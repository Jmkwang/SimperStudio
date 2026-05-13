import { WorkflowNode as _WorkflowNode } from '../../../types/models';
import { NodeExecutorFn } from '../types';

/**
 * Condition node: evaluates routes and returns payload unchanged.
 * Routing is handled in the engine based on matched route ID.
 */
export const conditionExecute: NodeExecutorFn = async (_node, payload, _helpers) => {
  return payload;
};
