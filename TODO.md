# SimperStudio 进度 & 待办清单 (TODO List)

## 🎯 当前进度 (Current Status)

### 🟢 已完成 (Completed)
- [x] **基础框架搭建**: Tauri + React + Vite + TypeScript 初始化。
- [x] **UI/样式集成**: Tailwind CSS + shadcn/ui 安装与基础配置，全局深色模式支持。
- [x] **路由与基础布局**: 左侧全局导航栏（Global Sidebar） + 动态上下文侧边栏 + 主内容区。
- [x] **状态管理基建**: Zustand `appStore.ts` 搭建，包含 Workspaces, Sessions, Messages, Agents, Workflows 的基础结构。
- [x] **多 Agent 聊天基础**: 
  - 支持类似 CherryStudio 的聊天界面
  - 实现 `@` 提及多智能体功能
  - 实现并接入 Vercel AI SDK，处理真实 API 流式响应 (SSE)
  - 修复了流式响应时文本重复累加的严重 Bug (`HHeHelHello` 问题)
- [x] **工作流画布基础**: 集成 React Flow，实现简单的节点与连线渲染。
- [x] **提示词生成区 (Prompt Generator)**:
  - 新增专用页面 `PromptGenerator.tsx` (左侧魔法棒图标进入)
  - 包含顶部提示词编辑和底部对话输入框
  - 已接入 AI 接口，支持自动生成和打磨提示词

### 🔴 待修复 Bug (Pending Bugs - High Priority)
- [x] **UI Bug: 小会话输入框丢失**
  - **现象**: 在没有历史消息的“小会话”视图中，底部的聊天输入框没有显示。
  - **排查点**: 检查 `ChatInterface.tsx` 或 `DualAgentChatView.tsx` 中针对空消息数组时的条件渲染逻辑。
- [x] **State Bug: 工作流保存失效 (刷新消失)**
  - **现象**: 在工作流画布中新增节点或修改连线后，刷新页面数据会重置。
  - **排查点**: 检查 `appStore.ts` 中的 Zustand `persist` 配置是否包含了 `workflows` 节点，以及 `WorkflowCanvas.tsx` 中的保存触发逻辑。
- [x] **UI Bug: 点击特定会话黑屏**
  - **现象**: 点击第二、三个默认会话（"UI Component Design", "General Inquiry"）时，整个主视图变成黑屏/崩溃。
  - **排查点**: 可能是由于对应的 Session 缺少绑定的 workflow 数据，或者存在 `undefined` 导致渲染循环崩溃。

### 🟡 下一步开发计划 (Next Steps)
- [x] **注入测试数据**: 在修复上述持久化和黑屏 Bug 后，为 3 个默认会话注入 3 组不同的工作流测试数据，以验证切换效果。
- [x] **完善工作流逻辑**: 
  - 实现自定义节点（触发器、Agent 节点、输出节点）的完整功能和属性面板。
  - 实现 DAG 执行引擎：按顺序执行工作流并将上一节点的输出传递给下一节点。
- [x] **本地 SQLite 数据库集成**: 替换目前的 Zustand `persist` (localStorage)，使用 Tauri SQLite 插件实现真正的本地持久化存储。
- [x] **构建与打包准备**:
  - 更新 `src-tauri/tauri.conf.json` 中的 `identifier` 和 `productName`。
  - 优化 Tauri build 尺寸，准备最终的 Windows 桌面端打包。
