import { WorkflowSubWorkflowNodeData } from '../../../types/models';
import { NodeExecutorFn } from '../types';

/**
 * Sub-workflow executor: executes a referenced workflow recursively.
 *
 * - Maps input fields from current payload to sub-workflow payload using `inputs` mapping.
 * - Calls `executeWorkflow` from helpers to run the referenced workflow.
 * - Merges the sub-workflow result back into the current payload.
 */
export const subWorkflowExecute: NodeExecutorFn = async (node, payload, helpers) => {
  const data = node.data as WorkflowSubWorkflowNodeData;
  const subWorkflowId = data.workflowId;

  if (!subWorkflowId) {
    return { ...payload, _error: 'Sub-workflow node has no workflowId configured' };
  }

  if (!helpers.executeWorkflow) {
    return { ...payload, _error: 'Sub-workflow execution is not available in this context' };
  }

  try {
    // Build sub-workflow initial payload from input mappings
    const inputs = data.inputs || {};
    const subPayload: Record<string, any> = {};

    for (const [subKey, sourcePath] of Object.entries(inputs)) {
      const value = helpers.getByPath(payload, sourcePath);
      subPayload[subKey] = value;
    }

    // Execute the referenced workflow
    const result = await helpers.executeWorkflow(subWorkflowId, subPayload);

    // Merge sub-workflow result back into current payload
    // Use _subWorkflowResult to store the full result, and merge individual fields
    const mergedPayload = { ...payload };
    if (result && typeof result === 'object') {
      for (const [key, value] of Object.entries(result)) {
        mergedPayload[key] = value;
      }
    }
    mergedPayload._subWorkflowResult = result;

    return mergedPayload;
  } catch (e: any) {
    return { ...payload, _error: `Sub-workflow execution failed: ${e.message || String(e)}` };
  }
};
