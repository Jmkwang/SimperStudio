# Stores 参考表

5 层 Zustand slice 组合到 `useAppStore`。源文件位于 `src/stores/`。

---

## 1. 总览

```
stores/
├── index.ts          ← create<AppStore>() 组合所有 slice + 状态变化追踪
├── baseSlice.ts      ← 工作空间 / Agent / 配置持久化
├── chatSlice.ts      ← 会话 / 消息 / 流式响应 / 浮窗
├── modelSlice.ts     ← 服务商 / 模型 / Settings
├── uiSlice.ts        ← 视图 / 各 active ID / 排序 / debugMode
└── workflowSlice.ts  ← 工作流 / 引擎调用 / 执行状态
```

`AppStore = BaseSlice & ChatSlice & ModelSlice & UISlice & WorkflowSlice`，组件统一通过 `useAppStore` 选择字段。

---

## 2. baseSlice

| 字段 | 类型 | 说明 |
|---|---|---|
| `workspaces` | `Workspace[]` | 工作空间，默认含 "Personal Workspace" |
| `agents` | `Agent[]` | 智能体（预置 12 个含狼人杀角色） |
| `agentCategories` | `AgentCategory[]` | Agent 分类 |

**Actions**：`addWorkspace`、`addAgent`、`updateAgent`、`batchUpdateAgents`、`addAgentCategory`、`fetchInitialData`

**导出工具**：
- `readConfig<T>(name)` — Tauri `read_json_config` → fallback `localStorage[simper_config][name]`
- `writeConfig(name, value)` — 反向

---

## 3. chatSlice

| 字段 | 类型 | 说明 |
|---|---|---|
| `sessions` | `ChatSession[]` | 全部会话（mode: single / workflow） |
| `workflowChatUI` | `WorkflowChatUIState` | 浮窗状态（windows / agentChatWindows / activeWindowId / zIndexCounter） |
| `activeStreamingSessionIds` | `string[]` | 流式中的 session（用于发送↔停止按钮切换） |

**Actions**（节选）：
- 会话：`createSession`、`openWorkflowSession`、`renameSession`、`deleteSession`
- 消息：`addAgentResponseStream`、`addAgentThinkingStream`、`completeAgentResponse`、`retryAgentResponse`
- 转发：`sendMessageToAgents`（支持 `thinkingLevel` 参数）、`sendToWorkflowAgent`、`forwardAgentReplyToNext`、`rerunAgentReply`、`rerunAndForwardAgentReply`、`sendToAgent`（支持 `thinkingLevel` 参数）；workflow 模式支持 `agent` 与 `dynamic-agent` 节点
- 流式取消：`cancelSessionStream(sessionId)` — 取消该 session 的所有进行中请求
- 浮窗：`openWorkflowAgentWindow`、`focusWorkflowAgentWindow`、`closeWorkflowAgentWindow`、`setWorkflowSidebarCollapsed`

**特殊点**：`AbortController` 不可序列化，用模块级 `Map<sessionId, AbortController>` 维护，不进入 store state。

**流式监控**：`runAgentResponse` 集成 `debugLogger.streamStart/streamChunk/streamEnd/streamError`，跟踪 chunk 计数、字符数、卡顿检测（15s 无新 chunk 触发 `stream_stall`）。

---

## 4. modelSlice

| 字段 | 类型 | 说明 |
|---|---|---|
| `settings` | `Settings` | 全局设置（含 providers、activeProviderId、theme、language、fontSize、cliTools 等） |

**Actions**：`updateSettings`、`addProvider`、`updateProvider`、`deleteProvider`、`setActiveProvider`

**自动选 active**：`autoSelectActiveProvider()` — 当前 active 失效时回退到第一个 enabled provider。

默认初始化 6 个 provider（OpenAI / Anthropic / Gemini / DeepSeek / SiliconFlow / Custom），全部 `isEnabled: false`，需用户启用并配 API Key。

---

## 5. uiSlice

| 字段 | 类型 | 说明 |
|---|---|---|
| `currentView` | `string` | 当前主视图（持久化到 `localStorage.ss_currentView`） |
| `activeWorkspaceId` | `string \| null` | |
| `activeSessionId` | `string \| null` | 当前选中会话 |
| `activeWorkflowId` | `string \| null` | |
| `activeAgentId` | `string \| null` | |
| `selectedAgentCategory` | `string \| null` | |
| `workflowChatMode` | `boolean` | |
| `chatLayoutMode` | `'A' \| 'B'` | 工作流聊天的拓扑/聊天布局 |
| `debugMode` | `boolean` | Ctrl+Shift+D 切换 |
| `contextSidebarTab` | `'workflows' \| 'sessions'` | |
| `selectedChatWorkflowId` | `string \| null` | |
| `workflowOrder` / `agentCategoryOrder` / `sessionOrder` | `string[]` | 侧栏拖拽排序，持久化到 `sidebar_orders.json` |

**Actions**：所有 setter（`setActiveWorkspace`、`setCurrentView` 等）+ `toggleDebugMode`、`previewWorkflowTopology`

**Helpers**：`getActiveSession()`、`getActiveWorkflow()`

---

## 6. workflowSlice

| 字段 | 类型 | 说明 |
|---|---|---|
| `workflows` | `Workflow[]` | 全部工作流（默认含狼人杀示例） |
| `workflowExecution` | `WorkflowExecutionState` | `{ status, currentNodeId, results, nodeRecords }` |
| `_abortController` | `AbortController \| null` | 当前执行的取消控制器 |

**Actions**：
- CRUD：`createWorkflow`、`saveWorkflow`、`deleteWorkflow`、`renameWorkflow`；`saveWorkflow` 保存时清理 React Flow UI-only 字段，并保留节点专属配置字段
- 执行：`executeWorkflow(workflowId, initialPayload, options?)` — 调用 `lib/workflow/engine.executeWorkflow`，5 分钟全局超时，结果通过 `onNodeResult` 回写聊天
- 取消：`cancelWorkflowExecution()`
- 状态：`setWorkflowExecutionState(partial)`

---

## 7. 持久化映射

| Slice 字段 | 持久化目标 |
|---|---|
| `workspaces` / `agents` / `sessions` / `workflows` | SQLite 表（Tauri 命令） |
| `settings` | `<AppData>/SimperStudio/config/settings.json` |
| `currentView` | `localStorage.ss_currentView` |
| `workflowOrder` 等 3 个排序 | `<AppData>/SimperStudio/config/sidebar_orders.json` |
| `agentCategories` | 当前未持久化（运行时派生） |

浏览器模式下全部 fallback 到 `localStorage.simper_config[<name>]`。

---

## 8. 状态变化追踪（debug 模式）

`stores/index.ts` 注册了 `useAppStore.subscribe`，仅在 `debugMode === true` 时记录以下字段的 from/to：

```
activeSessionId, activeWorkflowId, activeAgentId, activeWorkspaceId,
currentView, debugMode, chatLayoutMode, contextSidebarTab,
selectedChatWorkflowId, selectedAgentCategory
```

通过 `debugLogger.log('state_change', 'store', ...)` 输出，可在 `DebugOverlay` 浮窗实时查看。
