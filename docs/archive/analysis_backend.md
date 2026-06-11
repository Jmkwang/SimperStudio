# SimperStudio 后端（Tauri/Rust）专业审计报告

> 审计日期：2026-06-10  
> 审计范围：`src-tauri/` 全部 Rust 源码及配套配置  
> 审计视角：资深后端 / Rust 工程师  
> 版本基准：`0.5.4`（`package.json` / `tauri.conf.json` / `Cargo.toml` 一致）

---

## 执行摘要

| 维度 | 评分 | 关键结论 |
|---|---|---|
| 数据库设计 | 5/10 | 表结构基本合理，但缺乏系统级迁移、无外键闭环、无分页 |
| API 设计 | 5/10 | CRUD 完整但粒度粗，无过滤/分页/批量，文档与实现不一致 |
| 错误处理 | 4/10 | 全量 `String` 抹平错误类型，`unwrap` 过多，无结构化错误 |
| 并发安全 | 4/10 | 单 `Mutex<Connection>` 全局串行，async 命令中混合同步锁 |
| 性能 | 4/10 | 无连接池、无预编译语句复用、无查询分页，大数据量必崩 |
| 安全性 | 4/10 | SQL 注入防护到位，但路径遍历、任意进程执行、环境变量注入风险高 |
| 进程管理 | 5/10 | 有 spawn/kill/timeout 骨架，但超时后不收尸、僵尸进程风险大 |
| 配置管理 | 4/10 | JSON 分片简单，无 schema、无版本、无并发安全（跨 Mutex） |
| 日志系统 | 5/10 | 插件化日志可用，但 KeepAll 无限膨胀、无动态级别、无结构化 |
| 构建与发布 | 4/10 | 占位符未清理、仅 MSI、无跨平台 CI、无 feature 隔离 |

**总体评分：4.4/10** —— 当前后端处于“功能可用”阶段，距离生产级 Rust 桌面应用后端在并发架构、错误工程、安全边界、运维可观测性上均有显著差距。

---

## 1. 数据库设计（评分：5/10）

### 1.1 表结构

现有 5 张表：`workspaces`、`agents`、`chat_sessions`、`chat_messages`、`workflows`。

- **优点**：
  - 主键统一使用 `TEXT`（UUIDv4），与前端 `uuid` 包一致。
  - `chat_sessions` / `chat_messages` / `workflows` 均声明了 `FOREIGN KEY ... ON DELETE CASCADE`，级联删除语义正确。
  - `agents` 表字段覆盖全面（provider、model、temperature、max_tokens、parameters JSON、role/type/category 等）。
  - `parameters`、`nodes_data`、`edges_data` 使用 `TEXT` 存储 JSON，符合 SQLite 实践。

- **缺陷**：
  - `agents` 表没有 `workspace_id` 外键，Agent 是全局共享而非工作空间隔离，与产品“多工作空间”定位矛盾。
  - `chat_messages.content` 为 `TEXT NOT NULL`，但文档注明存 JSON；若单条消息超长（如附件 base64），SQLite `TEXT` 上限 2GB 虽够，但查询时全量加载内存会爆炸。
  - 无 `UNIQUE` 约束，例如同一工作空间下可创建同名 `chat_session`，前端可能产生歧义。
  - 无 `CHECK` 约束，例如 `temperature` 在 SQLite 层无范围限制（0~2）。

### 1.2 索引

```sql
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_sessions_workspace ON chat_sessions(workspace_id);
CREATE INDEX idx_workflows_workspace ON workflows(workspace_id);
```

- **优点**：覆盖了高频查询路径（按会话查消息、按空间查会话/工作流）。
- **缺陷**：
  - `agents` 表无任何索引，若 Agent 数量增长，`get_agents` 全表扫描。
  - `chat_messages` 缺少 `(session_id, timestamp)` 联合索引，当前只有单列索引，排序时可能回表。
  - 无部分索引或覆盖索引优化。

### 1.3 迁移策略

当前采用“启动时检测列存在性 + `ALTER TABLE ADD COLUMN`”的**增量补丁式迁移**（`init_db()` 中通过 `PRAGMA table_info` 循环检测）。

- **优点**：旧数据库可平滑升级，无需用户手动迁移。
- **严重缺陷**：
  - 没有 `schema_version` 表或 `migrations` 表，无法追溯已应用的迁移版本。
  - 迁移逻辑与 `CREATE TABLE` 语句分散，新增列时需要在两处维护（`CREATE TABLE` + `ALTER TABLE` 补丁），极易遗漏。
  - 第 180 行使用 `format!` 拼接 SQL：`conn.execute(&format!("ALTER TABLE agents ADD COLUMN {} {}", col, default), [])?;` —— 虽然 `col` 和 `default` 当前是硬编码常量，但**此写法为 SQL 注入埋下隐患**，一旦未来从外部输入列名将直接爆炸。
  - 不支持列删除、类型变更、索引重建等复杂迁移。

### 1.4 数据类型一致性

- `isActive` 在 SQLite 中为 `INTEGER DEFAULT 1`，Rust 层通过 `row.get::<_, i32>(15).map(|v| v != 0)?` 手动映射为 `bool`。这种跨层类型映射容易在新增字段时错位（当前 `get_agents` SELECT 列顺序与表定义/Agent struct 必须严格一致，已属高危）。

---

## 2. API 设计（评分：5/10）

### 2.1 命令粒度

`lib.rs` 注册了 19 个命令（含 `greet` 占位），每个领域实体（workspace/agent/session/message/workflow）均为标准 CRUD：

```
get_*/add_*/update_*/delete_*
```

- **优点**：模式统一，前端调用可预测。
- **缺陷**：
  - 无**批量操作**接口。前端若需删除 100 条消息，需调用 100 次 `delete_chat_message`，每次都要跨 FFI + 锁竞争。
  - 无**过滤/搜索**接口。`get_agents` 永远返回全表；`get_chat_messages` 只能按 `session_id` 查且返回全部历史，无 `LIMIT/OFFSET` 或时间范围过滤。
  - 无**部分更新**（PATCH语义）。`update_agent` 要求传入完整 `Agent` 结构体，前端必须回读再写回，增加竞态风险。

### 2.2 参数与返回值

- `get_chat_sessions`：文档（`tauri-commands.md`）标注入参为 `—`，但实际 Rust 函数签名要求 `workspace_id: String`。文档与实现不一致，前端若按文档调用会编译/运行错误。
- `add_*` 系列返回 `Result<(), String>`，成功时无返回值。前端无法立即获知插入后的数据库状态（如自增 ID，虽然此处是客户端生成 UUID，但无确认）。
- `read_json_config` 返回 `String`（JSON 文本），前端需二次 `JSON.parse`，增加序列化开销且类型不安全。

### 2.3 事件设计

`cli_agent.rs` 使用 Tauri 事件流推送子进程输出：

- `cli-output`：每行 stdout/stderr 推送一次。
- `cli-exit`：进程结束时推送。

- **优点**：流式推送避免大输出阻塞。
- **缺陷**：事件名未按 `execution_id` 分频道（文档写 `cli-output:<executionId>`，实际代码是统一 `cli-output`），前端需在全局监听后自行过滤，增加不必要的 IPC 流量和前端复杂度。

---

## 3. 错误处理（评分：4/10）

### 3.1 错误类型抹平

**所有** Tauri 命令统一返回 `Result<T, String>`，错误通过 `.map_err(|e| e.to_string())?` 转换为纯字符串。

- **后果**：
  - 前端无法区分“数据库连接断开”、“唯一约束冲突”、“记录不存在”、“JSON 解析失败”等不同错误域，只能统一弹窗或打印。
  - 无法做针对性重试或降级（如数据库锁超时重试）。
  - 丢失了错误链（`source()`），排查生产问题困难。

### 3.2 `unwrap` / `expect` 使用

| 位置 | 代码 | 风险 |
|---|---|---|
| `lib.rs:39` | `Mutex::new(db_conn)` | 正常 |
| `lib.rs:67` | `.expect("error while building tauri application")` | 构建失败直接 panic，无优雅降级 |
| `db.rs:9` | `dirs::data_dir().unwrap_or_else(...)` | 有兜底，尚可 |
| `db.rs:209` | `state.conn.lock().unwrap()` | **Poison 风险**：若某线程 panic 导致 Mutex poison，后续所有 DB 操作永久崩溃 |
| `db.rs:243` | `state.conn.lock().unwrap()` | 同上，全文件共 10+ 处 |
| `cli_agent.rs:145` | `registry.pids.lock()` 后 `if let Ok(...)` | 部分处理了 poison，但 `kill_all_processes` 中直接 `unwrap()` |

- **关键问题**：`Mutex` 在 Rust 中一旦 poison（持有锁时 panic），后续 `lock()` 返回 `Err`。代码中大量使用 `.unwrap()` 直接 panic，意味着一个 DB 操作 panic 会导致整个应用后端数据库功能瘫痪，必须重启应用。

### 3.3 建议方案

- 引入 `thiserror` 定义结构化错误枚举：
  ```rust
  #[derive(thiserror::Error, Debug)]
  enum AppError {
      #[error("数据库错误: {0}")]
      Db(#[from] rusqlite::Error),
      #[error("IO错误: {0}")]
      Io(#[from] std::io::Error),
      #[error("配置错误: {0}")]
      Config(String),
      #[error("未找到记录: {0}")]
      NotFound(String),
  }
  ```
- Tauri 命令返回 `Result<T, AppError>`，利用 `tauri::command` 的序列化能力自动转为 JSON 错误对象给前端。
- 使用 `parking_lot::Mutex`（不 poisoning）或显式处理 `lock()` 的 `Err` 情况。

---

## 4. 并发安全（评分：4/10）

### 4.1 数据库连接模型

```rust
pub struct DbState {
    pub conn: Mutex<Connection>,
}
```

- **问题本质**：SQLite 的 `rusqlite::Connection` 不是 `Sync`，但通过 `Mutex` 强行串行化。所有 DB 操作（包括只读查询）全局互斥，形成**单线程瓶颈**。
- **后果**：
  - 任何慢查询（如大消息内容检索）会阻塞所有其他 DB 命令，前端 UI 卡顿。
  - Tauri 命令默认在异步线程池执行，但 `db.rs` 中所有命令都是**同步函数**（非 `async`），占用线程池线程期间一直持有锁，线程池可能被耗尽。

### 4.2 async/sync 混用风险

`cli_agent.rs` 中的 `spawn_cli_agent` 是 `async fn`，但内部调用 `registry.pids.lock()`（同步 `std::sync::Mutex`）。在 async 上下文中持有同步锁是 Rust 并发经典反模式：

```rust
if let Ok(mut pids) = registry.pids.lock() {  // 同步锁，可能阻塞当前线程
    pids.insert(exec_id.clone(), pid);
}
```

- 若锁竞争激烈，async executor 的线程会被阻塞，导致同一线程上的其他 async 任务饿死。

### 4.3 建议方案

- **短期**：将 `db.rs` 所有命令改为 `async fn`，内部使用 `tokio::task::spawn_blocking` 包裹同步 DB 操作，释放 async 线程。
- **中期**：引入 `r2d2` / `deadpool` 连接池，允许多个并发读（SQLite WAL 模式下支持并发读）。
- **长期**：读写分离，读操作使用只读连接，写操作单连接串行化。
- **立即**：将 `std::sync::Mutex` 替换为 `tokio::sync::Mutex`（在 async 上下文使用）或 `parking_lot::Mutex`（更快且不 poisoning）。

---

## 5. 性能（评分：4/10）

### 5.1 数据库查询效率

- **无预编译语句复用**：每次命令都重新 `conn.prepare(...)`，SQL 解析开销重复。
- **无分页**：`get_chat_messages` 返回某 `session_id` 下的**全部**消息。若用户聊天历史 10k 条，一次性加载到内存再序列化到 JSON 跨 IPC，前端将明显卡顿。
- **无覆盖索引**：`get_agents` SELECT 了 17 个字段，但表上无覆盖索引，回表开销大（虽然当前数据量小不明显）。
- **N+1 风险**：前端若展示会话列表并显示最新消息预览，可能触发多次 `get_chat_messages`。

### 5.2 序列化与 IPC 开销

- `db.rs` 中所有查询结果先 `Vec<T>` 全量收集，再一次性 `serde_json` 序列化，再跨 Tauri IPC 传输。对于大表，内存峰值 = 数据库行 × Rust 结构体 + JSON 字符串 + 前端 JS 对象，三重膨胀。
- `nodes_data` / `edges_data` 在 `workflows` 表中以 JSON 文本存储，每次更新工作流都要全量重写这两个大字段。

### 5.3 进程管理性能

- `get_working_dir_snapshot` 递归遍历目录，对大型项目（如含 `node_modules`）可能耗时数秒。虽然跳过了 `node_modules` / `target` / 隐藏目录，但仍为**同步阻塞调用**，前端等待期间无进度反馈。

### 5.4 建议方案

- 所有 `get_*` 列表接口增加 `limit: Option<usize>`、`offset: Option<usize>`、`order_by: Option<String>` 参数。
- `get_chat_messages` 默认只返回最近 50 条，前端滚动加载历史。
- 使用 `rusqlite::CachedStatement` 或连接池级别的语句缓存。
- `get_working_dir_snapshot` 改为 `async` 流式返回（分批 emit 事件），或至少加 `tokio::task::spawn_blocking`。

---

## 6. 安全性（评分：4/10）

### 6.1 SQL 注入

- **防护到位**：所有查询均使用参数化查询（`?1`、`rusqlite::params!`），无字符串拼接 SQL（除迁移代码中的 `format!` 拼接 `ALTER TABLE`）。
- **隐患**：`init_db()` 第 180 行 `format!("ALTER TABLE agents ADD COLUMN {} {}", col, default)` 当前为硬编码，但若未来参数化将直接引入注入漏洞。

### 6.2 路径遍历

- `read_json_config` / `write_json_config` 的 `name` 参数未做路径净化。虽然最终路径是 `app_data_dir().join("config").join("config.json")`，但 `name` 仅用于 JSON key，不用于文件路径，**当前安全**。
- **`spawn_cli_agent` 的 `working_dir`**：仅检查 `path.exists()` 和 `path.is_dir()`，未限制必须在用户项目目录或白名单内。攻击者可通过前端调用传入 `C:\Windows\System32` 等系统目录，配合任意 `executable` 执行危险操作。
- **`get_working_dir_snapshot`**：同样无路径范围限制，可读取系统任意目录结构（信息泄露）。

### 6.3 任意进程执行

`spawn_cli_agent` 接收 `executable: String` 并直接 `Command::new(&request.executable)` 执行：

- **无白名单**：可执行任意路径下的任意程序（包括 `.exe`、`.bat`、PowerShell 脚本）。
- **无沙箱**：子进程继承父进程权限（用户级），可读写用户全部文件、访问网络。
- **环境变量注入**：`env_vars: Option<HashMap<String, String>>` 无 key 白名单，可覆盖 `PATH`、`HOME` 等敏感变量，诱导加载恶意 DLL（Windows DLL 劫持）。
- **stdin 注入**：`stdin_input` 直接写入子进程，若 `executable` 是交互式 shell，可构造管道命令。

### 6.4 建议方案

- **进程白名单**：维护允许执行的 CLI 工具列表（如 `npx`、`python`、`node` 等），校验 `executable` 为绝对路径且位于白名单内。
- **工作目录沙箱**：`working_dir` 必须位于用户工作区根目录下（通过 `canonicalize` + `starts_with` 校验）。
- **环境变量过滤**：只允许以特定前缀（如 `SIMPER_`）或已知安全变量传入，禁止覆盖 `PATH`、`LD_PRELOAD` 等。
- **迁移 SQL 拼接**：使用常量匹配替代 `format!`，或引入 `barrel` / `refinery` 等迁移框架。

---

## 7. 进程管理（评分：5/10）

### 7.1 架构概览

- `CliProcessRegistry`：维护 `Mutex<HashMap<String, u32>>`，映射 `execution_id -> PID`。
- `spawn_cli_agent`：异步 spawn，流式读取 stdout/stderr，支持 timeout（默认 5min）。
- `kill_cli_agent` / `kill_all_processes`：应用退出或用户主动 kill 时，通过 `taskkill`（Windows）或 `libc::kill(SIGKILL)`（Unix）终止。

### 7.2 关键缺陷

#### A. 超时后不收尸

```rust
let wait = child.wait();
match tokio::time::timeout(..., wait).await {
    Ok(Ok(status)) => ...,
    Ok(Err(e)) => ...,
    Err(_) => Err("Process timed out".to_string()),  // 超时返回错误，但 child 仍在运行！
}
```

- `tokio::time::timeout` 仅取消 `child.wait()` 的等待，**不会自动 kill 子进程**。超时后函数返回 `Err`，但子进程成为**孤儿进程/僵尸进程**，继续占用资源，且 PID 仍留在 registry 中（虽然后面有 `remove`，但仅在正常退出路径）。
- **正确做法**：超时分支中必须显式 `child.kill().await` 或 `kill_cli_agent` 逻辑。

#### B. 读者句柄泄漏

```rust
let _ = stdout_handle.await;
let _ = stderr_handle.await;
```

- 在超时路径中，函数已经返回 `Err`，这两行不会执行。`stdout_handle` / `stderr_handle` 中的 `tokio::spawn` 任务可能永远挂起（等待子进程关闭 stdout/stderr 管道），导致线程/任务泄漏。

#### C. Kill 错误静默

```rust
#[cfg(target_os = "windows")]
{
    let _ = StdCommand::new("taskkill")
        .args(["/F", "/PID", &pid.to_string()])
        .output();
}
```

- `let _ =` 完全忽略 kill 结果。若进程已自然退出，PID 被复用，`taskkill` 可能误杀其他进程；若 `taskkill` 失败（权限不足），调用方以为成功。

#### D. Unix 信号使用

```rust
unsafe { libc::kill(pid as i32, libc::SIGKILL); }
```

- 无返回值检查，不知道是否成功。
- `pid` 是 `u32`，在 32 位系统或特殊 PID 值时 `as i32` 可能溢出/截断。
- 使用 `libc::kill` 需要 `unsafe`，可考虑 `nix::sys::signal::kill` 安全封装。

#### E. 无进程树清理

- 子进程可能再 spawn 孙进程（如 `npx` 启动 node）。`taskkill /F /PID` 和 `SIGKILL` 只杀直接子进程，孙进程可能残留为孤儿进程。
- Windows 应使用 `taskkill /F /T /PID`（杀进程树），Unix 应使用进程组（`setpgid` + `kill(-pgid, SIGKILL)`）。

### 7.3 建议方案

- 超时后显式 `child.kill().await` 并等待 `stdout_handle` / `stderr_handle` 完成（或 `abort`）。
- 使用 `tokio::process::Command` 的 `kill_on_drop(true)`（若适用）或自定义 `Drop` 保证清理。
- Windows kill 加 `/T` 参数；Unix 使用进程组。
- Kill 后校验进程是否真正终止（轮询 `sysinfo` 或尝试 `waitpid(WNOHANG)`）。

---

## 8. 配置管理（评分：4/10）

### 8.1 当前实现

- 单文件：`app_data_dir()/config/config.json`
- 按 key 分片：`read_json_config(name)` 读取某个 key，`write_json_config(name, value)` 写入某个 key。
- 全量读写：每次写都要读入整个 JSON → 修改 → 格式化写回。

### 8.2 缺陷

- **无 schema 校验**：`write_json_config` 接收 `String`，内部 `serde_json::from_str` 仅校验是否为合法 JSON，不校验业务 schema。前端可能写入错误类型（如把 `maxTokens` 写成字符串）。
- **并发写风险**：虽然 DB 操作有 `Mutex`，但配置读写使用独立的 `fs::read_to_string` / `fs::write`，无锁保护。若前端快速连续调用两次 `write_json_config`，可能产生竞态写（后写覆盖前写，或文件损坏）。
- **无版本控制**：配置结构变更时，旧版 config.json 可能无法解析，导致启动失败或配置丢失。
- **全量重写性能差**：配置项增多后，每次修改一个 key 都要重写整个文件。
- **无加密/保护**：`apiKey` 等敏感信息若通过此配置存储，将以明文落盘。

### 8.3 建议方案

- 短期：将配置读写也纳入 `DbState` 的 `Mutex` 保护，或单独使用 `tokio::sync::RwLock`。
- 中期：引入配置 schema（`serde_json::Value` 转为强类型 struct），写时校验。
- 长期：敏感配置（API Key）使用 `keyring` 或 OS 凭据管理器存储，不存 JSON。

---

## 9. 日志系统（评分：5/10）

### 9.1 当前配置

```rust
.plugin(tauri_plugin_log::Builder::new()
    .level(log::LevelFilter::Info)
    .target(tauri_plugin_log::TargetKind::Folder { ... })
    .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
    .max_file_size(5_000_000)
    .build())
```

### 9.2 缺陷

- **KeepAll 无限膨胀**：`KeepAll` 保留所有历史日志文件，长期运行后磁盘占用无上限。应改为 `KeepOne` 或按日期轮转，并设置最大保留天数。
- **日志级别固定**：硬编码 `Info`，无法通过前端开关或环境变量动态调整（如排查问题时临时开 `Debug`）。
- **无结构化字段**：日志是纯文本，无 JSON 结构化输出，不利于 ELK / Loki 等日志系统采集。
- **关键事件缺失**：
  - 无数据库查询耗时日志。
  - 无 IPC 调用频率/耗时统计。
  - 无配置变更审计日志（谁改了 API Key）。
- **日志目录创建**：`dirs::data_dir().unwrap_or_default().join("SimperStudio").join("logs")` —— 若 `data_dir()` 为 None（极端情况），日志会写到当前工作目录的 `SimperStudio/logs`，可能无写权限。

### 9.3 建议方案

- 日志策略改为 `KeepOne` 或自定义清理（保留最近 7 天 / 10 个文件）。
- 增加 `TAURI_LOG_LEVEL` 环境变量支持，或前端提供日志级别切换命令。
- 关键路径（spawn CLI、DB 写、配置变更）增加结构化日志（`info!(target: "cli", execution_id=..., duration_ms=...)`）。

---

## 10. 构建与发布（评分：4/10）

### 10.1 Cargo.toml

```toml
name = "tmp_tauri"
version = "0.5.4"
authors = ["you"]
```

- `name` 仍为模板占位符 `tmp_tauri`，`lib` 名 `tmp_tauri_lib` 同样。
- `authors` 为占位符 `"you"`。
- 无 `license`、`repository`、`keywords` 等元数据。
- 无 `[profile.release]` 优化配置（LTO、codegen-units、strip 等），发布二进制体积和性能未优化。

### 10.2 tauri.conf.json

```json
"bundle": {
    "active": true,
    "targets": ["msi"]
}
```

- 仅打包 `msi`，无 `dmg`（macOS）、`deb`/`AppImage`（Linux），跨平台发布能力缺失。
- `csp: null` 未配置内容安全策略，前端若加载远程资源存在 XSS 风险（虽然桌面应用相对可控）。

### 10.3 版本一致性

- `package.json`、`tauri.conf.json`、`Cargo.toml` 版本号当前一致（`0.5.4`），但维护靠人工，无自动化校验脚本。
- `Cargo.toml` 中 `tauri = { version = "2", features = [] }` 使用大版本号，可能意外引入破坏性更新。

### 10.4 建议方案

- 重命名 crate 为 `simperstudio` / `simperstudio_lib`。
- 增加 `[profile.release]` 优化：
  ```toml
  [profile.release]
  lto = true
  codegen-units = 1
  strip = true
  opt-level = 3
  ```
- 扩展 bundle targets 到 `["msi", "dmg", "deb", "appimage"]`（视 CI 能力逐步添加）。
- 增加 `build.rs` 或 CI 脚本自动校验三处版本号一致性。
- 配置 CSP：`"csp": "default-src 'self'; connect-src 'self' https:; img-src 'self' data: https:"`。

---

## 问题清单

### P0（阻塞发布 / 数据损坏 / 安全漏洞）

| # | 问题 | 位置 | 影响 |
|---|---|---|---|
| P0-1 | **超时后子进程不收尸**：`spawn_cli_agent` 超时返回错误，但 `child` 仍在运行，成为孤儿/僵尸进程 | `cli_agent.rs:195` | 资源泄漏，长期运行后系统卡死 |
| P0-2 | **async 中持有同步 Mutex 阻塞线程池**：`spawn_cli_agent` 在 async 中 `registry.pids.lock()` 可能阻塞 executor 线程 | `cli_agent.rs:145` | 并发高时 async 任务饿死，前端无响应 |
| P0-3 | **配置写无锁保护，竞态可能损坏文件**：`write_json_config` 独立 `fs::write`，无 Mutex/RwLock | `db.rs:519` | 快速连续写时文件损坏或配置丢失 |
| P0-4 | **任意进程执行 + 环境变量注入**：`spawn_cli_agent` 无 executable 白名单、无 working_dir 沙箱、无 env 过滤 | `cli_agent.rs:95` | 恶意前端代码可执行系统命令，安全风险极高 |
| P0-5 | **Mutex poison 导致数据库永久不可用**：所有 `state.conn.lock().unwrap()` 在 poison 时 panic | `db.rs` 全文件 | 一次 DB 操作 panic = 全部 DB 功能瘫痪 |

### P1（严重影响体验 / 性能 / 可维护性）

| # | 问题 | 位置 | 影响 |
|---|---|---|---|
| P1-1 | **无查询分页，大数据量必崩**：`get_chat_messages` 等返回全表 | `db.rs:390` | 消息多 = 内存爆炸 + IPC 阻塞 + 前端卡顿 |
| P1-2 | **文档与实现不一致**：`tauri-commands.md` 写 `get_chat_sessions` 无参，实际需 `workspace_id` | `tauri-commands.md:37` | 前端按文档调用直接报错 |
| P1-3 | **错误类型全抹平**：所有错误转 `String`，前端无法分类处理 | `db.rs` / `cli_agent.rs` | 用户体验差，排查困难 |
| P1-4 | **迁移 SQL 拼接隐患**：`format!("ALTER TABLE ...")` 虽当前硬编码，但模式危险 | `db.rs:180` | 未来参数化即 SQL 注入 |
| P1-5 | **KeepAll 日志无限膨胀**：无日志清理策略 | `lib.rs:53` | 长期运行磁盘占满 |
| P1-6 | **进程树清理缺失**：kill 只杀直接子进程，孙进程残留 | `cli_agent.rs:260` | `npx` 等工具启动的孙进程成孤儿 |
| P1-7 | **agents 无 workspace 隔离**：全局共享，与多工作空间产品定位矛盾 | `db.rs:86` | 数据模型与业务逻辑不一致 |
| P1-8 | **Crate 名仍为模板占位符**：`tmp_tauri` / `tmp_tauri_lib` | `Cargo.toml:2,14` | 不专业，可能与其他 crate 冲突 |

### P2（优化项 / 技术债）

| # | 问题 | 位置 | 影响 |
|---|---|---|---|
| P2-1 | 无连接池 / WAL 模式，单连接串行 | `db.rs:23` | 并发性能差 |
| P2-2 | 无预编译语句缓存 | `db.rs` 全文件 | 重复 SQL 解析开销 |
| P2-3 | `get_working_dir_snapshot` 同步阻塞大目录遍历 | `cli_agent.rs:292` | 前端卡顿 |
| P2-4 | 无 release 编译优化配置 | `Cargo.toml` | 二进制体积大 |
| P2-5 | 仅 MSI 打包，无 macOS/Linux | `tauri.conf.json:30` | 无法跨平台发布 |
| P2-6 | CSP 为 null | `tauri.conf.json:25` | 安全基线缺失 |
| P2-7 | 无 API Key 加密存储 | 配置系统 | 敏感信息明文落盘 |
| P2-8 | `greet` 占位命令未移除 | `lib.rs:19` | 生产代码含无用函数 |
| P2-9 | 版本号维护靠人工，无校验 | 三处配置文件 | 易遗漏不一致 |
| P2-10 | 事件名未按 execution_id 分频道 | `cli_agent.rs:165` | 前端全局过滤，IPC 冗余 |

---

## 改进建议（按优先级排序）

### 阶段一：安全与稳定性（立即执行）

1. **修复超时收尸**：在 `spawn_cli_agent` 的超时分支中显式 `child.kill().await`，并确保 `stdout_handle` / `stderr_handle` 被 abort 或等待完成。
2. **进程沙箱化**：
   - `executable` 白名单校验（只允许已知 CLI 工具）。
   - `working_dir` 限制在用户项目目录下（`canonicalize` + `starts_with`）。
   - `env_vars` 过滤，只允许白名单 key（如 `NODE_ENV`、`SIMPER_*`）。
3. **消除 Mutex poison**：
   - 全项目搜索 `.lock().unwrap()`，改为 `.lock().map_err(|e| ...)?` 或换用 `parking_lot::Mutex`。
4. **配置写加锁**：将 `read_json_config` / `write_json_config` 纳入 `DbState` 的 `Mutex` 保护，或引入独立 `tokio::sync::RwLock<PathBuf>`。
5. **修复迁移 SQL 拼接**：将 `format!` 改为硬编码分支匹配，或引入 `refinery` / `barrel` 迁移框架。

### 阶段二：架构与性能（1-2 周）

6. **引入连接池**：使用 `r2d2_sqlite` 或 `deadpool-sqlite`，启用 WAL 模式（`PRAGMA journal_mode = WAL`），支持并发读。
7. **所有列表接口加分页**：
   ```rust
   #[tauri::command]
   pub fn get_chat_messages(
       session_id: String,
       limit: Option<usize>,
       offset: Option<usize>,
       state: tauri::State<DbState>
   ) -> Result<Vec<ChatMessage>, String> { ... }
   ```
8. **错误工程化**：引入 `thiserror`，定义 `AppError` 枚举，Tauri 命令返回 `Result<T, AppError>`，前端可分类处理。
9. **async DB 命令**：将 Tauri 命令改为 `async fn`，DB 操作包裹在 `spawn_blocking` 中，避免阻塞 async runtime。
10. **日志治理**：改为 `KeepOne` 或按日期轮转，增加环境变量控制日志级别。

### 阶段三：工程化与发布（2-4 周）

11. **重命名 crate**：`tmp_tauri` → `simperstudio`，更新 `main.rs` 调用。
12. **Release 优化**：添加 `profile.release`（LTO、strip、codegen-units=1）。
13. **跨平台打包**：扩展 `tauri.conf.json` targets 到 `dmg`、`deb`、`appimage`。
14. **敏感配置加密**：API Key 等使用 `keyring` crate 存入 OS 凭据管理器。
15. **版本一致性自动化**：在 `build.rs` 或 CI 中校验 `package.json` / `tauri.conf.json` / `Cargo.toml` 版本号一致。
16. **CSP 配置**：设置合理的 Content-Security-Policy。
17. **移除占位代码**：删除 `greet` 命令及无用注释。

---

## 结论

SimperStudio 的后端目前处于**“功能验证通过，工程化不足”**的阶段。`db.rs` 和 `cli_agent.rs` 在原型阶段快速迭代，实现了完整的 CRUD 和子进程管理骨架，但在以下方面距离生产级标准有明显差距：

1. **并发架构**：单 `Mutex<Connection>` 是最大瓶颈，必须引入连接池 + WAL + `spawn_blocking`。
2. **安全边界**：任意进程执行是当前最大的安全红线，必须加白名单和路径沙箱。
3. **错误工程**：全量 `String` 错误是技术债，应尽早引入结构化错误枚举。
4. **资源治理**：超时子进程、无限日志、无分页查询，这三项在真实用户场景下会迅速导致系统不可用。

建议按“阶段一（安全/稳定）→ 阶段二（架构/性能）→ 阶段三（工程化/发布）”的顺序推进，预计 2-4 周可将后端提升至生产可用水平（总体评分可达 7-8/10）。

---

*报告生成完毕。如需针对某一维度深入展开（如具体代码重构方案、迁移框架选型、连接池实现细节），可进一步补充。*
