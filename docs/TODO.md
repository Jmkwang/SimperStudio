# SimperStudio TODO

## 1. 已完成基线

- [x] Tauri + React + Vite + TypeScript 基础框架。
- [x] Tailwind CSS + shadcn/ui 基础样式与深色模式。
- [x] Global Sidebar + Context Sidebar + 主内容区三栏布局。
- [x] Zustand `appStore.ts` 基础状态：Workspaces、Sessions、Messages、Agents、Workflows。
- [x] 多 Agent 聊天基础：`@agent` 提及、多智能体并发回复、真实 API 流式响应。
- [x] 修复流式响应重复累加问题。
- [x] React Flow 工作流画布基础。
- [x] 工作流节点与执行器基础：trigger、agent、condition、code、loop、output。
- [x] 工作流持久化：本地 SQLite/Tauri 配置读写基础能力。
- [x] 工作流 loop 基础语义：`itemsPath`、`itemAlias`、`indexAlias`、`maxIterations`、`breakCondition`。
- [x] 工作流执行结果面板与 Next Round loop 入口。
- [x] Prompt Generator 基础页面与 AI 生成/打磨提示词能力。

## 2. P0（最高优先级）：Chat 页重构闭环

### 2.1 目标

把 chat 页拆成两种明确会话模式：

- **单个智能体对话**：保持普通群聊式消息流，支持 `@agent`、附件、复制等基础体验。
- **工作流对话**：按 workflow 节点组织多智能体会话，支持节点窗口、手动/自动转发、reload 后转发。

### 2.2 类型与状态模型

- [x] `src/types/models.ts`
  - [x] `ChatSession` 增加 `mode?: 'single' | 'workflow'`；旧数据按 `workflowId` 兼容推断。
  - [x] `ChatMessage` 增加 `meta`：`workflowId`、`workflowNodeId`、`sourceAgentId`、`targetAgentId`、`forwardFromMessageId`、`triggeredBy`。
  - [x] `AgentResponse` 增加可选 `nodeId`。
  - [x] 新增 `WorkflowConversationWindow` 类型：`id/sessionId/workflowId/nodeId/agentId/position/zIndex/minimized`。
  - [x] workflow agent node `data` 增加 `autoSendToNext?: boolean` 约定。
- [x] `src/store/appStore.ts`
  - [x] `createSession`、`openWorkflowSession` 写入 `mode`。
  - [x] 读取旧 session 后补齐默认 `mode`。
  - [x] 新增 `workflowChatUI`：`sidebarCollapsedBySession`、`windows`、`activeWindowId`、`zIndexCounter`。
  - [x] 新增窗口动作：`openWorkflowAgentWindow`、`focusWorkflowAgentWindow`、`closeWorkflowAgentWindow`、`setWorkflowSidebarCollapsed`。
  - [x] 新增编排动作：`sendToWorkflowAgent`、`forwardAgentReplyToNext`、`rerunAgentReply`、`rerunAndForwardAgentReply`。
  - [x] 抽出并复用现有 agent 模型请求逻辑，避免 `ChatInterface` 和 workflow chat 各写一套请求代码。

### 2.3 新建会话弹窗

- [x] `src/components/layout/ContextSidebar.tsx`
  - [x] 将当前 workflow picker 浮层替换为 shadcn `Dialog`。
  - [x] 弹窗顶部左右两项：左侧"单个智能体对话"，右侧"工作流对话"。
  - [x] 单智能体入口：选择 agent 后创建 `mode: 'single'` session，并设置 `activeAgentId`。
  - [x] 工作流入口：选择 workflow 后创建/打开 `mode: 'workflow'` session。
  - [x] chat 列表展示 session 时区分 single/workflow，可用 workflow 名称或小徽标标识。

### 2.4 ChatInterface 拆分

- [x] `src/components/chat/ChatInterface.tsx`
  - [x] 入口按 active session `mode` 分流：single 渲染普通聊天，workflow 渲染 `WorkflowChatView`。
  - [x] 保留普通聊天的输入框、mention、附件、群聊式消息流。
  - [x] 抽出通用消息气泡 `ChatMessageBubble`。
  - [x] 抽出 hover 操作组件 `MessageHoverActions`。
- [x] `src/components/chat/MessageHoverActions.tsx`
  - [x] 用户气泡 hover 支持复制。
  - [x] 智能体回复气泡 hover 支持复制、再发送一次、reload、发送给下一位、reload 后发送给下一位。

### 2.5 工作流对话视图

- [x] `src/components/chat/WorkflowChatView.tsx`
  - [x] 读取 active session 对应 workflow。
  - [x] 主区域展示 workflow agent 节点列表或简化流程视图。
  - [x] 点击 agent 节点打开对应浮动会话窗。
  - [x] 渲染多个 `WorkflowAgentWindow`，支持窗口重叠与 z-index 聚焦。
- [x] `src/components/chat/WorkflowAgentWindow.tsx`
  - [x] 显示当前 workflow node 对应 agent 的会话消息。
  - [x] 支持向当前 agent 发送消息。
  - [x] 支持回复 hover 操作：复制、再发送、reload、转发给下一位。
  - [x] 若当前 node `data.autoSendToNext === true`，回复完成后自动调用 `forwardAgentReplyToNext`。
- [x] `forwardAgentReplyToNext`
  - [x] 通过 `workflow.edges_data` 从当前 node 找后继 agent node。
  - [x] V1 支持线性/显式 agent 后继；condition/loop 复杂路由仍交给现有 `executeWorkflow`。

### 2.6 工作流侧栏与菜单

- [x] `src/components/layout/AppShell.tsx`
  - [x] 当前 active session 为 workflow 时，二级栏默认收起为窄按钮。
  - [x] 普通 single chat 保持现有侧栏行为。
- [x] `src/components/layout/ContextSidebar.tsx`
  - [x] workflow chat 展开时，二级展示 workflow 名称/节点概览。
  - [x] 三级展示 agent 节点列表。
  - [x] 点击三级 agent 节点打开对应 `WorkflowAgentWindow`。

### 2.7 工作流设计端自动发送配置

- [x] `src/components/workflow/nodes/AgentNode.tsx`
  - [x] 在 agent node 编辑弹窗中增加 `autoSendToNext` 开关。
- [x] `src/store/appStore.ts`
  - [x] `saveWorkflow` 清洗节点 data 时保留 `autoSendToNext`。

### 2.8 验收

- [x] 类型检查或构建通过：优先 `npm run check`；若项目无 check，运行 `npm run build`。
- [x] P0 UI 对齐 `docs/Design_Specs.md`：按钮/输入可见 focus、disabled 状态清晰、最小点击区 44×44px。
- [x] P0 无障碍基线：图标按钮补齐 `aria-label`，主要交互链路支持键盘 Tab 导航。
- [ ] 启动 `npm run dev`，浏览器验证普通 single chat：新建、发送、`@agent`、附件、复制。
- [ ] 浏览器验证 workflow chat：新建、二级栏收起/展开、workflow/agent 节点点击。
- [ ] 打开多个 agent 窗口，验证重叠、聚焦、关闭/最小化。
- [ ] 验证手动转发、自动转发、再发送一次、reload 后转发。
- [ ] 切回普通 session，确认 workflow UI 状态不污染普通聊天。

## 综合审计 P0 风险（2026-05-26）

> 由工程部（6 个角色）+ 设计部（6 个角色）综合审计产出。以下问题阻塞生产发布，需在现有 P0 完成后优先排期。

### 安全类（阻塞发布）

- [ ] **沙箱化表达式求值**：`helpers.ts:31-39` `evaluateExpression` 使用 `new AsyncFunction + with(payload)` 执行任意用户输入，存在代码注入风险。替换为 `jexl` / `jsonata` 等安全表达式解析器，或引入 AST 解释器。
- [ ] **隔离 Code 节点执行环境**：`codeExecutor.ts:4-13` Code 节点直接 `new AsyncFunction` 执行用户 JavaScript，10 秒超时无法阻止同步恶意操作。使用 Web Worker 隔离或改用受限 DSL。
- [ ] **修复 withTimeout 竞态条件**：`helpers.ts:3-9` `timeoutId` 可能未赋值就被 `clearTimeout` 调用。将类型改为 `NodeJS.Timeout | undefined`，`finally` 中判空再清除。

### API / 模型路由类（阻塞发布）

- [ ] **修复 streamText 参数传递**：`api.ts:103` `streamText()` 未传入 `maxTokens` 和 `temperature`，用户设置被忽略，可能导致高额账单。
- [ ] **修复 provider 默认值矛盾**：`agentProviderRouter.ts:30` + `modelSlice.ts:93` 默认 `activeProviderId` 指向禁用的 provider，首次调用必失败。统一 fallback 逻辑与默认值。
- [ ] **移除 apiKey fallback 不一致**：`api.ts:80` `apiKey || 'sk-custom'` 与 `resolveAgentModelConfig` 校验逻辑矛盾，产生无意义请求。

### 数据持久化类（阻塞发布）

- [ ] **修复 Agent 双写不一致**：`baseSlice.ts:213-246` `updateAgent` / `batchUpdateAgents` 只写 JSON 不写 SQLite，重启后数据回滚。以 SQLite 为唯一持久化层，补全 Rust `update_agent` / `delete_agent`。
- [ ] **使用 Tauri app data 目录**：`db.rs:41` 相对路径 `simperstudio.db` 导致启动目录变化时数据丢失。替换为 `tauri::api::path::app_data_dir()`。
- [ ] **添加数据库索引**：`db.rs` 所有表零索引，`chat_messages` 按 `session_id` 查询将全表扫描。添加 `idx_chat_messages_session`、`idx_workflows_workspace` 等高频索引。
- [ ] **修复内存与 DB 不一致**：`chatSlice.ts:277-286` 先改内存再写库，写库失败时内存有数据而数据库无记录。调整为"写库成功后再改内存"或引入乐观更新回滚。

### 类型与架构类（阻塞发布）

- [ ] **修复 WorkflowNodeData 类型失控**：`types/models.ts:126` `Record<string, unknown>` 完全丧失类型安全。改用 Discriminated Union：`type WorkflowNodeData = ({type:'agent'} & AgentData) | ...`
- [ ] **补齐子工作流实现**：`subWorkflowExecutor.ts` 仅返回 `payload`，无实际递归执行逻辑。调用 `executeWorkflow` 实现递归执行。

### 验证与合规类（阻塞发布）

- [ ] **完成浏览器验证清单**：`TODO 9.1/9.2` 6+ 项 P0 浏览器验证全部未完成（single chat 完整链路、workflow chat、窗口交互、转发链路、状态隔离）。冻结新功能，集中完成验证。
- [ ] **添加 LICENSE 文件**：根目录无 LICENSE，存在法律风险并阻碍贡献者。推荐 MIT 或 Apache-2.0。
- [ ] **添加 React Error Boundary**：`App.tsx` 未包裹 Error Boundary，任何组件未捕获错误导致整页白屏，辅助技术完全失效。添加全局 + 局部 Error Boundary，含友好错误页、重试按钮、`role="alert"`。
- [ ] **搭建最小化设计系统文档**：无 Storybook 或组件用法说明，设计债务快速累积。为 shadcn/ui 封装组件编写用法文档和变体示例。

### 设计合规类（阻塞发布）

- [ ] **支持 prefers-reduced-motion**：所有动效（流式打字、节点动画、页面切换）未检测 `prefers-reduced-motion`。添加 `@media (prefers-reduced-motion: reduce)` 回退，禁用连续动效。

## 3. P1：可组合节点生态（对标 n8n 的节点可拼装能力）

### 3.B Dynamic Agent 节点（设计完成，待实现）

> 详细设计见 `docs/plan-dynamic-agent.md`

**目标**：支持"Agent 设定 Agent"——一个组长 Agent 动态给其他空白 Agent 分配角色/性格/任务。

**核心场景**：狼人杀工作流升级——主持人 Agent 动态生成角色分配，Loop + Dynamic Agent 实现依次发言、独立性格。

#### Phase 1：核心引擎
- [x] `src/types/models.ts` — 新增 `DynamicAgentConfig`、`WorkflowDynamicAgentNodeData`，扩展 `WorkflowNodeType`
- [x] `src/lib/workflow/helpers.ts` — 新增 `replaceTemplateVars()` 模板替换函数
- [x] `src/lib/workflow/nodeExecutors/dynamicAgentExecutor.ts` — 创建执行器（payload/inline 双模式、三级模型回退、schema JSON 解析、_loopResults 收集）
- [x] `src/lib/workflow/nodeRegistry.ts` — 注册 `dynamic-agent` 执行器
- [x] 单元测试：payload 模式、inline 模式、模型回退链、Loop 串行集成

#### Phase 2：节点编辑器 UI
- [x] `src/components/workflow/nodes/DynamicAgentNode.tsx` — 节点编辑器（配置来源切换、模板输入、fallback 选择）
- [x] `src/components/workflow/WorkflowCanvas.tsx` — 注册 nodeTypes、节点面板添加分类
- [x] 节点样式设计（紫色主题、`Sparkles` 图标）

#### Phase 3：聊天视图集成
- [x] `WorkflowAgentWindow` — 支持从 `_dynamicAgentMeta` 读取动态名称/头像
- [x] `ChatMessageBubble` — 支持显示动态 Agent 信息
- [x] `WorkflowChatView` — Dynamic Agent 节点点击打开对话窗口

#### Phase 4：狼人杀示例升级
- [x] 重新设计狼人杀工作流 JSON（主持人生成角色 + Loop + Dynamic Agent）
- [ ] 回归测试：角色随机分配、串行发言、性格差异、游戏逻辑（需浏览器手动验证）

---

### 3.A 工作流导入导出

- [x] `src/components/workflow/WorkflowCanvas.tsx`
  - [x] 工具栏新增"导出 JSON"按钮，将当前画布的 `nodes_data` + `edges_data` 序列化为标准 JSON 并下载为 `.json` 文件。
  - [x] 工具栏新增"导入 JSON"按钮，支持两种导入方式：
    - [x] **文件导入**：打开文件选择器，选择本地 `.json` 文件读取并导入。
    - [x] **粘贴导入**：下拉菜单入口，弹出文本输入框，粘贴 JSON 代码。
  - [x] 粘贴框支持粘贴 JSON 代码，解析后校验结构（节点 id/type/position/data 完整性、edge 的 source/target 存在性）。
  - [x] 校验通过后清空当前画布并渲染导入的工作流；校验失败时展示具体错误信息。
- [ ] 验收（浏览器手动验证）

### 3.0 里程碑拆分

- **v0.2（先可用）**：交付 HTTP Request、Set/Transform、IF/Switch、Wait/Delay + 基础节点契约（timeout/retry/onError）与最小测试。
- **v0.3（再增强）**：交付 Merge、Webhook Trigger、Sub-workflow + 节点面板分类搜索 + 节点契约完善（schema）。

### 3.1 v0.2 交付范围（先可用）

- [x] HTTP Request 节点（GET/POST/PUT/PATCH/DELETE、headers/query/body、超时、重试配置）。
- [x] Set / Transform 节点（字段映射、重命名、白名单输出、常量注入）。
- [x] IF / Switch 节点（布尔条件、多分支值路由）。
- [x] Wait / Delay 节点（固定延时、到指定时间继续）。
- [x] `src/types/models.ts` 增加通用 `node.data` 基础契约：`timeoutMs/retryPolicy/onError`。
- [x] 为 v0.2 新节点补最小契约测试（输入输出与错误路径）。

### 3.2 v0.3 交付范围（再增强）

- [x] Merge 节点（按顺序合并、按 key 合并、等待多上游）。
- [x] Webhook Trigger 节点（本地端点、方法、鉴权、payload 注入）。
- [x] Sub-workflow 节点（调用其他 workflow，支持参数传入与输出回传）。
- [x] `src/types/models.ts` 扩展节点契约：`inputSchema/outputSchema`。
- [x] 节点面板支持按分类（Trigger/Flow/Data/AI/Integration）筛选与搜索。
- [ ] `src/components/workflow/nodes/*` 对齐配置交互：统一基础区块（名称、描述、超时、重试、失败策略）。
- [x] `src/store/appStore.ts` 的 `saveWorkflow` 增加节点数据规范化，防止脏数据写入。


## 4. P2：可靠执行语义（可预测、可恢复、可控失败）

### 4.1 执行语义标准化

- [x] 明确节点输入输出边界：每节点执行前做 schema 校验，失败写入结构化错误。
- [x] 统一失败策略：`stop-workflow` / `continue` / `route-to-error-branch`。
- [x] 统一重试策略：`maxAttempts`、`backoff`（fixed/exponential）、可重试错误类型。
- [x] 统一超时策略：节点级超时覆盖全局默认超时。

### 4.2 运行时稳定性

- [x] 执行队列支持并发上限（默认串行，可配置并发 N）。
- [x] 增加幂等键（executionId + nodeId + attempt）避免重复提交外部副作用。
- [x] 增加断点续跑（从失败节点/指定节点继续）。
- [x] 增加取消执行（用户手动 stop）与清理逻辑（中断后状态一致）。

### 4.3 现有能力补完

- [ ] 对齐 loop 聚合与 `payload.llmResult` 关系，避免覆盖。
- [ ] 明确 `forwardAgentReplyToNext` 与 `executeWorkflow` 的职责边界（聊天转发 vs 正式运行时）。
- [ ] 狼人杀样例回归：屠边、狼刀优先、女巫药剂、猎人开枪、平票 PK、`breakCondition`、`maxIterations`。

## 5. P3：可观测与运维能力（可定位、可重放、可发布）

### 5.1 执行可观测

- [x] 建立执行记录模型：`NodeExecutionRecord`、`WorkflowExecutionRecord`（状态、开始/结束时间、耗时、错误）。
- [x] 节点级输入/输出快照。
- [x] 执行时间线 UI：按节点展示 running/success/error，支持展开详情。
- [x] 错误面板：聚合最近失败执行，支持一键跳转到节点重跑。

### 5.2 运维操作

- [x] 支持重跑：整次重跑（Test Run）、从失败节点重跑（时间线按钮）、单节点重跑。
- [x] 支持导出执行日志（JSON）用于问题复盘。
- [ ] 支持基础告警钩子（本地通知/后续扩展 Webhook）。

### 5.4 验收（可观测 UI 对齐）

- [x] 执行时间线 UI 与 `docs/Design_Specs.md` 对齐：节点状态 `running/success/error/skipped/retrying` 视觉可区分。
- [x] 错误态信息包含可恢复动作（如重试/从失败节点重跑），避免"只有报错无下一步"。
- [x] `running/retrying` 动效支持 `prefers-reduced-motion`，在降动效模式下关闭脉冲，仅保留必要淡入淡出。
- [ ] 执行详情（输入/输出快照、错误信息）在浅色/深色模式下对比度达标（正文≥4.5:1，大号文本≥3:1）。
- [ ] 执行日志列表与详情面板交互控件满足最小点击区 44×44px。
- [ ] 时间线与错误面板中的图标按钮补齐 `aria-label`，关键操作可通过键盘 Tab 到达并触发。
- [ ] 中小屏（<1024px）下执行面板布局不遮挡核心操作；侧栏/详情抽屉开合行为符合响应式规则。

## 6. P4：多服务商模型管理

### 6.1 目标

将原来的单 API Provider 设置改为支持多服务商、每服务商多模型的配置系统。

### 6.2 数据模型更新

- [x] `src/types/models.ts`
  - [x] 新增 `ProviderModel` 类型：`id`, `name`, `modelId`, `isDefault`
  - [x] 新增 `ModelProvider` 类型：`id`, `name`, `type`, `apiKey`, `baseUrl`, `isEnabled`, `customHeader`, `models: ProviderModel[]`
  - [x] `Settings` 更新：`providers: ModelProvider[]`, `activeProviderId: string | null`
  - [x] 保留旧字段向后兼容

### 6.3 Store 操作

- [x] `src/store/appStore.ts`
  - [x] `addProvider`: 添加新服务商（自动生成默认模型）
  - [x] `updateProvider`: 更新服务商配置
  - [x] `deleteProvider`: 删除服务商（自动切换 activeProvider）
  - [x] `setActiveProvider`: 设置当前使用的服务商
  - [x] 默认初始化 3 个服务商：OpenAI、Anthropic、Gemini，每个含多个默认模型

### 6.4 设置页重新设计

- [x] `src/components/settings/SettingsView.tsx`
  - [x] 左侧标签栏：General / Appearance / Models
  - [x] Models 标签页：左侧服务商列表 + 右侧详情面板
  - [x] 服务商列表：显示名称、Base URL、启用状态（ON 标签）
  - [x] 服务商详情：名称、Base URL、API Key、Custom Header 编辑
  - [x] 模型列表：展示该服务商下所有模型，支持添加/删除/设为默认（星标）
  - [x] 操作按钮：启用/禁用、删除服务商、设为当前服务商
  - [x] "添加服务商"表单验证：必填字段为空时红色边框+错误提示
  - [x] 按服务商类型自动填充默认名称和 Base URL
  - [x] 添加成功后自动选中新服务商进入详情页
  - [x] 语言设置和远程访问设置分离为独立卡片

### 6.5 API 层更新

- [x] `src/lib/api.ts`
  - [x] `fetchFromModel`: 优先查找 `activeProvider`，使用其 `type` 和默认模型
  - [x] `fetchFromProvider`: 根据 `ModelProvider` 创建对应 AI SDK client

### 6.6 其他更新

- [x] `src/components/prompts/PromptGenerator.tsx`: 使用 activeProvider 进行 API 调用
- [x] `src/store/appStore.ts` `sendMessageToAgents`: 使用 activeProvider 进行 Agent 调用
- [x] `src/hooks/useTranslation.ts`: 添加新 UI 所需翻译键

## 7. P5：UI/UX 设计对齐（基于 Design Specs 对比检查）

### 7.1 侧边栏重构（已完成）

- [x] **ContextSidebar 按视图区分内容**
  - [x] 聊天视图：顶部标签切换「工作流/会话」，单列显示
  - [x] 工作流视图：仅显示工作流列表
  - [x] 智能体视图：显示智能体列表
  - [x] 其他视图（提示词/设置/个人资料）：不显示侧边栏
  - [x] 文件：`src/components/layout/ContextSidebar.tsx`, `src/components/layout/AppShell.tsx`

- [x] **聊天视图双列合并为单列+标签切换**
  - [x] 原双列布局（左工作流+右会话）改为单列，顶部「工作流/会话」标签切换
  - [x] 点击工作流后自动切换到会话标签
  - [x] 文件：`src/components/layout/ContextSidebar.tsx`

- [x] **新建会话功能修复**
  - [x] 使用 `createSession` 替代 `openWorkflowSession`，确保每次点击都创建新会话
  - [x] 文件：`src/components/layout/ContextSidebar.tsx`

### 7.2 工作流画布（已完成）

- [x] **添加 MiniMap**
  - [x] WorkflowCanvas 添加 MiniMap 组件
  - [x] 支持 dark/light 主题颜色适配
  - [x] 文件：`src/components/workflow/WorkflowCanvas.tsx`

### 7.3 工作流聊天视图（已完成）

- [x] **Bot 按钮移至标题栏**
  - [x] 将 App.tsx headerRightContent 中的 Bot 按钮移到 WorkflowChatView 标题栏右侧
  - [x] 仅在工作流会话且侧边栏折叠时显示
  - [x] 文件：`src/components/chat/WorkflowChatView.tsx`, `src/App.tsx`, `src/components/layout/AppShell.tsx`

- [x] **多 Agent 模式切换按钮文案**
  - [x] 按钮文案从"单Agent/多Agent"改为"拓扑/聊天"
  - [x] 文件：`src/components/chat/WorkflowChatView.tsx`

### 7.4 设置页（已完成）

- [x] **自定义协议选择器简化**
  - [x] 仅保留 "OpenAI 兼容" 一个选项
  - [x] 文件：`src/components/settings/SettingsView.tsx`

- [x] **多服务商模型管理**
  - [x] 左列表+右详情布局
  - [x] 支持多个 OpenAI/Anthropic/Gemini/Custom 服务商
  - [x] 每个服务商下支持多个模型
  - [x] 文件：`src/components/settings/SettingsView.tsx`, `src/types/models.ts`, `src/store/appStore.ts`

### 7.5 剩余待办

- [ ] **会话列表顶部添加固定 "+ 新增会话" 按钮**
  - 目标：会话列表第一条固定为 "+ 新建会话"，点击后打开新建会话弹窗
  - 当前：已有新建按钮，但可优化为更明显的固定入口
  - 文件：`src/components/layout/ContextSidebar.tsx`

- [ ] **列表项添加头像/图标**
  - 目标：列表项采用「头像/图标 + 助手名称」的形式
  - 当前：`ContextItem` 组件已添加图标，但可进一步美化
  - 文件：`src/components/layout/ContextSidebar.tsx`

- [ ] **单个列表项添加三点菜单（编辑/删除/更多）**
  - 目标：列表右侧的「三点菜单」，支持对单个助手进行更多操作（编辑、删除等）
  - 当前：已有删除按钮，可扩展为三点菜单
  - 文件：`src/components/layout/ContextSidebar.tsx`

### 7.6 右侧：主对话区（SimpleChatView / ChatMessageBubble）

- [ ] **面包屑栏添加对话时间显示**
  - 目标：在模型名称下方附带对话时间（如 04/19 21:06）
  - 当前：面包屑栏只有话题名 > 模型名 | Local，无时间
  - 文件：`src/components/chat/SimpleChatView.tsx`

- [x] **单条消息 Token 显示增加 ↑↓ 分项**
  - 目标：Tokens: 总token ↑上传token ↓下载token，上传下载数字前有 ↑↓ 符号
  - 当前：已改为 `↑${promptTokens} ↓${completionTokens} tokens` 格式
  - 文件：`src/components/chat/ChatMessageBubble.tsx`（AssistantBubble）

- [ ] **AI 回复去除左边框线，改为无明显气泡框**
  - 目标：AI 回复左对齐，无明显气泡框，直接在深色背景上显示文字
  - 当前：使用了 `bg-muted/30` 背景色，无明显左边框
  - 文件：`src/components/chat/ChatMessageBubble.tsx`（AssistantBubble）

- [x] **模型来源根据 agent 配置动态显示**
  - 目标：模型来源显示实际 provider（OpenAI/Anthropic/Local 等）
  - 当前：气泡中已显示 `providerName/modelName`，面包屑仍显示静态文本
  - 文件：`src/components/chat/ChatMessageBubble.tsx`、`src/components/chat/SimpleChatView.tsx`

### 7.7 多模型对比卡片（MultiModelComparison / AgentResultCard）

- [ ] **对比卡片添加快捷操作栏**
  - 目标：卡片底部提供一排功能图标（复制、刷新、引用、点赞、收藏、删除、更多）
  - 当前：MultiModelComparison 只有 "Select" 按钮；AgentResultCard 无任何操作栏
  - 文件：`src/components/chat/MultiModelComparison.tsx`、`src/components/chat/AgentResultCard.tsx`
  - 说明：`MessageHoverActions.tsx` 已实现完整操作按钮集，可复用或参考

- [ ] **对比卡片添加状态图标和时间**
  - 目标：每个卡片顶部重复模型名称、状态图标（如绿色星星）、时间和 Token 信息
  - 当前：只有模型名称和 Token 总数
  - 文件：`src/components/chat/MultiModelComparison.tsx`

### 7.8 全局导航栏（GlobalSidebar）

- [ ] **底部导航精简为仅暗色模式和设置**
  - 目标：底部是暗色模式和设置图标（从上到下）
  - 当前：底部有暗色模式 → Settings → Profile 三个图标，多了一个 Profile
  - 文件：`src/components/layout/GlobalSidebar.tsx`

## 8. P6：测试与工程化补齐

- [x] 搭建 vitest + @testing-library/react 测试基础设施。
- [x] 为 `addAgentResponseStream` / `completeAgentResponse` 增加 store 层单元测试：
  - [x] 同一 `messageId` 下多个 agent 聚合写入。
  - [x] chunk 追加无重复倍增。
  - [x] 单个 agent 完成不影响其他 agent 状态。
- [x] 为工作流运行时补最小契约测试：线性流程、条件分支、错误传播、断点续跑、执行记录。
- [x] 为聊天视图补最小渲染测试：多个 `agentResponses` 均显示正确 agent 标识。
- [x] 为 workflow chat V1 补最小交互测试：打开窗口、聚焦窗口、转发到下一节点。
- [x] 为新节点补契约测试：HTTP/IF/Merge/Sub-workflow 的输入输出与错误路径。

## 8.A SettingsView 组件化重构

### 目标

将 `SettingsView.tsx`（1100+ 行）拆分为三个独立页签组件 + 一个路由壳，彻底解决对话框跨作用域导致的黑屏问题。

### 拆分方案
```
src/components/settings/
├── SettingsView.tsx              ← 薄壳：左侧标签栏 + 页签路由
├── SettingsGeneralTab.tsx        ← 通用设置（语言、远程访问）
├── SettingsAppearanceTab.tsx     ← 外观设置（主题切换）
└── SettingsModelsTab.tsx         ← 模型管理（服务商 CRUD、模型测试、API 格式、对话框）
```

### 实施

- [x] 创建 `SettingsGeneralTab.tsx` — 语言选择 + 远程访问，独立 `local` 状态
- [x] 创建 `SettingsAppearanceTab.tsx` — 主题切换，独立 `theme` 状态
- [x] 创建 `SettingsModelsTab.tsx` — 服务商管理 + 模型测试 + 对话框，全部内聚
- [x] 精简 `SettingsView.tsx` 为标签栏 + 页签路由
- [x] TypeScript 编译验证
- [x] Vite build 验证
- [ ] 浏览器功能回归（三个页签完整测试）

## 8.B 配置持久化

- [x] Rust `db.rs` — 统一单文件 `config/config.json`，按 key 读写（settings / agents / workflows）
- [x] 前端 `appStore.ts` — `readConfig`/`writeConfig` 新增 `localStorage` 回退（键 `simper_config`）
- [x] 浏览器 `npm run dev` 刷新后持久化恢复
- [x] 移除服务商类型下拉框

### 8.C Bug 修复

- [x] 聊天侧边栏选中工作流后主聊天区拓扑不切换 — `handleWorkflowSelect` 改用 `openWorkflowSession` 替代 `setActiveWorkflow`
- [x] 新建会话按钮浏览器模式无效 — `createSession` 的 `set()` 移出 try 块，Tauri 失败不影响前端状态
- [x] 深色模式 SelectItem 悬停对比度差 — `focus:bg-hover` 改为 `focus:bg-primary/15 focus:text-primary`
- [x] 删除服务商黑屏 — 对话框移入 models 条件块内
- [x] 配置持久化：Rust 统一单文件 `config/config.json`，浏览器 localStorage 回退
- [x] `.gitignore` 排除 `config/` 目录防止 API Key 泄露
- [x] ChatInterface 头像与 AgentsView 不一致 — AgentsView / ChatMessageBubble / SimpleChatView 统一 `rounded-full` + `Bot` icon + `bg-primary/10 text-primary`
- [x] 消息气泡底部无 retry 按钮 — `ChatMessageBubble` 条件从 `onRetry && response.agentId` 简化为 `onRetry &&`，各视图补传 `onRetry`
- [x] retry 新建消息而非在原气泡重新生成 — 新增 `retryAgentResponse` action，复用原 `messageId` 清除旧 `agentResponse` 后重新生成
- [x] retry 重复添加用户消息 — `SimpleChatView` / `AgentChatWindow` / `WorkflowAgentWindow` 全部改用 `retryAgentResponse`（底层 `addUserMessage: false`）
- [x] 拓扑视图不显示聊天 A/B 中的回复 — `WorkflowAgentWindow` 和 `agentResponsesFiltered` 支持 `nodeId === undefined` 的全局消息
- [x] Provider/Model 信息抢视觉重心 — 从气泡底部移至 Agent 名称后方，底部元信息颜色统一为 `text-muted-foreground/50`

### 验收

- [ ] 页签切换无黑屏
- [ ] 通用/外观设置可正常编辑和保存
- [ ] 模型管理全部功能正常（服务商 CRUD、模型增删、测试、获取列表）

## 9. PM 分析结论：待补充任务

### 9.1 P0 验证缺口（阻塞项，需立即执行）

- [ ] 浏览器验证：Single Chat 完整链路（新建 → 发送 → @agent → 附件 → 复制 → retry）
- [ ] 浏览器验证：Workflow Chat 完整链路（新建 → 侧边栏收展 → workflow/agent 节点点击 → 浮窗打开 → retry）
- [ ] 浏览器验证：多窗口交互（重叠 → 聚焦 → 关闭/最小化）
- [ ] 浏览器验证：转发链路（手动转发 → 自动转发 → reload 后转发）
- [ ] 浏览器验证：切回普通 session，确认 workflow UI 状态不污染普通聊天
- [ ] Loop 聚合语义修复：对齐 `payload.loopResults` 与 `payload.llmResult` 关系，避免覆盖
- [ ] 狼人杀样例回归：屠边、狼刀优先、女巫药剂、猎人开枪、平票 PK、`breakCondition`、`maxIterations`

### 9.2 发布必须（MVP 阻塞项）

- [ ] 节点配置交互对齐：统一基础区块（名称、描述、超时、重试、失败策略）
- [ ] 基础无障碍：图标按钮补齐 `aria-label`
- [ ] 基础无障碍：主要交互链路支持键盘 Tab 导航与可见 focus
- [ ] 基础无障碍：可交互元素最小点击区 ≥44×44px
- [ ] 对比度修复：执行详情面板（输入/输出快照、错误信息）正文对比度 ≥4.5:1
- [ ] 对比度修复：大号文本（≥18px 或 14px bold）对比度 ≥3:1
- [ ] 中小屏适配：执行面板布局不遮挡核心操作（<1024px）
- [ ] 导入导出验收：浏览器手动验证导入/粘贴 JSON 流程

### 9.3 发布后迭代（非阻塞）

- [ ] P3 告警钩子：本地通知 / Webhook 扩展
- [ ] UI：会话列表顶部固定 "+ 新增会话" 按钮
- [ ] UI：列表项采用「头像/图标 + 助手名称」形式
- [ ] UI：列表项三点菜单（编辑/删除/更多）
- [ ] UI：面包屑栏添加对话时间显示
- [x] UI：单条消息 Token 显示增加 ↑↓ 分项
- [ ] UI：AI 回复去除左边框线，改为无明显气泡框
- [x] UI：模型来源根据 agent 配置动态显示
- [ ] UI：多模型对比卡片添加快捷操作栏（复制/刷新/引用/点赞/收藏/删除/更多）
- [ ] UI：多模型对比卡片添加状态图标和时间
- [ ] UI：GlobalSidebar 底部精简为仅暗色模式和设置（移除 Profile）
- [ ] UI：中小屏（<768px）抽屉式侧栏适配
- [ ] 首次启动体验：新手引导 / 空状态设计 / 狼人杀 Demo 高亮

### 9.4 P7：V1.0 发布标准（待拆分）

- [ ] Tauri 打包配置（Windows / macOS / Linux）
- [ ] 文档落地页（Landing Page）
- [ ] 自动更新器（Auto-updater）
- [ ] 应用签名与公证（macOS Notarization / Windows Code Signing）
- [ ] 发布渠道：GitHub Releases / 官网下载

## 10. P8：代码模块化重构（渐进式 Store 拆分 + 引擎提取）✅ 已完成

### 10.1 背景与目标

`src/store/appStore.ts` 已膨胀至 **2000+ 行**，同时承载了：
- 数据实体（workspaces, agents, sessions, workflows, settings）
- 工作流执行引擎（BFS 队列、DAG 遍历、13 种节点执行逻辑）
- 聊天系统（流式响应、消息转发、@提及、窗口管理）
- 多服务商模型管理
- 大量 mock 初始化数据

**目标：** 按领域拆分为独立 slice，工作流引擎提取为纯函数模块，降低新增节点/聊天功能的认知负担。

### 10.2 方案：渐进式拆分（方案A）

#### Phase 1：Store 领域拆分 ✅

```
stores/
  index.ts              ← 组合导出，兼容现有 useAppStore 接口
  baseSlice.ts          ← 工作空间、Agent、Agent分类、配置持久化
  chatSlice.ts          ← 会话、消息、流式响应、Agent聊天窗口
  workflowSlice.ts      ← 工作流定义、节点/边数据、执行状态
  modelSlice.ts         ← 服务商、模型、settings 配置
  uiSlice.ts            ← 视图切换、侧边栏状态、工作流聊天UI
```

- [x] 创建 `src/stores/baseSlice.ts` — 迁移工作空间、Agent、配置持久化
- [x] 创建 `src/stores/chatSlice.ts` — 迁移会话、消息、流式响应、窗口管理
- [x] 创建 `src/stores/workflowSlice.ts` — 迁移工作流 CRUD、执行状态
- [x] 创建 `src/stores/modelSlice.ts` — 迁移服务商/模型/设置
- [x] 创建 `src/stores/uiSlice.ts` — 迁移视图、侧边栏、工作流聊天UI
- [x] 创建 `src/stores/index.ts` — 组合导出，保持 `useAppStore` API 兼容
- [x] 全局替换 `import { useAppStore } from '@/store/appStore'` → `from '@/stores'`
- [x] 删除旧 `src/store/appStore.ts` 单体文件

#### Phase 2：工作流引擎提取 ✅

```
lib/workflow/
  engine.ts                  ← 纯函数 executeWorkflow(nodes, edges, payload, settings, options)
  helpers.ts                 ← withTimeout、表达式求值、Schema 校验、sleep
  nodeRegistry.ts            ← 节点类型→执行器注册表，含 computeCustomRouting()
  types.ts                   ← 引擎内部类型（ExecutionFrame、NodeExecutor、ExecutionHelpers 等）
  nodeExecutors/
    agentExecutor.ts         ← Agent 节点执行逻辑
    codeExecutor.ts          ← Code 节点执行逻辑
    conditionExecutor.ts     ← Condition 节点执行逻辑
    httpExecutor.ts          ← HTTP 节点执行逻辑（模板变量、超时、重试）
    loopExecutor.ts          ← Loop 节点执行逻辑
    mergeExecutor.ts         ← Merge 节点执行逻辑（append/byKey/object-assign）
    setTransformExecutor.ts  ← Set/Transform 节点执行逻辑
    subWorkflowExecutor.ts   ← Sub-workflow 节点执行逻辑
    waitDelayExecutor.ts     ← Wait/Delay 节点执行逻辑（固定延时/条件轮询）
```

- [x] 创建 `lib/workflow/engine.ts` — 从 appStore 提取 `executeWorkflow` 为纯函数
- [x] 将各节点 `case` 分支提取为独立 `nodeExecutors/*.ts`
- [x] 创建 `lib/workflow/nodeRegistry.ts` — 集中注册节点类型到执行器映射
- [x] 创建 `lib/workflow/helpers.ts` — withTimeout、表达式求值、Schema 校验
- [x] 创建 `lib/workflow/types.ts` — 引擎内部类型定义
- [x] 更新 `workflowSlice.ts` 调用 `executeWorkflow` 而非内联实现
- [x] 验证：狼人杀工作流正常执行

#### Phase 3：ContextSidebar 拆分 ✅

```
components/layout/sidebar/
  ChatSidebar.tsx            ← 聊天视图侧边栏（工作流列表 + 会话列表）
  WorkflowSidebar.tsx        ← 工作流视图侧边栏
  AgentsSidebar.tsx          ← 智能体视图侧边栏（分类+Agent二级导航）
  ContextItem.tsx            ← 通用列表项组件
  SortableList.tsx           ← 通用拖拽排序列表（鼠标+触摸）
```

- [x] 将 `ContextSidebar.tsx` 中的内联组件拆为独立文件
- [x] 创建 `AgentsSidebar.tsx` — 分类+Agent 二级导航
- [x] 创建 `SortableList.tsx` — 通用拖拽排序（HTML5 Drag + 触摸长按）
- [x] 保持 `ContextSidebar` 作为路由壳组件
- [x] 验证：三栏侧边栏在各视图下正常渲染

#### Phase 4：工作流节点自注册（可选增强）

- [ ] `nodeRegistry.ts` 支持运行时注册新节点类型
- [ ] 新增节点只需：创建 UI 组件 → 创建 executor → `registerNodeType()`
- [ ] 验证：手动添加一个测试节点，确认引擎自动识别

### 10.3 验收标准

- [x] `tsc --noEmit` 零错误
- [ ] `npm test` 测试用例全部通过（需浏览器验证）
- [ ] 浏览器验证：工作流执行（线性/分支/loop）正常
- [ ] 浏览器验证：聊天收发、流式响应、窗口管理正常
- [ ] 浏览器验证：模型服务商 CRUD 正常

### 10.4 优先级

- **Phase 1（Store 拆分）**：✅ 已完成
- **Phase 2（引擎提取）**：✅ 已完成
- **Phase 3（Sidebar 拆分）**：✅ 已完成
- **Phase 4（自注册）**：低优先级，等前三步完成后再考虑

---

## 11. P9：Agent 批量管理与分类 ✅ 已完成

### 11.1 Agent 分类系统

- [x] `src/types/models.ts` — Agent 增加 `category?: string` 字段
- [x] `src/stores/baseSlice.ts` — 增加 `agentCategories` 状态和 `addAgentCategory` action
- [x] `src/components/layout/sidebar/AgentsSidebar.tsx` — 分类+Agent 二级导航（分类列表→Agent 列表）
- [x] `src/components/agents/AgentsView.tsx` — 分类筛选（filter chip + X 按钮）

### 11.2 批量编辑模式

- [x] `src/components/agents/AgentsView.tsx` — Bulk Edit 模式：
  - "Bulk Edit" / "Exit Bulk" 切换按钮
  - 点击卡片切换选中状态（视觉 ring 高亮）
  - 分类级 "select all" 复选框
  - 底部固定工具栏：选中计数 + Provider 下拉 + Model 下拉 + Apply + Done
- [x] `src/stores/baseSlice.ts` — `batchUpdateAgents()` 批量更新（Set O(1) 查找优化）
- [x] `src/components/agents/AgentsView.tsx` — AgentCard 组件提取（可复用卡片，支持批量选择复选框）

### 11.3 Provider/Model 选择器重构

- [x] Agent 创建/编辑对话框中移除 per-agent `apiKey`/`baseUrl` 字段
- [x] Provider 下拉改为从 `settings.providers` 读取
- [x] Model 下拉依赖所选 Provider（显示该 Provider 的模型列表）
- [x] 使用 `providerId` 替代旧版 `modelProvider` 枚举

### 11.4 三级模型解析链

- [x] `src/lib/agentProviderRouter.ts` — `resolveAgentModelConfig()` 三级解析：
  1. 节点级覆盖（`overrideProviderId`/`overrideModelId`）
  2. Agent 级配置（`providerId`/`modelId`）
  3. 全局默认（`activeProviderId` + 默认模型）
- [x] `shortError()` — HTTP/网络错误中文翻译

### 11.5 工作流节点模型覆盖

- [x] `src/components/workflow/nodes/AgentNode.tsx` — 增加 Provider/Model 覆盖选择器
- [x] `src/types/models.ts` — `WorkflowNodeDataBase` 增加 `overrideProviderId`/`overrideModelId`

---

## 12. 已清理的旧计划

以下内容已被当前优先级方案覆盖，不再单独维护：

- 旧"多小窗并发验证矩阵"。新方案不再以多小窗并列作为主要聊天形态，而是在 workflow chat 中使用可重叠节点窗口。
- 旧"群聊版会话窗口 V1 草稿"。其核心目标已并入 single chat 普通群聊式消息流与通用气泡组件。
- 旧"2~4 周里程碑"。当前改为按 P0/P1/P2/P3/P4/P5/P6 优先级推进。
- 旧狼人杀多版设计全文。保留仍需执行的规则回归与 loop/runtime 相关项。
