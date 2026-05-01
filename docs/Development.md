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
│   │   │   ├── ChatInterface.tsx         # 主聊天界面（路由会话视图）
│   │   │   ├── AgentTopologyView.tsx    # 单智能体拓扑视图（Agent 节点）
│   │   │   ├── WorkflowChatView.tsx     # 工作流拓扑视图（复用工作流节点样式）
│   │   │   ├── AgentChatWindow.tsx      # Agent 对话窗口
│   │   │   ├── WorkflowAgentWindow.tsx  # 工作流 Agent 对话窗口
│   │   │   ├── ChatTriggerNode.tsx      # 拓扑图 Trigger 节点（只读样式）
│   │   │   ├── ChatAgentNode.tsx        # 拓扑图 Agent 节点（可点击打开对话）
│   │   │   ├── ChatOutputNode.tsx       # 拓扑图 Output 节点（只读样式）
│   │   │   ├── ChatCodeNode.tsx         # 拓扑图 Code 节点（只读样式）
│   │   │   ├── ChatLoopNode.tsx         # 拓扑图 Loop 节点（只读样式）
│   │   │   ├── ChatRouterNode.tsx       # 拓扑图 Router 节点（只读样式）
│   │   │   └── AgentResultCard.tsx      # Agent 结果卡片
│   │   │
│   │   ├── workflow/
│   │   │   ├── WorkflowCanvas.tsx        # 工作流画布主组件
│   │   │   ├── ExecutionTimeline.tsx     # 执行时间线面板
│   │   │   └── nodes/
│   │   │       ├── TriggerNode.tsx       # 触发器节点
│   │   │       ├── AgentNode.tsx         # Agent 节点
│   │   │       ├── OutputNode.tsx        # 输出节点
│   │   │       ├── RouterNode.tsx        # 条件路由节点
│   │   │       ├── CodeNode.tsx          # 代码执行节点
│   │   │       ├── LoopNode.tsx          # 循环迭代节点
│   │   │       ├── HttpRequestNode.tsx   # HTTP 请求节点
│   │   │       ├── SetTransformNode.tsx  # 数据转换节点
│   │   │       ├── IfSwitchNode.tsx      # 多分支路由节点
│   │   │       ├── WaitDelayNode.tsx     # 延时等待节点
│   │   │       ├── MergeNode.tsx         # 合并节点
│   │   │       ├── WebhookTriggerNode.tsx # Webhook 触发器节点
│   │   │       └── SubWorkflowNode.tsx   # 子工作流节点
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
│   ├── Development.md                   # 开发文档
│   ├── PRD.md                           # 产品需求文档
│   ├── Design_Specs.md                  # UI/UX 设计规范
│   └── TODO.md                          # 任务清单与优先级
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
    nodeRecords: Record<string, NodeExecutionRecord>; // 每个节点的执行记录
  };
}
```

#### 核心 Actions
- **fetchInitialData()**：初始化数据（从 SQLite 加载）
- **createSession/updateSession**：会话管理
- **addAgentResponseStream/completeAgentResponse**：流式响应处理
- **executeWorkflow()**：工作流执行引擎（支持 startNodeId 断点续跑）
- **cancelWorkflowExecution()**：取消正在执行的工作流
- **saveWorkflow()**：工作流持久化（含节点数据规范化）

### 2. 工作流执行引擎 (executeWorkflow)

位于 `appStore.ts` 的 `executeWorkflow` 函数，实现了一个基于队列的 DAG 执行引擎：

#### 执行模型
- **队列驱动**：使用 BFS 遍历工作流节点
- **帧隔离**：每个节点执行使用独立的 `ExecutionFrame`
- **上下文传递**：通过 `payload` 对象在节点间传递数据
- **循环保护**：`MAX_WORKFLOW_STEPS = 1000` 防止无限循环

#### 节点类型支持（13 种）

| 分类 | 节点 | 说明 |
|------|------|------|
| **Trigger** | trigger | 工作流入口点 |
| **Trigger** | webhook | HTTP 端点触发 |
| **Data** | code | JS 代码执行，支持异步和超时 |
| **Data** | set | 字段映射、常量注入、白名单过滤 |
| **AI** | agent | LLM 调用，支持结构化输出 |
| **Flow Control** | condition | JS 表达式评估，多分支分发 |
| **Flow Control** | switch | 多条件路由（first match wins） |
| **Flow Control** | loop | 数组遍历，支持 itemsPath/breakCondition |
| **Flow Control** | wait | 固定延时或条件等待 |
| **Flow Control** | merge | 多上游结果合并 |
| **Integration** | http | HTTP 请求（GET/POST/PUT/PATCH/DELETE） |
| **Integration** | subworkflow | 调用其他工作流 |
| **Output** | output | 终止节点，捕获结果 |

#### 节点契约（通用字段）

所有节点支持以下通用配置：
- `timeoutMs`：节点级超时
- `retryPolicy`：重试策略（maxAttempts/backoff/delayMs）
- `onError`：失败策略（stop/continue/route-to-error）
- `inputSchema/outputSchema`：输入输出 Schema 校验

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

### 3.1 拓扑视图与节点组件复用

Chats 区的拓扑视图复用 Workflow 工作流的节点视觉设计，保持全应用 UI 一致性。

#### AgentTopologyView（单智能体会话）
- 文件路径：`src/components/chat/AgentTopologyView.tsx`
- 功能：展示所有智能体为节点，点击打开对话窗口
- 使用 `ChatAgentNode` 组件渲染节点，样式与 Workflow 的 `AgentNode` 完全一致
- 通过 `key={activeSession.id}` 强制切换会话时重新挂载，解决 React Flow `useNodesState` 不更新问题

#### WorkflowChatView（工作流会话）
- 文件路径：`src/components/chat/WorkflowChatView.tsx`
- 功能：展示工作流拓扑图，所有节点使用与 WorkflowCanvas 一致的样式
- 节点类型映射：
  - `trigger` → `ChatTriggerNode`（绿色主题，Play 图标）
  - `agent` → `ChatAgentNode`（主色主题，点击打开对话窗口）
  - `output` → `ChatOutputNode`（灰蓝色主题，FileOutput 图标）
  - `code` → `ChatCodeNode`（蓝色主题，Code2 图标）
  - `loop` → `ChatLoopNode`（紫色主题，Repeat 图标）
  - `router` → `ChatRouterNode`（橙色主题，SplitSquareHorizontal 图标）
- 深色主题适配：`colorMode`、`Background` 点颜色、`Controls` 样式、`MiniMap` 节点和遮罩颜色

#### Chat*Node 组件（只读节点）
- 文件路径：`src/components/chat/Chat*Node.tsx`
- 设计原则：与 `src/components/workflow/nodes/` 下的工作流节点 **视觉完全一致**，但去除编辑功能
- 差异对比：
  | 特性 | Workflow 节点 | Chat 节点 |
  |------|--------------|-----------|
  | 视觉样式 | 相同（边框、圆角、图标、颜色主题） | 相同 |
  | 配置对话框 | 有（Dialog + Settings2 按钮） | 无（只读展示） |
  | 点击行为 | 选中节点编辑 | Agent 节点打开对话窗口，其他节点无交互 |
  | 内部状态 | useState 管理配置 | 无状态（纯展示） |
- Agent 节点特殊处理：`data.onClick` 回调打开 `openAgentChatWindow` / `openWorkflowAgentWindow`

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
- [x] P0：Chat 页重构闭环（single/workflow 双模式、窗口编排、转发链路）
- [x] P1：可组合节点生态（HTTP、Set/Transform、IF/Switch、Merge、Wait、Webhook、Sub-workflow）
- [x] P1：工作流导入导出（JSON 文件/粘贴导入）
- [x] P2：可靠执行语义（schema 校验、重试/超时/失败分支、断点续跑、取消执行）
- [x] P3：执行可观测（NodeExecutionRecord、ExecutionTimeline、错误面板、重跑、导出日志）
- [x] P4：测试基础设施（vitest + @testing-library/react，41 个测试用例）

### 剩余待办
- [ ] 浏览器手动验证（single chat、workflow chat、窗口交互、转发链路）
- [ ] 节点配置交互对齐（统一基础区块：名称、描述、超时、重试、失败策略）
- [ ] P2 运行时语义补完（loop 聚合、职责边界、狼人杀回归）
- [ ] P3 告警钩子（本地通知/Webhook）
- [ ] P3 无障碍/UI 对比度（对比度达标、点击区 44×44px、aria-label、响应式布局）

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

## 测试 (Testing)

项目使用 **vitest** + **@testing-library/react** 进行测试。

### 运行测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch
```

### 测试文件结构

```
src/
├── store/__tests__/
│   ├── appStore.test.ts          # 流式响应 store 测试
│   ├── workflowExecution.test.ts # 工作流执行引擎测试
│   ├── workflowChat.test.ts      # 工作流聊天窗口交互测试
│   └── nodeContracts.test.ts     # 节点契约测试（HTTP/IF/Switch/Merge/Wait/Retry/Timeout）
└── components/chat/__tests__/
    └── ChatMessageBubble.test.tsx # 聊天气泡渲染测试
```

### 测试覆盖范围

- Store 层：addAgentResponseStream、completeAgentResponse
- 执行引擎：线性流程、条件分支、错误传播、断点续跑、执行记录
- 节点契约：IF/Switch 路由、Set/Transform 映射、Wait/Delay 延时、Merge 合并、HTTP 请求、重试策略、超时
- 交互：窗口打开/聚焦/关闭/最小化、forwardAgentReplyToNext 路由
- 渲染：多 agentResponses 过滤显示

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
