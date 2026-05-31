import { NodeExecutorFn } from '../types';
import { Agent, DynamicAgentConfig, WorkflowDynamicAgentNodeData } from '@/types/models';
import { resolveAgentModelConfig, shortError } from '@/lib/agentProviderRouter';
import { fetchFromResolvedConfig } from '@/lib/api';

function tryParseJson(result: string): { parsed: any; success: boolean } {
  try {
    return { parsed: JSON.parse(result), success: true };
  } catch {
    const match = result.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return { parsed: JSON.parse(match[0]), success: true };
      } catch {
        return { parsed: { raw: result, _parseError: 'Failed to parse JSON from response' }, success: false };
      }
    }
    return { parsed: { raw: result, _parseError: 'No JSON found in response' }, success: false };
  }
}

export const dynamicAgentExecute: NodeExecutorFn = async (node, payload, helpers) => {
  const data = node.data as WorkflowDynamicAgentNodeData;
  // 1. Parse dynamic configuration
  let config: DynamicAgentConfig | undefined;

  if (data.configSource === 'payload') {
    const configPath = String(data.configPath || 'payload.dynamicAgentConfig');
    const resolved = helpers.getByPath(payload, configPath);
    if (resolved && typeof resolved === 'object' && resolved.systemPrompt) {
      config = resolved as DynamicAgentConfig;
    }
  } else {
    // inline mode: generate config from templates
    const inline = data.inlineConfig;
    if (inline && inline.systemPromptTemplate) {
      config = {
        name: helpers.replaceTemplateVars(inline.nameTemplate || 'Dynamic Agent', payload),
        systemPrompt: helpers.replaceTemplateVars(inline.systemPromptTemplate, payload),
        avatar: inline.avatarTemplate
          ? helpers.replaceTemplateVars(inline.avatarTemplate, payload)
          : undefined,
        personality: inline.personalityTemplate
          ? helpers.replaceTemplateVars(inline.personalityTemplate, payload)
          : undefined,
        role: inline.roleTemplate
          ? helpers.replaceTemplateVars(inline.roleTemplate, payload)
          : undefined,
      };
    }
  }

  if (!config || !config.systemPrompt) {
    return { ...payload, _error: 'Dynamic Agent: no valid configuration found' };
  }

  // 2. Resolve model config (three-level fallback) and avatar inheritance
  const settings = helpers.getGlobalState?.('settings');
  const allAgents = helpers.getGlobalState?.('agents') || [];
  let providerId = config.providerId;
  let modelId = config.modelId;

  // Fallback 1: from fallbackAgentId
  let fallbackAgent: Agent | undefined;
  if (data.fallbackAgentId) {
    fallbackAgent = allAgents.find((a: Agent) => a.id === data.fallbackAgentId);
    if (fallbackAgent && !providerId) {
      providerId = fallbackAgent.providerId;
      modelId = fallbackAgent.modelId;
    }
  }

  // Inherit avatar from fallbackAgent if config has no avatar
  if (!config.avatar && fallbackAgent?.avatar) {
    config = { ...config, avatar: fallbackAgent.avatar };
  }

  // Fallback 2: from fallbackProviderId / fallbackModelId
  if (!providerId && data.fallbackProviderId) {
    providerId = String(data.fallbackProviderId);
    modelId = data.fallbackModelId ? String(data.fallbackModelId) : undefined;
  }

  // 3. Build prompt text
  const promptText = data.promptTemplate
    ? helpers.replaceTemplateVars(String(data.promptTemplate), payload)
    : (typeof payload === 'object' ? JSON.stringify(payload, null, 2) : String(payload));

  // 4. Call LLM
  try {
    const virtualAgent: Agent = {
      id: `dynamic-${node.id}-${Date.now()}`,
      name: config.name || 'Dynamic Agent',
      avatar: config.avatar || '',
      systemPrompt: config.systemPrompt,
      providerId,
      modelId,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    };

    const modelConfig = resolveAgentModelConfig(virtualAgent, {}, settings);
    const { textStream } = await fetchFromResolvedConfig(
      modelConfig,
      promptText,
      config.systemPrompt,
      {
        maxTokens: config.maxTokens,
        temperature: config.temperature,
      }
    );

    let result = '';
    for await (const chunk of textStream) {
      if (helpers.signal?.aborted) break;
      result += chunk;
    }

    // 5. Parse schema if specified
    const schema = data.schema ? String(data.schema) : undefined;
    let outputValue: any = result;
    if (schema) {
      const { parsed } = tryParseJson(result);
      outputValue = parsed;
    }

    // 6. Collect loop iteration results
    if (payload.loop && Array.isArray(payload._loopResults)) {
      payload._loopResults.push({
        nodeId: node.id,
        iterationIndex: payload.loop.index,
        iterationItem: payload.loop.currentItem,
        llmResult: outputValue,
        timestamp: Date.now(),
      });
    }

    // 7. Build output
    const outputField = String(data.outputField || 'llmResult');
    return {
      ...payload,
      [outputField]: outputValue,
      _dynamicAgentMeta: {
        nodeId: node.id,
        name: config.name,
        role: config.role,
        personality: config.personality,
        avatar: config.avatar,
        systemPrompt: config.systemPrompt,
      },
    };

  } catch (e: any) {
    const detail = e.message || String(e);
    return { ...payload, _error: `${shortError(detail)}: ${detail}` };
  }
};
