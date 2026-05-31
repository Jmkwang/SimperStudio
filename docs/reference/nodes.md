# 节点参考表 (Workflow Nodes Reference)

本文件维护**单一事实源**：每种节点的执行器路径、UI 组件、契约字段、配色。新增节点时只更新此表。

> 当前版本：13 个执行器（`nodeRegistry.ts` 实际注册）+ 1 个 UI-only 触发器节点。

---

## 1. 节点总表

| Type 字符串 | 分类 | 执行器路径 | UI 组件路径 | 主题色 | 备注 |
|---|---|---|---|---|---|
| `trigger` | Trigger | `engine 内联（直通 payload）` | `nodes/TriggerNode.tsx` | Emerald | 工作流入口，1 个 |
| `webhook` | Trigger | *仅 UI，未注册执行器* | `nodes/WebhookTriggerNode.tsx` | Lime | 触发器占位，由外部 HTTP 端点驱动 |
| `agent` | AI | `nodeExecutors/agentExecutor.ts` | `nodes/AgentNode.tsx` | Primary | 静态绑定 agentId |
| `dynamic-agent` | AI | `nodeExecutors/dynamicAgentExecutor.ts` | `nodes/DynamicAgentNode.tsx` | Violet | payload / inline 双模式 + 模板变量 |
| `cli-agent` | AI | `nodeExecutors/cliAgentExecutor.ts` | `nodes/CliAgentNode.tsx` | Amber | spawn 子进程（Claude Code/Aider 等） |
| `code` | Data | `nodeExecutors/codeExecutor.ts` | `nodes/CodeNode.tsx` | Blue | Web Worker 隔离，10s 超时 |
| `set` | Data | `nodeExecutors/setTransformExecutor.ts` | `nodes/SetTransformNode.tsx` | Teal | 字段映射 + 常量 + 白名单 |
| `condition` | Flow Control | `nodeExecutors/conditionExecutor.ts` | `nodes/RouterNode.tsx` | Orange | JS 表达式分支（2s 超时） |
| `switch` | Flow Control | 与 condition 共用 executor | `nodes/IfSwitchNode.tsx` | Amber | 多分支首次匹配 |
| `loop` | Flow Control | `nodeExecutors/loopExecutor.ts` | `nodes/LoopNode.tsx` | Violet | 数组遍历，结果累积到 `payload._loopResults` |
| `wait` | Flow Control | `nodeExecutors/waitDelayExecutor.ts` | `nodes/WaitDelayNode.tsx` | Violet | 固定延时 / 条件轮询 |
| `merge` | Flow Control | `nodeExecutors/mergeExecutor.ts` | `nodes/MergeNode.tsx` | Pink | append / byKey / object-assign |
| `http` | Integration | `nodeExecutors/httpExecutor.ts` | `nodes/HttpRequestNode.tsx` | Cyan | GET/POST/PUT/PATCH/DELETE + 模板变量 |
| `subworkflow` | Integration | `nodeExecutors/subWorkflowExecutor.ts` | `nodes/SubWorkflowNode.tsx` | Indigo | 递归调用其他工作流 |
| `output` | Output | engine 内联（终止节点） | `nodes/OutputNode.tsx` | Slate | 捕获结果 |

> `action` / `transformation` 在 `WorkflowCanvas.nodeTypes` 映射到 `GenericNode`，但未注册到 `nodeRegistry`，作为占位渲染。

---

## 2. 通用节点契约（所有节点支持）

定义在 `WorkflowNodeDataBase`（`src/types/models.ts`）：

```ts
{
  label?: string                      // 显示名
  description?: string
  timeoutMs?: number                  // 节点级超时
  retryPolicy?: {
    maxAttempts: number
    backoff?: 'fixed' | 'exponential'
    delayMs?: number
  }
  onError?: 'stop' | 'continue' | 'route-to-error'
  inputSchema?: object                // 输入 JSON Schema 校验
  outputSchema?: object               // 输出 JSON Schema 校验
  overrideProviderId?: string         // 节点级模型覆盖（仅 AI 节点）
  overrideModelId?: string
}
```

UI 上由 `components/workflow/NodeBaseConfigSection.tsx` 统一渲染。

---

## 3. 节点专属字段

### `agent`
- `agentId: string` — 引用预定义 Agent
- `prompt: string` — 用户消息模板
- `autoSendToNext?: boolean` — workflow 聊天中回复完成自动转发
- 输出字段：无 schema 时写 `llmResult`（字符串），有 schema 时写 `llmResult`（解析后对象）
- loop 体内执行时，同时 push 到 `payload._loopResults[]`（含 `nodeId / iterationIndex / iterationItem / llmResult / timestamp`）

### `dynamic-agent`
- `configSource: 'payload' | 'inline'`
- `configPath?: string` — payload 模式下读取路径
- `inlineConfig?: { name?, avatar?, systemPromptTemplate, userPromptTemplate? }` — inline 模式
- `fallbackAgentId?: string` — 模型回退到此 agent
- `outputField?: string` — 默认 `llmResult`

### `cli-agent`
- `mode: 'preset' | 'custom'`
- `presetId?: string` — 引用 `settings.cliTools.presets`
- `executable?, args?, workingDir?: string`
- `inputMode: 'stdin' | 'arg' | 'prompt-template' | 'none'`
- `promptTemplate?: string`
- `outputField?, parseJson?, envVars?, requireConfirmation?, streamToChat?, captureStderr?`
- 白名单：执行前检查 `settings.cliTools.allowedExecutables`，不在列表中则返回 `_error`（`cliAgentExecutor.ts`）

### `code`
- `code: string` — JS 代码（async / await 可用）
- `timeoutMs?` — 默认 10s

### `loop`
- `itemsPath: string` — 如 `payload.alivePlayers`
- `itemAlias?: string`（默认 `item`）
- `indexAlias?: string`（默认 `index`）
- `maxIterations?: number`（默认 20）
- `breakCondition?: string` — 表达式
- `aggregationStrategy?: 'append' | 'replace'`
- 聚合语义：loop 体内 agent/dynamic-agent 节点每轮把结果 push 到共享 `_loopResults[]`；引擎完成后暴露为 `payload.loopResults`（公开字段）

### `condition` / `switch`
- `branches: [{ id, label, condition }]` 或 `routes` —— 表达式按顺序匹配，首个返回 truthy 的分支胜出

### `http`
- `method, url, headers, body, timeoutMs`
- url / headers / body 支持 `{{payload.x}}` 模板替换

### `set`
- `mappings: [{ sourcePath, targetPath }]`
- `constants: string` — JSON
- `whitelist: string` — 输出字段白名单（逗号分隔）

### `merge`
- `strategy: 'append' | 'byKey' | 'object-assign'`
- `key?: string` —（byKey 模式下）

### `wait`
- `mode: 'fixed' | 'condition'`
- `delayMs?: number`
- `conditionExpr?: string`
- `pollIntervalMs?: number`

### `subworkflow`
- `workflowId: string` — 引用其他工作流
- `inputs?: Record<string, string>` — 入参映射

---

## 4. 添加新节点的步骤

1. **类型** — `src/types/models.ts` 添加新成员到 `WorkflowNodeType` 联合类型与 `WorkflowNodeData` discriminated union
2. **执行器** — `src/lib/workflow/nodeExecutors/<name>Executor.ts` 实现 `NodeExecutorFn`
3. **注册** — `src/lib/workflow/nodeRegistry.ts` 调用 `register({ type, execute })`
4. **UI 组件** — `src/components/workflow/nodes/<Name>Node.tsx`
5. **画布绑定** — `WorkflowCanvas.tsx` 的 `nodeTypes` 映射 + `nodeDefaultDataBuilders` 提供默认 data
6. **聊天回写**（可选） — `workflowSlice.ts` 的 `onNodeResult` 加入新 type 分支
7. **测试** — `src/lib/workflow/nodeExecutors/__tests__/<name>Executor.test.ts`

---

## 5. 自定义路由（非简单 BFS）

`nodeRegistry.computeCustomRouting()` 处理需要特殊路由的节点：

- `condition` / `switch` — 解析 sourceHandle 匹配分支
- `loop` — 生成 N 个 iterationPayload 推入队列，每轮注入 `loop.currentItem` / `loop.index` / `loop.total`
- `merge` — 收集所有上游 result，调用 `computeMergePayload` 合并后才下发

其他节点走默认 BFS（向所有 outgoing edges 复制 payload）。
