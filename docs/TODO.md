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

## 2. 当前 P0：Chat 页重构

### 2.1 目标

把 chat 页拆成两种明确会话模式：

- **单个智能体对话**：保持普通群聊式消息流，支持 `@agent`、附件、复制等基础体验。
- **工作流对话**：按 workflow 节点组织多智能体会话，支持节点窗口、手动/自动转发、reload 后转发。

### 2.2 类型与状态模型

- [ ] `src/types/models.ts`
  - [ ] `ChatSession` 增加 `mode?: 'single' | 'workflow'`；旧数据按 `workflowId` 兼容推断。
  - [ ] `ChatMessage` 增加 `meta`：`workflowId`、`workflowNodeId`、`sourceAgentId`、`targetAgentId`、`forwardFromMessageId`、`triggeredBy`。
  - [ ] `AgentResponse` 增加可选 `nodeId`。
  - [ ] 新增 `WorkflowConversationWindow` 类型：`id/sessionId/workflowId/nodeId/agentId/position/zIndex/minimized`。
  - [ ] workflow agent node `data` 增加 `autoSendToNext?: boolean` 约定。
- [ ] `src/store/appStore.ts`
  - [ ] `createSession`、`openWorkflowSession` 写入 `mode`。
  - [ ] 读取旧 session 后补齐默认 `mode`。
  - [ ] 新增 `workflowChatUI`：`sidebarCollapsedBySession`、`windows`、`activeWindowId`、`zIndexCounter`。
  - [ ] 新增窗口动作：`openWorkflowAgentWindow`、`focusWorkflowAgentWindow`、`closeWorkflowAgentWindow`、`setWorkflowSidebarCollapsed`。
  - [ ] 新增编排动作：`sendToWorkflowAgent`、`forwardAgentReplyToNext`、`rerunAgentReply`、`rerunAndForwardAgentReply`。
  - [ ] 抽出并复用现有 agent 模型请求逻辑，避免 `ChatInterface` 和 workflow chat 各写一套请求代码。

### 2.3 新建会话弹窗

- [ ] `src/components/layout/ContextSidebar.tsx`
  - [ ] 将当前 workflow picker 浮层替换为 shadcn `Dialog`。
  - [ ] 弹窗顶部左右两项：左侧“单个智能体对话”，右侧“工作流对话”。
  - [ ] 单智能体入口：选择 agent 后创建 `mode: 'single'` session，并设置 `activeAgentId`。
  - [ ] 工作流入口：选择 workflow 后创建/打开 `mode: 'workflow'` session。
  - [ ] chat 列表展示 session 时区分 single/workflow，可用 workflow 名称或小徽标标识。

### 2.4 ChatInterface 拆分

- [ ] `src/components/chat/ChatInterface.tsx`
  - [ ] 入口按 active session `mode` 分流：single 渲染普通聊天，workflow 渲染 `WorkflowChatView`。
  - [ ] 保留普通聊天的输入框、mention、附件、群聊式消息流。
  - [ ] 抽出通用消息气泡 `ChatMessageBubble`。
  - [ ] 抽出 hover 操作组件 `MessageHoverActions`。
- [ ] `src/components/chat/MessageHoverActions.tsx`
  - [ ] 用户气泡 hover 支持复制。
  - [ ] 智能体回复气泡 hover 支持复制、再发送一次、reload、发送给下一位、reload 后发送给下一位。

### 2.5 工作流对话视图

- [ ] `src/components/chat/WorkflowChatView.tsx`
  - [ ] 读取 active session 对应 workflow。
  - [ ] 主区域展示 workflow agent 节点列表或简化流程视图。
  - [ ] 点击 agent 节点打开对应浮动会话窗。
  - [ ] 渲染多个 `WorkflowAgentWindow`，支持窗口重叠与 z-index 聚焦。
- [ ] `src/components/chat/WorkflowAgentWindow.tsx`
  - [ ] 显示当前 workflow node 对应 agent 的会话消息。
  - [ ] 支持向当前 agent 发送消息。
  - [ ] 支持回复 hover 操作：复制、再发送、reload、转发给下一位。
  - [ ] 若当前 node `data.autoSendToNext === true`，回复完成后自动调用 `forwardAgentReplyToNext`。
- [ ] `forwardAgentReplyToNext`
  - [ ] 通过 `workflow.edges_data` 从当前 node 找后继 agent node。
  - [ ] V1 支持线性/显式 agent 后继；condition/loop 复杂路由仍交给现有 `executeWorkflow`。

### 2.6 工作流侧栏与菜单

- [ ] `src/components/layout/AppShell.tsx`
  - [ ] 当前 active session 为 workflow 时，二级栏默认收起为窄按钮。
  - [ ] 普通 single chat 保持现有侧栏行为。
- [ ] `src/components/layout/ContextSidebar.tsx`
  - [ ] workflow chat 展开时，二级展示 workflow 名称/节点概览。
  - [ ] 三级展示 agent 节点列表。
  - [ ] 点击三级 agent 节点打开对应 `WorkflowAgentWindow`。

### 2.7 工作流设计端自动发送配置

- [ ] `src/components/workflow/nodes/AgentNode.tsx`
  - [ ] 在 agent node 编辑弹窗中增加 `autoSendToNext` 开关。
- [ ] `src/store/appStore.ts`
  - [ ] `saveWorkflow` 清洗节点 data 时保留 `autoSendToNext`。

### 2.8 验收

- [ ] 类型检查或构建通过：优先 `npm run check`；若项目无 check，运行 `npm run build`。
- [ ] 启动 `npm run dev`，浏览器验证普通 single chat：新建、发送、`@agent`、附件、复制。
- [ ] 浏览器验证 workflow chat：新建、二级栏收起/展开、workflow/agent 节点点击。
- [ ] 打开多个 agent 窗口，验证重叠、聚焦、关闭/最小化。
- [ ] 验证手动转发、自动转发、再发送一次、reload 后转发。
- [ ] 切回普通 session，确认 workflow UI 状态不污染普通聊天。

## 3. P1：Workflow Runtime 与狼人杀样例收口

### 3.1 Loop 结果聚合

- [ ] 约定 Loop 默认汇总位置，例如 `payload.loopResults[nodeId]`。
- [ ] 支持迭代结果聚合策略：V1 先实现 append。
- [ ] 明确与现有 `payload.llmResult` 的关系，避免多 agent/多迭代覆盖。
- [ ] 执行面板展示当前迭代状态：`currentItem/index/total`。

### 3.2 狼人杀样例最小迁移

- [ ] 先迁移 Day Speech：用 `loop` 对存活玩家逐人发言。
- [ ] 保留夜晚与投票裁决节点，避免一次性重写。
- [ ] 验证 Day Speech 输出可被后处理节点消费。
- [ ] 稳定后再评估 Day Vote 是否需要逐人 loop 投票。

### 3.3 规则回归

- [ ] 屠边规则。
- [ ] 狼刀优先。
- [ ] 女巫药剂扣减。
- [ ] 猎人开枪限制。
- [ ] 平票 PK。
- [ ] `breakCondition` 提前结束。
- [ ] `maxIterations` 保护。

## 4. P2：测试与工程化补齐

- [ ] 为 `addAgentResponseStream` / `completeAgentResponse` 增加 store 层单元测试：
  - [ ] 同一 `messageId` 下多个 agent 聚合写入。
  - [ ] chunk 追加无重复倍增。
  - [ ] 单个 agent 完成不影响其他 agent 状态。
- [ ] 为聊天视图补最小渲染测试：多个 `agentResponses` 均显示正确 agent 标识。
- [ ] 为 workflow chat V1 补最小交互测试：打开窗口、聚焦窗口、转发到下一节点。

## 5. 已清理的旧计划

以下内容已被当前 Chat 页重构计划覆盖，不再单独维护：

- 旧“多小窗并发验证矩阵”。新方案不再以多小窗并列作为主要聊天形态，而是在 workflow chat 中使用可重叠节点窗口。
- 旧“群聊版会话窗口 V1 草稿”。其核心目标已并入 single chat 普通群聊式消息流与通用气泡组件。
- 旧“2~4 周里程碑”。当前改为按 P0/P1/P2 优先级推进。
- 旧狼人杀多版设计全文。保留仍需执行的 loop 聚合、Day Speech 迁移与规则回归项。
