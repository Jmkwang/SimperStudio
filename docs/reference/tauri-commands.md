# Tauri Rust 命令参考表

源文件：`src-tauri/src/lib.rs`（注册）、`src-tauri/src/db.rs`（实现）、`src-tauri/src/cli_agent.rs`（CLI 子进程）

应用数据目录：`<dirs::data_dir>/SimperStudio/`（Windows: `%APPDATA%\SimperStudio\`）
- 数据库：`simperstudio.db`
- JSON 配置：`config/<name>.json`（按 key 分片）

---

## 1. 命令清单

### Greet（占位）
| 命令 | 入参 | 返回 |
|---|---|---|
| `greet` | `name: string` | `string` |

### 工作空间
| 命令 | 入参 | 返回 |
|---|---|---|
| `get_workspaces` | — | `Workspace[]` |
| `add_workspace` | `workspace: Workspace` | `()` |
| `update_workspace` | `workspace: Workspace` | `()` |
| `delete_workspace` | `id: string` | `()` |

### Agent
| 命令 | 入参 | 返回 |
|---|---|---|
| `get_agents` | — | `Agent[]` |
| `add_agent` | `agent: Agent` | `()` |
| `update_agent` | `agent: Agent` | `()` |
| `delete_agent` | `id: string` | `()` |

### 会话
| 命令 | 入参 | 返回 |
|---|---|---|
| `get_chat_sessions` | — | `ChatSession[]` |
| `add_chat_session` | `session: ChatSession` | `()` |
| `update_chat_session` | `session: ChatSession` | `()` |
| `delete_chat_session` | `id: string` | `()` |

### 消息
| 命令 | 入参 | 返回 |
|---|---|---|
| `get_chat_messages` | `session_id: string` | `ChatMessage[]` |
| `add_chat_message` | `message: ChatMessage` | `()` |
| `update_chat_message` | `message: ChatMessage` | `()` |
| `delete_chat_message` | `id: string` | `()` |

### 工作流
| 命令 | 入参 | 返回 |
|---|---|---|
| `get_workflows` | — | `Workflow[]` |
| `add_workflow` | `workflow: Workflow` | `()` |
| `update_workflow` | `workflow: Workflow` | `()` |
| `delete_workflow` | `id: string` | `()` |

### JSON 配置（统一文件）
| 命令 | 入参 | 返回 |
|---|---|---|
| `read_json_config` | `name: string` | `string \| null`（原始 JSON） |
| `write_json_config` | `name: string, value: string` | `()` |

### CLI 子进程
| 命令 | 入参 | 返回 |
|---|---|---|
| `spawn_cli_agent` | `executionId, executable, args[], cwd?, env?, stdin?` | 异步事件流 |
| `kill_cli_agent` | `executionId: string` | `()` |
| `get_working_dir_snapshot` | `path: string` | `Snapshot` 用于变更检测 |

CLI Agent 通过事件 `cli-output:<executionId>` / `cli-exit:<executionId>` 推送数据；应用退出时 `kill_all_processes()` 自动清理。

---

## 2. SQLite Schema

```sql
CREATE TABLE workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,           -- 注：v0.4.x 新增
    avatar TEXT,
    system_prompt TEXT NOT NULL,
    model_provider TEXT NOT NULL,
    model_id TEXT NOT NULL,
    temperature REAL NOT NULL,
    max_tokens INTEGER,
    api_key TEXT,
    base_url TEXT,
    parameters TEXT NOT NULL,   -- JSON
    industry TEXT,
    created_at INTEGER NOT NULL
);

CREATE TABLE chat_sessions (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    title TEXT NOT NULL,
    workflow_id TEXT,           -- 注：通过 ALTER 迁移添加
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,      -- JSON（含 attachments / agentResponses 等）
    timestamp INTEGER NOT NULL,
    FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE TABLE workflows (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    nodes_data TEXT NOT NULL,   -- JSON: WorkflowNode[]
    edges_data TEXT NOT NULL,   -- JSON: WorkflowEdge[]
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_sessions_workspace ON chat_sessions(workspace_id);
CREATE INDEX idx_workflows_workspace ON workflows(workspace_id);
```

> `agent_categories` 在前端运行时维护，未落库。
> `chat_sessions.workflow_id` 通过 `ALTER TABLE` 自动迁移添加，便于旧库平滑升级。

---

## 3. 序列化约定

所有结构体使用 `#[serde(rename_all = "camelCase")]`，前端 TS 接口直接对应：
- Rust `created_at: i64` ↔ TS `createdAt: number`
- Rust `model_provider: String` ↔ TS `modelProvider: string`

如需在 Rust 直接读 SQLite，注意字段在 SQL 表中是 snake_case，序列化层负责转换。

---

## 4. 错误处理

所有命令返回 `Result<T, String>`，错误通过 `e.to_string()` 转纯字符串。前端 `invoke` 抛 catch 后展示给用户或写入 `debugLogger`。

---

## 5. 应用退出清理

`run()` 注册 `RunEvent::Exit`：
- `CliProcessRegistry::kill_all_processes()` 强制终止所有活跃 CLI 子进程，防止僵尸进程

数据库连接随 `DbState` 在应用销毁时自动释放（Mutex 析构）。
