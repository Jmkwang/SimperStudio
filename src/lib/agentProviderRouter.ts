import { Agent, ModelProvider, ProviderModel, WorkflowAgentNodeData } from '@/types/models';

export interface ResolvedModelConfig {
  provider: ModelProvider;
  model: ProviderModel;
  providerName: string;
  modelName: string;
}

export interface ResolveSettings {
  providers: ModelProvider[];
  activeProviderId: string | null;
}

/**
 * Resolve the actual provider + model to use for an Agent call.
 * Priority chain:
 *   1. Node-level override (workflow node data)
 *   2. Agent-level config (agent.providerId / agent.modelId)
 *   3. Global activeProvider (settings.activeProviderId + its default model)
 *
 * No fallback — any missing/invalid config throws immediately.
 */
export function resolveAgentModelConfig(
  agent: Agent,
  nodeData?: Pick<WorkflowAgentNodeData, 'overrideProviderId' | 'overrideModelId'>,
  settings?: ResolveSettings,
): ResolvedModelConfig {
  // 1. Determine providerId
  const activeProviderId = settings?.activeProviderId || settings?.providers.find((p) => p.isEnabled)?.id || null;
  const providerId = nodeData?.overrideProviderId || agent.providerId || activeProviderId;
  if (!providerId) {
    throw new Error('No provider configured. Set a provider for this Agent or enable at least one provider in Settings > Models.');
  }

  const provider = settings?.providers.find((p) => p.id === providerId);
  if (!provider) {
    throw new Error(`Provider not found: "${providerId}"`);
  }
  if (!provider.isEnabled) {
    throw new Error(`Provider "${provider.name}" is disabled. Enable it in Settings > Models.`);
  }
  if (!provider.apiKey) {
    throw new Error(`Provider "${provider.name}" has no API key configured.`);
  }

  // 2. Determine modelId
  const modelId = nodeData?.overrideModelId || agent.modelId;
  let model: ProviderModel | undefined;
  if (modelId) {
    model = provider.models.find((m) => m.modelId === modelId || m.id === modelId);
  }
  if (!model) {
    model = provider.models.find((m) => m.isDefault) || provider.models[0];
  }
  if (!model) {
    throw new Error(`Provider "${provider.name}" has no models configured. Add a model in Settings > Models.`);
  }

  return {
    provider,
    model,
    providerName: provider.name,
    modelName: model.name,
  };
}

/**
 * Turn a raw error message into a one-line user-facing summary.
 */
export function shortError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('401') || m.includes('unauthorized')) return 'API Key 错误 (401)';
  if (m.includes('403') || m.includes('forbidden')) return '无权访问 (403)';
  if (m.includes('404') || m.includes('not found')) return '模型不存在 (404)';
  if (m.includes('429') || m.includes('too many requests')) return '请求频率限制 (429)';
  if (m.includes('500') || m.includes('internal server')) return '服务器错误 (500)';
  if (m.includes('503') || m.includes('service unavailable')) return '服务不可用 (503)';
  if (m.includes('timeout')) return '请求超时';
  if (m.includes('networkerror') || m.includes('fetch') || m.includes('enetunreach')) return '网络连接失败';
  if (m.includes('provider not found')) return '服务商未配置';
  if (m.includes('disabled')) return '服务商已禁用';
  if (m.includes('no api key')) return '未配置 API Key';
  if (m.includes('no models')) return '服务商无可用模型';
  return '模型调用失败';
}
