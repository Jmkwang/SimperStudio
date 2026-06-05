# 工作流引擎参考

引擎是纯函数，与 React/Zustand 解耦。源文件位于 `src/lib/workflow/`。

---

## 1. 模块结构

```
lib/workflow/
├── engine.ts          # executeWorkflow() 主入口
├── nodeRegistry.ts    # 节点 type → executor 映射 + 自定义路由
├── helpers.ts         # withTimeout / 表达式求值 / Schema 校验 / 模板替换 / sleep
├── types.ts           # 引擎内部类型
└── nodeExecutors/     # 13 个节点执行器（见 nodes.md）
```

---

## 2. 主入口签名

```ts
export async function executeWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  initialPayload: Record<string, any>,
  options: ExecutionOptions = {},
  onStateChange?: (state: Partial<WorkflowExecutionState>) => void,
  globalState?: Record<string, any>,
): Promise<{
  finalPayload: Record<string, any>;
  results: Record<string, any>;
  status: WorkflowExecutionState['status'];
}>
```

其中 `ExecutionOptions` 定义于 `types.ts`：

```ts
interface ExecutionOptions {
  startNodeId?: string;          // 断点续跑
  concurrency?: number;          // 默认串行
  signal?: AbortSignal;          // 取消执行
  /** Called after each node completes successfully (fire-and-forget). */
  onNodeResult?: (nodeId: string, nodeType: string, payload: any, nodeData: any) => void;
}
```

---

## 3. 执行模型

**BFS 队列驱动**：

```
1. 找到 type === 'trigger' 节点（或 startNodeId）入队
2. 循环（最多 MAX_WORKFLOW_STEPS = 1000 步）：
   a. 出队 ExecutionFrame { nodeId, payload }
   b. 检查幂等键（${executionId}:${nodeId}:${loopNodeId}:${loopIndex}），已执行则跳过
   c. 输入 schema 校验（失败按 onError 策略处理）
   d. 调用 nodeRegistry.executeNode(node, payload, helpers)
      - 包裹 timeoutMs / retryPolicy
      - 失败按 onError: stop / continue / route-to-error
   e. 输出 schema 校验
   f. 调用 onNodeResult 回调（写时间线 + 写聊天）
   g. 计算 routing：
      - condition / switch / loop / merge → computeCustomRouting()
      - 其他 → 默认按 outgoing edges 复制 payload
   h. 入队下一批 frames
3. 队列空 → status = 'completed'
4. AbortSignal 触发 → status = 'idle'，立即返回
```

---

## 4. 关键不变式

- **payload 不可共享**：每条边 fork 时通过 `structuredClone(payload)`，避免分支互相污染
- **payload._loopResults**：循环节点累积每轮 `llmResult`，避免被覆盖（v0.4.3 修复）
- **幂等键** 包含循环上下文，确保 loop 体内每轮独立执行
- **AbortSignal** 在 helpers 中传递，executor 可主动响应取消

---

## 5. ExecutionHelpers

executor 接收的工具集（`createExecutionHelpers` 构造）：

```ts
interface ExecutionHelpers {
  withTimeout<T>(promise: Promise<T>, ms: number, error: string): Promise<T>
  evaluateExpression(expression: string, payload: any, timeoutMs: number): Promise<boolean>   // AST 解释器，无 new Function
  evaluateExpressionSync(expression: string, payload: any): any                    // 同步版本（路由判断）
  validateSchema(data: any, schemaStr: string | undefined, label: string): string | null
  getByPath(obj: any, path: string): any                                           // "payload.foo.bar" → 值
  setByPath(obj: any, path: string, value: any): void
  replaceTemplateVars(template: string, payload: any): string                      // {{path.to.value}} 替换
  sleep(ms: number): Promise<void>
  fetchNode(nodeId: string): WorkflowNode | undefined
  getGlobalState?: (key: string) => any
  signal?: AbortSignal                                                             // 透传给 executor
  // sub-workflow 用
  executeWorkflow?(workflowId: string, initialPayload: Record<string, any>): Promise<any>
}
```

**安全约束**：表达式求值使用 AST 解释器（`tokenizeExpression` + `ExprParser` + `evalNode`），**不**使用 `new Function` / `eval` / `with`，规避代码注入。

---

## 6. 节点契约

所有节点共享 `WorkflowNodeDataBase`：`timeoutMs` / `retryPolicy` / `onError` / `inputSchema` / `outputSchema`。

UI 上由 `components/workflow/NodeBaseConfigSection.tsx` 统一渲染 5 个基础区块。

每节点的专属字段见 [nodes.md](./nodes.md)。

---

## 7. 性能与限制

| 项 | 值 | 说明 |
|---|---|---|
| `MAX_WORKFLOW_STEPS` | 1000 | 死循环保护 |
| Code 节点超时 | 默认 10s | Web Worker 隔离 |
| 表达式求值超时 | 2s | AST 解释器 |
| 全局执行超时 | 5 分钟 | `workflowSlice` 包裹层 |
| Loop maxIterations | 默认 20 | UI 可调 |
| 默认并发 | 1（串行） | `options.concurrency` 可调 |

---

## 8. 与聊天系统的桥接

`workflowSlice.executeWorkflow` 通过 `onNodeResult` 把每个完成的 agent / dynamic-agent / cli-agent 节点的结果调用 `chatSlice.addAgentResponseStream` + `completeAgentResponse`，将 LLM 回复实时写入当前 workflow chat session。

完成后 toast + `screen-shake` CSS 动画反馈（用户可在设置页 `executionFeedback` 关闭）。

---

## 9. 调试

- `debugMode` 下，引擎内部关键事件通过 `debugLogger.log('workflow_exec', 'engine', ...)` 输出
- `ExecutionTimeline` 组件订阅 `workflowExecution.nodeRecords`，按节点展示状态/耗时
- 时间线支持「从该节点重跑」按钮（`startNodeId` 选项）
