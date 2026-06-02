# SimperStudio - 已支持功能清单

> 当前版本基于代码实际状态整理。详细架构见 [Development.md](./Development.md)，节点字段细则见 [reference/nodes.md](./reference/nodes.md)，组件规范见 [Design.md](./Design.md)。

---

## 1. 布局与导航

### 1.1 应用布局
- 双区布局：MergedSidebar（260px 固定）+ Main Content
- 视图驱动路由（11 种 viewMode），详见 [reference/views.md](./reference/views.md)
- `profile` 视图全屏显示（侧栏隐藏）

### 1.2 合并侧栏（MergedSidebar）
旧版 GlobalSidebar(64px) + ContextSidebar(可调) 已合并为统一 260px 深色侧栏。
- **Mode Switcher Pill**：Agent ↔ Workflow 两种模式
- **Nav Items**（按模式动态切换）：
  - Agent 模式：新增会话、智能体、提示词
  - Workflow 模式：工作流会话、工作流编辑器、提示词
- **Recents**：最近 5 项（按 updatedAt 倒序）
- **Gateway**（底部）：Logo + 主题切换 + 设置入口
- 活跃态左侧蓝色指示条；hover 高亮；无内边框

---

## 2. 聊天系统

### 2.1 单 Agent 聊天（SimpleChatView）
- Agent 选择器（DropdownMenu，支持多 Agent 切换）
- 圆角气泡输入框（`rounded-2xl`），无上方分隔线
- 左下附件按钮 + 模型切换器，右下圆形发送按钮
- 流式消息发送，发送按钮在流式中变红色停止按钮
- Token 实时计数（↑prompt ↓completion）
- 拓扑视图切换（AgentTopologyView）
- 面包屑导航（含对话时间）
- 空状态占位（SimpleChatPlaceholder：智能体快速入口卡片）

### 2.2 工作流聊天（WorkflowChatView）
- ReactFlow 拓扑图（只读），13 类只读节点（Chat*Node 系列）
- 「执行工作流」按钮：调用 engine + 5 分钟超时 + 结果回写聊天
- 「拓扑/聊天」模式切换按钮
- WorkflowNodePanel 侧边面板（Agent 节点列表）
- ExecutionTimeline 执行时间线
- MiniMap + Controls + Background
- 浮窗 Agent 聊天窗口系统
- 空状态占位（WorkflowChatPlaceholder：工作流快速入口卡片）

### 2.3 双 Agent 对比（DualAgentChatView）
- 左右并排两个 Agent 结果卡片
- 共享消息输入框

### 2.4 多模型对比（MultiModelComparison）
- 多模型标签选择器
- 共享消息输入框
- 每模型回复卡片（垂直堆叠 + 状态指示）
- 操作按钮：Select / Copy / Like / Bookmark / Delete

### 2.5 Agent 拓扑视图（AgentTopologyView）
- ReactFlow 展示会话中 Agent 关系
- 自动布局；点击节点切换聊天

### 2.6 消息气泡（ChatMessageBubble）
- 用户/助手区分样式
- **用户消息**：长文本自动折叠（>300字符或>6行），底部渐变遮罩，点击展开/收起；hover 时显示复制按钮
- **助手消息**：带头像（`h-10 w-10` 圆形）+ Agent 名称（白色加粗）+ 模型信息（灰色）+ 正文
- **布局切换**：hover 用户消息时显示切换按钮（A=卡片堆叠/B=垂直列表），偏好持久化
- Markdown/HTML 内容渲染
- 流式打字光标（支持 `motion-reduce`）
- 底部元信息：时间右对齐、Token、耗时（颜色 `/70`，对比度达标）
- 操作按钮：Copy（成功 2s 渐回）+ Retry

### 2.7 消息悬浮操作（MessageHoverActions）
8 项：Copy / Rerun / Forward / Rerun & Forward / Quote / Like / Bookmark / Delete。工作流模式下显示 Forward / Rerun & Forward。

### 2.8 浮窗系统
- **AgentChatWindow**（通用 Agent 浮窗）
- **WorkflowAgentWindow**（工作流节点浮窗，含 Rerun / Forward / Rerun & Forward 三种特殊操作）
- 可拖拽、最小化、关闭、聚焦（z-index 维护）

### 2.9 流式响应取消
- Session 级 AbortController（模块级 Map 维护，不进 store）
- 四个输入区（SimpleChat / WorkflowChat / WorkflowAgentWindow / AgentChatWindow）发送↔停止按钮切换
- `cancelSessionStream(sessionId)` 一键中断该 session 所有进行中流

### 2.10 附件上传
- Paperclip 按钮 + 文件选择 + chips 显示（`max-w-[160px] truncate`）
- `sendToAgent` 接口接收 `attachments` 参数
- 附件信息注入 LLM prompt
- 用户气泡显示文件名+大小

### 2.11 转发链路
- `forwardAgentReplyToNext`：通过 edges 找后继节点
- `autoSendToNext` 节点配置：回复完成自动转发
- `rerunAgentReply` / `rerunAndForwardAgentReply`
- `retryAgentResponse`：原气泡内重生成（复用 messageId）

---

## 3. 工作流系统

### 3.1 工作流画布（WorkflowCanvas）
- 拖拽、缩放、平移、框选
- 节点面板：浮动按钮 + 类型搜索 + 分类筛选（Trigger / Flow / Data / AI / Integration / Output）
- 拖入节点定位在视窗中心（`screenToFlowPosition`）
- 连接线管理
- 保存到 SQLite
- 导入导出 JSON（文件 / 粘贴）
- Test Run（含 testPayload 配置）
- MiniMap / Controls / Background
- ExecutionTimeline 覆盖层
- 自动生成默认 edges（trigger → agent → output）

### 3.2 工作流节点（13 个执行器 + 1 个 UI 触发器）

完整清单见 [reference/nodes.md](./reference/nodes.md)。摘要：

| 分类 | 节点 |
|---|---|
| Trigger | trigger、webhook（仅 UI） |
| AI | agent、dynamic-agent、cli-agent |
| Data | code（Web Worker）、set/transform |
| Flow Control | condition、switch、loop、wait、merge |
| Integration | http、subworkflow |
| Output | output |

新增于 v0.4.4 的 **CLI Agent 节点**：通过 Tauri Rust 后端 spawn 子进程调用 Claude Code / Aider 等本地编程智能体，支持流式输出、文件变更检测、白名单限制。

### 3.3 节点通用契约（NodeBaseConfigSection）
所有节点共享：Label / Description / TimeoutMs / RetryPolicy（maxAttempts + backoff + delayMs）/ OnError（stop / continue / route-to-error）/ InputSchema / OutputSchema。

### 3.4 工作流导入导出
- 导出 JSON 文件下载
- 文件导入 + 粘贴导入
- 校验：节点 id/type/position/data 完整性、edge 的 source/target 存在性

### 3.5 工作流执行引擎
- 函数式纯函数 `executeWorkflow`，BFS 队列驱动
- `MAX_WORKFLOW_STEPS = 1000` 死循环保护
- 幂等键：`${executionId}:${nodeId}:${loopNodeId}:${loopIndex}`，循环体内每轮独立
- 表达式求值：**AST 解释器**（沙箱化），**不**使用 `new Function`
- AbortSignal 全链路传递
- `onStateChange` / `onNodeResult` 回调
- Code 节点 Web Worker 隔离 + 10s 超时
- 表达式求值 2s 超时
- 全局执行 5 分钟超时（`workflowSlice` 包裹层）

### 3.6 执行容错
- 节点超时（timeoutMs）
- 重试（fixed / exponential 退避）
- 输入/输出 Schema 校验（string/number/boolean/object/array）
- 错误策略：stop / continue / route-to-error

### 3.7 执行监控（ExecutionTimeline）
- 节点状态：running / success / error / skipped / pending / retrying / cancelled
- 状态颜色 + 脉冲动画（`prefers-reduced-motion` 关闭）
- 节点耗时显示
- 详情展开/折叠（错误信息、重试次数、结果 JSON）
- 从指定节点重跑
- 单节点 debug 重跑
- 导出执行日志 JSON

### 3.8 引擎结果写聊天
`onNodeResult` 回调把 agent / dynamic-agent / cli-agent 节点结果通过 `chatSlice.addAgentResponseStream` + `completeAgentResponse` 写入当前 workflow chat session，伴随 toast + screen-shake 反馈（用户可关闭 `executionFeedback`）。

---

## 4. 智能体管理

### 4.1 AgentsView
- 网格视图（按分类分组）+ 详情视图
- CRUD：创建、查看、编辑、删除
- AgentCard 可复用卡片（支持批量选择）

### 4.2 批量编辑
- "Bulk Edit" / "Exit Bulk" 切换
- 卡片点击切换选中（视觉 ring 高亮）
- 分类级 select all 复选框
- 底部工具栏：选中计数 + Provider 下拉 + Model 下拉 + Apply + Done
- `batchUpdateAgents`（Set O(1) 优化）

### 4.3 分类系统
- Agent `category` 字段
- AgentsSidebar 分类 + Agent 二级导航
- 分类筛选 chip + X 按钮
- `addAgentCategory` action

### 4.4 Agent 属性
- Name / Description / Avatar URL / Category / Industry
- System Prompt
- providerId（替代旧 modelProvider 枚举）
- modelId
- Temperature（0-2）/ MaxTokens
- 旧 apiKey / baseUrl 字段保留兼容

### 4.5 三级模型解析（resolveAgentModelConfig）
1. 节点级覆盖：`overrideProviderId` / `overrideModelId`
2. Agent 级配置：`providerId` / `modelId`
3. 全局默认：`activeProviderId` + 默认模型

每级校验 provider enabled、API Key 非空、模型可用性，失败抛出中文短描述。

### 4.6 预置智能体（12 个）
organize-assistant、summary-assistant、architect、reviewer、host、wolf-shadow、wolf-fury、seer、witch、guard、hunter、villager。

---

## 5. 提示词系统

### 5.1 PromptGenerator
- 可编辑的 Meta-Prompt
- 聊天界面（用户输入 + AI 流式回复）
- 通过当前活跃 Provider 调用
- Markdown 渲染

---

## 6. 模型与服务商管理

### 6.1 多服务商支持
- 6 种服务商类型：**OpenAI / Anthropic / Gemini / DeepSeek / SiliconFlow / Custom**（OpenAI 兼容）
- 每服务商支持多个模型
- 一个服务商设为活跃
- 默认全部 `isEnabled: false`

### 6.2 设置页（SettingsView，4 页签）

#### General
- Language（English / 中文 / Español）
- Remote Access（开关 + 端口，独立卡片）
- Execution Feedback（toast + screen-shake 开关）
- Font Size

#### Appearance
- Theme：Light / Dark / System（循环切换）

#### Models
- 服务商列表（左）：名称 / 类型 / Base URL / 启用状态
- 服务商详情（右）：
  - 基础信息：名称、类型（下拉切换）、API 格式（Chat / Responses / Anthropic Messages）、Base URL（自动补 `/v1`）、API Key（按住 👁 显示）
  - 模型列表：分组折叠（按 ID 前缀自动分组），分组名可点击修改；▶ 单测试 / 星标默认 / 删除
  - 操作：启用/禁用 / 设为当前 / 删除（确认）/ 测试（费用提示）/ 获取模型列表（弹窗 + 重新获取 + 勾选添加）

#### CLI Tools（v0.4.4 新增）
- 默认工作目录
- 可执行白名单
- 默认超时
- 默认是否需要确认
- 预设管理（CliToolPreset CRUD）

### 6.3 API 集成
- Vercel AI SDK v6 + 多 Provider 适配器
- API 格式三选：`openai-responses` / `openai-chat` / `anthropic-messages`
- ensureV1 自动补 `/v1`（用户只需填域名）
- 本地模型支持（Ollama / LM Studio）

---

## 7. 主题与国际化

### 7.1 主题系统
- Light / Dark / System 三态循环
- localStorage 持久化（设置同步到 `settings.theme`）
- `matchMedia('(prefers-color-scheme: dark)')` 监听
- CSS 变量驱动（参见 [Design.md](./Design.md) §2）
- 圆角：`rounded-lg` / `rounded-xl`

### 7.2 多语言
- English / 中文 / Español
- `useTranslation` hook

---

## 8. 用户资料

### ProfileView
- 头像显示 + 更换
- Full Name / Email / Bio 编辑
- Update Profile
- Danger Zone：Delete Account

---

## 9. 调试系统

### Debug 模式（Ctrl+Shift+D）
- `DebugBadge`：每个组件角落小名牌
- `DebugOverlay`：浮窗实时事件流
- `debugLogger.log(type, source, action, data)`：统一入口
- 事件类型：click / state_change / api_call / api_response / error / navigation / workflow_exec / custom
- `useDebugTrack(componentName)`：组件挂载追踪
- 关闭时零开销

---

## 10. 错误处理

### Error Boundary
- 全局 `ErrorBoundary` 包裹 `App`
- `ErrorFallback`：友好错误页（`role="alert"` + 详情 + 重试 + 刷新）

### 业务错误
- `shortError()`：HTTP/网络错误中文翻译（401/403/404/429/500/503/timeout/network）
- 工作流执行失败 toast + screen-shake

---

## 11. 测试

### 测试框架
- Vitest + @testing-library/react + jsdom

### 测试目录
```
src/store/__tests__/                    # 历史路径，仍承载部分用例
  ├── appStore.test.ts                  # 流式响应 store
  ├── workflowExecution.test.ts         # 引擎线性/分支/续跑
  ├── workflowChat.test.ts              # 浮窗交互
  └── nodeContracts.test.ts             # HTTP/IF/Switch/Merge/Wait/Retry/Timeout
src/lib/workflow/nodeExecutors/__tests__/
  └── dynamicAgentExecutor.test.ts      # Dynamic Agent
src/components/chat/__tests__/
  └── ChatMessageBubble.test.tsx        # 渲染
```

### 覆盖范围
- Store 层：addAgentResponseStream、completeAgentResponse、retry
- 引擎：线性、条件、错误传播、断点续跑、节点记录
- 节点契约：IF/Switch/Set/Wait/Merge/HTTP/Retry/Timeout
- 交互：窗口打开/聚焦/关闭/最小化、forwardAgentReplyToNext
- 渲染：多 agentResponses 过滤显示

---

## 12. 持久化

### SQLite 表（Tauri）
- `workspaces` / `agents` / `chat_sessions` / `chat_messages` / `workflows`
- 索引：`idx_chat_messages_session` / `idx_chat_sessions_workspace` / `idx_workflows_workspace`
- 应用数据目录：`<dirs::data_dir>/SimperStudio/simperstudio.db`

### JSON 配置（Tauri）
- 单文件 `config/config.json`，按 key 分片
- `read_json_config(name)` / `write_json_config(name, value)` 命令
- 持久化项：settings、agents（已废弃，仅 legacy 迁移用）、sidebar_orders 等

### 浏览器回退
- 全部回退 `localStorage` 键 `simper_config[<name>]`
- 视图状态：`localStorage.ss_currentView`

---

## 13. 预置数据

### 工作流（4 个）
- `default-workflow`（My First Workflow）
- `workflow-pipeline`（Data Processing Pipeline）
- `workflow-report`（Report Generation）
- `werewolf-standard`（狼人杀标准局，含 testPayload）

### 服务商（6 个，全部 disabled）
- OpenAI（gpt-4o / gpt-4o-mini）
- Anthropic（claude-3.5-sonnet）
- Gemini（gemini-1.5-pro / gemini-1.5-flash）
- DeepSeek（deepseek-chat / deepseek-reasoner）
- SiliconFlow
- Custom

---

## 14. 技术栈速览

| 层 | 选型 |
|---|---|
| 前端 | React 19 + TypeScript 5.8 + Vite 7 |
| 桌面运行时 | Tauri 2.x |
| 样式 | Tailwind CSS 3.4 + shadcn/ui (Radix UI) |
| 工作流画布 | @xyflow/react 12 |
| 状态 | Zustand 5（5 层 slice） |
| AI SDK | ai 6 + @ai-sdk/openai/anthropic/google |
| 后端 | Rust + Rusqlite 0.31 + tokio |
| 测试 | Vitest 4 + @testing-library/react |

---

> 本清单与代码同步更新。新增/删除功能时请在此添加/删除条目并同步 [CHANGELOG.md](./CHANGELOG.md)。
