import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

export async function fetchFromModel(provider: string, modelId: string, prompt: string, settings: any, systemPrompt?: string) {
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
