import { Settings, ModelProvider } from '../types/models';

export interface ModelSlice {
  settings: Settings;

  // Actions
  updateSettings: (updates: Partial<Settings>) => void;
  addProvider: (provider: ModelProvider) => void;
  updateProvider: (id: string, updates: Partial<ModelProvider>) => void;
  deleteProvider: (id: string) => void;
  setActiveProvider: (providerId: string | null) => void;
}

function autoSelectActiveProvider(providers: ModelProvider[], currentActiveId: string | null): string | null {
  // If current active is still enabled, keep it
  if (currentActiveId && providers.find(p => p.id === currentActiveId)?.isEnabled) {
    return currentActiveId;
  }
  // Otherwise pick the first enabled provider
  const firstEnabled = providers.find(p => p.isEnabled);
  return firstEnabled?.id || null;
}

export function createModelSlice(set: any, _get: any, writeConfig: (name: string, value: unknown) => Promise<void>): ModelSlice {
  return {
    settings: {
      theme: 'system',
      language: 'zh',
      providers: [
        {
          id: 'openai-default',
          name: 'OpenAI',
          type: 'openai',
          apiKey: '',
          baseUrl: 'https://api.openai.com/v1',
          isEnabled: false,
          apiFormat: 'openai-responses',
          models: [
            { id: 'openai-gpt4o', name: 'GPT-4o', modelId: 'gpt-4o', isDefault: true },
            { id: 'openai-gpt4o-mini', name: 'GPT-4o Mini', modelId: 'gpt-4o-mini' },
            { id: 'openai-o3', name: 'o3', modelId: 'o3' },
            { id: 'openai-o4-mini', name: 'o4-mini', modelId: 'o4-mini' },
          ],
        },
        {
          id: 'anthropic-default',
          name: 'Anthropic',
          type: 'anthropic',
          apiKey: '',
          baseUrl: 'https://api.anthropic.com/v1',
          isEnabled: false,
          models: [
            { id: 'anthropic-claude-opus-4', name: 'Claude Opus 4', modelId: 'claude-opus-4-5', isDefault: true },
            { id: 'anthropic-claude-sonnet-4', name: 'Claude Sonnet 4', modelId: 'claude-sonnet-4-5' },
            { id: 'anthropic-claude-haiku-4', name: 'Claude Haiku 4', modelId: 'claude-haiku-4-5' },
          ],
        },
        {
          id: 'gemini-default',
          name: 'Gemini',
          type: 'gemini',
          apiKey: '',
          baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
          isEnabled: false,
          models: [
            { id: 'gemini-2-5-pro', name: 'Gemini 2.5 Pro', modelId: 'gemini-2.5-pro-preview-06-05', isDefault: true },
            { id: 'gemini-2-5-flash', name: 'Gemini 2.5 Flash', modelId: 'gemini-2.5-flash-preview-05-20' },
            { id: 'gemini-2-0-flash', name: 'Gemini 2.0 Flash', modelId: 'gemini-2.0-flash' },
          ],
        },
        {
          id: 'deepseek-default',
          name: 'DeepSeek',
          type: 'deepseek',
          apiKey: '',
          baseUrl: 'https://api.deepseek.com',
          isEnabled: false,
          apiFormat: 'openai-chat',
          models: [
            { id: 'deepseek-chat', name: 'DeepSeek V3', modelId: 'deepseek-chat', isDefault: true },
            { id: 'deepseek-reasoner', name: 'DeepSeek R1', modelId: 'deepseek-reasoner' },
          ],
        },
        {
          id: 'siliconflow-default',
          name: '硅基流动',
          type: 'siliconflow',
          apiKey: '',
          baseUrl: 'https://api.siliconflow.cn',
          isEnabled: false,
          apiFormat: 'openai-chat',
          models: [
            { id: 'sf-deepseek-v3', name: 'DeepSeek-V3', modelId: 'deepseek-ai/DeepSeek-V3', isDefault: true },
            { id: 'sf-deepseek-r1', name: 'DeepSeek-R1', modelId: 'deepseek-ai/DeepSeek-R1' },
            { id: 'sf-qwen3-235b', name: 'Qwen3-235B-A22B', modelId: 'Qwen/Qwen3-235B-A22B' },
          ],
        },
        {
          id: 'kimi-default',
          name: 'Kimi',
          type: 'custom',
          apiKey: '',
          baseUrl: 'https://api.moonshot.cn',
          isEnabled: false,
          apiFormat: 'openai-chat',
          models: [
            { id: 'kimi-k2', name: 'Kimi K2', modelId: 'kimi-k2-0711-preview', isDefault: true },
            { id: 'moonshot-v1-8k', name: 'Moonshot v1 8k', modelId: 'moonshot-v1-8k' },
            { id: 'moonshot-v1-32k', name: 'Moonshot v1 32k', modelId: 'moonshot-v1-32k' },
            { id: 'moonshot-v1-128k', name: 'Moonshot v1 128k', modelId: 'moonshot-v1-128k' },
          ],
        },
      ],
      activeProviderId: null,
      allowRemoteAccess: true,
      remoteAccessPort: 1420,
      fontSize: 100,
    },

    updateSettings: (updates) => set((state: any) => {
      const settings = { ...state.settings, ...updates };
      void writeConfig('model.json', settings);
      return { settings };
    }),

    addProvider: (provider) => set((state: any) => {
      const newProviders = [...state.settings.providers, provider];
      const settings: Settings = {
        ...state.settings,
        providers: newProviders,
        activeProviderId: autoSelectActiveProvider(newProviders, state.settings.activeProviderId),
      };
      void writeConfig('model.json', settings);
      return { settings };
    }),

    updateProvider: (id, updates) => set((state: any) => {
      const newProviders = state.settings.providers.map((p: ModelProvider) => p.id === id ? { ...p, ...updates } : p);
      const settings: Settings = {
        ...state.settings,
        providers: newProviders,
        activeProviderId: autoSelectActiveProvider(newProviders, state.settings.activeProviderId),
      };
      void writeConfig('model.json', settings);
      return { settings };
    }),

    deleteProvider: (id) => set((state: any) => {
      const newProviders = state.settings.providers.filter((p: ModelProvider) => p.id !== id);
      const settings: Settings = {
        ...state.settings,
        providers: newProviders,
        activeProviderId: autoSelectActiveProvider(newProviders, state.settings.activeProviderId),
      };
      void writeConfig('model.json', settings);
      return { settings };
    }),

    setActiveProvider: (providerId) => set((state: any) => {
      const settings: Settings = {
        ...state.settings,
        activeProviderId: providerId,
      };
      void writeConfig('model.json', settings);
      return { settings };
    }),
  };
}
