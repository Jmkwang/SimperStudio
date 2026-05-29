import { WorkflowNode as _WorkflowNode } from '../../../types/models';
import { NodeExecutorFn } from '../types';

export const waitExecute: NodeExecutorFn = async (node, payload, helpers) => {
  const d = node.data as any;
  const waitMode = d?.waitMode || 'fixed';
  if (waitMode === 'fixed') {
    await helpers.sleep(Number(d?.delayMs) || 1000);
  } else {
    const untilExpr = String(d?.untilExpression || 'true');
    const start = Date.now();
    while (Date.now() - start < 60000) {
      if (await helpers.evaluateExpression(untilExpr, payload, 2000)) break;
      await helpers.sleep(500);
    }
  }
  return payload;
};
