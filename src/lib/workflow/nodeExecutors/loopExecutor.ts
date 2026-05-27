import { WorkflowNode, WorkflowEdge as _WorkflowEdge } from '../../../types/models';
import { NodeExecutorFn, ExecutionHelpers } from '../types';

export const loopExecute: NodeExecutorFn = async (node, payload, _helpers) => {
  // Initialize the shared accumulator so agent nodes inside the loop can
  // push iteration results without overwriting payload.llmResult.
  // The public loopResults field is populated at workflow completion
  // (engine.ts) to avoid a premature empty snapshot here.
  return {
    ...payload,
    loopNodeId: node.id,
  };
};

export interface LoopIterationResult {
  iterationPayloads: Array<{ payload: any }>;
  breakEarly: boolean;
}

export async function computeLoopIterations(
  node: WorkflowNode,
  payload: any,
  helpers: ExecutionHelpers
): Promise<LoopIterationResult> {
  const itemsPath = String(node.data?.itemsPath || 'payload.alivePlayers');
  const itemAlias = String(node.data?.itemAlias || 'item');
  const indexAlias = String(node.data?.indexAlias || 'index');
  const maxIterationsValue = Number(node.data?.maxIterations);
  const maxIterations = maxIterationsValue > 0 ? maxIterationsValue : 20;
  const breakCondition = String(node.data?.breakCondition || '').trim();

  const resolvedItems = helpers.getByPath(payload, String(itemsPath));
  const items = Array.isArray(resolvedItems) ? resolvedItems : [];
  const total = items.length;
  const iterationCount = Math.min(total, maxIterations);

  const result: LoopIterationResult = { iterationPayloads: [], breakEarly: false };

  // Shared accumulator for all iterations — survives shallow copies inside the loop body
  const sharedLoopResults: any[] = payload._loopResults || [];

  for (let i = 0; i < iterationCount; i++) {
    const iterationPayload: any = structuredClone(payload);
    iterationPayload[itemAlias] = items[i];
    iterationPayload[indexAlias] = i;
    iterationPayload.loop = { currentItem: items[i], index: i, total, nodeId: node.id };
    iterationPayload._loopResults = sharedLoopResults;

    if (breakCondition) {
      try {
        const shouldBreak = await helpers.evaluateExpression(breakCondition, iterationPayload, 2000);
        if (shouldBreak) {
          result.breakEarly = true;
          break;
        }
      } catch (e) {
        console.error('Loop break condition evaluation error:', e);
      }
    }

    result.iterationPayloads.push({ payload: iterationPayload });
  }

  return result;
}
