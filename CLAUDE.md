# SimperStudio - 开发文档 (Development Documentation)

## 项目概述 (Project Overview)

**SimperStudio** 是一个基于 Tauri + React 的 AI 工作流与多智能体协作桌面应用程序。它集成了工作流编排、多 Agent 聊天、提示词生成等核心功能，支持本地模型和云端 API 的混合使用，专注于为用户提供直观、可视化的 AI 能力编排体验。

### 核心特性

- 🎯 **多 Agent 协作聊天**：支持 `@提及` 多智能体，消息分角色展示，流式响应
- 🔄 **可视化工作流引擎**：基于 React Flow 的拖拽式工作流编排，支持 DAG 执行
- 🔁 **Loop 节点迭代**：支持数组遍历、条件中断、结果聚合
- 📊 **条件路由节点**：基于 JavaScript 表达式的动态分支分发
- 💻 **代码执行节点**：支持自定义 JS 逻辑与状态转换
- 🎨 **提示词生成器**：独立的提示词打磨与生成页面
- 💾 **本地持久化**：基于 Tauri + SQLite 的本地数据存储
- 🌓 **深色/浅色主题**：系统级主题适配，Tailwind CSS 驱动

## 技术栈 (Tech Stack)

### 前端
- **React 18** + TypeScript
- **Vite** 构建工具
- **Tailwind CSS** + **shadcn/ui** 组件库
- **React Flow** 工作流画布
- **Zustand** 状态管理
- **Tauri** 桌面端框架

### 后端 (Rust)
- **Tauri 2.x** 桌面运行时
- **Rusqlite** SQLite 数据库
- **serde** 序列化/反序列化

### AI/API 支持
- OpenAI API
- Anthropic API
- Google Gemini API
- 自定义 OpenAI 兼容端点
- 本地模型 (Ollama/LM Studio)

## 项目结构 (Project Structure)

```
SimperStudio/
├── src/
│   ├── main.tsx                          # 应用入口
│   ├── App.tsx                           # 根组件
│   ├── globals.css                       # 全局样式
│   ├── vite-env.d.ts                     # Vite 类型声明
│   │
│   ├── components/
│   │   ├── theme/ThemeProvider.tsx       # 主题提供者
│   │   │
│   │   ├── layout/
│   │   │   ├── AppShell.tsx              # 应用外壳（布局容器）
│   │   │   ├── GlobalSidebar.tsx         # 全局左侧导航栏
│   │   │   └── ContextSidebar.tsx        # 上下文侧边栏
│   │   │
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx         # 主聊天界面
│   │   │   ├── DualAgentChatView.tsx     # 工作流模式聊天视图
│   │   │   └── AgentResultCard.tsx       # Agent 结果卡片
│   │   │
│   │   ├── workflow/
│   │   │   ├── WorkflowCanvas.tsx        # 工作流画布主组件
│   │   │   └── nodes/
│   │   │       ├── TriggerNode.tsx       # 触发器节点
│   │   │       ├── AgentNode.tsx         # Agent 节点
│   │   │       ├── OutputNode.tsx        # 输出节点
│   │   │       ├── RouterNode.tsx        # 条件路由节点
│   │   │       ├── CodeNode.tsx          # 代码执行节点
│   │   │       └── LoopNode.tsx          # 循环迭代节点
│   │   │
│   │   ├── prompts/
│   │   │   └── PromptGenerator.tsx       # 提示词生成器
│   │   │
│   │   ├── agents/
│   │   │   └── AgentsView.tsx            # Agent 管理视图
│   │   │
│   │   ├── settings/
│   │   │   └── SettingsView.tsx          # 设置页面
│   │   │
│   │   ├── profile/
│   │   │   └── ProfileView.tsx           # 个人资料视图
│   │   │
│   │   └── ui/                           # UI 组件库 (shadcn/ui)
│   │       ├── button.tsx, card.tsx, dialog.tsx, input.tsx, 等
│   │
│   ├── store/
│   │   └── appStore.ts                   # Zustand 全局状态管理
│   │
│   ├── types/
│   │   └── models.ts                     # TypeScript 类型定义
│   │
│   ├── lib/
│   │   ├── api.ts                        # API 调用封装
│   │   └── utils.ts                      # 工具函数
│   │
│   └── hooks/
│       └── useTranslation.ts             # 国际化钩子
│
├── src-tauri/
│   ├── src/
│   │   ├── main.rs                      # Tauri 应用入口
│   │   ├── lib.rs                       # 库入口
│   │   └── db.rs                        # SQLite 数据库操作
│   │
│   ├── Cargo.toml                       # Rust 依赖管理
│   └── tauri.conf.json                  # Tauri 配置
│
├── docs/
│   ├── PRD.md                           # 产品需求文档
│   └── Design_Specs.md                  # UI/UX 设计规范
│
├── public/                              # 静态资源
├── .claude/                             # Claude Code 工作区
└── ...
```

## 核心功能详解 (Core Features)

### 1. 状态管理 (appStore.ts)

使用 **Zustand** 集中管理应用状态，包含以下模块：

#### 数据实体
- **Workspaces**：工作空间（默认包含 "Personal Workspace"）
- **Agents**：智能体配置（预置 4 个示例 Agent）
- **Sessions**：聊天会话（默认 3 个会话）
- **Workflows**：工作流定义（默认 5 个，含狼人杀示例）

#### 关键状态
```typescript
interface AppState {
  workspaces: Workspace[];
  agents: Agent[];
  sessions: ChatSession[];
  workflows: Workflow[];
  activeWorkspaceId: string | null;
  activeSessionId: string | null;
  activeWorkflowId: string | null;
  workflowChatMode: boolean;           // 工作流聊天模式开关
  workflowExecution: {                 // 工作流执行状态
    status: 'idle' | 'running' | 'completed' | 'error';
    currentNodeId: string | null;
    results: Record<string, any>;
  };
}
```

#### 核心 Actions
- **fetchInitialData()**：初始化数据（从 SQLite 加载）
- **createSession/updateSession**：会话管理
- **addAgentResponseStream/completeAgentResponse**：流式响应处理
- **executeWorkflow()**：工作流执行引擎
- **saveWorkflow()**：工作流持久化

### 2. 工作流执行引擎 (executeWorkflow)

位于 `appStore.ts` 的 `executeWorkflow` 函数，实现了一个基于队列的 DAG 执行引擎：

#### 执行模型
- **队列驱动**：使用 BFS 遍历工作流节点
- **帧隔离**：每个节点执行使用独立的 `ExecutionFrame`
- **上下文传递**：通过 `payload` 对象在节点间传递数据
- **循环保护**：`MAX_WORKFLOW_STEPS = 1000` 防止无限循环

#### 节点类型支持
1. **Trigger (触发器)**：工作流入口点
2. **Agent (AI 节点)**：LLM 调用，支持结构化输出（Schema）
3. **Code (代码节点)**：JS 表达式执行，支持异步和超时（10s）
4. **Condition (条件路由)**：JS 表达式评估，多分支分发
5. **Loop (循环节点)**：数组遍历，支持：
   - `itemsPath`：数据源路径（如 `payload.alivePlayers`）
   - `itemAlias/indexAlias`：迭代变量别名
   - `maxIterations`：最大迭代次数（默认 20）
   - `breakCondition`：中断条件表达式
   - `aggregationStrategy`：结果聚合策略（append/replace）
   - **结果存储**：`payload.loopResults[nodeId]`
6. **Output (输出节点)**：标记工作流输出点

#### 循环节点实现细节
```typescript
// Loop 节点执行逻辑
- 解析 itemsPath 获取数组
- 遍历数组（最多 maxIterations 次）
- 每次迭代创建独立的 iterationPayload
- 注入上下文：loop.currentItem, loop.index, loop.total
- 收集下游节点的 llmResult 或完整 payload
- 聚合结果到 payload.loopResults[nodeId]
```

#### 表达式求值
使用 `AsyncFunction` 动态编译 JS 表达式，支持：
- 超时控制（2s 表达式求值）
- 安全沙箱（with 语句隔离）
- 错误捕获

### 3. 聊天系统 (ChatInterface.tsx)

#### 消息处理
- **用户消息**：直接发送到会话
- **Agent 响应**：流式接收，按 Agent 分组展示
- **@提及**：解析 `@agent-name` 触发指定 Agent 响应

#### 状态同步
- 后端通过 `invoke` 调用 Tauri 命令持久化
- 实时更新本地 Zustand 状态
- `agentResponses` 数组存储多 Agent 并发响应

### 4. 狼人杀工作流 (Werewolf Game Logic)

位于 `workflows[4]`，演示复杂工作流编排：

#### 架构设计
- **两层架构**：
  - **创意层**：Agent 生成内容（发言、决策）
  - **裁决层**：Code 节点执行规则（计票、胜负判定）

#### 夜阶段
1. 狼人选择目标（结构化输出 `{targetId, reason}`）
2. 预言家查验
3. 女巫使用药剂（救/毒）
4. Code 节点统一结算（狼刀优先、药剂消耗、胜负判定）

#### 白天阶段
1. **Loop 节点**：遍历存活玩家逐人发言
2. Code 节点：记录发言、检测自爆
3. 投票阶段（批量决策）
4. Code 节点：计票、PK、胜负判定

#### 关键特性
- 支持屠边规则
- 狼刀优先机制
- 猎人开枪规则（被放逐/狼刀触发）
- 平票进入 PK 流程

## 数据库设计 (Database Schema)

### SQLite 表结构 (db.rs)

#### workspaces
```sql
CREATE TABLE workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

#### agents
```sql
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT,
    system_prompt TEXT NOT NULL,
    model_provider TEXT NOT NULL,
    model_id TEXT NOT NULL,
    temperature REAL NOT NULL,
    max_tokens INTEGER,
    api_key TEXT,
    base_url TEXT,
    parameters TEXT,  -- JSON string
    industry TEXT,
    created_at INTEGER NOT NULL
);
```

#### chat_sessions
```sql
CREATE TABLE chat_sessions (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
);
```

#### chat_messages
```sql
CREATE TABLE chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,  -- JSON string
    timestamp INTEGER NOT NULL,
    FOREIGN KEY(session_id) REFERENCES chat_sessions(id)
);
```

#### workflows (核心)
```sql
CREATE TABLE workflows (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    nodes_data TEXT NOT NULL,   -- JSON string
    edges_data TEXT NOT NULL,   -- JSON string
    status TEXT NOT NULL,       -- active/inactive
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
);
```

## 配置文件详解

### tauri.conf.json
```json
{
  "productName": "SimperStudio",
  "identifier": "com.kwang.simperstudio",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "frontendDist": "../dist"
  },
  "bundle": {
    "targets": "all"  // Windows/macOS/Linux 跨平台打包
  }
}
```

## 开发规范 (Development Guidelines)

### 代码风格
- **缩进**：2 空格（TypeScript/TSX）
- **引号**：单引号（`'`）
- **行宽**：建议 100 字符以内
- **类型**：严格 TypeScript，禁用 `any`（特殊场景除外）

### 组件规范
- 使用函数组件 + Hooks
- Props 使用 TypeScript 接口定义
- 样式使用 Tailwind CSS + `cn()` 工具函数
- 遵循 shadcn/ui 组件设计模式

### 状态管理
- 优先使用 `useAppStore` 访问全局状态
- 局部状态使用 `useState`/`useReducer`
- 异步操作使用 `async/await` + 错误边界

### 文件命名
- 组件：`PascalCase.tsx`（如 `WorkflowCanvas.tsx`）
- 工具函数：`camelCase.ts`（如 `api.ts`）
- 类型定义：`models.ts` 集中管理

## 待办事项 (TODO List)

### 已完成 ✓
- [x] 基础框架搭建（Tauri + React + Vite）
- [x] UI/样式集成（Tailwind + shadcn/ui）
- [x] 路由与基础布局
- [x] 状态管理基建（Zustand）
- [x] 多 Agent 聊天（@提及、AI SDK 集成）
- [x] 工作流画布基础（React Flow）
- [x] 提示词生成器页面
- [x] 流式响应 Bug 修复
- [x] 工作流持久化修复（SQLite）
- [x] 默认会话黑屏问题修复
- [x] 默认数据注入（3 个工作流 + 3 个会话）
- [x] Loop 节点 UI 与执行引擎实现
- [x] Loop 节点数据汇总（`payload.loopResults`）

### 下一步计划
- [ ] 完善自定义节点属性面板
- [ ] 实现 DAG 执行引擎（按顺序传递数据）
- [ ] 狼人杀工作流完整适配（分阶段迁移）
- [ ] 测试用例补充（Loop 节点、工作流执行）
- [ ] 打包配置优化（Tauri build 体积）
- [ ] 文档完善（中英文）

## 调试技巧 (Debugging Tips)

### 查看工作流执行状态
打开控制台，查看 `workflowExecution` 对象：
- `status`：执行状态
- `currentNodeId`：当前执行节点
- `results`：各节点输出结果

### 检查 SQLite 数据
```bash
# 进入项目根目录
sqlite3 simperstudio.db

# 查询表
.tables
SELECT * FROM workflows;
SELECT * FROM chat_sessions;
```

### 模拟 API 调用
当未配置 API Key 时，系统会自动进入模拟模式，查看控制台日志：
```
Simulating API call for [AgentName] because no API key is configured
```

## 常见问题 (FAQ)

### Q1: 如何添加新的 Agent？
A: 进入 "Agents" 页面，点击 "Create Agent"，填写名称、系统提示词、选择模型提供者。

### Q2: 工作流数据不保存？
A: 确保 SQLite 数据库文件可写（`simperstudio.db`），检查控制台是否有错误日志。

### Q3: 如何测试工作流执行？
A: 在工作流画布右上角点击 "Test Run" 按钮，会使用预设参数（如狼人杀的初始状态）执行。

### Q4: Loop 节点如何配置？
A: 双击 Loop 节点配置：
- `itemsPath`：数据源路径（如 `payload.alivePlayers`）
- `itemAlias`：当前项变量名（默认 `item`）
- `indexAlias`：索引变量名（默认 `index`）
- `maxIterations`：最大迭代次数
- `breakCondition`：提前退出条件（可选）
- `aggregationStrategy`：结果聚合方式

## 性能优化建议

1. **React.memo**：对高频更新的组件使用记忆化
2. **useCallback/useMemo**：缓存函数和计算结果
3. **虚拟列表**：长列表使用 `react-window` 或 `virtuoso`
4. **Web Worker**：复杂计算（如代码节点）可移至 Worker
5. **防抖节流**：输入框、拖拽操作使用防抖

## 扩展开发指南

### 添加新的节点类型
1. 在 `src/types/models.ts` 定义节点数据结构
2. 创建组件文件 `src/components/workflow/nodes/MyNode.tsx`
3. 在 `WorkflowCanvas.tsx` 的 `nodeTypes` 中注册
4. 在 `executeWorkflow` 中添加执行逻辑

### 集成新的 AI API
1. 在 `src/lib/api.ts` 中添加 API 调用函数
2. 在 `appStore.ts` 的 `fetchFromModel` 中处理新类型
3. 在设置页面添加 API Key 配置

### 添加数据库表
1. 在 `src-tauri/src/db.rs` 中：
   - 定义结构体
   - 添加 CREATE TABLE 语句
   - 编写 CRUD 命令
2. 在 `main.rs` 中注册命令
3. 在前端添加对应的 Zustand 状态管理

## 版本历史

### v0.1.0 (2026-04-29)
- 初始版本发布
- 基础 UI 框架完成
- 工作流引擎 MVP 实现
- Loop 节点支持
- 狼人杀示例工作流

## AI 快速参考指南 (AI Quick Reference)

### 关键文件路径索引

#### 核心状态管理
- `src/store/appStore.ts` - 全局 Zustand 状态，包含所有工作流逻辑
  - `executeWorkflow()` - 工作流执行引擎（第974-1231行）
  - `saveWorkflow()` - 工作流持久化（第910-956行）
  - `workflowExecution` 状态 - 跟踪执行状态

#### 工作流节点实现
- `src/components/workflow/WorkflowCanvas.tsx` - 画布主逻辑
- `src/components/workflow/nodes/LoopNode.tsx` - 循环节点UI配置
- 节点类型：trigger | agent | output | condition | code | loop

#### 数据库层（Rust）
- `src-tauri/src/db.rs` - 所有数据库操作
  - `get_workflows()` / `add_workflow()` / `update_workflow()` - 工作流CRUD
- `src-tauri/src/lib.rs` - Tauri 命令注册

#### 前端组件
- `src/components/chat/ChatInterface.tsx` - 聊天主界面
- `src/components/agents/AgentsView.tsx` - Agent管理
- `src/components/workflow/nodes/` - 所有节点组件

### 关键数据流

```
用户操作 → React组件 → Zustand状态 → (Tauri invoke) → SQLite
                                    ↓
                              React重新渲染
                                    ↓
                          工作流引擎执行
                                    ↓
                          节点结果更新到状态
```

### 工作流执行流程

1. **触发执行**：`executeWorkflow(workflowId, initialPayload)`
2. **查找触发器**：定位 `type === 'trigger'` 的节点
3. **队列处理**：BFS遍历，使用 `queue: ExecutionFrame[]`
4. **节点执行**：
   - Agent节点：模拟LLM调用，设置 `payload.llmResult`
   - Code节点：`new AsyncFunction()` 执行JS代码
   - Condition节点：表达式求值，选择分支
   - **Loop节点**：遍历数组，注入上下文，收集结果
5. **结果收集**：`results[nodeId] = currentPayload`
6. **状态更新**：`setWorkflowExecutionState()`

### Loop 节点关键字段

```typescript
interface LoopNodeData {
  itemsPath: string;        // 如 "payload.alivePlayers"
  itemAlias: string;        // 默认 "item"
  indexAlias: string;       // 默认 "index"
  maxIterations: number;    // 默认 20
  breakCondition: string;   // 可选中断条件
  aggregationStrategy: 'append' | 'replace';
}
```

### 数据库JSON字段说明

- `workflows.nodes_data` - 节点数组（JSON字符串）
- `workflows.edges_data` - 连线数组（JSON字符串）
- `agents.parameters` - Agent参数（JSON字符串）
- `chat_messages.content` - 消息内容（JSON字符串）

### 常用的Tauri命令

```rust
get_agents, add_agent
get_workspaces, add_workspace
get_chat_sessions, add_chat_session, update_chat_session
get_chat_messages, add_chat_message, update_chat_message
get_workflows, add_workflow, update_workflow, delete_workflow
```

### 性能关键点

- **MAX_WORKFLOW_STEPS = 1000** - 最大执行步数
- **Code节点超时 = 10秒** - 使用 `withTimeout()`
- **表达式超时 = 2秒** - 条件求值超时
- **循环保护** - 检查 `itemsPath` 是否为数组

### 错误处理

- 所有节点执行都有 try-catch
- 错误信息存储在 `payload._error`
- 超时返回特定错误消息
- Console.error 记录到浏览器控制台

---

**文档维护**：本文件由 Claude Code 自动生成，随项目更新。  
**最后更新**：2026-04-29  
**版本**：v0.1.0
