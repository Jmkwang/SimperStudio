import { WorkflowNode as _WorkflowNode } from '../../../types/models';
import { NodeExecutorFn } from '../types';

export const codeExecute: NodeExecutorFn = async (node, payload, helpers) => {
  const jsCode = `try { ${node.data?.code || 'return payload;'} } catch(e) { return { ...payload, _error: e.message }; }`;
  const executeFn = new helpers.AsyncFunction('payload', jsCode);
  const resultPayload = await helpers.withTimeout(
    executeFn(structuredClone(payload)),
    10000,
    'Code execution timed out after 10s'
  );
  return resultPayload || payload;
};
