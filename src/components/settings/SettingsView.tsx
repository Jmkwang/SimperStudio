import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, Power, Globe, Key, Server, ChevronRight, Star, Minus,
  Play, CheckCircle, XCircle, Loader2, RefreshCw, ChevronDown, Bot
} from "lucide-react";
import { fetchFromProvider } from "@/lib/api";
import type { ModelProvider, ProviderModel } from "@/types/models";
import { v4 as uuidv4 } from 'uuid';

const PROVIDER_TYPE_OPTIONS = [
  { value: 'openai', label: 'OpenAI', icon: 'O' },
  { value: 'anthropic', label: 'Anthropic', icon: 'A' },
  { value: 'gemini', label: 'Gemini', icon: 'G' },
  { value: 'custom', label: 'Custom API', icon: 'C' },
] as const;

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-emerald-500/20 text-emerald-500',
  anthropic: 'bg-orange-500/20 text-orange-500',
  gemini: 'bg-blue-500/20 text-blue-500',
  custom: 'bg-purple-500/20 text-purple-500',
};

export function SettingsView() {
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);
  const addProvider = useAppStore(state => state.addProvider);
  const updateProvider = useAppStore(state => state.updateProvider);
  const deleteProvider = useAppStore(state => state.deleteProvider);
  const setActiveProvider = useAppStore(state => state.setActiveProvider);
  const { setTheme } = useTheme();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'models'>('models');
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(settings.activeProviderId);
  const [addProviderDialogOpen, setAddProviderDialogOpen] = useState(false);
  const [newProvider, setNewProvider] = useState<Partial<ModelProvider>>({
    type: 'openai',
    name: '',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    isEnabled: true,
    models: [],
  });
  const [newModel, setNewModel] = useState({ name: '', modelId: '', group: '' });
  const [validationErrors, setValidationErrors] = useState<{ name?: string; baseUrl?: string }>({});
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string>('');

  // Fetch models dialog state
  const [fetchDialogOpen, setFetchDialogOpen] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
  const [fetchedModels, setFetchedModels] = useState<Array<{ id: string; name: string; group?: string }>>([]);
  const [fetchError, setFetchError] = useState('');
  const [selectedFetchedModels, setSelectedFetchedModels] = useState<Set<string>>(new Set());

  // Add model dialog state
  const [addModelDialogOpen, setAddModelDialogOpen] = useState(false);

  // Model group expansion state
  const [expandedModelGroups, setExpandedModelGroups] = useState<Set<string>>(new Set());

  const [localSettings, setLocalSettings] = useState({
    allowRemoteAccess: settings.allowRemoteAccess,
    remoteAccessPort: settings.remoteAccessPort,
    language: settings.language,
    theme: settings.theme,
  });

  useEffect(() => {
    setLocalSettings({
      allowRemoteAccess: settings.allowRemoteAccess,
      remoteAccessPort: settings.remoteAccessPort,
      language: settings.language,
      theme: settings.theme,
    });
  }, [settings]);

  useEffect(() => {
    if (settings.activeProviderId && !selectedProviderId) {
      setSelectedProviderId(settings.activeProviderId);
    }
  }, [settings.activeProviderId, selectedProviderId]);

  // Reset test status when selected provider changes
  useEffect(() => {
    setTestStatus('idle');
    setTestError('');
  }, [selectedProviderId]);

  const handleChange = (key: string, value: string | boolean | number) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveGeneral = () => {
    updateSettings({
      allowRemoteAccess: localSettings.allowRemoteAccess,
      remoteAccessPort: Number(localSettings.remoteAccessPort),
      language: localSettings.language,
      theme: localSettings.theme as any,
    });
    setTheme(localSettings.theme as any);
  };

  const selectedProvider = settings.providers.find(p => p.id === selectedProviderId);

  const handleAddProvider = () => {
    const errors: { name?: string; baseUrl?: string } = {};
    if (!newProvider.name?.trim()) {
      errors.name = t('Please enter a provider name');
    }
    if (!newProvider.baseUrl?.trim()) {
      errors.baseUrl = t('Please enter a base URL');
    }
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});
    const defaultModel: ProviderModel = {
      id: uuidv4(),
      name: 'Default Model',
      modelId: getDefaultModelId(newProvider.type || 'openai'),
      isDefault: true,
    };
    const newProviderWithId: ModelProvider = {
      ...newProvider as Omit<ModelProvider, 'id'>,
      id: uuidv4(),
      models: [defaultModel],
    };
    addProvider(newProviderWithId);
    setSelectedProviderId(newProviderWithId.id);
    setAddProviderDialogOpen(false);
    setNewProvider({
      type: 'openai',
      name: '',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      isEnabled: true,
      models: [],
    });
  };

  const handleOpenAddProvider = () => {
    setNewProvider({
      type: 'openai',
      name: '',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      isEnabled: true,
      models: [],
    });
    setValidationErrors({});
    setAddProviderDialogOpen(true);
  };

  const handleAddModel = () => {
    if (selectedProvider && newModel.modelId) {
      const existingModels = Array.isArray(selectedProvider.models) ? selectedProvider.models : [];
      const model: ProviderModel = {
        id: uuidv4(),
        name: newModel.name || newModel.modelId,
        modelId: newModel.modelId,
      };
      updateProvider(selectedProvider.id, {
        models: [...existingModels, model],
      });
      setNewModel({ name: '', modelId: '', group: '' });
      setAddModelDialogOpen(false);
    }
  };

  // Group models by their ID prefix (e.g., "deepseek-ai/xxx" -> "deepseek-ai")
  const getModelGroup = (modelId: string): string => {
    if (modelId.includes('/')) {
      return modelId.split('/')[0];
    }
    return 'General';
  };

  const groupModelsByPrefix = (models: ProviderModel[]) => {
    const groups: Record<string, ProviderModel[]> = {};
    models.forEach(model => {
      const group = getModelGroup(model.modelId);
      if (!groups[group]) groups[group] = [];
      groups[group].push(model);
    });
    return groups;
  };

  // Fetch models from provider API
  const handleFetchModels = async () => {
    if (!selectedProvider) return;
    setFetchStatus('fetching');
    setFetchError('');
    setFetchedModels([]);
    setSelectedFetchedModels(new Set());

    try {
      const response = await fetch(`${selectedProvider.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${selectedProvider.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const models = (data.data || data.models || data).map((m: any) => ({
        id: m.id || m.modelId || uuidv4(),
        name: m.name || m.id || m.modelId || 'Unknown',
        group: m.id?.includes('/') ? m.id.split('/')[0] : undefined,
      }));

      setFetchedModels(models);
      setFetchStatus('success');
    } catch (err: any) {
      console.error('Fetch models failed:', err);
      setFetchStatus('error');
      setFetchError(err.message || String(err));
    }
  };

  // Add selected fetched models
  const handleAddFetchedModels = () => {
    if (!selectedProvider || selectedFetchedModels.size === 0) return;

    const existingModels = Array.isArray(selectedProvider.models) ? selectedProvider.models : [];

    const modelsToAdd = fetchedModels
      .filter(m => selectedFetchedModels.has(m.id))
      .map(m => ({
        id: uuidv4(),
        name: m.name,
        modelId: m.id,
      }));

    updateProvider(selectedProvider.id, {
      models: [...existingModels, ...modelsToAdd],
    });

    setFetchDialogOpen(false);
    setFetchedModels([]);
    setSelectedFetchedModels(new Set());
    setFetchStatus('idle');
  };

  const toggleFetchedModel = (id: string) => {
    setSelectedFetchedModels(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteModel = (modelId: string) => {
    if (selectedProvider) {
      const newModels = selectedProvider.models.filter(m => m.id !== modelId);
      if (newModels.length > 0 && !newModels.some(m => m.isDefault)) {
        newModels[0].isDefault = true;
      }
      updateProvider(selectedProvider.id, { models: newModels });
    }
  };

  const handleSetDefaultModel = (modelId: string) => {
    if (selectedProvider) {
      updateProvider(selectedProvider.id, {
        models: selectedProvider.models.map(m => ({
          ...m,
          isDefault: m.id === modelId,
        })),
      });
    }
  };

  const getDefaultBaseUrl = (type: string) => {
    switch (type) {
      case 'openai': return 'https://api.openai.com/v1';
      case 'anthropic': return 'https://api.anthropic.com/v1';
      case 'gemini': return 'https://generativelanguage.googleapis.com/v1beta';
      default: return '';
    }
  };

  const getDefaultModelId = (type: string) => {
    switch (type) {
      case 'openai': return 'gpt-4o';
      case 'anthropic': return 'claude-3-5-sonnet-20240620';
      case 'gemini': return 'gemini-1.5-pro-latest';
      default: return '';
    }
  };

  const getDefaultProviderName = (type: string) => {
    switch (type) {
      case 'openai': return 'OpenAI';
      case 'anthropic': return 'Anthropic';
      case 'gemini': return 'Gemini';
      case 'custom': return 'Custom API';
      default: return '';
    }
  };

  const tabs = [
    { id: 'general' as const, label: t('General'), icon: Globe },
    { id: 'appearance' as const, label: t('Appearance'), icon: Server },
    { id: 'models' as const, label: t('Models'), icon: Key },
  ];

  return (
    <div className="flex-1 overflow-hidden flex h-full">
      {/* Left Sidebar - Tabs */}
      <div className="w-56 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">{t("Settings")}</h2>
          <p className="text-xs text-muted-foreground mt-1">{t("Manage global application settings.")}</p>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Right Content */}
      <div className="flex-1 overflow-auto p-8">
        {activeTab === 'general' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-lg font-medium">{t("General Settings")}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t("Manage your application preferences.")}</p>
            </div>

            <div className="space-y-4 bg-card border rounded-lg p-6 shadow-sm">
              <div className="space-y-2">
                <Label>{t("Language")}</Label>
                <Select value={localSettings.language} onValueChange={(val) => handleChange('language', val)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={handleSaveGeneral}>{t("Save Settings")}</Button>
              </div>
            </div>

            <div className="space-y-4 bg-card border rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("Allow Remote Access")}</Label>
                  <div className="text-sm text-muted-foreground">
                    允许局域网内其他设备访问此应用
                  </div>
                </div>
                <Switch
                  checked={localSettings.allowRemoteAccess}
                  onCheckedChange={(checked: boolean) => handleChange('allowRemoteAccess', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="remote-access-port">远程访问端口</Label>
                <Input
                  id="remote-access-port"
                  type="number"
                  min={1}
                  max={65535}
                  value={localSettings.remoteAccessPort || 1420}
                  disabled={!localSettings.allowRemoteAccess}
                  onChange={(e) => handleChange('remoteAccessPort', Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-lg font-medium">{t("Appearance Settings")}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t("Customize the look and feel.")}</p>
            </div>

            <div className="space-y-4 bg-card border rounded-lg p-6 shadow-sm">
              <div className="space-y-2">
                <Label>{t("Theme Preference")}</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant={localSettings.theme === 'light' ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleChange('theme', 'light')}
                  >{t("Light")}</Button>
                  <Button
                    variant={localSettings.theme === 'dark' ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleChange('theme', 'dark')}
                  >{t("Dark")}</Button>
                  <Button
                    variant={localSettings.theme === 'system' ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleChange('theme', 'system')}
                  >{t("System")}</Button>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={handleSaveGeneral}>{t("Save Settings")}</Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'models' && (
          <div className="flex h-full gap-6">
            {/* Provider List */}
            <div className="w-72 flex flex-col gap-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">{t("Model Providers")}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={handleOpenAddProvider}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("Add")}
                </Button>
              </div>

              <div className="flex flex-col gap-1">
                {settings.providers.map(provider => (
                  <div
                    key={provider.id}
                    onClick={() => {
                      setSelectedProviderId(provider.id);
                    }}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                      selectedProviderId === provider.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50 border border-transparent"
                    )}
                  >
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold shrink-0",
                      PROVIDER_COLORS[provider.type] || 'bg-muted text-muted-foreground'
                    )}>
                      {provider.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{provider.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{provider.baseUrl}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {provider.isEnabled && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-medium">
                          ON
                        </span>
                      )}
                      <ChevronRight className={cn(
                        "h-4 w-4 text-muted-foreground transition-opacity",
                        selectedProviderId === provider.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Provider Detail */}
            <div className="flex-1 max-w-xl">
              {selectedProvider ? (
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-medium">{selectedProvider.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {PROVIDER_TYPE_OPTIONS.find(o => o.value === selectedProvider.type)?.label}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 px-2",
                          selectedProvider.isEnabled ? "text-emerald-500" : "text-muted-foreground"
                        )}
                        onClick={() => updateProvider(selectedProvider.id, { isEnabled: !selectedProvider.isEnabled })}
                      >
                        <Power className="h-4 w-4 mr-1" />
                        {selectedProvider.isEnabled ? t("Enabled") : t("Disabled")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-destructive"
                        onClick={() => {
                          deleteProvider(selectedProvider.id);
                          setSelectedProviderId(null);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 bg-card border rounded-lg p-6 shadow-sm">
                    <div className="space-y-2">
                      <Label>{t("Name")}</Label>
                      <Input
                        value={selectedProvider.name}
                        onChange={(e) => updateProvider(selectedProvider.id, { name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t("Base URL")}</Label>
                      <Input
                        value={selectedProvider.baseUrl}
                        onChange={(e) => updateProvider(selectedProvider.id, { baseUrl: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("Preview")}: {selectedProvider.baseUrl}/chat/completions
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("API Key")}</Label>
                      <Input
                        type="password"
                        value={selectedProvider.apiKey}
                        onChange={(e) => updateProvider(selectedProvider.id, { apiKey: e.target.value })}
                      />
                    </div>

                    {selectedProvider.type === 'custom' && (
                      <div className="space-y-2">
                        <Label>{t("Custom Header")}</Label>
                        <Input
                          placeholder="Authorization: Bearer TOKEN"
                          value={selectedProvider.customHeader || ''}
                          onChange={(e) => updateProvider(selectedProvider.id, { customHeader: e.target.value })}
                        />
                      </div>
                    )}

                    {/* Models Section */}
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <Label className="text-base">{t("Models")}</Label>
                        <div className="flex items-center gap-2">
                          {testStatus === 'success' && (
                            <span className="flex items-center gap-1 text-xs text-emerald-500">
                              <CheckCircle className="h-3 w-3" />
                              {t('连接正常')}
                            </span>
                          )}
                          {testStatus === 'error' && (
                            <span className="flex items-center gap-1 text-xs text-destructive" title={testError}>
                              <XCircle className="h-3 w-3" />
                              {t('连接失败')}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">{selectedProvider.models.length} {t("models")}</span>
                          <button
                            onClick={async () => {
                              if (!selectedProvider) return;
                              setTestStatus('testing');
                              setTestError('');
                              try {
                                const defaultModel = selectedProvider.models.find(m => m.isDefault) || selectedProvider.models[0];
                                if (!defaultModel) {
                                  throw new Error(t('请先添加一个模型'));
                                }
                                const result = await fetchFromProvider(
                                  selectedProvider,
                                  defaultModel.modelId,
                                  'hello',
                                  'You are a helpful assistant.'
                                );
                                try {
                                  // @ts-ignore
                                  const textStream = result.textStream;
                                  if (textStream) {
                                    const reader = textStream.getReader();
                                    const { done } = await reader.read();
                                    await reader.cancel();
                                    if (!done) {
                                      setTestStatus('success');
                                    } else {
                                      setTestStatus('error');
                                      setTestError(t('无响应'));
                                    }
                                  } else {
                                    setTestStatus('success');
                                  }
                                } catch (streamErr: any) {
                                  setTestStatus('success');
                                }
                              } catch (err: any) {
                                console.error('Provider test failed:', err);
                                setTestStatus('error');
                                setTestError(err.message || String(err));
                              }
                            }}
                            disabled={testStatus === 'testing' || selectedProvider.models.length === 0}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-all duration-300 border",
                              testStatus === 'testing'
                                ? "text-muted-foreground border-border cursor-not-allowed"
                                : "text-primary border-primary/20 hover:bg-primary/5 hover:border-primary/40"
                            )}
                            title={t('发送 "hello" 测试连接')}
                          >
                            {testStatus === 'testing' ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                {t('测试中')}
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3" />
                                {t('测试')}
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Model Groups */}
                      <div className="flex flex-col gap-2">
                        {(() => {
                          const groups = groupModelsByPrefix(selectedProvider.models);

                          // Initialize expanded groups on first render
                          useEffect(() => {
                            if (expandedModelGroups.size === 0 && Object.keys(groups).length > 0) {
                              setExpandedModelGroups(new Set(Object.keys(groups)));
                            }
                          }, [selectedProvider?.id]);

                          const toggleModelGroup = (group: string) => {
                            setExpandedModelGroups(prev => {
                              const next = new Set(prev);
                              if (next.has(group)) next.delete(group);
                              else next.add(group);
                              return next;
                            });
                          };

                          return Object.entries(groups).map(([group, models]) => (
                            <div key={group} className="flex flex-col">
                              <button
                                onClick={() => toggleModelGroup(group)}
                                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <ChevronDown
                                    className={cn(
                                      "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                                      expandedModelGroups.has(group) ? "" : "-rotate-90"
                                    )}
                                  />
                                  <span className="text-sm font-medium">{group}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground">{models.length}</span>
                              </button>
                              {expandedModelGroups.has(group) && (
                                <div className="flex flex-col gap-1 pl-8 pr-1">
                                  {models.map(model => (
                                    <div
                                      key={model.id}
                                      className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-md border transition-colors",
                                        model.isDefault
                                          ? "bg-primary/5 border-primary/20"
                                          : "bg-muted/20 border-transparent hover:bg-muted/40"
                                      )}
                                    >
                                      <Bot className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{model.name}</div>
                                        <div className="text-[10px] text-muted-foreground font-mono truncate">{model.modelId}</div>
                                      </div>
                                      <div className="flex items-center gap-0.5">
                                        <button
                                          onClick={() => handleSetDefaultModel(model.id)}
                                          className={cn(
                                            "p-1 rounded transition-colors",
                                            model.isDefault
                                              ? "text-yellow-500"
                                              : "text-muted-foreground hover:text-yellow-500"
                                          )}
                                          title={model.isDefault ? t("Default Model") : t("Set as Default")}
                                        >
                                          <Star className={cn("h-3 w-3", model.isDefault && "fill-current")} />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteModel(model.id)}
                                          className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                                          title={t("Delete")}
                                        >
                                          <Minus className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ));
                        })()}
                      </div>

                      {/* Add Model Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setFetchDialogOpen(true)}
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                          {t('获取模型列表')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setAddModelDialogOpen(true)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          {t('添加模型')}
                        </Button>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Button
                        variant={settings.activeProviderId === selectedProvider.id ? "secondary" : "default"}
                        onClick={() => setActiveProvider(selectedProvider.id)}
                        disabled={settings.activeProviderId === selectedProvider.id}
                      >
                        {settings.activeProviderId === selectedProvider.id
                          ? t("Active Provider")
                          : t("Set as Active")
                        }
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <p>{t("Select a provider to view details.")}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fetch Models Dialog */}
      <Dialog open={fetchDialogOpen} onOpenChange={setFetchDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('获取模型列表')}</DialogTitle>
            <DialogDescription>
              {selectedProvider ? `${t('从')} ${selectedProvider.name} ${t('获取可用模型')}` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-4">
            {fetchStatus === 'idle' && (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p>{t('点击下方按钮获取模型列表')}</p>
              </div>
            )}

            {fetchStatus === 'fetching' && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
                <p className="text-muted-foreground">{t('正在获取模型列表...')}</p>
              </div>
            )}

            {fetchStatus === 'error' && (
              <div className="text-center py-8">
                <XCircle className="h-8 w-8 mx-auto mb-3 text-destructive" />
                <p className="text-destructive font-medium">{t('获取失败')}</p>
                <p className="text-sm text-muted-foreground mt-1">{fetchError}</p>
              </div>
            )}

            {fetchStatus === 'success' && fetchedModels.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t('未找到可用模型')}</p>
              </div>
            )}

            {fetchStatus === 'success' && fetchedModels.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-2 pb-2">
                  <span className="text-xs text-muted-foreground">
                    {t('共')} {fetchedModels.length} {t('个模型')}，{t('已选择')} {selectedFetchedModels.size} {t('个')}
                  </span>
                  <button
                    onClick={() => {
                      if (selectedFetchedModels.size === fetchedModels.length) {
                        setSelectedFetchedModels(new Set());
                      } else {
                        setSelectedFetchedModels(new Set(fetchedModels.map(m => m.id)));
                      }
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    {selectedFetchedModels.size === fetchedModels.length ? t('取消全选') : t('全选')}
                  </button>
                </div>
                <div className="flex flex-col gap-1 max-h-[50vh] overflow-auto">
                  {fetchedModels.map(model => (
                    <label
                      key={model.id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors",
                        selectedFetchedModels.has(model.id)
                          ? "bg-primary/5 border-primary/20"
                          : "border-transparent hover:bg-muted/30"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFetchedModels.has(model.id)}
                        onChange={() => toggleFetchedModel(model.id)}
                        className="rounded border-border"
                      />
                      <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{model.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{model.id}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {fetchStatus !== 'fetching' && (
              <>
                <Button variant="outline" onClick={() => setFetchDialogOpen(false)}>
                  {t('取消')}
                </Button>
                {fetchStatus === 'idle' || fetchStatus === 'error' ? (
                  <Button onClick={handleFetchModels}>
                    <RefreshCw className="h-4 w-4 mr-1.5" />
                    {t('获取')}
                  </Button>
                ) : (
                  <Button
                    onClick={handleAddFetchedModels}
                    disabled={selectedFetchedModels.size === 0}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    {t('添加')} {selectedFetchedModels.size > 0 ? `(${selectedFetchedModels.size})` : ''}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Model Dialog */}
      <Dialog open={addModelDialogOpen} onOpenChange={setAddModelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('添加模型')}</DialogTitle>
            <DialogDescription>
              {t('手动添加一个模型到当前服务商')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <span className="text-destructive">*</span>
                <Label>{t('模型 ID')}</Label>
              </div>
              <Input
                placeholder="e.g., gpt-4o, deepseek-ai/DeepSeek-V3"
                value={newModel.modelId}
                onChange={(e) => setNewModel(prev => ({ ...prev, modelId: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">{t('模型的唯一标识符，必填')}</p>
            </div>

            <div className="space-y-2">
              <Label>{t('模型名称')}</Label>
              <Input
                placeholder={t('可选，留空则使用模型 ID')}
                value={newModel.name}
                onChange={(e) => setNewModel(prev => ({ ...prev, name: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">{t('显示名称，非必填')}</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddModelDialogOpen(false)}>
              {t('取消')}
            </Button>
            <Button onClick={handleAddModel} disabled={!newModel.modelId}>
              <Plus className="h-4 w-4 mr-1.5" />
              {t('添加')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Provider Dialog */}
      <Dialog open={addProviderDialogOpen} onOpenChange={setAddProviderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('添加服务商')}</DialogTitle>
            <DialogDescription>
              {t('配置一个新的模型服务商')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('服务商类型')}</Label>
              <Select
                value={newProvider.type}
                onValueChange={(val: any) => {
                  setNewProvider(prev => ({
                    ...prev,
                    type: val,
                    baseUrl: getDefaultBaseUrl(val),
                    name: prev.name || getDefaultProviderName(val),
                  }));
                  setValidationErrors({});
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <span className="text-destructive">*</span>
                <Label>{t('名称')}</Label>
              </div>
              <Input
                placeholder={t('例如：SiliconFlow')}
                value={newProvider.name || ''}
                onChange={(e) => {
                  setNewProvider(prev => ({ ...prev, name: e.target.value }));
                  if (validationErrors.name) setValidationErrors(prev => ({ ...prev, name: undefined }));
                }}
                className={validationErrors.name ? 'border-destructive' : ''}
              />
              {validationErrors.name && (
                <p className="text-xs text-destructive">{validationErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <span className="text-destructive">*</span>
                <Label>{t('Base URL')}</Label>
              </div>
              <Input
                placeholder="https://api.example.com/v1"
                value={newProvider.baseUrl || ''}
                onChange={(e) => {
                  setNewProvider(prev => ({ ...prev, baseUrl: e.target.value }));
                  if (validationErrors.baseUrl) setValidationErrors(prev => ({ ...prev, baseUrl: undefined }));
                }}
                className={validationErrors.baseUrl ? 'border-destructive' : ''}
              />
              {validationErrors.baseUrl && (
                <p className="text-xs text-destructive">{validationErrors.baseUrl}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('API Key')}</Label>
              <Input
                type="password"
                placeholder="sk-..."
                value={newProvider.apiKey || ''}
                onChange={(e) => setNewProvider(prev => ({ ...prev, apiKey: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Switch
                id="provider-enabled"
                checked={newProvider.isEnabled}
                onCheckedChange={(checked) => setNewProvider(prev => ({ ...prev, isEnabled: checked }))}
              />
              <Label htmlFor="provider-enabled" className="cursor-pointer">{t('启用')}</Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddProviderDialogOpen(false)}>
              {t('取消')}
            </Button>
            <Button onClick={handleAddProvider}>
              <Plus className="h-4 w-4 mr-1.5" />
              {t('添加')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
