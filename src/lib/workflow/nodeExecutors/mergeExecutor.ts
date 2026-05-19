import { WorkflowNode, WorkflowEdge } from '../../../types/models';
import { NodeExecutorFn } from '../types';

export const mergeExecute: NodeExecutorFn = async (_node, payload, _helpers) => {
  return payload;
};

/**
 * Merge routing: collects results from upstream nodes and merges them.
 * Called after execution to handle the merge semantics.
 *
 * @param incomingEdges - edges that point TO this merge node (source = upstream)
 */
export function computeMergePayload(
  node: WorkflowNode,
  basePayload: any,
  incomingEdges: WorkflowEdge[],
  results: Record<string, any>
): any {
  const strategy = node.data?.strategy || 'append';
  const mergeKey = node.data?.mergeKey || 'id';
  const incomingResults: any[] = [];
  for (const edge of incomingEdges) {
    if (results[edge.source]) incomingResults.push(results[edge.source]);
  }
  if (strategy === 'append') {
    return { ...basePayload, merged: incomingResults };
  }
  if (strategy === 'byKey') {
    const merged: Record<string, unknown> = {};
    for (const r of incomingResults) {
      const key = String(r[mergeKey as string] ?? '');
      if (key) merged[key] = r;
    }
    return { ...basePayload, merged };
  }
  // object assign
  return { ...basePayload, merged: Object.assign({}, ...incomingResults) as Record<string, unknown> };
}
