# SimperStudio P0 问题批量修复计划

> 基于6份分析报告（前端、架构、调试、后端、维护、综合）的跨角色共识P0问题
> 目标：在单次迭代中消除最关键的P0级风险

---

## 修复原则

1. **安全优先**：后端安全漏洞（任意进程执行、Mutex poison）最先修复
2. **稳定性次之**：数据库初始化panic、超时收尸、配置竞态
3. **可维护性**：chatSlice拆分、lock文件修复、CI/CD基础
4. **不引入破坏性变更**：保持前端API兼容，Rust命令签名不变

---

## Stage 1: 并行修复（5个Worker同时执行）

### Worker 1 — 后端安全修复员 (`backend_security_fixer`)
**目标**：消除cli_agent.rs中的所有P0安全与并发问题
**文件**：`src-tauri/src/cli_agent.rs`
**任务清单**：
- [ ] 超时分支显式 `child.kill().await` + 清理stdout/stderr句柄
- [ ] 将 `std::sync::Mutex` 替换为 `tokio::sync::Mutex`（避免async中阻塞线程池）
- [ ] 添加executable白名单校验（只允许已知CLI工具如npx/python/node等）
- [ ] 添加working_dir沙箱校验（canonicalize + starts_with用户项目目录）
- [ ] 添加env_vars过滤（只允许SIMPER_*前缀或已知安全变量）
- [ ] Kill后校验进程是否真正终止
- [ ] Windows kill加 `/T` 参数（杀进程树）

### Worker 2 — 后端数据库修复员 (`backend_db_fixer`)
**目标**：消除db.rs中的所有P0稳定性问题
**文件**：`src-tauri/src/db.rs`
**任务清单**：
- [ ] 将所有 `state.conn.lock().unwrap()` 替换为 `.lock().map_err()` 或换 `parking_lot::Mutex`
- [ ] 将 `read_json_config` / `write_json_config` 纳入 `DbState` Mutex保护（或独立RwLock）
- [ ] 修复迁移SQL拼接：`format!("ALTER TABLE...")` 改为硬编码分支或引入refinery框架
- [ ] 为所有 `get_*` 列表接口添加 `limit`/`offset` 参数（默认limit=50）
- [ ] 添加agents表索引（workspace_id、is_active）
- [ ] 添加chat_messages联合索引（session_id, timestamp）

### Worker 3 — 后端工程化修复员 (`backend_eng_fixer`)
**目标**：修复lib.rs、Cargo.toml、tauri.conf.json的P0工程化问题
**文件**：`src-tauri/src/lib.rs`, `Cargo.toml`, `tauri.conf.json`
**任务清单**：
- [ ] 数据库初始化失败时返回错误到前端（不panic），前端显示引导修复页面
- [ ] 重命名crate：`tmp_tauri` → `simperstudio`，`tmp_tauri_lib` → `simperstudio_lib`
- [ ] 锁定Cargo.toml版本约束：`"2"` → `"~2.0"`，`"1"` → `"~1.0"`
- [ ] 添加 `[profile.release]` 优化（LTO、strip、codegen-units=1）
- [ ] 移除 `greet` 占位命令
- [ ] 扩展bundle targets：`["msi", "nsis", "dmg", "appimage", "deb"]`
- [ ] 配置基础CSP

### Worker 4 — 前端Slice拆分员 (`frontend_slice_splitter`)
**目标**：拆分chatSlice.ts，消除上帝对象
**文件**：`src/stores/chatSlice.ts`, `src/stores/index.ts`
**任务清单**：
- [ ] 创建 `chatSessionSlice.ts`：会话CRUD、当前会话切换、窗口管理
- [ ] 创建 `chatMessageSlice.ts`：消息添加、更新、删除、用户消息创建
- [ ] 创建 `chatStreamSlice.ts`：流式响应、AbortController管理、chunk buffer flush
- [ ] 创建 `chatForwardSlice.ts`：消息转发、重跑、autoSendToNext逻辑、workflowChatUI
- [ ] 保留 `chatSlice.ts` 作为facade（重新导出组合后的slice），保持向后兼容
- [ ] 更新 `stores/index.ts` 导入
- [ ] 确保所有外部引用仍可通过 `chatSlice.ts` 访问

### Worker 5 — 维护工程化修复员 (`maintenance_eng_fixer`)
**目标**：修复.gitignore、添加CI/CD、添加代码质量工具
**文件**：`.gitignore`, `.github/workflows/ci.yml`, `eslint.config.js`, `.prettierrc`
**任务清单**：
- [ ] 从 `.gitignore` 移除 `package-lock.json` 和 `src-tauri/Cargo.lock`
- [ ] 创建 `.github/workflows/ci.yml`：install → lint → test → build → artifact
- [ ] 添加 `eslint.config.js`（@eslint/js + typescript-eslint + react-hooks）
- [ ] 添加 `.prettierrc` 配置
- [ ] 添加 `.github/pull_request_template.md`

---

## Stage 2: 验证与整合

1. 检查各Worker输出文件是否存在且编译通过
2. 检查是否有文件冲突（多个Worker修改同一文件）
3. 如有冲突，由Orchestrator手动合并
4. 生成修复摘要报告

---

## 风险与回退

- **chatSlice拆分风险**：如果拆分导致类型循环依赖，保留原文件作为fallback
- **Rust修改风险**：如果引入编译错误，优先保证能编译通过，功能完整性次之
- **并发修改风险**：5个Worker可能同时修改不同文件，无直接冲突预期
