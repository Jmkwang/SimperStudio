# SimperStudio Changelog

按版本倒序记录已完成项。当前正在做的事在 [TODO_active.md](./TODO_active.md)。

> 版本号必须三处一致：`package.json` / `tauri.conf.json` / `src-tauri/Cargo.toml`。

---

## v0.5.5

### 设计系统统一（P1 收尾）
- **消除硬编码颜色完成**：`lunar-*` → `primary`、`red-*` → `destructive`、用户气泡 hex → `primary` 全量替换完成；MergedSidebar / WorkflowTopologyPreview inline style hex 保留（运行时需要实际值）

### 视觉叙事与品牌（P2）
- **Logo 品牌设计**：从 "S" 字母占位升级为有辨识度的品牌 Logo（`src/assets/`）
- **首次启动 Onboarding**：3 步快速引导流程，新用户首次进入时展示核心功能（`src/components/onboarding/`）
- **Agent 创建成功 Toast**：创建 Agent 后展示带品牌感的成功提示（`src/components/ui/toast`）

### 微交互（P2）
- **Agent 创建成功微交互**：Toast 替换为 Avatar 轻微动画反馈，增强操作确认感

### 多模型对比（P2）
- **MultiModelComparison 卡片操作栏**：底部一排功能图标（复制/刷新/引用/点赞/收藏/删除/更多），复用 `MessageHoverActions`（`MultiModelComparison.tsx`）
- **AgentResultCard 状态图标和时间**：每个卡片顶部显示模型名称、状态图标（绿色星星）、时间和 Token 信息（`AgentResultCard.tsx`）

### 列表与导航（P2）
- **会话列表顶部固定 "+ 新增会话" 按钮**：作为列表第一条固定显示（`MergedSidebar.tsx`）
- **列表项头像/图标 + 助手名称**：`ContextItem` 美化，展示助手头像与名称（`MergedSidebar.tsx`）
- **列表项三点菜单**：编辑/删除/更多操作菜单（`MergedSidebar.tsx`）

### AI 回复气泡（P2）
- **AI 回复去除左边框线**：移除 `bg-muted/30` 左侧视觉痕迹，回复区域更干净（`ChatMessageBubble.tsx`）

### 可观测性增强（P3）
- **告警钩子**：本地通知 / Webhook 扩展（`src/services/alerts.ts`）
- **中小屏适配**：< 768px 抽屉式侧栏（`MergedSidebar.tsx`）

### 国际化补完（P3）
- **硬编码字符串修复**：SettingsGeneralTab 中文字符串改为 `t()` 调用；"Test Run" / "Running..." / "Create Agent" / "Execution Timeline" / "Export" 等未翻译 key 全部接入 i18n；ContextSidebar default case 中文字符串走 `t()`（多文件）

### 代码质量遗留（P3）
- **文案修复**：测试全部模型对话框 `{t('models in total,')}` 改为自然文案（`SettingsModelsTab.tsx`）
- **新建服务商默认模型硬编码修复**：新建服务商时根据服务商类型设置合理的默认模型，不再硬编码 `gpt-4o`（`modelSlice.ts`）

### Bug 修复
- **Workflow Dynamic Agent 保存与转发修复**：`saveWorkflow` 保留 Dynamic Agent 专属配置字段与 agent 节点模型 override 字段；workflow chat 的手动转发、自动转发、重跑后转发支持 `dynamic-agent`，并同步 reference 文档（`src/stores/workflowSlice.ts` / `src/stores/chatSlice.ts` / `src/store/__tests__/workflowSave.test.ts` / `src/store/__tests__/workflowChat.test.ts` / `docs/reference/nodes.md` / `docs/reference/chat-system.md` / `docs/reference/stores.md`）
- **对话导出在 Tauri 环境下无效**：`MergedSidebar.tsx` 中原生 `<a download>` 方式在 Tauri WebView 中无法触发保存，改为使用 `tauri-plugin-dialog` 的 `save()` + `tauri-plugin-fs` 的 `writeTextFile()`，与 `WorkflowCanvas` 导出逻辑保持一致；补全 `Session exported` / `Workflow exported` / `Export failed` 三处 i18n key（`src/components/layout/MergedSidebar.tsx` / `src/hooks/useTranslation.ts`）
- **Settings 旧版 provider 字段清理**：`PromptGenerator.tsx` 从 `fetchFromModel()`（依赖 `settings.apiProvider` / `customBaseUrl` / `openaiKey` 等旧字段）迁移到 `fetchFromProvider()`（通过 `settings.providers` 路由）；删除 `api.ts` 中的 `fetchFromModel()` 废弃函数；从 `Settings` 接口移除 14 个 legacy provider 字段（`src/components/prompts/PromptGenerator.tsx` / `src/lib/api.ts` / `src/types/models.ts`）
- **Agent 废弃字段清理**：`Agent.apiKey` / `Agent.baseUrl` 在前端已无运行时代码读取，从 TS `Agent` 接口移除；同步删除 Rust `Agent` struct 的 `api_key` / `base_url` 字段及 SQL 读写（`src/types/models.ts` / `src/stores/baseSlice.ts` / `src-tauri/src/db.rs`）；`modelProvider` 因 Rust 侧仍为 NOT NULL 保留，`docs/reference/tauri-commands.md` SQL schema 同步更新

### 新工作流
- **礼物推荐助手**：日常生活场景，用户输入送礼需求 → 礼物策划师（Agent A）推荐 3-5 个选项（`autoSendToNext: true`）→ 礼物评估师（Agent B）四维度评分并给出最终推荐 → 输出节点展示结果。新增 2 个 Agent（`agent-gift-planner` / `agent-gift-evaluator`）+ 2 个 avatar SVG（`src/stores/baseSlice.ts` / `src/stores/workflowSlice.ts` / `public/avatars/gift.svg` / `public/avatars/evaluator.svg`）

### 设计审计 P1 残留（P4）
- **WorkflowCanvas 节点尺寸标准化**：节点尺寸/间距统一规范（`WorkflowCanvas.tsx`）
- **GenericNode red-* 替换**：`red-500/red-700/red-950` 替换为 `text-destructive` 系列（`GenericNode.tsx`）
- **ExecutionTimeline 颜色 token 化**：硬编码颜色替换为 design token（`ExecutionTimeline.tsx`）

---

## v0.5.4

### 设计系统统一（P1）
- **消除硬编码颜色**：UI 组件 `lunar-*` → `primary`（`button.tsx`/`input.tsx`/`select.tsx`/`slider.tsx`/`textarea.tsx`/`switch.tsx`）；节点删除按钮 `text-red-500` → `text-destructive`（`DynamicAgentNode.tsx`/`IfSwitchNode.tsx`/`SetTransformNode.tsx`/`RouterNode.tsx`）；用户气泡 `bg-[#2563eb]` → `bg-primary`（`ChatMessageBubble.tsx`）；DebugOverlay 错误色 → `destructive`
- **统一字号阶梯**：消除 `text-[9px]`/`text-[10px]`/`text-[11px]`，统一为 `text-xs`（12px），共 15 处（`DebugOverlay.tsx`/`SimpleChatView.tsx`/`SettingsModelsTab.tsx`/`TitleBar.tsx`）
- **主题色一致性**：Light/Dark 均使用 258° 紫色相，已统一；更新 `DESIGN.md` 文档
- **统一保存模式**：侧栏 `cycleTheme` 同步 `updateSettings`（`MergedSidebar.tsx`）；设置页移除 system 选项（`SettingsAppearanceTab.tsx`）

### 节点配置交互对齐（P1）
- **Dialog 宽度统一**：15 个节点编辑器统一为 `sm:max-w-[500px]`
- **容器模式统一**：CliAgentNode 从 `space-y-4` 改为 `grid gap-4 py-4`
- **Save 按钮统一**：CliAgentNode 从全宽按钮改为 `flex justify-end` 右对齐
- **卡片宽度统一**：OutputNode/TriggerNode 200px→240px，CodeNode/MergeNode/WaitDelayNode 220px→240px，DynamicAgentNode 280px→240px
- **hover 动画补齐**：OutputNode/TriggerNode 添加 `transition-all hover:shadow-md`
- **标题国际化**：4 个节点 Dialog 标题包裹 `t()`（`SubWorkflowNode.tsx`/`WaitDelayNode.tsx`/`IfSwitchNode.tsx`/`SetTransformNode.tsx`）
- **间距统一**：CodeNode/RouterNode 移除多余 `mt-2`

### Bug 修复
- **Agent 消息持久化**：`agentResponses` 数组未存储到数据库，刷新后丢失。新增 `agent_responses` 列，保存/加载时序列化/反序列化（`db.rs`/`chatSlice.ts`/`baseSlice.ts`）
- **MergedSidebar 嵌套 button**：会话行 `<button>` 内嵌套菜单 `<button>` 导致 HTML 验证错误，改为外层使用 `<div role="button">`（`MergedSidebar.tsx`）
- **batchUpdateAgents DB 失败**：Rust `Agent` 结构体的 `Option` 字段（`description`/`avatar`/`max_tokens`/`api_key`/`base_url`/`industry`）缺少 `#[serde(default)]`，当前端不发送这些可选字段时 serde 反序列化失败（`db.rs`）
- **batchUpdateAgents 浏览器模式失败**：`npm run dev` 纯浏览器模式下无 Tauri 运行时，`invoke` 必定失败；原逻辑失败后跳过 store 更新导致 UI 显示失败。改为始终更新内存 store（与 `addAgent` 行为一致），DB 持久化失败仅记 warn（`baseSlice.ts`）
- **parameters 二次序列化**：`buildAgentPayload` 中 `JSON.stringify` 可能对已经是字符串的 `parameters` 进行二次编码，增加类型检查（`baseSlice.ts`）
- **助手消息丢失**：助手回复保存到 DB 时 `content.text` 为空（实际文本在 `agentResponses` 中），重新加载后消息显示空白。改为持久化前将 `agentResponses` 文本合并写入 `content.text`（`chatSlice.ts`）
- **默认智能体消失**：`fetchInitialData` 用 SQLite 结果覆盖 store 默认 agent，但 SQLite 中从未写入内置 agent。改为加载后自动补种缺失的内置 agent（`baseSlice.ts`）

### 功能
- **工作流改名**：工作流编辑器左上角显示工作流名称，点击可直接编辑重命名（`WorkflowCanvas.tsx`）
- **Markdown 渲染**：智能体回复支持 Markdown 格式（标题、加粗、代码块、列表、表格、链接等），使用 `react-markdown` + `remark-gfm` + Tailwind Typography（`ChatMessageBubble.tsx`）
- **深色模式底色**：深色模式背景色从纯黑 `#111111` 调整为灰色 `#303133`（`globals.css`、`MergedSidebar.tsx`）
- **拓扑模式 Agent 小窗**：支持拖动移动；内容改为只显示该节点的 Agent 回复，不再显示整个会话（`WorkflowAgentWindow.tsx`）
- **聊天界面改进**：
  - **输入框重设计**：去掉上方分隔线，改为圆角气泡样式（`rounded-2xl`），发送按钮移至右下角圆形按钮（`SimpleChatView.tsx`/`WorkflowChatView.tsx`）
  - **用户消息折叠**：长文本（>300字符或>6行）自动折叠，点击展开/收起（`ChatMessageBubble.tsx`）
  - **用户消息复制**：hover 时显示复制按钮，点击复制全文（`ChatMessageBubble.tsx`）
  - **智能体头像**：助手消息左侧显示智能体头像（`h-10 w-10`），支持 URL/emoji/首字母 fallback（`ChatMessageBubble.tsx`）
  - **消息布局优化**：头像占两行高度，右侧第一行 Agent 名称（白色加粗），第二行模型信息（灰色），第三行正文（`ChatMessageBubble.tsx`/`WorkflowAgentWindow.tsx`）
  - **布局切换**：用户消息 hover 时显示布局切换按钮（A=卡片堆叠/B=垂直列表），偏好持久化到 localStorage（`ChatMessageBubble.tsx`/`uiSlice.ts`）
  - **WorkflowChatView 布局切换**：传递 `onLayoutChange` 给 `ChatMessageBubble`，支持布局切换（`WorkflowChatView.tsx`）
  - **WorkflowAgentWindow 布局同步**：小窗消息使用与主聊天一致的头像+名称+模型布局（`WorkflowAgentWindow.tsx`）
  - **深色模式边框**：降低卡片边框亮度，从 `border-border/50` 改为 `border-border/30`（`ChatMessageBubble.tsx`）

### 侧栏与导航
- **MergedSidebar 合并侧栏**：将旧 GlobalSidebar(64px) + ContextSidebar(可调) 合并为统一 260px 深色侧栏（`MergedSidebar.tsx`）
  - Mode Switcher Pill 切换 Agent / Workflow 模式
  - Nav Items 动态切换（活跃态左侧蓝色指示条）
  - Recents 按 `updatedAt` 倒序展示最近 5 项
  - Gateway 区：Logo + 主题切换 + 设置入口
- 旧 `GlobalSidebar` / `ContextSidebar` / `ChatSidebar` / `WorkflowChatSidebar` / `WorkflowSidebar` / `AgentsSidebar` 移入 `__archive__/`
- 会话列表 hover 时隐藏时间显示 ⋮ 菜单（重命名/删除）
- **主题切换简化**：去掉 system 模式，改为 light ↔ dark 两态切换（`MergedSidebar.tsx`）
- **Recents 固定显示**：agent 模式始终显示最近会话，workflow 模式始终显示最近工作流会话，不再随 nav 切换（`MergedSidebar.tsx`）
- **去除 emoji**：Mode Switcher、Nav Items 标题全部去除 emoji，保留纯文字（`MergedSidebar.tsx`）
- **会话导出**：⋮ 菜单新增"导出"选项，将会话（含所有消息）导出为 JSON 文件（`MergedSidebar.tsx`）
- **工作流会话分组视图**：workflow 模式 Recents 区域支持两种视图切换（`MergedSidebar.tsx`）
  - 分组视图（默认）：按工作流名称分组，右侧显示会话数，点击展开/收起，默认折叠
  - 平铺视图：所有工作流会话按时间排列
  - 视图偏好持久化到 `localStorage`（key: `ss_wf_view_mode`）
- **Nav items 样式调整**：去掉常显 active 背景色和左侧蓝标，只保留 hover 高亮（`MergedSidebar.tsx`）
- **Recents 蓝标**：选中会话行左侧显示蓝色指示条，与 nav items 区分（`MergedSidebar.tsx`）
- **自动总结话题**：用户发送第一条消息后，fire-and-forget 调用 LLM 生成会话标题（`chatSlice.ts`）
  - 设置页 General 新增卡片：开关 + 指定 provider/model，不可用时 fallback 到禁用（`SettingsGeneralTab.tsx`）
  - `Settings.autoTitle` 字段：`{ enabled, providerId?, modelId? }`（`models.ts`）

### 模型管理
- **更新预置模型 ID**（`modelSlice.ts`）：
  - OpenAI：移除 GPT-4 Turbo，加 o3 / o4-mini
  - Anthropic：更新为 Claude Opus 4 / Sonnet 4 / Haiku 4（claude-opus-4-5 / claude-sonnet-4-5 / claude-haiku-4-5）
  - Gemini：更新为 Gemini 2.5 Pro / 2.5 Flash / 2.0 Flash
  - DeepSeek：更新为 deepseek-chat（V3）/ deepseek-reasoner（R1）
  - 硅基流动：加 DeepSeek-R1 / Qwen3-235B-A22B
- **新增 Kimi 服务商**：月之暗面 OpenAI 兼容接口，预置 Kimi K2 / Moonshot v1 8k/32k/128k（`modelSlice.ts`）
- **服务商头像自定义**：详情面板 Name 字段上方加居中头像编辑区，支持 URL / emoji，左侧列表同步显示（`SettingsModelsTab.tsx`，`ModelProvider.avatar` 字段）
- **Worker mock**：`src/test/setup.ts` 补充 `MockWorker` + `URL.createObjectURL` stub，jsdom 环境下 code 节点可正常执行（`setup.ts`）
- **AST 表达式求值修复**：`resolveIdent` 正确处理 `payload.xxx` 前缀，`payload.value > 10` 等条件表达式现在能正确解析（`helpers.ts`）
- **dynamicAgentExecutor 测试修复**：补全 `fetchFromResolvedConfig` 第 4 个参数断言（`dynamicAgentExecutor.test.ts`）
- 全部 213 个测试通过（26 个测试文件）
- **Loop 聚合语义修复**：
  - 移除 `handleLoopRouting` 中冗余的 `llmResult` push 逻辑（`nodeRegistry.ts`）
  - `agentExecutor` 无 schema 时统一输出字段为 `llmResult`（原为 `output`），loop 累积结构一致（`agentExecutor.ts`）
  - `engine.ts` 末尾从 `results` 中兜底查找 `_loopResults`，防止 `structuredClone` 断裂导致 `loopResults` 丢失（`engine.ts`）
- **CLI Agent 白名单校验**：`cliAgentExecutor.ts` 补充 `allowedExecutables` 白名单检查，拒绝不在列表中的命令（`cliAgentExecutor.ts`）

### 聊天界面
- 面包屑简化（去除左侧栏图标/选择器/拓扑按钮、模型名移至输入框）
- 集成式输入框：发送/附件整合进 textarea 内底部栏，无边框
- 模型切换器：点击输入框左下角模型名弹出 provider/model 选择器
- ChatMessageBubble 移除 Avatar，agent 名颜色暗化
- 时间右对齐（`flex justify-between`，`shrink-0`）

### 设计系统
- 创建 `Design_System.md`（已合并到 `Design.md`）
- 设计令牌、Button/Textarea/Dialog/DropdownMenu/Avatar/Tooltip/Select 7 个核心组件规范
- 无障碍规范（对比度、最小点击区、aria-label、prefers-reduced-motion）

### 设置页 UI 优化
- **去除重复标题**：General/Appearance 标签页移除与 SettingsView header 重复的副标题（`SettingsGeneralTab.tsx`/`SettingsAppearanceTab.tsx`）
- **模型服务商列表**：去掉右侧 `>` 箭头；绿线改为绿色圆点，支持点击切换 `isEnabled`；去掉星标和"当前服务商"按钮（`SettingsModelsTab.tsx`）
- **智能体分类下拉**：`<datalist>` 改为 Radix UI `<Select>`，修复 Tauri WebView2 下拉失效（`AgentsView.tsx`）

### 边框与视觉
- **MergedSidebar 边框**：浅色 `#EAEAE9` / 深色 `#333333`，2px 宽度，外侧 box-shadow 减淡（`MergedSidebar.tsx`）
- **Agent 浮窗边框**：AgentChatWindow / WorkflowAgentWindow 边框颜色同步 MergedSidebar（`AgentChatWindow.tsx`/`WorkflowAgentWindow.tsx`）
- **用户气泡操作栏**：修复浅色模式下复制/布局切换按钮不可见（`text-white` → `text-muted-foreground`，因按钮在气泡外部页面背景上）（`ChatMessageBubble.tsx`）

### 工作流导出
- **原生保存对话框**：安装 `@tauri-apps/plugin-dialog` + `@tauri-apps/plugin-fs`，导出弹出系统"另存为"对话框，用户选择保存路径（`WorkflowCanvas.tsx`/`lib.rs`/`Cargo.toml`）

### 思考过程（Thinking）
- **类型扩展**：`AgentResponse.content` 新增 `thinking?: string` 字段（`models.ts`）
- **API 启用**：`streamText` 传入 `experimental_thinking: { enabled: true }`，支持 Claude 等模型的 extended thinking（`api.ts`）
- **流式处理**：`runAgentResponse` 并发消费 `textStream` + `reasoningTextStream`，新增 `addAgentThinkingStream` action（`chatSlice.ts`）
- **UI 渲染**：`ThinkingBlock` 组件，默认折叠显示一行预览，点击展开滚动查看完整思考过程，流式时 Brain 图标脉冲动画（`ChatMessageBubble.tsx`）
- **思维程度控制**：输入框工具栏 Brain 图标，弹出选择器（默认自动/关闭），通过 `thinkingLevel` 参数传递到 API（`SimpleChatView.tsx`/`WorkflowChatView.tsx`/`chatSlice.ts`/`api.ts`）

### 日志监测系统
- **持久化**：`debugLogger` 新增 localStorage 存储（200 条上限），启动自动加载，2s 防抖写入（`debugLogger.ts`）
- **流式监控**：`StreamMonitor` 类跟踪活跃流状态、chunk 计数、字符数、15s 卡顿检测（`debugLogger.ts`）
- **新事件类型**：`stream_start`/`stream_chunk`/`stream_end`/`stream_stall`/`stream_error`/`performance`（`debugLogger.ts`）
- **chatSlice 集成**：`runAgentResponse` 集成 `streamStart`/`streamChunk`/`streamEnd`/`streamError`（`chatSlice.ts`）
- **DebugOverlay 增强**：新增 Streams/Perf 筛选标签，聚合流式事件计数（`DebugOverlay.tsx`）
- **Rust 侧日志**：`tauri-plugin-log` 输出到 `%APPDATA%/SimperStudio/logs/`，5MB 轮转（`lib.rs`/`Cargo.toml`）
- **CLI 进程监控**：spawn/成功/失败/超时全部记录日志（`cli_agent.rs`）

---

## v0.4.3（2026-05-29）

### 引擎
- **循环幂等键修复**：`engine.ts` 幂等键改为 `${executionId}:${nodeId}:${loopNodeId}:${loopIndex}`，循环体内每轮迭代独立执行（修复狼人杀非首轮角色不执行）
- **工作流执行入口**：`WorkflowChatView` 标题栏添加「执行工作流」按钮，5 分钟全局超时保护
- **引擎结果写聊天**：`onNodeResult` 回调把 agent / dynamic-agent 节点 LLM 回复写入 chat session，含 toast + screen-shake

### 流式与附件
- **流式响应取消**：session 级 `AbortController` Map + `cancelSessionStream` action + `activeStreamingSessionIds`，四个输入区发送↔停止按钮切换
- **附件上传**：Paperclip 按钮 + 文件选择 + chips；`sendToAgent` 接口增加 `attachments` 参数；用户气泡显示文件名+大小
- **复制成功动画**：`Copy` → `Check`（绿色）2s 渐回

### 修复
- WorkflowNodePanel 过滤包含 `dynamic-agent`，修复 agent 查找逻辑
- SimpleChatView/WorkflowChatView 的 agent 列表按 id 去重

---

## v0.4.2（2026-05-27）

### 审计与整改
- 工程部 + 设计部 6 角色联合审计，产出 P0-P3 分级整改清单
- 边框间距修复（GlobalSidebar 与 ContextSidebar 边框重叠）
- P10 GlobalSidebar 聊天与工作流会话拆分方案规划

### 安全与稳定
- **沙箱化表达式求值**：AST 解释器（`tokenizeExpression` + `ExprParser` + `evalNode`），移除 `new AsyncFunction + with(payload)`
- **Code 节点隔离**：Web Worker（`createCodeWorker` + `executeInWorker`），10s 超时后 `worker.terminate()`
- **withTimeout 竞态修复**：`timeoutId` 类型修正

### API 修复
- `streamText` 参数补传 `maxTokens`/`temperature`
- 新增 `setActiveProvider` action，UI 提供「设为当前」按钮
- 移除 `apiKey` fallback 不一致

### 持久化修复
- **Agent 双写不一致修复**：`baseSlice` 移除 `writeConfig('agents.json')`，仅以 SQLite 为持久化层
- **Tauri app data 目录**：`db.rs` 使用 `dirs::data_dir().join("SimperStudio")`
- **数据库索引**：`idx_chat_messages_session` / `idx_chat_sessions_workspace` / `idx_workflows_workspace`
- **流式持久化**：新消息先写库再改内存（失败回滚），流式片段仅改内存，完成后追加 `update_chat_message` 终态落库

### 类型与架构
- 修复 `WorkflowNodeData` 类型失控
- 子工作流执行器递归调用实现

### 合规
- LICENSE 文件（MIT）
- React Error Boundary（含 `ErrorFallback`）
- `prefers-reduced-motion` 全局支持

---

## v0.4.1（2026-05-18）

- **Retry 在原气泡重新生成**：`retryAgentResponse` action，复用原 `messageId`
- **Provider/Model 信息位置调整**：移至 Agent 名称后方
- 气泡底部视觉降噪（`text-muted-foreground/50`）
- WorkflowChatView 补传 `agents` / `onRetry` props
- 拓扑视图消息过滤修复（支持 `nodeId === undefined` 的全局消息）
- Agent 头像样式对齐（`rounded-full` + `Bot`）
- Retry 逻辑统一（不重复添加用户消息）

---

## v0.4.0（2026-05-17）

### 架构重构
- **Store 五层 Slice 拆分**：2000+ 行单体 `appStore.ts` 拆为 baseSlice / chatSlice / modelSlice / uiSlice / workflowSlice
- **工作流引擎 v2**：从类式改为函数式，`executeWorkflow` 提取为纯函数，新增 `nodeRegistry` 注册表，13 种节点独立 executor
- **侧边栏组件化**：ContextSidebar 拆为 ChatSidebar / WorkflowSidebar / AgentsSidebar 独立组件
- 引擎增强：AbortSignal、`onStateChange` 回调、Schema 校验、节点级 timeout/retry/onError

### 新功能
- **Agent 分类系统**：`category` 字段，分类筛选
- **批量编辑模式**：选择 + Provider/Model 批量改
- **三级模型解析链**：`agentProviderRouter.ts` 节点 → Agent → 全局
- **Provider/Model 选择器重构**：移除 per-agent API Key
- **工作流节点模型覆盖**：`overrideProviderId` / `overrideModelId`
- **SortableList**：通用拖拽排序（鼠标 + 触摸）
- **WorkflowTopologyPreview**：只读拓扑预览
- **AgentCard**：可复用卡片，支持批量选择

---

## v0.3.0（2026-05-07）

### API 与服务商
- **三种 API 格式切换**：OpenAI Chat Completions / Responses / Anthropic Messages
- **DeepSeek 服务商**（`deepseek-chat` / `deepseek-reasoner`）
- **SiliconFlow 服务商**接入完成
- **服务商管理优化**：行内添加（去除弹窗）、类型可切换、默认全部不启用
- **API Key 显示/隐藏**：按住 👁 显示明文
- **模型连通性测试**：单个 ▶ 测试 + 全部模型批量测试
- **模型分组名**支持点击修改
- **获取模型列表**弹窗支持重新获取
- 修复 `@ai-sdk/openai` v3 默认走 Responses API 导致兼容服务商 404

### 设置页重构
- **SettingsView 组件化**：拆为 SettingsView(壳) + SettingsGeneralTab + SettingsAppearanceTab + SettingsModelsTab
- 对话框内聚在对应页签，根除跨作用域黑屏

### 持久化
- Rust 统一单文件 `config/config.json`，按 key 读写
- 浏览器 `localStorage.simper_config` 回退
- `.gitignore` 排除 `config/` 目录

### 修复
- 聊天侧边栏选中工作流后主聊天区拓扑不切换
- 新建会话按钮浏览器模式无效
- 深色模式 SelectItem 悬停对比度

---

## v0.2.0（2026-05-04）

- **多服务商模型管理**：OpenAI / Anthropic / Gemini / Custom，每服务商支持多模型
- **设置页重新设计**：左列表 + 右详情布局
- **侧边栏按视图区分内容**
- **聊天视图双列合并为单列+标签切换**
- **MiniMap**（工作流画布）
- WorkflowChatView Bot 按钮

---

## v0.1.0（2026-04-29）

- 初始版本发布
- 基础 UI 框架（Tauri + React + Vite）
- 工作流引擎 MVP
- Loop 节点支持
- 狼人杀示例工作流

---

## 已完成的设计专项（按 P 优先级）

### P0 — Chat 重构闭环（v0.3-v0.4）
- ChatSession `mode: single | workflow`
- ChatMessage 元数据（workflowId / nodeId / sourceAgentId 等）
- WorkflowConversationWindow 浮窗系统
- ChatInterface 拆分（按 mode 分流）
- WorkflowChatView + WorkflowAgentWindow
- forwardAgentReplyToNext / autoSendToNext

### P1 — 节点生态扩展（v0.2-v0.3）
- HTTP Request / Set/Transform / IF/Switch / Wait/Delay 节点（v0.2）
- Merge / Webhook Trigger / Sub-workflow（v0.3）
- 节点契约（timeoutMs / retryPolicy / onError / Schema）
- 节点面板分类筛选与搜索
- 工作流导入导出（JSON 文件 / 粘贴）

### P2 — 可靠运行时（v0.4.0-v0.4.2）
- Schema 校验、统一失败/重试/超时策略
- 幂等键 + 断点续跑 + 取消执行
- AST 解释器替代 Function 求值
- Web Worker 隔离 Code 节点

### P3 — 可观测性（v0.4.0-v0.4.2）
- NodeExecutionRecord / WorkflowExecutionRecord
- 节点级输入/输出快照
- ExecutionTimeline UI（含从失败节点重跑、单节点重跑）
- 导出执行日志（JSON）

### P4 — 多服务商管理（v0.2-v0.3）
- ProviderModel / ModelProvider / Settings 类型
- Provider CRUD + setActiveProvider
- API 层 fetchFromProvider 多 SDK 适配
- 6 种服务商默认配置（全部 disabled）

### P9 — Agent 批量管理（v0.4.0）
- 分类系统 + 批量编辑模式
- batchUpdateAgents（Set O(1) 优化）
- 三级模型解析链
- 工作流节点模型覆盖

### P10 — 聊天与工作流会话拆分（v0.4.0）
- `currentView` 增加 `workflowChat`
- WorkflowChatSidebar / SimpleChatPlaceholder / WorkflowChatPlaceholder
- 视图状态持久化（localStorage）
- 移除自动创建默认会话

### P12 — 代码审查修复（v0.4.3）
- SimpleChatView showTopology / Agent 选择器接通
- WorkflowChatView 拓扑/聊天切换
- 服务商删除确认弹窗
- API Key React 化
- 错误使用 Toast 替代 alert
- 工作流新节点放置在视窗中心
- 主题切换支持 system 模式
- WorkflowCanvas 双 effect 简化
- 狼人杀测试数据通用化（`testPayload` 字段）

### P13 — 设计审计整改（v0.4.3-v0.4.4）
- Tooltip 延迟 400ms
- ContextSidebar 折叠按钮 aria 属性
- SettingsView Tab 无障碍
- 字号/间距/主色对齐（部分完成）

### P14 — CLI Agent 节点（v0.4.4）
- Rust 后端：`cli_agent.rs` + 子进程注册表
- 类型：`WorkflowCliAgentNodeData` / `CliToolPreset` / `Settings.cliTools`
- 执行器：`cliAgentExecutor.ts`（流式 + 文件快照对比 + AbortSignal）
- UI：`CliAgentNode.tsx` + `SettingsCliTab.tsx`（4 页签 Settings）
- Engine signal 透传

### P8 — 模块化重构（v0.4.0）
- Phase 1: Store 5 slice 拆分
- Phase 2: 引擎提取为纯函数模块
- Phase 3: ContextSidebar 拆分（已被 P13 MergedSidebar 替代）
