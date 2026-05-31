import { NodeExecutorFn } from '../types';
import { WorkflowAgentNodeData } from '@/types/models';
import { resolveAgentModelConfig, shortError } from '@/lib/agentProviderRouter';
import { fetchFromResolvedConfig } from '@/lib/api';

export const agentExecute: NodeExecutorFn = async (node, payload, helpers) => {
  const data = node.data as WorkflowAgentNodeData;
  const agentId = data.agentId;
  if (!agentId) {
    return { ...payload, _error: 'No agent assigned to this node' };
  }

  const agents = helpers.getGlobalState?.('agents') || [];
  const settings = helpers.getGlobalState?.('settings');
  const agent = agents.find((a: any) => a.id === agentId);

  if (!agent) {
    return { ...payload, _error: `Agent not found: ${agentId}` };
  }

  // Build prompt from payload context
  const promptText = typeof payload === 'object'
    ? JSON.stringify(payload, null, 2)
    : String(payload);

  // Node-level overrides
  const nodeData = {
    overrideProviderId: data.overrideProviderId,
    overrideModelId: data.overrideModelId,
    overrideSystemPrompt: data.overrideSystemPrompt || data.prompt || undefined,
  };

  try {
    const config = resolveAgentModelConfig(agent, nodeData, settings);
    const systemPrompt = nodeData.overrideSystemPrompt || agent.systemPrompt;

    const { textStream } = await fetchFromResolvedConfig(config, promptText, systemPrompt, {
      maxTokens: agent.maxTokens,
      temperature: agent.temperature,
    });

    let result = '';
    for await (const chunk of textStream) {
      result += chunk;
    }

    // If schema is specified, try to parse as structured JSON output
    if (data.schema) {
      try {
        const parsed = JSON.parse(result);
        // Collect loop iteration results so they are not overwritten by subsequent iterations
        if (payload.loop && Array.isArray(payload._loopResults)) {
          payload._loopResults.push({
            nodeId: node.id,
            iterationIndex: payload.loop.index,
            iterationItem: payload.loop.currentItem,
            llmResult: parsed,
            timestamp: Date.now(),
          });
        }
        return { ...payload, llmResult: parsed };
      } catch {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (payload.loop && Array.isArray(payload._loopResults)) {
              payload._loopResults.push({
                nodeId: node.id,
                iterationIndex: payload.loop.index,
                iterationItem: payload.loop.currentItem,
                llmResult: parsed,
                timestamp: Date.now(),
              });
            }
            return { ...payload, llmResult: parsed };
          } catch {
            const fallback = { raw: result, _parseError: 'Failed to parse JSON from response' };
            if (payload.loop && Array.isArray(payload._loopResults)) {
              payload._loopResults.push({
                nodeId: node.id,
                iterationIndex: payload.loop.index,
                iterationItem: payload.loop.currentItem,
                llmResult: fallback,
                timestamp: Date.now(),
              });
            }
            return { ...payload, llmResult: fallback };
          }
        }
        const fallback = { raw: result, _parseError: 'No JSON found in response' };
        if (payload.loop && Array.isArray(payload._loopResults)) {
          payload._loopResults.push({
            nodeId: node.id,
            iterationIndex: payload.loop.index,
            iterationItem: payload.loop.currentItem,
            llmResult: fallback,
            timestamp: Date.now(),
          });
        }
        return { ...payload, llmResult: fallback };
      }
    }

    // Collect loop iteration results even when no schema is specified
    if (payload.loop && Array.isArray(payload._loopResults)) {
      payload._loopResults.push({
        nodeId: node.id,
        iterationIndex: payload.loop.index,
        iterationItem: payload.loop.currentItem,
        llmResult: result,
        timestamp: Date.now(),
      });
    }

    return { ...payload, llmResult: result };

  } catch (e: any) {
    const detail = e.message || String(e);
    return { ...payload, _error: `${shortError(detail)}: ${detail}` };
  }
};
