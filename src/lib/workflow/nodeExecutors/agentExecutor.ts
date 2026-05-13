import { WorkflowNode as _WorkflowNode } from '../../../types/models';
import { NodeExecutorFn } from '../types';

export const agentExecute: NodeExecutorFn = async (node, payload, _helpers) => {
  if (node.data?.schema) {
    const schemaStr = String(node.data.schema || '');
    let parsedOutput = {};
    if (schemaStr.includes('targetId')) {
      parsedOutput = { targetId: 'player_3', reason: 'simulated logic' };
    } else {
      parsedOutput = { result: 'simulated' };
    }
    return { ...payload, llmResult: parsedOutput };
  }
  return { ...payload, output: `[Agent Output for ${node.data?.label || 'Agent'}]: processed input.` };
};
