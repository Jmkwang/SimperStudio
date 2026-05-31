# SimperStudio

SimperStudio 是一个本地优先（local-first）的桌面应用，把多智能体聊天与可视化工作流自动化整合在同一个界面中。它强调轻量、流畅、实用，面向日常 AI 辅助工作场景。

## 亮点

- 支持 `@` 提及与流式响应的多智能体聊天
- 基于 React Flow 的可视化工作流构建器
- 15 种已实现节点类型：`trigger`、`agent`、`condition`、`code`、`loop`、`output`、`router`、`http`、`set`、`switch`、`wait`、`merge`、`webhook`、`subworkflow`、`dynamic-agent`
- 工作流执行时间线，支持实时状态、结果预览和重新运行
- 浅色/深色主题支持
- Tauri 桌面外壳（Rust 后端 + React 前端）

## 节点速览

| 节点 | 说明 |
|------|------|
| `trigger` | 工作流入口，触发执行流程。 |
| `agent` | 调用 LLM 根据系统提示词生成回复。 |
| `condition` | 基于 JS 表达式求值，将数据路由到匹配分支。 |
| `code` | 执行自定义 JavaScript，支持异步和超时保护。 |
| `loop` | 遍历数组，每次迭代注入上下文变量并聚合结果。 |
| `output` | 终止工作流并返回最终执行结果。 |
| `router` | 多分支路由分发（与 condition 共享执行逻辑）。 |
| `http` | 发送 HTTP 请求，支持模板变量替换和超时重试。 |
| `set` | 字段映射、常量注入和输出白名单过滤。 |
| `switch` | 基于条件值匹配的多分支路由（first match wins）。 |
| `wait` | 固定延时等待或条件轮询等待后继续执行。 |
| `merge` | 合并多个上游节点的输出结果到统一 payload。 |
| `webhook` | 提供 HTTP 端点供外部系统触发工作流执行。 |
| `subworkflow` | 调用并执行其他工作流，支持参数传入和结果回传。 |
| `dynamic-agent` | 从 payload 或模板读取配置的运行时可变角色 Agent。 |

## 技术栈

- **桌面运行时：** [Tauri v2](https://v2.tauri.app/)
- **前端：** React 19 + Vite + TypeScript
- **UI：** Tailwind CSS + shadcn/ui + Radix UI
- **状态管理：** Zustand
- **工作流画布：** [React Flow](https://reactflow.dev/)
- **LLM 集成：** Vercel AI SDK providers

## 工作流引擎说明

当前运行时支持：

- **条件路由：** 命中第一条条件分支即继续执行
- **Code 节点执行：** 支持异步 JavaScript，带超时保护
- **Loop 节点执行：**
  - 按 `itemsPath` 迭代
  - 注入 `itemAlias` 与 `indexAlias`
  - 暴露 `payload.loop = { currentItem, index, total }`
  - 支持 `breakCondition`
  - 支持节点级迭代上限（`maxIterations`）
  - 支持全局工作流步骤上限，防止图执行失控

## 工作原理

### 聊天模式
与 AI 智能体实时交互。在不同智能体之间切换，用 `@` 提及它们，获得流式响应。完美用于头脑风暴、问答和协作思考。

### 工作流模式
通过连接节点构建可视化自动化管道。每个节点执行特定任务——调用 LLM、获取数据、转换数据或基于条件路由。工作流可以手动触发、定时执行或通过 webhook 触发。

### 动态智能体
一项强大的功能，让你在运行时配置智能体的角色。与其硬编码智能体行为，你可以通过工作流负载传递智能体配置（名称、系统提示、模型）。支持"智能体设置智能体"等灵活模式，其中领导智能体可以动态为团队成员分配角色。

## 使用示例

### 示例 1：并行多智能体分析（一对多）
单个用户查询由 3 个专业智能体并行分析，然后合并结果并综合。

**工作流：**
```
Trigger（用户输入）
  ├─→ Dynamic Agent（市场分析师）──┐
  ├─→ Dynamic Agent（技术评审员）  ├─→ Merge → Agent（综合分析）→ Output
  └─→ Dynamic Agent（风险评估员）──┘
```

**应用场景：** 产品评估、投资分析、综合研究报告。

### 示例 2：顺序数据管道与分支路由
获取数据、验证数据，然后根据数据类型路由到不同的处理路径。

**工作流：**
```
Trigger（定时触发）
  → HTTP（获取数据）
  → Code（验证并分类）
  → Switch（按类型路由）
      ├─→ Agent（处理财务数据）→ HTTP（保存到财务数据库）
      ├─→ Agent（处理用户数据）→ HTTP（保存到用户数据库）
      └─→ Agent（处理日志）→ HTTP（归档到存储）
  → Output
```

**应用场景：** ETL 管道、数据摄取、多目标数据路由。

### 示例 3：动态智能体团队与循环
领导智能体动态创建并分配任务给团队成员，每个成员处理其任务，结果被聚合。

**工作流：**
```
Trigger（项目简报）
  → Agent（项目经理 - 创建任务列表）
  → Loop（遍历任务）
      → Dynamic Agent（从负载读取任务配置）
      → Code（处理任务）
      → Merge（聚合结果）
  → Agent（总结员 - 最终报告）
  → Output
```

**应用场景：** 项目管理、团队协作、动态任务分配。

## 开发

### 系统要求

- **Node.js** 18+
- **npm** 或 yarn
- **Rust 工具链**（用于 Tauri 桌面构建）
  - **Windows：** Visual Studio Build Tools 2019+ 或 Visual Studio Community（含 C++ 工作负载）
  - **macOS：** Xcode 命令行工具（`xcode-select --install`）
  - **Linux：** `build-essential`、`libssl-dev`、`libgtk-3-dev`、`libayatana-appindicator3-dev`、`librsvg2-dev`

### 快速开始

```bash
# 1. 克隆并安装依赖
git clone <repository-url>
cd SimperStudio
npm install

# 2. 开发模式（仅 Web，http://localhost:1420）
npm run dev

# 3. 桌面开发（带 Tauri 热重载）
npm run tauri dev

# 4. 运行测试
npm test              # 单次运行
npm run test:watch   # 监视模式

# 5. 生产构建
npm run build         # 构建前端
npm run tauri build   # 打包桌面应用
```

## 项目状态

### 已实现

- 核心应用布局与导航
- 多智能体聊天 UI 与流式响应链路（single + workflow 双模式）
- 工作流画布编辑与持久化（React Flow + MiniMap）
- 15 种节点类型 + 执行引擎 v2（BFS 队列 + 注册表架构）
- 动态智能体节点，支持运行时可配置的角色
- Loop 节点 UI + 运行时语义（迭代、breakCondition、结果聚合）
- Agent 回复原位重新生成（retry）
- 多服务商模型管理（OpenAI/Anthropic/Gemini/DeepSeek/SiliconFlow/Custom/Ollama）
- Agent 批量管理与分类系统
- 工作流导入导出（JSON 文件 + 粘贴导入）
- 执行时间线 + 可观测性与重跑支持
- 工作流聊天 + 浮窗 Agent 窗口 + 转发链路
- 配置持久化（Tauri JSON 配置 + localStorage 回退）
- 无障碍改进（焦点状态、aria-labels、键盘导航）

### 进行中 / 下一步

- 发布打包（Tauri 跨平台打包：Windows/macOS/Linux）
- 额外的工作流模板和示例
- 大型工作流的性能优化

## 常见问题

**Q: 我的数据存储在哪里？**  
A: 所有数据（工作流、聊天、智能体、设置）存储在本地的 `%APPDATA%\SimperStudio\`（Windows）、`~/Library/Application Support/SimperStudio/`（macOS）或 `~/.local/share/SimperStudio/`（Linux）。没有任何数据发送到外部服务器。

**Q: 我可以离线使用 SimperStudio 吗？**  
A: 可以，用于本地工作流和聊天。但是，调用外部 LLM API（OpenAI、Anthropic 等）需要互联网。通过 Ollama 的本地模型完全离线工作。

**Q: 我如何导出或备份我的工作流？**  
A: 右键单击工作流 → 导出为 JSON。你也可以通过粘贴 JSON 或选择文件来导入工作流。备份存储在本地数据目录中。

**Q: 聊天和工作流模式有什么区别？**  
A: **聊天**用于与智能体的实时对话。**工作流**用于构建逐步运行的自动化管道。工作流可以包含聊天步骤（智能体节点），但专为复杂的多步自动化设计。

**Q: 我可以按计划运行工作流吗？**  
A: 可以，使用设置为"定时"的 Trigger 节点并配置 cron 表达式。也支持 webhook 用于外部触发。

**Q: 什么是动态智能体？**  
A: 动态智能体在运行时从工作流负载读取其配置（名称、系统提示、模型）。这支持灵活的模式，其中一个智能体可以动态生成和配置其他智能体。

**Q: 我如何调试失败的工作流？**  
A: 打开工作流并点击"运行"。执行时间线显示每个节点的状态、持续时间和输出。点击节点以检查其结果负载。

## 贡献

我们欢迎贡献！要开始：

1. Fork 仓库
2. 创建功能分支（`git checkout -b feature/amazing-feature`）
3. 进行更改并充分测试
4. 用清晰的消息提交
5. 推送到你的 fork 并打开 Pull Request

请确保：
- 代码遵循现有风格（2 空格缩进、TypeScript 严格模式）
- 测试通过（`npm test`）
- 如需要更新文档
- 在 `docs/CHANGELOG.md` 中记录更改

对于重大更改，请先打开 issue 讨论你的提案。

## 许可证

本项目采用 [MIT 许可证](LICENSE) — 可自由使用、修改和分发。

## 致谢

SimperStudio 建立在开源创新和现代 AI 能力的基础之上。我们深深感谢以下项目和工具的支持：

### 设计与灵感

- **[CherryStudio](https://github.com/kangfenmao/cherry-studio)** — 证明了轻量级、优雅的多智能体聊天界面可以既强大又令人愉悦。启发了我们对对话 UX 和智能体管理的方法。
- **[n8n](https://n8n.io/)** — 开创了可视化工作流自动化范式。他们的节点架构和执行模型塑造了我们工作流引擎的设计哲学。

### AI 与开发智能

- **[Claude Code](https://claude.com/claude-code)** — 通过智能代码生成、重构建议和架构指导加速了开发。帮助我们在整个代码库中保持代码质量和一致性。
- **[ChatGPT](https://openai.com/chatgpt)** — 在整个项目生命周期中提供了快速原型设计、文档编写和问题解决协助。
- **[Codex](https://openai.com/blog/openai-codex/)** — 开创了 AI 辅助代码生成，为现代代码智能工具奠定了基础。
- **[Kimi](https://kimi.moonshot.cn/)** — 为复杂算法设计提供了深度推理，特别是在工作流引擎优化和状态管理架构方面。
- **[DeepSeek](https://www.deepseek.com/)** — 为自然语言处理功能和多语言支持提供了高效的语言理解。

### 技术基础

- **[Tauri](https://tauri.app/)** — 使我们能够构建轻量级、安全的桌面应用，占用空间小且具有原生 OS 集成。
- **[React Flow](https://reactflow.dev/)** — 为我们的工作流编辑器提供了可视化画布基础。
- **[Vercel AI SDK](https://sdk.vercel.ai/)** — 通过统一接口简化了多提供商 LLM 集成。

### 愿景

SimperStudio 代表了思想的汇聚：CherryStudio 的对话优雅、n8n 的自动化力量，以及现代 AI 模型的智能。通过将这些元素与深思熟虑的设计和开源原则相结合，我们创造了一个工具，使用户能够构建复杂的 AI 工作流而无需复杂性。

无论你是在编排多智能体团队、自动化数据管道，还是探索新的 AI 模式，SimperStudio 都被设计为你在 AI 时代的协作伙伴。

## 更多文档

- `README.md` – 英文概览
- `docs/Development.md` – 架构、技术栈和开发指南
- `docs/PRD.md` – 产品需求和愿景
- `docs/Features.md` – 完整功能清单
- `docs/Design.md` – UI/UX 设计系统和令牌
- `docs/TODO_active.md` – 当前任务和路线图
- `docs/CHANGELOG.md` – 版本历史和已完成项
- `docs/reference/` – 技术参考（节点、存储、命令、视图、工作流引擎、聊天系统）
