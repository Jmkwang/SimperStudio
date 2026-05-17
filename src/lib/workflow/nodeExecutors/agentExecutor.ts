import { NodeExecutorFn } from '../types';
import { resolveAgentModelConfig, shortError } from '@/lib/agentProviderRouter';
import { fetchFromResolvedConfig } from '@/lib/api';

export const agentExecute: NodeExecutorFn = async (node, payload, helpers) => {
  const agentId = node.data?.agentId;
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
    overrideProviderId: node.data?.overrideProviderId,
    overrideModelId: node.data?.overrideModelId,
    overrideSystemPrompt: node.data?.overrideSystemPrompt || node.data?.prompt || undefined,
  };

  try {
    const config = resolveAgentModelConfig(agent, nodeData, settings);
    const systemPrompt = nodeData.overrideSystemPrompt || agent.systemPrompt;

    const { textStream } = await fetchFromResolvedConfig(config, promptText, systemPrompt);

    let result = '';
    for await (const chunk of textStream) {
      result += chunk;
    }

    // If schema is specified, try to parse as structured JSON output
    if (node.data?.schema) {
      try {
        const parsed = JSON.parse(result);
        return { ...payload, llmResult: parsed };
      } catch {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            return { ...payload, llmResult: parsed };
          } catch {
            return { ...payload, llmResult: { raw: result, _parseError: 'Failed to parse JSON from response' } };
          }
        }
        return { ...payload, llmResult: { raw: result, _parseError: 'No JSON found in response' } };
      }
    }

    return { ...payload, output: result };

  } catch (e: any) {
    const detail = e.message || String(e);
    return { ...payload, _error: `${shortError(detail)}: ${detail}` };
  }
};
