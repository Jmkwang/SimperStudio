# 视图路由参考表

`App.tsx` 的 `renderContent()` switch 把 `viewMode` 映射到主区组件。`viewMode` 来自 `useAppStore.currentView`（持久化到 `localStorage.ss_currentView`）。

---

## 1. 视图清单

| viewMode | 主区组件 | 用途 | 侧栏（MergedSidebar）模式 |
|---|---|---|---|
| `chat` | `ChatInterface` | 单 Agent 聊天 | Agent 模式 |
| `workflowChat` | `ChatInterface`（同源，内部按 session.mode 分流） | 工作流驱动多 Agent 协作 | Workflow 模式 |
| `new-chat` | `NewChatView` | 新建聊天的引导卡片网格 | Agent 模式 |
| `new-workflow` | `NewWorkflowView` | 新建工作流的引导 | Workflow 模式 |
| `workflow` | `WorkflowListView` | 工作流列表（卡片视图） | Workflow 模式 |
| `workflow-editor` | `WorkflowCanvas` | React Flow 画布编辑 | Workflow 模式 |
| `agents` | `AgentsView` | 智能体管理（含批量编辑） | Agent 模式 |
| `prompts` | `PromptGenerator` | AI 辅助提示词生成 | 任意 |
| `settings` | `SettingsView` | 设置（4 页签） | 显示 |
| `profile` | `ProfileView` | 个人资料 | **不显示侧栏**（`VIEWS_WITHOUT_SIDEBAR`） |

> Default 分支显示 "view coming soon..."，新增视图前补 case。

---

## 2. ChatInterface 内部分流

`ChatInterface.tsx` 根据 `activeSession` 与 `currentView` 决定具体子视图：

```
activeSession 存在
├── session.mode === 'workflow'   → WorkflowChatView
└── session.mode === 'single'     → SimpleChatView

activeSession 不存在
├── currentView === 'workflowChat'
│   ├── selectedChatWorkflowId 存在 → WorkflowTopologyPreview（只读拓扑）
│   └── 否则                         → WorkflowChatPlaceholder（卡片网格）
└── currentView === 'chat'           → SimpleChatPlaceholder（智能体快速入口）
```

---

## 3. MergedSidebar 内容随 viewMode 联动

侧栏顶部 Mode Switcher Pill 切换 Agent / Workflow 两种模式：

| Mode | Nav Items | Recents 内容 |
|---|---|---|
| Agent | 新增会话(`chat`)、智能体(`agents`)、提示词(`prompts`) | 最近 single sessions |
| Workflow | 工作流会话(`workflowChat`)、工作流编辑器(`workflow`)、提示词(`prompts`) | 最近工作流 / 工作流会话 |

`settings` / `profile` 不出现在 Nav Items 里，由侧栏底部 Gateway 区入口（齿轮图标 / 主题切换）。

---

## 4. 侧栏隐藏

`AppShell.tsx` 维护 `VIEWS_WITHOUT_SIDEBAR = new Set(['profile'])`，命中则不渲染 `MergedSidebar`，主区占满宽度。

如需新增"全屏"视图（如演示模式、首次启动 onboarding），加入此 Set 即可。

---

## 5. 视图持久化与回退

- 启动时 `uiSlice` 读取 `localStorage.ss_currentView`，缺省 `'chat'`
- 每次 `setCurrentView(view)` 同步写回 localStorage
- 浏览器模式下不依赖 Tauri，纯前端可用

---

## 6. 添加新视图的步骤

1. `App.tsx` 在 `ViewMode` 联合类型加入新值
2. `renderContent()` switch 新增 case 与组件
3. `MergedSidebar.tsx` 的 `AGENT_NAV` / `WORKFLOW_NAV` 决定是否暴露入口
4. 如需隐藏侧栏 → `AppShell.VIEWS_WITHOUT_SIDEBAR` 加入
5. 国际化键加入 `hooks/useTranslation.ts`
