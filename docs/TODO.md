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

## 3. P1：可组合节点生态（对标 n8n 的节点可拼装能力）

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
- [x] 错误态信息包含可恢复动作（如重试/从失败节点重跑），避免”只有报错无下一步”。
- [x] `running/retrying` 动效支持 `prefers-reduced-motion`，在降动效模式下关闭脉冲，仅保留必要淡入淡出。
- [ ] 执行详情（输入/输出快照、错误信息）在浅色/深色模式下对比度达标（正文≥4.5:1，大号文本≥3:1）。
- [ ] 执行日志列表与详情面板交互控件满足最小点击区 44×44px。
- [ ] 时间线与错误面板中的图标按钮补齐 `aria-label`，关键操作可通过键盘 Tab 到达并触发。
- [ ] 中小屏（<1024px）下执行面板布局不遮挡核心操作；侧栏/详情抽屉开合行为符合响应式规则。

## 6. P4：测试与工程化补齐

- [x] 搭建 vitest + @testing-library/react 测试基础设施。
- [x] 为 `addAgentResponseStream` / `completeAgentResponse` 增加 store 层单元测试：
  - [x] 同一 `messageId` 下多个 agent 聚合写入。
  - [x] chunk 追加无重复倍增。
  - [x] 单个 agent 完成不影响其他 agent 状态。
- [x] 为工作流运行时补最小契约测试：线性流程、条件分支、错误传播、断点续跑、执行记录。
- [x] 为聊天视图补最小渲染测试：多个 `agentResponses` 均显示正确 agent 标识。
- [x] 为 workflow chat V1 补最小交互测试：打开窗口、聚焦窗口、转发到下一节点。
- [x] 为新节点补契约测试：HTTP/IF/Merge/Sub-workflow 的输入输出与错误路径。

## 7. 已清理的旧计划

以下内容已被当前优先级方案覆盖，不再单独维护：

- 旧“多小窗并发验证矩阵”。新方案不再以多小窗并列作为主要聊天形态，而是在 workflow chat 中使用可重叠节点窗口。
- 旧“群聊版会话窗口 V1 草稿”。其核心目标已并入 single chat 普通群聊式消息流与通用气泡组件。
- 旧“2~4 周里程碑”。当前改为按 P0/P1/P2/P3/P4 优先级推进。
- 旧狼人杀多版设计全文。保留仍需执行的规则回归与 loop/runtime 相关项。
