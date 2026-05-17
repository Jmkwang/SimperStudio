# SimperStudio

SimperStudio 是一个本地优先（local-first）的桌面应用，把多智能体聊天与可视化工作流自动化整合在同一个界面中。它强调轻量、流畅、实用，面向日常 AI 辅助工作场景。

## 亮点

- 支持 `@` 提及与流式响应的多智能体聊天
- 基于 React Flow 的可视化工作流构建器
- 14 种已实现节点类型：`trigger`、`agent`、`condition`、`code`、`loop`、`output`、`router`、`http`、`set`、`switch`、`wait`、`merge`、`webhook`、`subworkflow`
- 1 种设计中：`dynamic-agent`（运行时动态配置角色 — 设计文档见 `docs/plan-dynamic-agent.md`）
- 工作流测试运行面板，支持实时执行状态与结果 payload 预览
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
| `dynamic-agent` *(设计中)* | 从 payload 或模板读取配置的运行时可变角色 Agent。 |

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

## 开发

### 前置要求

- Node.js 18+
- npm
- Rust toolchain + Tauri prerequisites（桌面打包所需）

### 安装依赖

```bash
npm install
```

### 启动 Web 开发服务

```bash
npm run dev
```

### 构建前端

```bash
npm run build
```

### 启动 Tauri 桌面应用（开发模式）

```bash
npm run tauri dev
```

## 项目状态

已实现：

- 核心应用布局与导航
- 多智能体聊天 UI 与流式响应链路（single + workflow 双模式）
- 工作流画布编辑与持久化（React Flow + MiniMap）
- 14 种节点类型 + 执行引擎 v2（BFS 队列 + 注册表架构）
- Loop 节点 UI + 运行时语义（迭代、breakCondition、结果聚合）
- Agent 回复原位重新生成（retry）
- 多服务商模型管理（OpenAI/Anthropic/Gemini/DeepSeek/SiliconFlow/Custom）
- Agent 批量管理与分类系统
- 工作流导入导出（JSON 文件 + 粘贴导入）
- 执行时间线 + 可观测性与重跑支持
- 工作流聊天 + 浮窗 Agent 窗口 + 转发链路
- 配置持久化（Tauri JSON 配置 + localStorage 回退）

进行中 / 下一步：

- Dynamic Agent 节点（设计完成，待实现）— 详见 `docs/plan-dynamic-agent.md`
- 狼人杀工作流升级（dynamic-agent + loop 串行发言）
- Loop 聚合语义细化（`payload.loopResults` 与 `payload.llmResult` 关系）
- 无障碍优化（对比度、点击区、aria-label、键盘导航）
- 发布打包（Tauri 跨平台打包：Windows/macOS/Linux）

## 更多文档

- `README.md` – English overview
- `docs/TODO.md` – 详细进度与分阶段实施清单
- `docs/` – 产品与设计文档
