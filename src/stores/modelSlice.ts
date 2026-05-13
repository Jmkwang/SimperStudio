import { Settings, ModelProvider } from '../types/models';

export interface ModelSlice {
  settings: Settings;

  // Actions
  updateSettings: (updates: Partial<Settings>) => void;
  addProvider: (provider: ModelProvider) => void;
  updateProvider: (id: string, updates: Partial<ModelProvider>) => void;
  deleteProvider: (id: string) => void;
  setActiveProvider: (id: string) => void;
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
            { id: 'openai-gpt4-turbo', name: 'GPT-4 Turbo', modelId: 'gpt-4-turbo' },
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
            { id: 'anthropic-sonnet', name: 'Claude 3.5 Sonnet', modelId: 'claude-3-5-sonnet-20240620', isDefault: true },
            { id: 'anthropic-haiku', name: 'Claude 3 Haiku', modelId: 'claude-3-haiku-20240307' },
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
            { id: 'gemini-pro', name: 'Gemini 1.5 Pro', modelId: 'gemini-1.5-pro-latest', isDefault: true },
            { id: 'gemini-flash', name: 'Gemini 1.5 Flash', modelId: 'gemini-1.5-flash-latest' },
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
            { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', modelId: 'deepseek-v4-flash', isDefault: true },
            { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', modelId: 'deepseek-v4-pro' },
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
            { id: 'siliconflow-deepseek-v3-2', name: 'DeepSeek-V3.2', modelId: 'deepseek-ai/DeepSeek-V3.2', isDefault: true },
          ],
        },
      ],
      activeProviderId: 'siliconflow-default',
      allowRemoteAccess: true,
      remoteAccessPort: 1420,
    },

    updateSettings: (updates) => set((state: any) => {
      const settings = { ...state.settings, ...updates };
      void writeConfig('model.json', settings);
      return { settings };
    }),

    addProvider: (provider) => set((state: any) => {
      const settings: Settings = {
        ...state.settings,
        providers: [...state.settings.providers, provider],
      };
      void writeConfig('model.json', settings);
      return { settings };
    }),

    updateProvider: (id, updates) => set((state: any) => {
      const settings: Settings = {
        ...state.settings,
        providers: state.settings.providers.map((p: ModelProvider) => p.id === id ? { ...p, ...updates } : p),
      };
      void writeConfig('model.json', settings);
      return { settings };
    }),

    deleteProvider: (id) => set((state: any) => {
      const newProviders = state.settings.providers.filter((p: ModelProvider) => p.id !== id);
      const settings: Settings = {
        ...state.settings,
        providers: newProviders,
        activeProviderId: state.settings.activeProviderId === id
          ? (newProviders[0]?.id || null)
          : state.settings.activeProviderId,
      };
      void writeConfig('model.json', settings);
      return { settings };
    }),

    setActiveProvider: (id) => set((state: any) => {
      const settings: Settings = { ...state.settings, activeProviderId: id };
      void writeConfig('model.json', settings);
      return { settings };
    }),
  };
}
