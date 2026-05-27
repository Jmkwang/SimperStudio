import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import type { ModelProvider } from '@/types/models';
import type { ResolvedModelConfig } from './agentProviderRouter';
import { debugLogger } from '@/lib/debugLogger';

/** 自动拼 /v1：用户只需填域名，程序补全版本路径 */
function ensureV1(url: string): string {
    const cleaned = url.trim().replace(/\/+$/, '');
    if (cleaned.endsWith('/v1')) return cleaned;
    return `${cleaned}/v1`;
}

function apiBase(provider: ModelProvider): string {
    return ensureV1(provider.baseUrl);
}

export interface FetchOptions {
  maxTokens?: number;
  temperature?: number;
}

export async function fetchFromResolvedConfig(
  config: ResolvedModelConfig,
  prompt: string,
  systemPrompt?: string,
  options?: FetchOptions,
) {
  return fetchFromProvider(config.provider, config.model.modelId, prompt, systemPrompt, options);
}

/** @deprecated Use fetchFromResolvedConfig via agentProviderRouter instead */
export async function fetchFromModel(provider: string, modelId: string, prompt: string, settings: any, systemPrompt?: string) {
    // New multi-provider system
    if (settings.providers) {
        const activeProvider = settings.activeProviderId
            ? settings.providers.find((p: ModelProvider) => p.id === settings.activeProviderId)
            : settings.providers.find((p: ModelProvider) => p.isEnabled);
        if (activeProvider && activeProvider.isEnabled) {
            return fetchFromProvider(activeProvider, modelId, prompt, systemPrompt);
        }
    }

    // Legacy fallback
    let model;
    if (provider === 'custom') {
        const customProvider = createOpenAI({
            baseURL: ensureV1(settings.customBaseUrl || ''),
            apiKey: settings.customApiKey || 'sk-custom',
        });
        model = customProvider.chat(modelId || settings.customModelId || 'default');
    } else if (provider === 'openai') {
        const openai = createOpenAI({ apiKey: settings.openaiKey || '' });
        model = openai.chat(modelId);
    } else if (provider === 'anthropic') {
        const anthropic = createAnthropic({ apiKey: settings.anthropicKey || '' });
        model = anthropic(modelId);
    } else if (provider === 'google') {
        const google = createGoogleGenerativeAI({ apiKey: settings.googleKey || '' });
        model = google(modelId);
    } else {
        throw new Error(`Unsupported provider: ${provider}`);
    }

    return streamText({
        model,
        system: systemPrompt,
        prompt,
    });
}

export async function fetchFromProvider(provider: ModelProvider, modelId: string, prompt: string, systemPrompt?: string, options?: FetchOptions) {
    const startTime = performance.now();
    debugLogger.log('api_call', 'api', `→ ${provider.type}/${modelId}`, {
      baseUrl: provider.baseUrl,
      apiFormat: provider.apiFormat,
      promptPreview: prompt.slice(0, 120),
      systemPromptPreview: systemPrompt?.slice(0, 80),
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
    });

    let model;

    if (provider.type === 'openai' || provider.type === 'custom' || provider.type === 'siliconflow' || provider.type === 'deepseek') {
        if (provider.apiFormat === 'anthropic-messages') {
            const anthropic = createAnthropic({
                baseURL: apiBase(provider),
                apiKey: provider.apiKey,
            });
            model = anthropic(modelId);
        } else {
            const openai = createOpenAI({
                baseURL: apiBase(provider),
                apiKey: provider.apiKey,
            });
            if (provider.apiFormat === 'openai-responses') {
                model = openai(modelId);
            } else {
                model = openai.chat(modelId);
            }
        }
    } else if (provider.type === 'anthropic') {
        const anthropic = createAnthropic({
            baseURL: apiBase(provider),
            apiKey: provider.apiKey,
        });
        model = anthropic(modelId);
    } else if (provider.type === 'gemini') {
        const google = createGoogleGenerativeAI({
            apiKey: provider.apiKey,
        });
        model = google(modelId);
    } else {
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }

    const result = streamText({
        model,
        system: systemPrompt,
        prompt,
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
    });

    const duration = performance.now() - startTime;
    debugLogger.log('api_response', 'api', `← ${provider.type}/${modelId}`, { durationMs: Math.round(duration) }, 'info', duration);

    return result;
}
