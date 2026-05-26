# SimperStudio - 已支持功能清单

> 本文档记录 SimperStudio 当前版本已实现的全部功能，基于代码实际状态整理。

---

## 1. 布局与导航

### 1.1 应用布局
- 三栏布局：GlobalSidebar | ContextSidebar + Header | MainContent
- ContextSidebar 支持拖拽调整宽度（240px - 400px）
- 响应式折叠模式

### 1.2 全局导航栏（GlobalSidebar）
- **聊天视图**（Chats）：进入聊天界面
- **工作流视图**（Workflows）：进入工作流编辑器
- **智能体视图**（Agents）：进入智能体管理
- **提示词生成器**（Prompts）：进入提示词工程页面
- **主题切换**：Light / Dark / System 三模式
- **设置页面**（Settings）：进入应用设置

### 1.3 上下文侧边栏（ContextSidebar）
- **聊天模式**：顶部标签切换「工作流 / 会话」，单列显示
  - 工作流列表：点击创建工作流驱动的会话，选中高亮
  - 会话列表：点击切换会话，支持多 Agent 标签显示
- **工作流模式**：仅显示工作流列表，支持新建、选中
- **智能体模式**：显示智能体列表，支持搜索、行业筛选
- **其他视图**（提示词/设置/个人资料）：不显示侧边栏

---

## 2. 聊天系统

### 2.1 单 Agent 聊天（SimpleChatView）
- Agent 选择器下拉菜单（头像、名称、行业）
- 消息输入框（Shift+Enter 换行）
- 流式消息发送（loading 状态指示）
- Token 实时计数显示
- 消息列表渲染（用户消息 + Agent 回复）
- 面包屑导航栏（Workflow > Session 路径）
- 空状态引导（选择 Agent 开始聊天）

### 2.2 工作流聊天（WorkflowChatView）
- ReactFlow 拓扑图（只读）展示工作流节点结构
- 使用 Chat 系列只读节点（ChatTriggerNode, ChatAgentNode 等 6 种）
- "Test Run" 按钮执行工作流
- "拓扑/聊天" 模式切换按钮（仅多 Agent 时显示）
- WorkflowNodePanel 侧边面板（Agent 节点列表）
- ExecutionTimeline 执行时间线
- MiniMap + Controls + Background
- 浮窗 Agent 聊天窗口系统

### 2.3 双 Agent 对比聊天（DualAgentChatView）
- 左右并排两个 Agent 结果卡片
- 模拟流式打字效果（逐字显示）
- 共享消息输入框
- 空状态提示

### 2.4 多模型对比（MultiModelComparison）
- 多模型标签选择器（勾选/取消模型）
- 共享消息输入框
- 每个模型的回复卡片（垂直堆叠）
- 回复状态指示（streaming / complete）
- 每条回复的操作按钮：Select、Copy、Like、Bookmark、Delete

### 2.5 Agent 拓扑视图（AgentTopologyView）
- 以 ReactFlow 拓扑图展示会话中 Agent 关系
- 自动布局 Agent 节点
- 点击 Agent 节点切换到聊天模式
- 返回聊天模式按钮

### 2.6 消息气泡（ChatMessageBubble）
- 用户消息 vs 助手消息样式区分
- Agent 头像显示
- Markdown/HTML 内容渲染
- 流式打字光标动画（streaming 状态）
- 悬浮操作栏

### 2.7 消息悬浮操作栏（MessageHoverActions）
- **8 项操作**：
  - Copy（复制消息内容）
  - Rerun（重新运行该 Agent 回复）
  - Forward（转发到下一个 Agent）
  - Rerun & Forward（重新运行并转发）
  - Quote（引用消息）
  - Like / Dislike（点赞/踩）
  - Bookmark（收藏）
  - Delete（删除消息）
- 工作流模式下显示 forward / rerun-forward 按钮

### 2.8 Agent 结果卡片（AgentResultCard）
- Agent 头像 + 名称
- 消息内容渲染
- 流式打字效果
- Copy / Like / Bookmark 操作按钮

### 2.9 Agent 聊天浮窗（AgentChatWindow）
- 可拖拽标题栏
- Agent 头像 + 名称 + 状态
- 消息列表（用户消息 + Agent 回复）
- 流式打字效果
- 消息输入框
- 独立的 Agent 会话上下文

### 2.10 工作流 Agent 浮窗（WorkflowAgentWindow）
- 可拖拽标题栏
- 最小化 / 关闭按钮
- 节点标签 + Agent 名称 + 状态指示
- 三种特殊操作：Rerun、Forward、Rerun & Forward
- 消息输入框（发送到指定 Agent）
- 流式响应显示

---

## 3. 工作流系统

### 3.1 工作流画布（WorkflowCanvas）
- 画布交互：拖拽、缩放、平移、框选、对齐
- 添加节点面板：浮动按钮展开节点类型列表（支持搜索过滤）
- 连接线管理：拖拽连接节点
- 保存工作流（写入 Rust 后端）
- 导出工作流为 JSON 文件
- 测试运行（执行工作流）
- MiniMap 缩略图
- Controls 控件（缩放、适配、锁定）
- Background 背景网格
- ExecutionTimeline 执行时间线覆盖层
- 自动生成默认 edges（trigger -> agent -> output）
- 会话关联（linkWorkflowToSession）

### 3.2 工作流节点类型（13 种）

| 节点 | 说明 | Handles |
|------|------|---------|
| **Trigger** | 手动触发，工作流入口 | source（右侧） |
| **Webhook Trigger** | HTTP Webhook 触发，支持 Method/Path/Auth | source（右侧） |
| **Agent** | 调用 LLM Agent，支持 Prompt 模板、Output Schema、Auto-send | target + source |
| **Code** | 执行自定义 JS 代码（Web Worker 隔离，10s 超时） | target + source |
| **HTTP Request** | 发起 HTTP 请求（GET/POST/PUT/PATCH/DELETE），模板变量替换 | target + source |
| **Router** | 基于 JS 条件表达式的分支路由，动态路由列表 | target + 动态 source |
| **IF/Switch** | 多分支条件判断，动态分支列表 | target + 动态 source |
| **Loop** | 数组遍历，支持 break 条件、max 迭代限制 | target + source |
| **Merge** | 合并多分支输出（Append / by Key / Wait for All） | 2×target + source |
| **Set/Transform** | 字段映射、常量注入、输出白名单过滤 | target + source |
| **Wait/Delay** | 固定延迟 / 条件轮询等待（500ms 间隔，最长 60s） | target + source |
| **Sub-workflow** | 引用并执行其他工作流，参数传入与输出回传 | target + source |
| **Output** | 工作流终端节点，返回最终结果 | target（左侧） |

### 3.3 节点通用配置（NodeBaseConfigSection）
- Label（节点标签）
- Description（节点描述）
- Timeout（超时时间，毫秒）
- Retry Policy：Max Attempts、Backoff Type（fixed/exponential）、Delay
- Error Handling：Stop Execution / Continue / Route to Error Branch
- Input Schema / Output Schema（JSON Schema）

### 3.4 工作流导入导出
- 导出为 JSON 文件下载
- 文件导入：选择本地 `.json` 文件
- 粘贴导入：文本框粘贴 JSON 代码
- 导入校验：节点 id/type/position/data 完整性、edge 的 source/target 存在性

### 3.5 工作流执行引擎
- 队列驱动 DAG 执行器（BFS 遍历）
- 最大步骤限制：1000 步防无限循环
- 幂等保护：executionId + nodeId 组合键
- 取消执行：用户手动 stop + _cancelRequested 标志
- 表达式求值：`with(payload)` 语法支持直接访问 payload 字段

### 3.6 执行容错机制
- **节点超时**：每个节点可配置 timeoutMs
- **重试策略**：可配置 maxAttempts，支持 fixed / exponential 退避
- **Schema 验证**：输入/输出 JSON Schema 类型验证（string/number/boolean/object/array）
- **错误处理策略**：stop / continue / route-to-error

### 3.7 执行监控（ExecutionTimeline）
- 节点执行状态显示（running/success/error/skipped/pending/retrying/cancelled）
- 状态颜色编码 + 脉冲动画（支持 prefers-reduced-motion）
- 节点执行耗时显示（毫秒）
- 节点详情展开/折叠（错误信息、重试次数、结果 JSON）
- 从指定节点重新运行（Rerun from node）
- 导出执行日志为 JSON 文件
- 关闭/清除时间线

---

## 4. 智能体管理

### 4.1 智能体视图（AgentsView）
- **网格视图**：卡片网格展示，按分类分组，支持新建按钮
- **详情视图**：头像 + 名称 + 属性编辑表单 + 返回按钮
- **CRUD 操作**：创建、查看、编辑、删除

### 4.2 智能体侧边栏（ContextSidebar - Agents 模式）
- **分类列表**：按 `category` 或 `industry` 字段分组展示
- **层级导航**：
  - 第一层：分类列表（显示分类名称 + 助手数量）
  - 第二层：点击分类进入该分类下的智能体列表
  - 点击智能体弹出详情/编辑弹窗
- **添加新助手**：置顶「添加新助手」按钮
- **智能体详情弹窗**：点击智能体右侧弹出，展示完整配置并支持编辑
  - 基本信息：头像、名称、描述
  - System Prompt（可编辑）
  - 模型配置：Provider、Model ID
  - 参数：Temperature、Max Tokens
  - API 设置：API Key（脱敏）、Base URL（如有）

### 4.3 智能体属性
- Name（名称）
- Description（描述）
- Avatar URL（头像链接）
- Category（分类，新增字段，用于侧边栏分组）
- Industry（行业分类：General/Product/Engineering/Data/Marketing/Design/Research/Finance）
- System Prompt（系统提示词，多行文本）
- Model Provider（模型供应商）
- Model ID（模型标识符）
- Temperature（温度滑块 0-2，默认 0.7）
- Max Tokens（最大 token 数）
- API Key / Base URL（自定义 API 设置）

### 4.4 预置智能体（12 个）
- organize-assistant（整理助手）、summary-assistant（总结助手）
- architect（架构师）、reviewer（代码审查员）
- host（狼人杀主持人）、wolf-shadow（暗影狼人）、wolf-fury（狂怒狼人）
- seer（预言家）、witch（女巫）、guard（守卫）、hunter（猎人）、villager（村民）

---

## 5. 提示词系统

### 5.1 提示词生成器（PromptGenerator）
- 可编辑的 Meta-Prompt（元提示词）
- 聊天界面（用户输入 + AI 流式回复）
- 流式响应（通过当前活跃 Provider 发送）
- AI 回复的 Markdown 渲染
- 输入框（Shift+Enter 换行）
- 空状态欢迎界面

---

## 6. 模型与服务商管理

### 6.1 多服务商支持
- 支持 4 种服务商类型：OpenAI、Anthropic、Gemini、Custom（OpenAI 兼容）
- 每个服务商支持多个模型配置
- 一个服务商设为"活跃"，所有 AI 调用使用该服务商

### 6.2 设置页（SettingsView）

#### General 标签
- Language 选择：English / 中文 / Español
- Remote Access：局域网访问开关 + 端口配置（独立卡片）

#### Appearance 标签
- Theme 切换：Light / Dark / System

#### Models 标签
- **服务商列表**（左面板）：名称、类型、Base URL、启用状态（ON 标识）
- **服务商详情**（右面板）：
  - 基本信息编辑：Name、Base URL、API Key（密码输入，支持显示/隐藏）、Custom Header
  - 模型管理：
    - **分组展示**：按模型 ID 前缀自动分组（如 `deepseek-ai/xxx` 归入 `deepseek-ai`）
    - 分组可折叠/展开，显示组内模型数量
    - 每个模型显示：Bot 图标、名称、Model ID、默认标记（星标）、删除按钮
  - **测试连接**：发送 "hello" 测试服务商连接状态（测试中/连接正常/连接失败）
  - **获取模型列表**：调用服务商 `/v1/models` API 获取可用模型列表，支持勾选批量添加
  - **手动添加模型**：弹窗输入模型 ID（必填）和名称（可选）
  - 操作：启用/禁用、删除服务商（带确认）、设为当前活跃服务商
- **添加服务商表单**：
  - 表单验证：必填字段为空时红色边框 + 错误提示
  - 按类型自动填充默认名称和 Base URL
  - 添加成功后自动选中新服务商

### 6.3 API 集成
- Vercel AI SDK（streamText）支持流式响应
- 多 Provider 路由：根据活跃 Provider 类型自动选择 AI SDK client
- 自定义 API：OpenAI 兼容格式（createOpenAI with custom baseURL）
- 支持本地模型（Ollama / LM Studio）

---

## 7. 主题与国际化

### 7.1 主题系统（Deep Space Minimalism）
- Light / Dark / System 三模式
- **深色模式**：深空灰黑背景 + 月白/淡紫强调色 + 环境光晕效果
- **浅色模式**：月白灰背景 + 深紫/靛蓝强调色
- 系统主题检测：matchMedia('(prefers-color-scheme: dark)')
- localStorage 持久化（key: simper-studio-theme）
- Tailwind CSS 变量驱动，独立的浅色/深色配色系统
- 圆角设计：核心容器 rounded-2xl，按钮 rounded-xl
- 悬停效果：基于 `--hover` CSS 变量的主题化悬停背景

### 7.2 多语言
- English / 中文 / Español
- useTranslation hook 驱动

---

## 8. 用户资料

### 8.1 ProfileView
- 头像显示 + 更换头像
- Full Name / Email / Bio 编辑
- Update Profile 按钮
- Danger Zone：Delete Account

---

## 9. 技术栈

- **前端框架**：React 19 + TypeScript
- **构建工具**：Vite 6
- **状态管理**：Zustand（持久化到 localStorage）
- **样式方案**：Tailwind CSS 4 + shadcn/ui
- **路由**：React Router v7（Hash 模式）
- **AI SDK**：Vercel AI SDK（流式响应）
- **图标**：Lucide React
- **国际化**：自定义 useTranslation Hook
- **测试**：Vitest + React Testing Library + jsdom
- **代码质量**：ESLint + TypeScript 严格模式

## 10. 项目结构

```
src/
├── components/        # UI 组件
│   ├── ui/           # shadcn/ui 基础组件
│   ├── layout/       # 布局组件（AppShell、侧边栏）
│   ├── chat/         # 聊天相关组件
│   ├── agents/       # 智能体相关组件
│   ├── settings/     # 设置相关组件
│   └── theme/        # 主题相关组件
├── hooks/            # 自定义 Hooks
├── lib/              # 工具函数 + API 调用
├── store/            # Zustand Store
├── types/            # TypeScript 类型定义
├── locales/          # 国际化翻译文件
└── globals.css       # 全局样式 + Tailwind 导入 + CSS 变量
```

## 11. 预置数据

### 11.1 预置工作流（4 个）
- default-workflow（默认工作流）
- pipeline-workflow（管线工作流）
- report-workflow（报告工作流）
- werewolf-standard（狼人杀标准流程）

### 11.2 预置会话（4 个）
- session-1：organize-assistant 单 Agent
- session-2：architect 单 Agent
- session-3：organize-assistant + summary-assistant 双 Agent
- dual-compare-1：双模型对比

### 11.3 预置模型配置
- **OpenAI**：GPT-4o、GPT-4o-mini
- **Anthropic**：Claude 3.5 Sonnet
- **Google**：Gemini 1.5 Pro、Gemini 1.5 Flash
- **活跃 Provider**：OpenAI

---

## 12. 测试覆盖

- 测试框架：vitest + @testing-library/react
- 41 个测试用例覆盖：
  - Store 层：Agent 响应流聚合、chunk 追加、完成状态隔离
  - 工作流执行：线性流程、条件分支、错误传播、断点续跑、执行记录
  - 节点契约：HTTP/IF/Merge/Sub-workflow 的输入输出与错误路径
  - 聊天视图：多 agentResponses 渲染
  - 工作流交互：窗口打开/聚焦/转发

---

*最后更新：2026-05-04*
