# SimperStudio 开发文档

> 本文档是项目主入口。它**只**讲项目是什么、怎么跑起来、关键架构决策与代码索引。
> 详细事实清单（节点表 / store slice 表 / Tauri 命令表 / 路径索引）在 `reference/` 下分文件维护，避免主文档膨胀。

---

## 1. 项目简介

**SimperStudio** 是 Tauri 2 + React 19 桌面应用，定位"小而美"的 AI 工作流与多智能体协作工具。核心能力分两条线：

- **聊天线**：单智能体对话、工作流驱动多智能体协同、流式响应、附件、@提及
- **工作流线**：可视化 DAG 编排（13 类执行器节点），运行时含重试/超时/失败分支/断点续跑，引擎结果可写回聊天

完整功能清单见 [`Features.md`](./Features.md)。产品愿景与阶段目标见 [`PRD.md`](./PRD.md)。

---

## 2. Quickstart

```bash
# 1. 安装依赖
npm install

# 2. 启动开发模式（Vite + Tauri 热更新）
npm run tauri dev

# 3. 仅前端调试（无 Tauri 后端，使用 localStorage 回退持久化）
npm run dev      # http://localhost:1420

# 4. 单元测试
npm test         # 一次性
npm run test:watch

# 5. 生产构建
npm run build              # tsc + vite build
npm run tauri build        # 打包桌面安装包
```

> **持久化双轨**：Tauri 可用时所有配置写入 `<AppData>/SimperStudio/`（Windows: `%APPDATA%\SimperStudio\`，含 `simperstudio.db` + `config.json`）；浏览器模式回退 `localStorage` 键 `simper_config`。

---

## 3. 技术栈

| 层 | 选型 | 版本 |
|---|---|---|
| 前端框架 | React + Vite + TypeScript | React 19 / Vite 7 / TS 5.8 |
| 桌面运行时 | Tauri | 2.x |
| UI 组件 | Tailwind CSS + shadcn/ui (Radix UI) | Tailwind 3.4 |
| 工作流画布 | `@xyflow/react` (React Flow) | 12.x |
| 状态管理 | Zustand（5 层 slice） | 5.x |
| AI SDK | `ai` v6 + `@ai-sdk/openai`/`anthropic`/`google` | ai 6.0 |
| 后端语言 | Rust + Rusqlite + tokio | rusqlite 0.31 / tokio 1 |
| 数据库 | SQLite（应用数据目录） | bundled |
| 测试 | vitest + @testing-library/react | vitest 4 |

支持的模型服务商：OpenAI、Anthropic、Google Gemini、DeepSeek、SiliconFlow、自定义 OpenAI 兼容端点、本地（Ollama / LM Studio）。

---

## 4. 顶层架构

```
┌─────────────────────────────────────────────────────────────┐
│  React UI (App.tsx → AppShell → MergedSidebar + 视图路由)    │
└──────────────┬─────────────────────────────────┬────────────┘
               │                                 │
       ┌───────▼────────┐               ┌────────▼─────────┐
       │ Zustand Stores │               │ Workflow Engine  │
       │  (5 slices)    │               │ (lib/workflow/)  │
       └───────┬────────┘               └────────┬─────────┘
               │                                 │
               │  invoke / writeConfig           │ executeNode
               │                                 │
        ┌──────▼─────────────────────────────────▼──────┐
        │ Tauri Rust 后端                                │
        │  - db.rs  (SQLite CRUD)                       │
        │  - cli_agent.rs  (子进程 spawn / 终止)         │
        │  - read/write_json_config                     │
        └───────────────────────────────────────────────┘
```

四个核心子系统：

1. **布局系统** — `AppShell` + `MergedSidebar`（260px 固定深色侧栏，已合并旧 GlobalSidebar + ContextSidebar）
2. **状态系统** — 5 层 Zustand slice，组合到 `useAppStore`，详见 [reference/stores.md](./reference/stores.md)
3. **工作流引擎** — 函数式 BFS 队列 + 节点注册表，详见 [reference/workflow-engine.md](./reference/workflow-engine.md)
4. **聊天系统** — single / workflow 两模式，session 级流式 AbortController，详见 [reference/chat-system.md](./reference/chat-system.md)

---

## 5. 目录结构

```
SimperStudio/
├── src/
│   ├── App.tsx                  # 视图路由（11 种 viewMode）
│   ├── main.tsx
│   ├── globals.css              # 设计令牌 + 主题变量
│   ├── components/
│   │   ├── layout/              # AppShell + MergedSidebar + WorkflowNodePanel
│   │   ├── chat/                # 23 个聊天相关组件（含拓扑只读节点）
│   │   ├── workflow/            # 画布 + 14 类节点编辑器 + 时间线
│   │   ├── agents/              # AgentsView（含批量编辑）
│   │   ├── settings/            # 4 页签：General / Appearance / Models / CLI
│   │   ├── prompts/             # PromptGenerator
│   │   ├── profile/
│   │   ├── debug/               # DebugBadge + DebugOverlay（Ctrl+Shift+D）
│   │   ├── theme/
│   │   ├── ui/                  # shadcn/ui 封装
│   │   ├── ErrorBoundary.tsx
│   │   └── ErrorFallback.tsx
│   ├── stores/                  # 5 层 slice（baseSlice 等）
│   ├── lib/
│   │   ├── api.ts               # AI SDK 多服务商适配
│   │   ├── agentProviderRouter.ts # 三级模型解析链
│   │   ├── messageService.ts    # ChatMessage 工厂
│   │   ├── debugLogger.ts
│   │   ├── utils.ts             # cn() 等
│   │   └── workflow/            # 引擎 + 13 个 nodeExecutors
│   ├── hooks/                   # useTranslation / useDebugTrack
│   ├── types/models.ts          # 全部领域类型
│   ├── store/__tests__/         # 历史路径，仍承载部分测试用例
│   └── test/setup.ts            # vitest 全局
│
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs               # Tauri 命令注册（19 个命令）
│   │   ├── db.rs                # SQLite + JSON 配置文件
│   │   └── cli_agent.rs         # 子进程管理（CLI Agent 节点）
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── docs/
│   ├── Development.md           # 本文档
│   ├── Quickstart.md            # 简版上手（可选；正文已含）
│   ├── PRD.md                   # 产品需求
│   ├── Features.md              # 已实现功能清单
│   ├── Design.md                # 设计规范（合并自 Design_Specs + Design_System）
│   ├── TODO_active.md           # 当前未完成任务
│   ├── CHANGELOG.md             # 已完成项按版本归档
│   ├── reference/               # 事实表（自动维护，不写故事）
│   │   ├── nodes.md             # 14 类节点清单（执行器/UI/契约）
│   │   ├── stores.md            # 5 个 slice 字段与 action 表
│   │   ├── tauri-commands.md    # Rust 命令清单
│   │   ├── views.md             # App.tsx viewMode 路由表
│   │   ├── workflow-engine.md   # 引擎执行流程
│   │   └── chat-system.md       # 聊天数据流
│   └── archive/                 # 已完成的 plan / 历史记录 / 审计报告
│
└── public/
```

---

## 6. 关键架构决策

### 6.1 状态分层

`appStore.ts`（2000+ 行单体）已按领域拆为 5 个独立 slice，组合到 `useAppStore`：

| Slice | 职责 |
|---|---|
| `baseSlice` | workspaces、agents、agentCategories、`readConfig`/`writeConfig`、初始数据 |
| `chatSlice` | sessions、messages、流式响应、转发链路、session-level AbortController |
| `modelSlice` | providers、models、settings、`setActiveProvider` |
| `uiSlice` | currentView、各 active ID、debugMode、侧栏排序、view 持久化 |
| `workflowSlice` | workflows、`executeWorkflow`、execution state、cancelExecution |

详细字段表见 [reference/stores.md](./reference/stores.md)。

### 6.2 工作流引擎

`src/lib/workflow/engine.ts` 是纯函数，输入 `{nodes, edges, payload, settings, options}` 返回执行结果。运行特性：

- **BFS 队列驱动**，`MAX_WORKFLOW_STEPS = 1000` 死循环保护
- **节点注册表**（`nodeRegistry.ts`）将 `node.type` 映射到 executor，支持运行时 `registerNodeType()` 动态扩展
- **幂等键** = `${executionId}:${nodeId}:${loopNodeId}:${loopIndex}`，循环体内每轮迭代独立执行
- **统一节点契约**：`timeoutMs` / `retryPolicy` / `onError` / `inputSchema` / `outputSchema`
- **AbortSignal** 全链路传递，用户可随时取消
- **`onNodeResult` 回调** 把 agent / dynamic-agent / cli-agent 的结果实时写回 chat session

完整执行流程与节点契约见 [reference/workflow-engine.md](./reference/workflow-engine.md)，节点清单见 [reference/nodes.md](./reference/nodes.md)。

### 6.3 多服务商模型路由

三级解析链（`lib/agentProviderRouter.ts` 的 `resolveAgentModelConfig`）：

1. **节点级覆盖**：`nodeData.overrideProviderId` / `overrideModelId`
2. **Agent 级配置**：`agent.providerId` / `agent.modelId`
3. **全局默认**：`settings.activeProviderId` + 该 provider 的 `isDefault` 模型

每级校验 provider 存在性、enabled 状态、API Key 非空。`shortError()` 把 HTTP/网络错误翻译为中文短提示。

### 6.4 持久化策略

- **聊天/工作流/Agent** → SQLite（`get_*` / `add_*` / `update_*` / `delete_*` 命令），单文件 `<AppData>/SimperStudio/simperstudio.db`
- **Settings / 排序 / 杂项** → JSON 配置文件，通过 `read_json_config` / `write_json_config` 命令读写 `<AppData>/SimperStudio/config/`
- **浏览器模式** → 全部回退 `localStorage` 键 `simper_config`，便于纯前端 `npm run dev` 调试

### 6.5 调试系统

按下 **Ctrl+Shift+D** 切换 `debugMode`：

- 每个组件在角落显示 `DebugBadge`（绿色/红色名牌）
- `DebugOverlay` 浮窗展示实时事件流（state_change / click / api_call / navigation 等）
- `debugLogger.log(type, source, action, data)` 是统一入口
- `useDebugTrack(componentName)` Hook 自动追踪组件挂载

不在 debug 模式下零开销，订阅器在订阅前判 `state.debugMode`。

---

## 7. 开发规范

### 代码风格
- 缩进 2 空格，单引号，行宽 ~100
- 严格 TS，`any` 仅在 zustand slice 的 `set/get` 入口可用
- 组件用函数 + Hooks，Props 写接口
- 样式 Tailwind + `cn()`（`lib/utils.ts`），遵循 shadcn 模式

### 状态访问
- 优先 `useAppStore` 读全局；局部 `useState`/`useReducer`
- 写 store 时所有 action 走 `writeConfig` 持久化

### 文件命名
- 组件 `PascalCase.tsx`，工具 `camelCase.ts`
- 类型集中在 `src/types/models.ts`

### 测试
- 引擎契约 / store 行为 / 组件渲染 三类
- 文件位于 `src/store/__tests__/` 与 `src/components/.../__tests__/`
- 引擎执行器测试在 `src/lib/workflow/nodeExecutors/__tests__/`

### Git 与文档
- 每次合 PR：同步更新 `Features.md` 与版本号（`package.json` / `tauri.conf.json` / `Cargo.toml` 三处保持一致）
- 已完成的 P 项从 `TODO_active.md` 移到 `CHANGELOG.md`
- 设计/产品决策变更同步 `Design.md` 与 `PRD.md`
- 详细规约见 `CLAUDE.md` 文档维护章节

---

## 8. 常用调试与定位指南

| 场景 | 入口 |
|---|---|
| 工作流卡住 | 打开 debugMode → `ExecutionTimeline` 查看每节点状态/耗时 |
| API 失败 | `agentProviderRouter.shortError` 已翻译；原始错误见控制台 |
| 持久化没生效 | 检查 Tauri 是否启动；浏览器模式下查 `localStorage.simper_config` |
| 模型不响应 | 设置页 → 服务商 → 「测试」按钮逐模型连通 |
| 节点不识别 | `nodeRegistry.ts` 检查是否注册；`WorkflowCanvas.nodeTypes` 检查是否绑定 UI |
| 流式无法停 | `chatSlice.cancelSessionStream(sessionId)`；红色按钮 |
| Loop 节点结果丢失 | 引擎使用 `payload._loopResults` 累积，避免被 `payload.llmResult` 覆盖 |

---

## 9. 版本与历史

当前版本：见 `package.json` / `tauri.conf.json` / `src-tauri/Cargo.toml`（三处必须一致）。

完整版本变更见 [`CHANGELOG.md`](./CHANGELOG.md)。

---

## 10. 文档导航

| 想看 | 去哪 |
|---|---|
| 产品定位与里程碑 | [PRD.md](./PRD.md) |
| 已实现的全部功能 | [Features.md](./Features.md) |
| UI/UX 与设计系统 | [Design.md](./Design.md) |
| 当前任务与剩余坑 | [TODO_active.md](./TODO_active.md) |
| 历史变更 | [CHANGELOG.md](./CHANGELOG.md) |
| 节点 / store / 命令清单 | `reference/` 子目录 |
| 已归档的 plan / 审计报告 | `archive/` 子目录 |

---

**文档维护**：本文档随项目演进维护，不再嵌入版本号与时间戳；时间序信息一律放 CHANGELOG。
