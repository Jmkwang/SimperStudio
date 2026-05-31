import { WorkflowNode, WorkflowEdge } from '../../types/models';
import { NodeExecutorFn, NodeRouterFn, ExecutionHelpers } from './types';
import { agentExecute } from './nodeExecutors/agentExecutor';
import { dynamicAgentExecute } from './nodeExecutors/dynamicAgentExecutor';
import { codeExecute } from './nodeExecutors/codeExecutor';
import { httpExecute } from './nodeExecutors/httpExecutor';
import { setTransformExecute } from './nodeExecutors/setTransformExecutor';
import { waitExecute } from './nodeExecutors/waitDelayExecutor';
import { conditionExecute } from './nodeExecutors/conditionExecutor';
import { mergeExecute, computeMergePayload } from './nodeExecutors/mergeExecutor';
import { loopExecute, computeLoopIterations } from './nodeExecutors/loopExecutor';
import { subWorkflowExecute } from './nodeExecutors/subWorkflowExecutor';
import { cliAgentExecute } from './nodeExecutors/cliAgentExecutor';

export interface RegisteredExecutor {
  type: string;
  execute: NodeExecutorFn;
  route?: NodeRouterFn;
}

const registry = new Map<string, RegisteredExecutor>();

function register(executor: RegisteredExecutor) {
  registry.set(executor.type, executor);
}

register({ type: 'agent', execute: agentExecute });
register({ type: 'dynamic-agent', execute: dynamicAgentExecute });
register({ type: 'code', execute: codeExecute });
register({ type: 'http', execute: httpExecute });
register({ type: 'set', execute: setTransformExecute });
register({ type: 'wait', execute: waitExecute });
register({ type: 'condition', execute: conditionExecute });
register({ type: 'switch', execute: conditionExecute }); // same as condition
register({ type: 'merge', execute: mergeExecute });
register({ type: 'loop', execute: loopExecute });
register({ type: 'subworkflow', execute: subWorkflowExecute });
register({ type: 'cli-agent', execute: cliAgentExecute });
register({ type: 'trigger', execute: async (_n, p) => p });

export function getExecutor(nodeType: string): RegisteredExecutor | undefined {
  return registry.get(nodeType);
}

/**
 * Dynamically register a new node type at runtime.
 * Enables plugins and external integrations to add custom nodes
 * without modifying the registry source file.
 */
export function registerNodeType(type: string, executor: RegisteredExecutor): void {
  if (registry.has(type)) {
    console.warn(`Node type "${type}" is already registered. Overwriting.`);
  }
  register(executor);
  console.log(`Node type "${type}" registered successfully.`);
}

export function executeNode(
  node: WorkflowNode,
  payload: any,
  helpers: ExecutionHelpers
): Promise<any> {
  const executor = registry.get(node.type);
  if (!executor) return Promise.resolve(payload);
  return executor.execute(node, payload, helpers);
}

export function computeCustomRouting(
  node: WorkflowNode,
  payload: any,
  outgoingEdges: WorkflowEdge[],
  incomingEdges: WorkflowEdge[],
  results: Record<string, any>,
  helpers: ExecutionHelpers
): Promise<{ nextFrames: Array<{ nodeId: string; payload: any }>; skipDefault: boolean }> | null {
  if (node.type === 'condition' || node.type === 'switch') {
    return handleConditionSwitchRouting(node, payload, outgoingEdges, helpers);
  }
  if (node.type === 'loop') {
    return handleLoopRouting(node, payload, outgoingEdges, helpers);
  }
  if (node.type === 'merge') {
    const merged = computeMergePayload(node, payload, incomingEdges, results);
    return Promise.resolve({
      nextFrames: outgoingEdges.map((e) => ({ nodeId: e.target, payload: structuredClone(merged) })),
      skipDefault: true,
    });
  }
  return null;
}

async function handleConditionSwitchRouting(
  node: WorkflowNode,
  payload: any,
  edges: WorkflowEdge[],
  helpers: ExecutionHelpers
): Promise<{ nextFrames: Array<{ nodeId: string; payload: any }>; skipDefault: boolean }> {
  const d = node.data as any;
  const routesOrBranches = d?.routes || d?.branches || [];
  let matchedId: string | null = null;

  for (const item of routesOrBranches as any[]) {
    try {
      const isMatch = await helpers.evaluateExpression(item.condition || 'false', payload, 2000);
      if (isMatch) {
        matchedId = item.id;
        break;
      }
    } catch (e) {
      console.error('Route/branch evaluation error:', e);
    }
  }

  if (matchedId) {
    const matchingEdge = edges.find((e) => e.sourceHandle === matchedId);
    if (matchingEdge) {
      const nextPayload = structuredClone(payload);
      return {
        nextFrames: [{ nodeId: matchingEdge.target, payload: nextPayload }],
        skipDefault: true,
      };
    }
  }
  return { nextFrames: [], skipDefault: true };
}

async function handleLoopRouting(
  node: WorkflowNode,
  payload: any,
  edges: WorkflowEdge[],
  helpers: ExecutionHelpers
): Promise<{ nextFrames: Array<{ nodeId: string; payload: any }>; skipDefault: boolean }> {
  const itemsPath = String((node.data as any)?.itemsPath || 'payload.alivePlayers');
  const resolvedItems = helpers.getByPath(payload, String(itemsPath));

  if (!Array.isArray(resolvedItems)) {
    return { nextFrames: [], skipDefault: true };
  }

  const loopResult = await computeLoopIterations(node, payload, helpers);
  const nextFrames: Array<{ nodeId: string; payload: any }> = [];

  for (const iter of loopResult.iterationPayloads) {
    for (const edge of edges) {
      // iterationPayload is already a structuredClone in computeLoopIterations;
      // avoid a second clone to preserve the shared _loopResults reference.
      nextFrames.push({ nodeId: edge.target, payload: iter.payload });
    }
  }

  return { nextFrames, skipDefault: true };
}
