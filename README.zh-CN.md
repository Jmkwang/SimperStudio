# SimperStudio

SimperStudio 是一个本地优先（local-first）的桌面应用，把多智能体聊天与可视化工作流自动化整合在同一个界面中。它强调轻量、流畅、实用，面向日常 AI 辅助工作场景。

## 亮点

- 支持 `@` 提及与流式响应的多智能体聊天
- 基于 React Flow 的可视化工作流构建器
- 节点类型：`trigger`、`agent`、`condition`、`code`、`loop`、`output`
- 工作流测试运行面板，支持实时执行状态与结果 payload 预览
- 浅色/深色主题支持
- Tauri 桌面外壳（Rust 后端 + React 前端）

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
- 多智能体聊天 UI 与流式响应链路
- 工作流画布编辑与持久化
- Loop 节点 UI + 运行时语义（Step 1 & Step 2）

进行中 / 下一步：

- Loop 结果聚合约定（`payload.loopResults[...]`）
- Werewolf 工作流分阶段迁移（先迁移 Day Speech 到 loop）
- SQLite 持久化整合与发布打包

## 更多文档

- `README.md` – English overview
- `TODO.md` – 详细进度与分阶段实施清单
- `docs/` – 产品与设计文档
