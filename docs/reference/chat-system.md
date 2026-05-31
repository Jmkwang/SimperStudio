# 聊天系统参考

聊天系统由 `chatSlice` + 一组 chat 视图组件构成，支持 single（单 Agent）与 workflow（工作流驱动多 Agent）两种 session 模式。

---

## 1. 数据模型

```ts
interface ChatSession {
  id: string
  workspaceId: string
  title: string
  mode: 'single' | 'workflow'   // v0.3+ 新增
  workflowId?: string            // workflow 模式必填
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: { text: string; attachments?: MessageAttachment[] }
  timestamp: number
  meta?: MessageMeta             // workflowNodeId / sourceAgentId / forwardFromMessageId 等
  agentResponses?: AgentResponse[]  // 多 Agent 并发回复
}

interface AgentResponse {
  agentId: string
  nodeId?: string                // 工作流场景标识来源节点
  content: { text: string }
  status: 'streaming' | 'complete' | 'error'
  errorMessage?: string
  promptTokens?: number
  completionTokens?: number
  durationMs?: number
  timestamp: number
}
```

旧 session（无 `mode`）通过 `normalizeSession` 自动推断：有 `workflowId` → `workflow`，否则 `single`。

---

## 2. 主要组件

```
components/chat/
├── ChatInterface.tsx           # 总入口，按 session.mode 分流
├── SimpleChatView.tsx          # single 聊天视图（含 Agent 切换、附件、retry）
├── WorkflowChatView.tsx        # workflow 拓扑视图（13 类只读节点）
├── ChatMessageBubble.tsx       # UserBubble + AssistantBubble + Token/时间/操作按钮
├── MessageHoverActions.tsx     # 消息悬浮操作（复制/重发/转发/reload）
├── WorkflowAgentWindow.tsx     # 工作流 Agent 浮动对话窗
├── AgentChatWindow.tsx         # 通用 Agent 浮动对话窗
├── AgentTopologyView.tsx       # 单 Agent 拓扑视图（多 Agent 切换时）
├── DualAgentChatView.tsx       # 双 Agent 对比视图
├── MultiModelComparison.tsx    # 多模型对比卡片
├── AgentResultCard.tsx         # 单结果卡片
├── SimpleChatPlaceholder.tsx   # 单聊空状态（智能体快速入口）
├── WorkflowChatPlaceholder.tsx # 工作流空状态
├── NewChatView.tsx             # /new-chat 视图
├── NewWorkflowView.tsx         # /new-workflow 视图
├── AgentNode.tsx               # 拓扑视图内的 Agent 节点（旧版引用，新版用 ChatAgentNode）
└── Chat{Trigger,Agent,Output,Code,Loop,Router}Node.tsx  # 6 个只读拓扑节点
```

---

## 3. 流式响应链路

```
SimpleChatView.handleSend()
  └── chatSlice.sendMessageToAgents(sessionId, agentIds, prompt, attachments)
       ├── createUserMessage → 写库 + 内存
       ├── 为每个 agent 调用 runAgentResponse:
       │    ├── createStreamMessage（agentResponses[].status='streaming'）
       │    ├── resolveAgentModelConfig → providerId / modelId 三级回退
       │    ├── fetchFromResolvedConfig → AI SDK streamText
       │    ├── for await chunk → addAgentResponseStream(messageId, chunk)
       │    │     └── 仅改内存（流式不落库，避免高频写）
       │    └── completeAgentResponse → status='complete' + update_chat_message 终态落库
       └── activeStreamingSessionIds 维护 → UI 切换发送↔停止按钮
```

**取消机制**：模块级 `Map<sessionId, AbortController>` 维护活跃流。`cancelSessionStream(sessionId)` → `controller.abort()`，AI SDK 自动响应。

---

## 4. workflow 模式特殊行为

```
WorkflowChatView
├── 拓扑只读图（ReactFlow + Chat*Node 系列只读节点）
├── 「执行工作流」按钮 → workflowSlice.executeWorkflow
│      └── engine 的 onNodeResult 把每个 agent 节点结果通过 chatSlice 写回
├── 点击 Agent / Dynamic Agent 节点 → 打开 WorkflowAgentWindow
└── 「拓扑/聊天」切换按钮：
     ├── 拓扑模式：可视化节点图
     └── 聊天模式：扁平化消息流（按节点分组）
```

**autoSendToNext**：agent 节点配置 `data.autoSendToNext === true` 时，回复完成自动调用 `forwardAgentReplyToNext`，沿出边找下一个 agent/dynamic-agent 继续发送。

---

## 5. 消息转发动作

| Action | 入口 | 行为 |
|---|---|---|
| `forwardAgentReplyToNext` | hover 操作 / `autoSendToNext` | 通过 edges 找后继 agent 节点，把当前回复作为 prompt 发送 |
| `rerunAgentReply` | hover 操作 | 用同 prompt 重新生成回复（新建消息） |
| `retryAgentResponse` | 气泡 retry 按钮 | 在原气泡内重生成（清除 `agentResponse`，复用 `messageId`） |
| `rerunAndForwardAgentReply` | hover 操作 | 重跑后自动转发 |

---

## 6. 持久化策略

- **新消息**：先 `add_chat_message` 落库，失败回滚内存
- **流式片段**：仅内存（避免每 chunk 一次 IO）
- **完成后**：`update_chat_message` 写入终态（含 token 统计、`agentResponses[i].status`）
- **会话**：`createSession` / `openWorkflowSession` 库成功后才改内存

---

## 7. 三种 session 切换的视图行为

```
single chat ↔ workflow chat 切换时：
- workflow 浮窗 (workflowChatUI.windows / agentChatWindows) 不污染 single 视图
- selectedChatWorkflowId 仅作用于 workflowChat 占位预览
- activeSessionId 与 currentView 解耦：可在 workflow 视图下不选 session（显示占位）
```

---

## 8. 国际化与无障碍

- 所有按钮 `aria-label` 完整
- 流式光标支持 `motion-reduce:animate-none`
- 操作按钮最小点击区 44×44px
- 操作色对比度 ≥4.5:1（`text-muted-foreground/70`）
