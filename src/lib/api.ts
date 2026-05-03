import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import type { ModelProvider } from '@/types/models';

export async function fetchFromModel(provider: string, modelId: string, prompt: string, settings: any, systemPrompt?: string) {
    // New multi-provider system
    if (settings.providers && settings.activeProviderId) {
        const activeProvider = settings.providers.find((p: ModelProvider) => p.id === settings.activeProviderId);
        if (activeProvider && activeProvider.isEnabled) {
            return fetchFromProvider(activeProvider, modelId, prompt, systemPrompt);
        }
    }

    // Legacy fallback
    let model;
    if (provider === 'custom') {
        const customProvider = createOpenAI({
            baseURL: settings.customBaseUrl,
            apiKey: settings.customApiKey || 'sk-custom',
        });
        model = customProvider(modelId || settings.customModelId || 'default');
    } else if (provider === 'openai') {
        const openai = createOpenAI({ apiKey: settings.openaiKey || '' });
        model = openai(modelId);
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

export async function fetchFromProvider(provider: ModelProvider, modelId: string, prompt: string, systemPrompt?: string) {
    let model;
    const defaultModel = provider.models.find(m => m.isDefault) || provider.models[0];
    const finalModelId = modelId || defaultModel?.modelId || '';

    if (provider.type === 'openai' || provider.type === 'custom') {
        const openai = createOpenAI({
            baseURL: provider.baseUrl,
            apiKey: provider.apiKey || 'sk-custom',
        });
        model = openai(finalModelId);
    } else if (provider.type === 'anthropic') {
        const anthropic = createAnthropic({
            apiKey: provider.apiKey || '',
        });
        model = anthropic(finalModelId);
    } else if (provider.type === 'gemini') {
        const google = createGoogleGenerativeAI({
            apiKey: provider.apiKey || '',
        });
        model = google(finalModelId);
    } else {
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }

    return streamText({
        model,
        system: systemPrompt,
        prompt,
    });
}
