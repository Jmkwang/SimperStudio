import { WorkflowNode as _WorkflowNode } from '../../../types/models';
import { NodeExecutorFn } from '../types';

/**
 * Sub-workflow executor: executes a referenced workflow.
 * Currently a pass-through — the actual sub-workflow execution
 * will be wired when the engine supports recursive execution.
 */
export const subWorkflowExecute: NodeExecutorFn = async (_node, payload, _helpers) => {
  return payload;
};
