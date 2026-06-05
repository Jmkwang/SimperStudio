import { WorkflowNode, WorkflowEdge } from '../../types/models';
import { ExecutionOptions, WorkflowExecutionState } from './types';
import { createExecutionHelpers, validateSchema, sleep, withTimeout } from './helpers';
import { executeNode, computeCustomRouting } from './nodeRegistry';

const MAX_WORKFLOW_STEPS = 1000;

/**
 * Formal workflow engine: executes the complete DAG with full state tracking,
 * retry logic, schema validation, and execution records.
 *
 * This is the **runtime execution path**. For interactive chat forwarding
 * between agent nodes (manual/auto/reload), use `forwardAgentReplyToNext`
 * from the chat slice instead.
 */
export async function executeWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  initialPayload: Record<string, any>,
  options: ExecutionOptions = {},
  onStateChange?: (state: Partial<WorkflowExecutionState>) => void,
  globalState?: Record<string, any>,
): Promise<{ finalPayload: Record<string, any>; results: Record<string, any>; status: WorkflowExecutionState['status'] }> {
  const signal = options.signal;
  const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const executedKeys = new Set<string>();

  const fetchNode = (nodeId: string) => nodes.find((n) => n.id === nodeId);
  const helpers = createExecutionHelpers(fetchNode, globalState, (subWorkflowId, subPayload) => {
    const subWorkflow = globalState?.workflows?.find((w: any) => w.id === subWorkflowId);
    if (!subWorkflow) {
      throw new Error(`Sub-workflow not found: ${subWorkflowId}`);
    }
    return executeWorkflow(
      subWorkflow.nodesData,
      subWorkflow.edgesData,
      subPayload,
      { signal: options.signal },
      undefined,
      globalState,
    );
  }, signal);

  const startNodeId = options.startNodeId;
  const startNode = startNodeId
    ? nodes.find((n) => n.id === startNodeId)
    : nodes.find((n) => n.type === 'trigger');

  if (!startNode) {
    onStateChange?.({ status: 'error' });
    return { finalPayload: { ...initialPayload }, results: {}, status: 'error' };
  }

  onStateChange?.({ status: 'running', currentNodeId: null, results: {}, nodeRecords: {} });

  type ExecutionFrame = { nodeId: string; payload: any };
  let queue: ExecutionFrame[] = [{ nodeId: startNode.id, payload: structuredClone(initialPayload) }];
  let results: Record<string, any> = { [startNode.id]: structuredClone(initialPayload) };
  let finalPayload = structuredClone(initialPayload);
  let stepCounter = 0;

  const nodeRecords: Record<string, any> = {};

  // Lightweight node types that execute instantly — skip the 400ms throttle
  const LIGHTWEIGHT_NODE_TYPES = new Set(['trigger', 'code', 'condition', 'output', 'set', 'router']);

  while (queue.length > 0) {
    if (signal?.aborted) {
      onStateChange?.({ status: 'idle', currentNodeId: null });
      return { finalPayload, results, status: 'idle' };
    }

    const frame = queue.shift()!;
    const nodeId = frame.nodeId;
    const node = nodes.find((n) => n.id === nodeId);
    let currentPayload = structuredClone(frame.payload);

    // Include loop iteration context in the idempotent key so that nodes
    // inside a loop body can execute once per iteration instead of being
    // skipped after the first iteration.
    const loopCtx = frame.payload?.loop ? `:${frame.payload.loop.nodeId}:${frame.payload.loop.index}` : '';
    const idempotentKey = `${executionId}:${nodeId}${loopCtx}`;
    if (executedKeys.has(idempotentKey)) continue;
    executedKeys.add(idempotentKey);

    const nodeStartTime = Date.now();
    nodeRecords[nodeId] = { status: 'running', startTime: nodeStartTime, attempts: 0 };
    onStateChange?.({ currentNodeId: nodeId, results, nodeRecords: { ...nodeRecords } });

    stepCounter++;
    if (stepCounter > MAX_WORKFLOW_STEPS) {
      onStateChange?.({ status: 'error', currentNodeId: null, results });
      return { finalPayload, results, status: 'error' };
    }

    const nodeEdges = edges.filter((e) => e.source === nodeId);

    // Input schema validation
    const inputError = validateSchema(currentPayload, node?.data?.inputSchema, 'Input');
    if (inputError) {
      currentPayload = { ...currentPayload, _error: inputError };
      results[nodeId] = currentPayload;
      if (node?.data?.onError === 'continue') continue;
      if (node?.data?.onError === 'route-to-error') {
        const errorEdge = nodeEdges.find((e) => e.sourceHandle === 'error');
        if (errorEdge) queue.push({ nodeId: errorEdge.target, payload: currentPayload });
        continue;
      }
      onStateChange?.({ status: 'error', currentNodeId: nodeId, results, nodeRecords });
      finalPayload = currentPayload;
      return { finalPayload, results, status: 'error' };
    }

    const nodeTimeoutMs = Number(node?.data?.timeoutMs) || 0;
    const retryPolicy = node?.data?.retryPolicy || {};
    const maxAttempts = Number(retryPolicy.maxAttempts) || 1;
    const backoffType = retryPolicy.backoff || 'fixed';
    const baseDelay = Number(retryPolicy.delayMs) || 1000;

    if (!LIGHTWEIGHT_NODE_TYPES.has(node?.type || '')) {
      await sleep(400); // throttle
    }

    // Output node is a pass-through
    if (node?.type === 'output') {
      finalPayload = currentPayload;
      results[nodeId] = currentPayload;
      nodeRecords[nodeId] = { status: 'success', startTime: nodeStartTime, endTime: Date.now(), durationMs: Date.now() - nodeStartTime, attempts: 1 };
      onStateChange?.({ nodeRecords: { ...nodeRecords } });
      options.onNodeResult?.(nodeId, node.type, currentPayload, node?.data);
      continue;
    }

    // Execute node with retry
    let nodeExecError: string | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const execPromise = executeNode(node!, currentPayload, helpers);
        if (nodeTimeoutMs > 0) {
          currentPayload = await withTimeout(execPromise, nodeTimeoutMs, `Node timed out after ${nodeTimeoutMs}ms`);
        } else {
          currentPayload = await execPromise;
        }
        nodeExecError = null;
        break;
      } catch (e: any) {
        nodeExecError = e.message;
        console.error(`Node ${nodeId} attempt ${attempt}/${maxAttempts} failed:`, e.message);
        if (attempt < maxAttempts) {
          const delay = backoffType === 'exponential' ? baseDelay * Math.pow(2, attempt - 1) : baseDelay;
          await sleep(delay);
        }
      }
    }

    // Error handling after retries
    if (nodeExecError) {
      const nodeEndTime = Date.now();
      nodeRecords[nodeId] = { status: 'error', endTime: nodeEndTime, durationMs: nodeEndTime - nodeStartTime, error: nodeExecError, attempts: maxAttempts };
      onStateChange?.({ nodeRecords: { ...nodeRecords } });
      currentPayload = { ...currentPayload, _error: nodeExecError };
      results[nodeId] = currentPayload;

      if (node?.data?.onError === 'continue') continue;
      if (node?.data?.onError === 'route-to-error') {
        const errorEdge = edges.find((e) => e.source === nodeId && e.sourceHandle === 'error');
        if (errorEdge) queue.push({ nodeId: errorEdge.target, payload: currentPayload });
        continue;
      }
      onStateChange?.({ status: 'error', currentNodeId: nodeId, results, nodeRecords });
      finalPayload = currentPayload;
      return { finalPayload, results, status: 'error' };
    }

    // Output schema validation
    const outputError = validateSchema(currentPayload, node?.data?.outputSchema, 'Output');
    if (outputError) currentPayload = { ...currentPayload, _error: outputError };

    // Record success
    const nodeEnd = Date.now();
    nodeRecords[nodeId] = { status: 'success', startTime: nodeStartTime, endTime: nodeEnd, durationMs: nodeEnd - nodeStartTime, attempts: nodeRecords[nodeId]?.attempts || 1 };
    results[nodeId] = currentPayload;
    onStateChange?.({ nodeRecords: { ...nodeRecords } });
    options.onNodeResult?.(nodeId, node?.type || '', currentPayload, node?.data);

    // Routing
    const outgoingEdges = nodeEdges;
    const incomingEdges = edges.filter((e) => e.target === nodeId);

    // Check for custom routing (condition/switch/loop/merge)
    const customRouting = await computeCustomRouting(node!, currentPayload, outgoingEdges, incomingEdges, results, helpers);
    if (customRouting) {
      for (const frame of customRouting.nextFrames) {
        queue.push(frame);
      }
      if (customRouting.skipDefault) continue;
    }

    // Default routing: follow all outgoing edges
    for (const edge of outgoingEdges) {
      const nextPayload = structuredClone(currentPayload);
      // Preserve the shared _loopResults reference across clones so that
      // agent nodes inside a loop can accumulate results without losing
      // the shared array on each routing step.
      if (Array.isArray(currentPayload._loopResults)) {
        nextPayload._loopResults = currentPayload._loopResults;
      }
      results[edge.target] = nextPayload;
      queue.push({ nodeId: edge.target, payload: nextPayload });
    }
  }

  // Expose accumulated loop results under the public field name so callers
  // can access all iteration outputs without them being overwritten by
  // the last iteration's llmResult.
  // Search all node results for _loopResults in case finalPayload lost the
  // reference through structuredClone (e.g. output node pass-through).
  const allLoopResults = finalPayload._loopResults
    ?? Object.values(results).find((r: any) => Array.isArray(r?._loopResults))?._loopResults;
  if (Array.isArray(allLoopResults) && allLoopResults.length > 0) {
    finalPayload.loopResults = allLoopResults;
  }

  onStateChange?.({ status: 'completed', currentNodeId: null, results, nodeRecords });
  return { finalPayload, results, status: 'completed' };
}
