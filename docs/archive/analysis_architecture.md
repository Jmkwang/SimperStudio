# SimperStudio 架构评审报告

> **评审日期**：2026-06-10  
> **评审范围**：前端 (React 19 + Vite + TypeScript)、工作流引擎、Tauri Rust 后端、数据持久化层  
> **评审方法**：静态代码分析、架构文档审阅、关键路径推演  

---

## 执行摘要

SimperStudio 是一款定位"小而美"的 AI 工作流与多智能体协作桌面应用，采用 **Tauri v2 + React 19 + Vite** 技术栈，整体架构呈现出**"轻量、清晰、可扩展"**的鲜明特征。项目在以下方面表现优秀：

- **工作流引擎设计**：纯函数式 BFS 执行引擎，与 React/Zustand 完全解耦，节点注册表支持运行时动态扩展
- **安全沙箱**：Code 节点采用 Web Worker 隔离 + 危险 API 禁用；表达式求值使用自研 AST 解释器，彻底规避 `eval`/`new Function`
- **文档与规范**：架构文档 (`Development.md`) 与事实清单 (`reference/*.md`) 分离，维护策略清晰
- **调试系统**：`debugMode` + `DebugOverlay` + `debugLogger` 形成完整的可观测性链路

**总体架构健康度评分：7.2 / 10** —— 核心引擎与扩展机制设计良好，但在**后端异步模型、状态管理粒度、安全存储、测试覆盖**四个方面存在显著的技术债务与架构风险。

**关键发现**：
1. **Rust 后端 SQLite 层全部为同步阻塞调用**，与 Tauri 2.x 的异步事件循环模型不匹配，存在阻塞主线程与 panic 风险
2. **chatSlice 单文件超过 1000 行**，职责过重，已呈现"上帝对象"反模式征兆
3. **API Key 以明文形式存储于 SQLite**，无加密或系统密钥链集成
4. **测试覆盖率极低**（7 个测试文件 vs. ~9000 行核心代码），重构风险高

---

## 1. 整体架构

**评分：7.5 / 10**

### 1.1 分层清晰度

项目采用经典的三层架构，分层边界总体清晰：

```
┌─────────────────────────────────────────┐
│  Presentation (React + Tailwind + shadcn) │
├─────────────────────────────────────────┤
│  State Layer (Zustand 5 Slices)         │
├─────────────────────────────────────────┤
│  Domain Engine (Workflow Engine)          │
├─────────────────────────────────────────┤
│  Tauri Bridge (19 IPC Commands)           │
├─────────────────────────────────────────┤
│  Rust Backend (SQLite + CLI Agent)        │
└─────────────────────────────────────────┘
```

**优点**：
- `engine.ts` 是纯函数，输入 `nodes/edges/payload`，输出执行结果，与 UI 框架零耦合，可独立测试
- `nodeRegistry.ts` 实现类型→执行器的映射，支持 `registerNodeType()` 运行时扩展
- `api.ts` 集中封装 AI SDK 多服务商适配，隐藏 provider 差异

**不足**：
- **缺少 Service/UseCase 中间层**：Zustand slice 直接调用 `engine.executeWorkflow` 和 `fetchFromResolvedConfig`，业务逻辑与状态管理混合
- `App.tsx` 的 `renderContent()` 使用简单 `switch` 路由，随着 viewMode 增加（当前 11 种），可维护性将下降
- `stores/index.ts` 的 slice 组合过于简单，没有提供跨 slice 事务或 saga 机制

### 1.2 职责分离

| 模块 | 职责 | 评价 |
|------|------|------|
| `engine.ts` | DAG 执行、BFS 调度、重试/超时 | ✅ 优秀，纯函数，无副作用 |
| `nodeRegistry.ts` | 节点类型注册、路由分发 | ✅ 良好，开闭原则 |
| `chatSlice.ts` | 会话、消息、流式、转发、浮窗 | ⚠️ 过重，单一文件 1000+ 行 |
| `workflowSlice.ts` | 工作流 CRUD、执行、取消 | ⚠️ 过重，且含大量硬编码示例数据 |
| `db.rs` | SQLite CRUD、JSON 配置 | ⚠️ 同步阻塞，无 Repository 抽象 |
| `api.ts` | AI SDK 适配、streamText 封装 | ✅ 良好，provider 差异收敛 |

### 1.3 模块边界

- **强边界**：`lib/workflow/` 目录自包含（engine + registry + helpers + executors），不依赖 React
- **弱边界**：`stores/` 各 slice 通过 Zustand 的 `get()` 互相访问，形成隐式依赖网。例如 `workflowSlice` 调用 `chatSlice.addAgentResponseStream`，`chatSlice` 调用 `baseSlice.writeConfig`
- **建议**：引入事件总线或显式的跨 slice action 协议，替代直接的函数调用

---

## 2. 技术选型

**评分：7.5 / 10**

### 2.1 技术栈合理性

| 技术 | 版本 | 评价 |
|------|------|------|
| React | 19.1.0 | ⚠️ 非常新，生态兼容风险（部分库可能未适配） |
| Vite | 7.0.4 | ⚠️ 前沿版本，构建插件兼容性待观察 |
| TypeScript | 5.8.3 | ✅ 稳定，严格模式 |
| Tauri | 2.11.0 | ✅ 成熟，v2 API 稳定 |
| Zustand | 5.0.12 | ✅ 轻量，适合桌面应用 |
| @xyflow/react | 12.10.2 | ✅ 工作流画布事实标准 |
| `ai` SDK | 6.0.168 | ✅ Vercel 官方，多 provider 支持完善 |
| Tailwind + shadcn | 3.4.19 | ✅ 组件化、主题化成熟 |
| Rusqlite | 0.31 | ✅ bundled 特性简化部署 |
| tokio | 1.x | ✅ Rust 异步运行时标准 |

### 2.2 版本风险

**React 19 + Vite 7 的组合是最大技术风险点**。React 19 引入了新的 JSX Transform 和并发特性，虽然 `ai` SDK v6 已适配，但第三方库（如 `@xyflow/react`、`react-markdown`、`sonner`）在极端场景下可能存在兼容性问题。建议：
- 锁定 `package-lock.json`，避免自动升级引入 breaking change
- 建立 CI 矩阵，覆盖 `tauri build` 与 `npm run dev` 两种模式

### 2.3 长期维护性

- **正面**：Tauri 替代 Electron 显著减小包体积与安全攻击面；SQLite 单文件便于用户备份/迁移
- **负面**：`ai` SDK v6 迭代极快，API 可能变化；项目对 `ai` SDK 的 `streamText`/`experimental_thinking` 等实验性 API 有深度依赖
- **建议**：在 `api.ts` 中增加适配器层，隔离 `ai` SDK 的直接调用，便于未来版本迁移

---

## 3. 数据流设计

**评分：7.0 / 10**

### 3.1 数据流向

```
User Input → React UI → Zustand Store → Tauri invoke → Rust Command → SQLite/JSON
                                    ↓
                              Workflow Engine (纯 JS)
                                    ↓
                              AI SDK streamText → Provider API
```

### 3.2 状态同步策略

项目采用**"内存优先、异步落库、流式免写"**的策略，设计合理：

- **高频写免库**：流式 chunk 仅更新 Zustand 内存，每 50ms flush 一次，避免每 token 一次 IO
- **终态落库**：流式完成后 `update_chat_message` 写入 SQLite
- **配置双轨**：Tauri 可用时写 `<AppData>/SimperStudio/`，浏览器模式回退 `localStorage`

**问题点**：
- `db.rs` 中所有数据库操作是**同步阻塞**的：`state.conn.lock().unwrap()` 后直接执行 SQL。虽然 Tauri v2 支持 async commands，但当前实现没有利用 tokio 的异步能力，大量并发请求时会阻塞 Tauri 的事件循环
- `writeConfig` 在 `baseSlice` 中封装了 Tauri → localStorage 的回退，但**没有写失败重试或队列机制**，高并发写配置可能丢数据
- `agentCategories` 当前未持久化（文档明确标注），属于功能缺失

### 3.3 序列化与类型安全

- 前后端通过 Tauri IPC 传递数据，使用 serde 序列化，类型安全有保障
- 但 `Workflow.nodes_data` / `edges_data` 在 SQLite 中以**JSON 字符串**存储，丢失了类型信息，且无法做数据库级查询（如"查找包含某类型节点的工作流"）
- `ChatMessage.content` 和 `agent_responses` 也是 JSON 字符串，同样存在查询与索引困难

---

## 4. 扩展性

**评分：8.0 / 10**

### 4.1 新增节点类型

扩展机制设计优秀，是项目的架构亮点之一：

1. `types/models.ts` 添加类型
2. `nodeExecutors/<name>Executor.ts` 实现 `NodeExecutorFn`
3. `nodeRegistry.ts` 调用 `register({ type, execute })`
4. `components/workflow/nodes/<Name>Node.tsx` 实现 UI
5. `WorkflowCanvas.tsx` 绑定 `nodeTypes` + `nodeDefaultDataBuilders`
6. （可选）`workflowSlice.ts` `onNodeResult` 添加聊天回写分支
7. 编写测试

**动态注册**：`registerNodeType()` 支持运行时注册，为插件系统预留了扩展点。

**不足**：
- `WorkflowCanvas.tsx` 的 `nodeTypes` 和 `nodeDefaultDataBuilders` 仍需手动维护，没有自动扫描/注册机制
- 节点 UI 组件与执行器分离，但主题色（配色）在 `nodes.md` 文档中维护，没有集中配置表

### 4.2 新增模型服务商

`api.ts` 的 `fetchFromProvider` 使用 `if-else` 分支判断 provider type，新增服务商需修改此处。虽然 `ai` SDK 的 provider 包（`@ai-sdk/openai`、`@ai-sdk/anthropic` 等）已抽象大部分差异，但 `apiBase()` 的 `/v1` 自动拼接逻辑和 `apiFormat` 分支（`anthropic-messages` / `openai-responses`）仍需要侵入式修改。

**建议**：将 provider 构造逻辑抽象为 `ProviderAdapter` 接口，支持通过配置注册新 provider，而非修改 `api.ts`。

### 4.3 UI 扩展

- shadcn/ui 组件库提供良好的基础，但项目已深度定制（`NodeBaseConfigSection.tsx`、`WorkflowCanvas.tsx` 等）
- `App.tsx` 的 viewMode switch 是扩展新视图的主要瓶颈
- 当前 11 种 viewMode 已使 `App.tsx` 略显臃肿，建议引入路由配置表或懒加载

---

## 5. 耦合度

**评分：6.5 / 10**

### 5.1 模块间依赖关系

**依赖关系图（简化）**：

```
App.tsx
  ├─ stores/index.ts (useAppStore)
  │   ├─ baseSlice ──→ Tauri API / localStorage
  │   ├─ chatSlice ──→ api.ts, agentProviderRouter.ts, messageService.ts
  │   │                ├─ workflowSlice (通过 get())
  │   │                └─ baseSlice (writeConfig)
  │   ├─ modelSlice ──→ baseSlice (writeConfig)
  │   ├─ uiSlice
  │   └─ workflowSlice ──→ engine.ts, chatSlice (通过 get())
  ├─ components/* ──→ stores, lib/*, 互相引用
  └─ lib/workflow/* ──→ types/models (仅类型)
```

### 5.2 循环依赖风险

- **chatSlice ↔ workflowSlice**：`chatSlice` 通过 `get()` 访问 `workflowSlice` 的 `executeWorkflow`（间接，通过 UI 层），`workflowSlice` 的 `onNodeResult` 回调直接调用 `chatSlice.addAgentResponseStream`。虽然 Zustand slice 组合避免了直接的 import 循环，但**运行时逻辑耦合严重**
- **stores → lib → stores**：`baseSlice` 的 `writeConfig` 被 `modelSlice`、`uiSlice` 导入使用，方向合理，但 `writeConfig` 同时被 `chatSlice` 内部使用，形成网状依赖

### 5.3 紧耦合点

| 耦合点 | 严重程度 | 说明 |
|--------|----------|------|
| `chatSlice.ts` 1000+ 行 | 🔴 高 | 会话管理、消息流式、转发逻辑、浮窗 UI 全在一个文件 |
| `workflowSlice.ts` 硬编码示例 | 🟡 中 | 狼人杀、礼物推荐等 6 个示例工作流直接写在 slice 中 |
| `api.ts` provider if-else | 🟡 中 | 新增 provider 必须修改核心文件 |
| `agentProviderRouter.ts` → `api.ts` | 🟢 低 | 单向依赖，合理 |

### 5.4 建议

- 将 `chatSlice.ts` 拆分为：`chatSessionSlice`、`chatMessageSlice`、`chatStreamSlice`、`chatForwardSlice`
- 将 `workflowSlice.ts` 中的示例数据迁移到 `src/lib/workflow/presets.ts` 或 JSON 文件
- 引入**事件总线**（如 `mitt` 或 Zustand 的 subscribe 模式）解耦 `workflowSlice` 与 `chatSlice` 的回调依赖

---

## 6. 安全性

**评分：6.0 / 10**

### 6.1 代码注入防护

**优秀实践**：
- **Code 节点**：Web Worker 隔离执行，禁用 `importScripts`、`fetch`、`XMLHttpRequest`、`WebSocket`、`EventSource`。超时 10s 后强制 `worker.terminate()`
- **表达式求值**：自研 AST 解释器（`tokenizeExpression` + `ExprParser` + `evalNode`），**完全拒绝** `new Function` / `eval` / `with`。这是架构层面的安全亮点
- **CLI Agent**：路径遍历检查 `executable.includes('..')`，阻止跨目录执行

**风险点**：
- **Code 节点 Worker 内仍使用 `AsyncFunction` 构造函数**：`Object.getPrototypeOf(async function(){}).constructor`。虽然 Worker 沙箱已隔离网络与存储，但 `AsyncFunction` 仍可访问全局 `self` 对象。建议进一步限制 Worker 作用域
- **HTTP 节点**：`url` / `headers` / `body` 支持 `{{payload.x}}` 模板替换，若 payload 中包含用户输入的 URL，可能导致 **SSRF（服务器端请求伪造）**。例如：`url: "http://localhost:{{payload.port}}"` 可探测内网服务
- **缺少输入消毒**：`agentExecutor.ts` 的 `rawPrompt` 直接拼接模板后发送给 LLM，没有长度限制或敏感词过滤

### 6.2 数据持久化安全

**严重风险**：
- **API Key 明文存储**：`ModelProvider.apiKey` 以纯文本形式存储在 SQLite 的 `settings.json` 和 `agents` 表中。项目未集成操作系统密钥链（Windows Credential Manager / macOS Keychain / Linux Secret Service）
- **SQLite 文件无加密**：`<AppData>/SimperStudio/simperstudio.db` 是标准 SQLite 文件，任何有文件系统访问权限的程序都可读取全部聊天记录、工作流、API Key
- **config.json 明文**：settings、sidebar_orders 等以 pretty JSON 写入，无加密

**建议**：
- 使用 `keyring` crate（Rust）或 `tauri-plugin-stronghold` 加密存储敏感配置
- 至少对 `apiKey` 字段做 AES-256-GCM 加密，密钥派生自设备唯一标识

### 6.3 API Key 管理

- 当前模型路由在 `resolveAgentModelConfig` 中校验 `provider.apiKey` 非空，但**没有权限隔离**：任何工作流节点都可访问全局 provider 的 API Key
- 建议：为工作流执行引入**最小权限上下文**，节点级覆盖不应能读取其他 provider 的 key

---

## 7. 容错设计

**评分：7.0 / 10**

### 7.1 错误处理

**前端**：
- `shortError()` 将 HTTP/网络错误翻译为中文短提示，用户体验友好
- `ErrorBoundary` + `ErrorFallback` 包裹 `AppShell`，防止全局崩溃
- 流式错误通过 `streamError` 回调写入 `agentResponses[].status = 'error'`

**后端**：
- `db.rs` 中所有命令返回 `Result<T, String>`，错误通过 Tauri IPC 传回前端
- **严重问题**：多处使用 `.unwrap()` 和 `.expect()`，可能 panic 导致整个 Tauri 进程崩溃：
  - `lib.rs:33`：`panic!("Failed to initialize database: {}", e)` —— 数据库初始化失败直接崩溃
  - `db.rs:209`：`let conn = state.conn.lock().unwrap();` —— Mutex  poison 时 panic
  - `db.rs:所有命令`：锁获取失败直接 panic，没有降级策略

### 7.2 降级策略

- **持久化降级**：Tauri 不可用时自动回退 `localStorage`，设计良好
- **模型调用降级**：`resolveAgentModelConfig` **明确拒绝降级**（文档："No fallback — any missing/invalid config throws immediately"）。这在生产环境中过于严格，建议增加"跳过该节点 / 使用默认模型"的优雅降级选项
- **无网络降级**：当前没有离线模式或缓存策略，网络断开时所有 AI 调用直接失败

### 7.3 超时 / 重试机制

| 层级 | 机制 | 评价 |
|------|------|------|
| 节点级 | `timeoutMs` + `retryPolicy`（fixed/exponential backoff） | ✅ 完善 |
| 工作流级 | `MAX_WORKFLOW_STEPS = 1000` | ✅ 死循环保护 |
| 全局级 | `workflowSlice` 包裹 5 分钟超时 | ✅ 合理 |
| 流式级 | `AbortController` + 15s stall 检测 | ✅ 完善 |
| 表达式级 | 2s 超时 | ✅ 合理 |
| Code 节点 | 10s Worker 超时 | ✅ 合理 |
| CLI Agent | `timeout_ms` 参数 | ✅ 合理 |

**缺失**：
- 没有**断路器（Circuit Breaker）**机制：当某 provider 连续失败时，不会自动暂停对该 provider 的调用
- 没有**速率限制（Rate Limiting）**：用户可能因高频调用触发 provider 的 429 限制

---

## 8. 性能架构

**评分：6.5 / 10**

### 8.1 渲染性能

- **流式优化**：`streamChunkBuffer` 每 50ms 批量 flush 到 Zustand，避免每 token 触发全局重渲染。这是关键优化
- **React 19 并发特性**：理论上可提升流式渲染性能，但项目目前未显式使用 `useTransition` / `useDeferredValue`
- **潜在问题**：`ChatMessageBubble.tsx` 437 行，消息列表无虚拟化（`react-window` / `react-virtualized`）。当聊天记录达到数千条时，DOM 节点数量将严重影响性能
- **React Flow 画布**：大工作流（如狼人杀示例含 20+ 节点）在低端设备上可能卡顿，未启用 `onlyRenderVisibleElements` 等优化

### 8.2 工作流执行性能

- **BFS 队列 + structuredClone**：每条边 fork 时 deep clone payload，确保分支隔离。这在复杂 DAG 中可能导致**显著的内存开销**（每次 clone 整个 payload 对象）
- **串行默认**：`concurrency` 默认为 1，用户需手动调高。对于 I/O 密集型节点（HTTP、Agent），默认串行是性能瓶颈
- **Loop 节点**：`maxIterations` 默认 20，但无总执行时间限制。20 次 LLM 调用 × 单次数秒 = 总耗时可能超过全局 5 分钟超时

### 8.3 内存管理

- **Web Worker 泄漏**：`codeExecutor.ts` 的 `activeWorkers` Map 在超时或错误时清理，但正常完成后也立即 `terminate()`，管理良好
- **AbortController 泄漏**：`sessionAbortControllers` Map 在流式完成/取消/错误时清理，但需确认所有异常路径都执行 `clearSessionStream`
- **全局状态引用**：`engine.ts` 通过 `globalState` 参数传入 `workflows` / `agents` / `settings`，BFS 执行中这些大数组常驻内存

### 8.4 建议

- 消息列表引入虚拟化，或按会话分页加载
- 工作流 payload 考虑使用**不可变数据结构**（如 `immer` 的 `produce`）替代 `structuredClone`，减少内存分配
- 对 HTTP / Agent 节点默认启用有限并发（如 `concurrency: 3`）

---

## 9. 可维护性

**评分：7.0 / 10**

### 9.1 架构文档

**优秀**：
- `Development.md` 作为项目主入口，清晰说明"是什么、怎么跑、关键决策"
- `reference/` 目录维护事实清单（节点表、store slice 表、命令表、视图路由表），与叙事文档分离
- 每次合 PR 要求同步 `Features.md`、版本号（三处一致）、CHANGELOG

**不足**：
- 没有**架构决策记录（ADR）**文件，如"为什么选择 Zustand 而非 Redux"、"为什么引擎用 BFS 而非 DFS"等决策缺少上下文
- `TODO_active.md` 与 `CHANGELOG.md` 的维护依赖人工，建议引入自动化（如 GitHub Actions 检查 PR 是否更新文档）

### 9.2 代码组织

| 目录 | 评价 |
|------|------|
| `src/components/layout/` | ✅ 布局组件集中 |
| `src/components/chat/` | ⚠️ 23 个组件，部分可进一步分组（如 `WorkflowChat*` vs `SimpleChat*`） |
| `src/components/workflow/` | ✅ 画布 + 节点编辑器 + 时间线，职责清晰 |
| `src/lib/workflow/` | ✅ 引擎自包含， executors 子目录清晰 |
| `src/stores/` | ⚠️ slice 文件过大，需拆分 |
| `src/types/models.ts` | ✅ 单一事实源，类型集中 |

### 9.3 重构友好度

- **正面**：TypeScript 严格模式 + 类型集中，重构时有编译器保护
- **负面**：
  - `any` 在 Zustand slice 的 `set/get` 入口被允许（文档说明），但已蔓延到部分业务逻辑
  - `node.data as any` 在多个 executor 中出现，破坏了类型安全
  - 测试覆盖极低（7 个测试文件），大规模重构缺乏安全网

### 9.4 测试覆盖

当前测试文件仅 7 个：
- `ChatMessageBubble.test.tsx`
- `dynamicAgentExecutor.test.ts`
- `appStore.test.ts`
- `nodeContracts.test.ts`
- `workflowChat.test.ts`
- `workflowExecution.test.ts`
- `workflowSave.test.ts`

**缺口**：
- `engine.ts` 核心执行逻辑无直接单元测试
- `api.ts` 无 provider mock 测试
- `agentProviderRouter.ts` 无三级解析链测试
- `db.rs` / `cli_agent.rs` 无任何 Rust 端测试
- 没有 E2E / 集成测试（如 Playwright 测试工作流画布交互）

---

## 10. 前后端分离

**评分：6.0 / 10**

### 10.1 Tauri 桥接设计

- **命令粒度**：19 个 Tauri 命令，粒度适中（CRUD 各 4 个领域：agents / workspaces / chat_sessions / chat_messages / workflows + config 读写 + CLI spawn/kill）
- **状态管理**：`DbState` 使用 `Mutex<Connection>` 共享连接，`CliProcessRegistry` 使用 `Mutex<HashMap>` 管理 PID。设计简洁

### 10.2 异步模型不匹配（核心问题）

**这是架构层面最严重的设计缺陷**：

Tauri 2.x 的 `invoke_handler` 支持 `async fn` 命令，且基于 tokio 运行时。但 `db.rs` 中**所有数据库命令都是同步阻塞**的：

```rust
#[tauri::command]
pub fn get_agents(state: tauri::State<DbState>) -> Result<Vec<Agent>, String> {
    let conn = state.conn.lock().unwrap();  // 阻塞等待锁
    let mut stmt = conn.prepare("...").map_err(|e| e.to_string())?;
    // ... 同步执行 SQL
}
```

虽然 Tauri 会将同步命令放到线程池执行，但：
1. `Mutex` 锁竞争时，所有 DB 命令串行化，高并发场景成为瓶颈
2. `.unwrap()` 在锁 poison 时直接 panic，导致整个应用崩溃
3. 没有连接池（如 `r2d2`），单连接成为瓶颈
4. 大量数据（如加载含 1000 条消息的历史会话）会阻塞较长时间

**建议**：
- 使用 `rusqlite` 的 `bundled` + `unlock_notify` 特性，或迁移到 `sqlx`（真正的 async SQLite）
- 或至少引入 `r2d2_sqlite` 连接池，将 `Mutex<Connection>` 替换为 `Pool<SqliteConnectionManager>`
- 将 `db.rs` 的命令改为 `async fn`，利用 tokio 的非阻塞调度

### 10.3 数据序列化

- 使用 `serde` + `serde_json`，标准且可靠
- `rename_all = "camelCase"` 统一处理命名风格，前后端一致
- **问题**：`Workflow.nodes_data` / `edges_data` 以 JSON 字符串存储，每次读写需 `JSON.parse` / `JSON.stringify`，且无法利用数据库的 JSON 索引（SQLite 3.38+ 支持 JSON 函数，但当前 schema 未使用）

### 10.4 CLI Agent 设计

`cli_agent.rs` 是后端设计的亮点：
- 使用 `tokio::process::Command` 异步 spawn，不阻塞主线程
- 通过 Tauri Event (`Emitter`) 流式输出 stdout/stderr 到前端
- `CliProcessRegistry` 管理 PID，支持 `kill_cli_agent`
- Windows 下使用 `CREATE_NO_WINDOW` 防止控制台闪烁
- 应用退出时 (`RunEvent::Exit`) 自动 `kill_all_processes`

---

## 架构风险清单

### P0 — 必须立即处理

| 编号 | 风险 | 影响 | 缓解措施 |
|------|------|------|----------|
| P0-1 | **Rust 后端 SQLite 同步阻塞 + unwrap panic** | 高并发时 Tauri 主线程阻塞；锁 poison 导致应用崩溃 | 引入 `r2d2` 连接池；将命令改为 `async fn`；移除所有 `.unwrap()` |
| P0-2 | **API Key 明文存储** | 用户密钥泄露；不符合安全合规要求 | 使用系统密钥链或 `tauri-plugin-stronghold` 加密存储 |
| P0-3 | **chatSlice 单文件 1000+ 行（上帝对象）** | 维护困难；变更冲突率高；测试难以编写 | 拆分为 4-5 个独立 slice（session / message / stream / forward / ui） |

### P1 — 短期规划（1-2 个迭代）

| 编号 | 风险 | 影响 | 缓解措施 |
|------|------|------|----------|
| P1-1 | **测试覆盖率极低**（7 文件 vs. ~9000 行核心代码） | 重构风险高；回归缺陷难以发现 | 为核心引擎、provider 路由、Rust DB 层补充单元测试；引入 Playwright E2E |
| P1-2 | **workflowSlice 硬编码 6 个示例工作流** | 核心代码被示例数据污染；包体积增加 | 迁移示例到 `src/lib/workflow/presets/` 或单独 JSON 文件；运行时加载 |
| P1-3 | **HTTP 节点 SSRF 风险** | 内网探测、未授权访问外部服务 | 增加 URL 白名单 / 黑名单校验；禁止 `localhost`/`127.0.0.1` / 内网 IP |
| P1-4 | **React 19 + Vite 7 生态兼容性** | 第三方库不兼容；构建失败 | 锁定依赖版本；建立 CI 矩阵；关注 `@xyflow/react` 兼容性 |
| P1-5 | **消息列表无虚拟化** | 长会话渲染卡顿；内存占用高 | 引入 `react-window` 或按分页加载历史消息 |
| P1-6 | **没有断路器 / 速率限制** | provider 429 频繁触发；用户体验差 | 为每个 provider 增加失败计数器；连续失败 3 次后暂停 60s |

### P2 — 中期优化（3-6 个月）

| 编号 | 风险 | 影响 | 缓解措施 |
|------|------|------|----------|
| P2-1 | **工作流执行状态无持久化** | 应用崩溃/关闭后，长时工作流丢失执行进度 | 增加 `workflow_executions` 表，持久化 `nodeRecords` / `queue` / `results` |
| P2-2 | **Code 节点 Worker 内仍可用 AsyncFunction** | 沙箱逃逸风险（虽低） | 使用 `QuickJS` 或 `WebAssembly` 沙箱替代原生 Worker |
| P2-3 | **structuredClone 高频内存分配** | 大 payload 工作流执行慢、GC 压力大 | 使用 `immer` 不可变更新，或实现增量 copy-on-write |
| P2-4 | **缺少 ADR 与自动化文档检查** | 架构决策上下文丢失；新人上手成本高 | 建立 `docs/adr/` 目录；CI 检查 PR 是否更新相关文档 |
| P2-5 | **agentCategories 未持久化** | 用户自定义分类在重启后丢失 | 补充 SQLite 表或 JSON 配置持久化 |
| P2-6 | **没有离线模式 / 本地模型缓存** | 网络不稳定时完全不可用 | 引入本地模型（Ollama）自动回退；缓存最近使用的响应 |

---

## 架构改进建议

### 建议 1：重构后端异步模型（优先级：最高）

**目标**：消除 SQLite 同步阻塞，提升并发能力与稳定性。

**方案 A（推荐）**：迁移到 `sqlx`（async SQLite）
- 将 `db.rs` 改为 `async fn` 命令
- 使用 `sqlx::sqlite::SqlitePool` 替代 `Mutex<Connection>`
- 前端 Tauri invoke 无需改动（Tauri 自动处理 async command）

**方案 B（保守）**：引入 `r2d2_sqlite` 连接池
- 保持 `rusqlite`，但使用连接池管理多连接
- 将 `.unwrap()` 全部替换为 `?` 或 `match` 错误处理

### 建议 2：拆分巨型 Slice（优先级：高）

将 `chatSlice.ts`（1000+ 行）拆分为：
- `chatSessionSlice.ts`：会话 CRUD、当前会话切换
- `chatMessageSlice.ts`：消息添加、更新、删除
- `chatStreamSlice.ts`：流式响应、AbortController 管理、chunk buffer
- `chatForwardSlice.ts`：消息转发、重跑、autoSendToNext 逻辑
- `chatUISlice.ts`：浮窗、workflowChatUI、拓扑/聊天布局切换

同理，`workflowSlice.ts` 拆分为：
- `workflowDataSlice.ts`：工作流 CRUD
- `workflowExecutionSlice.ts`：执行状态、取消、时间线
- `workflowPresetSlice.ts`：示例工作流（从核心代码移除）

### 建议 3：引入 Provider 适配器模式（优先级：中）

当前 `api.ts` 的 `if-else` 分支：

```typescript
// 当前（紧耦合）
if (provider.type === 'openai' || ...) { ... }
else if (provider.type === 'anthropic') { ... }
```

改进为适配器注册表：

```typescript
// 改进（开闭原则）
interface ProviderAdapter {
  createModel(provider: ModelProvider, modelId: string): LanguageModel;
}
const providerAdapters = new Map<string, ProviderAdapter>();
providerAdapters.set('openai', new OpenAIAdapter());
// 新增 provider 无需修改 api.ts
```

### 建议 4：增加 API Key 安全存储（优先级：高）

**短期**：使用 `tauri-plugin-stronghold` 或前端 `crypto.subtle` AES-GCM 加密 `apiKey`，密钥派生自 `navigator.userAgent + 设备名`（弱安全但优于明文）。

**长期**：
- Windows：`windows::Win32::Security::Credentials::CredWriteW`
- macOS：`security` CLI 或 `Keychain Services`
- Linux：`libsecret` / `secret-service`
- 封装为 Tauri command：`store_secret(key, value)` / `read_secret(key)`

### 建议 5：工作流执行持久化（优先级：中）

新增 `workflow_executions` 表：

```sql
CREATE TABLE workflow_executions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    node_records TEXT,        -- JSON: { nodeId: { status, startTime, endTime, ... } }
    results TEXT,           -- JSON: { nodeId: payload }
    queue TEXT,             -- JSON: 待执行帧队列
    error_node_id TEXT,
    error_message TEXT
);
```

支持：
- 应用崩溃后恢复执行（`startNodeId` 从上次断点继续）
- 历史执行记录查询
- 执行审计与调试

### 建议 6：建立测试金字塔（优先级：高）

| 层级 | 目标 | 工具 |
|------|------|------|
| 单元测试 | engine.ts 各执行路径、provider 路由、AST 解释器 | vitest |
| 集成测试 | Tauri command 端到端（内存 SQLite） | vitest + `@tauri-apps/api` mock |
| 组件测试 | 节点编辑器渲染、画布交互 | `@testing-library/react` |
| E2E 测试 | 完整工作流创建→执行→验证 | Playwright |
| Rust 测试 | db.rs CRUD、cli_agent.rs spawn/kill | `cargo test` |

**短期目标**：核心引擎测试覆盖率达到 80%；新增 Playwright 测试覆盖"创建狼人杀工作流并执行一次完整对局"。

### 建议 7：引入消息列表虚拟化（优先级：中）

对于 `SimpleChatView` / `WorkflowChatView` 的消息列表：
- 使用 `react-window` 或 `@tanstack/react-virtual`
- 按时间分页加载历史消息（每次 50 条）
- 流式消息始终渲染在可视区域底部

### 建议 8：架构决策记录（ADR）

在 `docs/adr/` 目录下建立以下 ADR：
- `ADR-001-why-zustand-not-redux.md`
- `ADR-002-workflow-engine-bfs-vs-dfs.md`
- `ADR-003-sync-sqlite-vs-async.md`（记录当前决策与已知风险）
- `ADR-004-web-worker-vs-quickjs-for-code-node.md`
- `ADR-005-persistence-sqlite-vs-json.md`

---

## 结论

SimperStudio 的架构在**工作流引擎设计、安全沙箱、扩展机制、文档规范**四个方面达到了优秀水平，体现了团队对"小而美"产品定位的深刻理解。`engine.ts` 的纯函数设计、`nodeRegistry.ts` 的动态注册机制、以及 AST 解释器替代 `eval` 的安全决策，都是值得肯定的架构亮点。

然而，项目在**后端异步模型、状态管理粒度、安全存储、测试覆盖**四个维度存在显著的技术债务。其中 **Rust 后端 SQLite 同步阻塞**与 **API Key 明文存储**是 P0 级风险，建议在下个迭代优先处理。**chatSlice 的拆分**和**测试覆盖的提升**是保障长期可维护性的关键投资。

总体而言，SimperStudio 的架构基础扎实，核心抽象（引擎、注册表、路由）设计良好。通过针对性的重构（后端异步化、slice 拆分、安全加固、测试补齐），项目完全有能力支撑从 MVP 到生产级产品的演进。

---

*报告生成时间：2026-06-10*  
*评审文件版本：package.json v0.5.4 / tauri.conf.json v0.5.4 / Cargo.toml v0.5.4*
