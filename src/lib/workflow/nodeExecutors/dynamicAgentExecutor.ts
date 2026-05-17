import { NodeExecutorFn } from '../types';
import { Agent, DynamicAgentConfig } from '@/types/models';
import { resolveAgentModelConfig, shortError } from '@/lib/agentProviderRouter';
import { fetchFromResolvedConfig } from '@/lib/api';

export const dynamicAgentExecute: NodeExecutorFn = async (node, payload, helpers) => {
  // 1. Parse dynamic configuration
  let config: DynamicAgentConfig | undefined;

  if (node.data?.configSource === 'payload') {
    const configPath = String(node.data?.configPath || 'payload.dynamicAgentConfig');
    const resolved = helpers.getByPath(payload, configPath);
    if (resolved && typeof resolved === 'object' && resolved.systemPrompt) {
      config = resolved as DynamicAgentConfig;
    }
  } else {
    // inline mode: generate config from templates
    const inline = node.data?.inlineConfig;
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

  // 2. Resolve model config (three-level fallback)
  const settings = helpers.getGlobalState?.('settings');
  let providerId = config.providerId;
  let modelId = config.modelId;

  // Fallback 1: from fallbackAgentId
  if (!providerId && node.data?.fallbackAgentId) {
    const agents = helpers.getGlobalState?.('agents') || [];
    const fallbackAgent = agents.find((a: Agent) => a.id === node.data?.fallbackAgentId);
    if (fallbackAgent) {
      providerId = fallbackAgent.providerId;
      modelId = fallbackAgent.modelId;
    }
  }

  // Fallback 2: from fallbackProviderId / fallbackModelId
  if (!providerId && node.data?.fallbackProviderId) {
    providerId = String(node.data.fallbackProviderId);
    modelId = node.data?.fallbackModelId ? String(node.data.fallbackModelId) : undefined;
  }

  // 3. Build prompt text
  const promptText = node.data?.promptTemplate
    ? helpers.replaceTemplateVars(String(node.data.promptTemplate), payload)
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
      config.systemPrompt
    );

    let result = '';
    for await (const chunk of textStream) {
      result += chunk;
    }

    // 5. Build output
    const outputField = String(node.data?.outputField || 'llmResult');
    return {
      ...payload,
      [outputField]: result,
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
