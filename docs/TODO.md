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

- [ ] **单条消息 Token 显示增加 ↑↓ 分项**
  - 目标：Tokens: 总token ↑上传token ↓下载token，上传下载数字前有 ↑↓ 符号
  - 当前：只显示 `totalTokens tokens`，无分项
  - 文件：`src/components/chat/ChatMessageBubble.tsx`（AssistantBubble）

- [ ] **AI 回复去除左边框线，改为无明显气泡框**
  - 目标：AI 回复左对齐，无明显气泡框，直接在深色背景上显示文字
  - 当前：使用了 `border-l-2 border-muted-foreground/20 pl-3` 左边框引用样式
  - 文件：`src/components/chat/ChatMessageBubble.tsx`（AssistantBubble）

- [ ] **模型来源根据 agent.modelProvider 动态显示**
  - 目标：模型来源显示实际 provider（OpenAI/Anthropic/Local 等）
  - 当前：面包屑中固定硬编码为 `t("Local")`
  - 文件：`src/components/chat/SimpleChatView.tsx`

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

### 验收

- [ ] 页签切换无黑屏
- [ ] 通用/外观设置可正常编辑和保存
- [ ] 模型管理全部功能正常（服务商 CRUD、模型增删、测试、获取列表）

## 9. 已清理的旧计划

以下内容已被当前优先级方案覆盖，不再单独维护：

- 旧"多小窗并发验证矩阵"。新方案不再以多小窗并列作为主要聊天形态，而是在 workflow chat 中使用可重叠节点窗口。
- 旧"群聊版会话窗口 V1 草稿"。其核心目标已并入 single chat 普通群聊式消息流与通用气泡组件。
- 旧"2~4 周里程碑"。当前改为按 P0/P1/P2/P3/P4/P5/P6 优先级推进。
- 旧狼人杀多版设计全文。保留仍需执行的规则回归与 loop/runtime 相关项。
