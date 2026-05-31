import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useAppStore } from '@/stores';
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { useDebugTrack } from "@/hooks/useDebugTrack";
import { toast } from "sonner";
import {
  Plus, Trash2, Power, ChevronRight, Star, Minus,
  Play, CheckCircle, XCircle, Loader2, RefreshCw, ChevronDown, Bot, AlertTriangle, Eye
} from "lucide-react";
import { fetchFromProvider } from "@/lib/api";
import type { ModelProvider, ProviderModel } from "@/types/models";
import { v4 as uuidv4 } from 'uuid';

const PROVIDER_DEFAULTS: Record<string, { name: string; baseUrl: string; defaultModel: string }> = {
  openai: { name: 'OpenAI', baseUrl: 'https://api.openai.com', defaultModel: 'gpt-4o' },
  anthropic: { name: 'Anthropic', baseUrl: 'https://api.anthropic.com', defaultModel: 'claude-sonnet-4-5' },
  gemini: { name: 'Gemini', baseUrl: 'https://generativelanguage.googleapis.com', defaultModel: 'gemini-2.5-flash-preview-05-20' },
  deepseek: { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-chat' },
  siliconflow: { name: 'SiliconFlow', baseUrl: 'https://api.siliconflow.cn', defaultModel: 'deepseek-ai/DeepSeek-V3' },
  kimi: { name: 'Kimi', baseUrl: 'https://api.moonshot.cn', defaultModel: 'kimi-k2-0711-preview' },
  custom: { name: 'Custom', baseUrl: '', defaultModel: 'gpt-4o' },
};

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-green-500/20 text-green-600 dark:text-green-400',
  anthropic: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
  gemini: 'bg-sky-500/20 text-sky-600 dark:text-sky-400',
  deepseek: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
  siliconflow: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
  kimi: 'bg-violet-500/20 text-violet-600 dark:text-violet-400',
  custom: 'bg-primary/20 text-primary',
};

function getModelGroup(model: ProviderModel): string {
  if (model.group) return model.group;
  if (model.modelId.includes('/')) return model.modelId.split('/')[0];
  return 'General';
}

function groupModelsByPrefix(models: ProviderModel[]) {
  const groups: Record<string, ProviderModel[]> = {};
  models.forEach(model => {
    const group = getModelGroup(model);
    if (!groups[group]) groups[group] = [];
    groups[group].push(model);
  });
  return groups;
}

function shortError(message: string): string {
  if (message.includes('401') || message.includes('Unauthorized')) return 'API Key Error (401)';
  if (message.includes('403') || message.includes('Forbidden')) return 'Access Denied (403)';
  if (message.includes('404') || message.includes('Not Found')) return 'Model Not Found (404)';
  if (message.includes('429') || message.includes('Too Many Requests')) return 'Rate Limited (429)';
  if (message.includes('500') || message.includes('Internal Server')) return 'Server Error (500)';
  if (message.includes('503') || message.includes('Service Unavailable')) return 'Service Unavailable (503)';
  if (message.includes('timeout') || message.includes('Timeout')) return 'Request Timeout';
  if (message.includes('NetworkError') || message.includes('Failed to fetch') || message.includes('fetch')) return 'Network Error';
  return message.length > 50 ? message.substring(0, 50) + '…' : message;
}

export function SettingsModelsTab() {
  const settings = useAppStore(state => state.settings);
  const addProvider = useAppStore(state => state.addProvider);
  const updateProvider = useAppStore(state => state.updateProvider);
  const deleteProvider = useAppStore(state => state.deleteProvider);
  const { t } = useTranslation();
  const { trackClick } = useDebugTrack('SettingsModelsTab');

  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(settings.activeProviderId);
  const [newModel, setNewModel] = useState({ name: '', modelId: '', group: '' });
  const [fetchDialogOpen, setFetchDialogOpen] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
  const [fetchedModels, setFetchedModels] = useState<Array<{ id: string; name: string; group?: string }>>([]);
  const [fetchError, setFetchError] = useState('');
  const [selectedFetchedModels, setSelectedFetchedModels] = useState<Set<string>>(new Set());
  const [addModelDialogOpen, setAddModelDialogOpen] = useState(false);
  const [expandedModelGroups, setExpandedModelGroups] = useState<Set<string>>(new Set());
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [modelTestStates, setModelTestStates] = useState<Record<string, { status: 'idle' | 'testing' | 'success' | 'error'; error?: string; detail?: string }>>({});
  const [testAllDialogOpen, setTestAllDialogOpen] = useState(false);
  const [testAllRunning, setTestAllRunning] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [expandedError, setExpandedError] = useState<string | null>(null);

  const selectedProvider = settings.providers.find(p => p.id === selectedProviderId);

  useEffect(() => {
    if (settings.activeProviderId && !selectedProviderId) {
      setSelectedProviderId(settings.activeProviderId);
    }
  }, [settings.activeProviderId, selectedProviderId]);

  useEffect(() => {
    setModelTestStates({});
  }, [selectedProviderId]);

  // Auto-expand model groups when provider changes
  useEffect(() => {
    if (selectedProvider) {
      const groups = groupModelsByPrefix(selectedProvider.models);
      const groupKeys = Object.keys(groups);
      if (groupKeys.length > 0) {
        setExpandedModelGroups(new Set(groupKeys));
      }
    }
  }, [selectedProvider?.id]);

  const handleInlineAddProvider = trackClick(() => {
    const defaults = PROVIDER_DEFAULTS.custom;
    const newProvider: ModelProvider = {
      id: uuidv4(),
      name: defaults.name,
      type: 'custom',
      apiKey: '',
      baseUrl: defaults.baseUrl,
      isEnabled: false,
      apiFormat: 'openai-chat',
      models: [{ id: uuidv4(), name: 'Default Model', modelId: defaults.defaultModel, isDefault: true }],
    };
    addProvider(newProvider);
    setSelectedProviderId(newProvider.id);
  }, 'provider:InlineAdd');

  const handleAddModel = () => {
    if (selectedProvider && newModel.modelId) {
      const existingModels = Array.isArray(selectedProvider.models) ? selectedProvider.models : [];
      updateProvider(selectedProvider.id, {
        models: [...existingModels, { id: uuidv4(), name: newModel.name || newModel.modelId, modelId: newModel.modelId }],
      });
      setNewModel({ name: '', modelId: '', group: '' });
      setAddModelDialogOpen(false);
    }
  };

  const handleFetchModels = async () => {
    if (!selectedProvider) return;
    setFetchStatus('fetching');
    setFetchError('');
    setFetchedModels([]);
    setSelectedFetchedModels(new Set());

    try {
      if (!selectedProvider.baseUrl) throw new Error(t('Please fill in Base URL first'));
      if (!selectedProvider.apiKey) throw new Error(t('Please fill in API Key first'));
      const base = selectedProvider.baseUrl.trim().replace(/\/+$/, '');
      const apiBase = base.endsWith('/v1') ? base : `${base}/v1`;
      const response = await fetch(`${apiBase}/models`, {
        headers: { 'Authorization': `Bearer ${selectedProvider.apiKey}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      const models = (data.data || data.models || data).map((m: any) => ({
        id: m.id || m.modelId || uuidv4(),
        name: m.name || m.id || m.modelId || 'Unknown',
        group: m.id?.includes('/') ? m.id.split('/')[0] : undefined,
      }));
      setFetchedModels(models);
      setFetchStatus('success');
    } catch (err: any) {
      setFetchStatus('error');
      setFetchError(err.message || String(err));
    }
  };

  const handleAddFetchedModels = () => {
    if (!selectedProvider || selectedFetchedModels.size === 0) return;
    const existingModels = Array.isArray(selectedProvider.models) ? selectedProvider.models : [];
    const modelsToAdd = fetchedModels.filter(m => selectedFetchedModels.has(m.id)).map(m => ({
      id: uuidv4(), name: m.name, modelId: m.id,
    }));
    updateProvider(selectedProvider.id, { models: [...existingModels, ...modelsToAdd] });
    setFetchDialogOpen(false);
    setFetchedModels([]);
    setSelectedFetchedModels(new Set());
    setFetchStatus('idle');
  };

  const handleDeleteModel = (modelId: string) => {
    if (!selectedProvider || selectedProvider.models.length <= 1) {
      toast.warning(t('至少保留一个模型'));
      return;
    }
    const newModels = selectedProvider.models.filter(m => m.id !== modelId);
    if (newModels.length > 0 && !newModels.some(m => m.isDefault)) newModels[0].isDefault = true;
    updateProvider(selectedProvider.id, { models: newModels });
  };

  const handleSetDefaultModel = (modelId: string) => {
    if (selectedProvider) {
      updateProvider(selectedProvider.id, {
        models: selectedProvider.models.map(m => ({ ...m, isDefault: m.id === modelId })),
      });
    }
  };

  const testSingleModel = async (provider: ModelProvider, model: ProviderModel) => {
    const key = model.id;
    setModelTestStates(prev => ({ ...prev, [key]: { status: 'testing' } }));
    try {
      const result = await fetchFromProvider(provider, model.modelId, 'hello', 'You are a helpful assistant.');
      let hasContent = false;
      const streamPromise = (async () => {
        for await (const chunk of result.textStream) { if (chunk) { hasContent = true; break; } }
      })();
      await Promise.race([streamPromise, new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Stream timeout after 10s')), 10000))]);
      if (hasContent) {
        setModelTestStates(prev => ({ ...prev, [key]: { status: 'success' } }));
      } else {
        setModelTestStates(prev => ({ ...prev, [key]: { status: 'error', error: t('No Response'), detail: t('API returned no content') } }));
      }
    } catch (err: any) {
      const message = err.message || String(err);
      setModelTestStates(prev => ({ ...prev, [key]: { status: 'error', error: t(shortError(message)), detail: message } }));
    }
  };

  const testAllModels = async () => {
    if (!selectedProvider || selectedProvider.models.length === 0) return;
    setTestAllRunning(true);
    const reset: Record<string, { status: 'idle' }> = {};
    selectedProvider.models.forEach(m => { reset[m.id] = { status: 'idle' }; });
    setModelTestStates(reset);
    for (const model of selectedProvider.models) {
      await testSingleModel(selectedProvider, model);
    }
    setTestAllRunning(false);
  };

  const toggleModelGroup = (group: string) => {
    setExpandedModelGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  };

  return (
    <>
      <div className="flex h-full gap-6">
        {/* Provider List */}
        <div className="w-72 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium">{t("Model Providers")}</h3>
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={handleInlineAddProvider}>
              <Plus className="h-4 w-4 mr-1" />{t("Add")}
            </Button>
          </div>
          <div className="flex flex-col gap-1">
            {settings.providers.map(provider => (
              <div key={provider.id} onClick={trackClick(() => setSelectedProviderId(provider.id), 'provider:select')} data-debug-source="SettingsModelsTab" data-debug-action="provider:select" className={cn(
                "group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                selectedProviderId === provider.id
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted/50 border border-transparent"
              )}>
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold shrink-0 overflow-hidden", provider.avatar ? '' : (PROVIDER_COLORS[provider.type] || 'bg-muted text-muted-foreground'))}>
                  {provider.avatar
                    ? (provider.avatar.startsWith('http') || provider.avatar.startsWith('/'))
                      ? <img src={provider.avatar} alt={provider.name} className="w-full h-full object-cover" />
                      : <span>{provider.avatar}</span>
                    : provider.name.charAt(0).toUpperCase()
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{provider.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{provider.baseUrl || `(${t('Empty')})`}</div>
                </div>
                <div className="flex items-center gap-1">
                  {settings.activeProviderId === provider.id && (
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary font-medium">{t('Current Provider')}</span>
                  )}
                  {provider.isEnabled && (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 font-medium">{t('ON')}</span>
                  )}
                  <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-opacity", selectedProviderId === provider.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Provider Detail */}
        <div className="flex-1 max-w-xl">
          {selectedProvider ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium">{selectedProvider.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-8 px-2", settings.activeProviderId === selectedProvider.id ? "text-primary" : "text-muted-foreground")}
                    disabled={settings.activeProviderId === selectedProvider.id}
                    onClick={trackClick(() => {
                      const setActiveProvider = useAppStore.getState().setActiveProvider;
                      setActiveProvider(selectedProvider.id);
                    }, 'provider:setActive')}
                  >
                    <Star className="h-4 w-4 mr-1" />
                    {settings.activeProviderId === selectedProvider.id ? t('Current Provider') : t('Set as Current')}
                  </Button>
                  <Button variant="ghost" size="sm" className={cn("h-8 px-2", selectedProvider.isEnabled ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}
                    onClick={trackClick(() => updateProvider(selectedProvider.id, { isEnabled: !selectedProvider.isEnabled }), 'provider:toggleEnabled')}>
                    <Power className="h-4 w-4 mr-1" />
                    {selectedProvider.isEnabled ? t("Enabled") : t("Disabled")}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive" onClick={trackClick(() => {
                    if (!selectedProvider) return;
                    setDeleteConfirmOpen(true);
                  }, 'provider:deleteConfirm')}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4 bg-card border rounded-lg p-6 shadow-sm">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-3 pb-4 border-b">
                  <div className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold shrink-0 overflow-hidden",
                    selectedProvider.avatar ? '' : (PROVIDER_COLORS[selectedProvider.type] || 'bg-muted text-muted-foreground')
                  )}>
                    {selectedProvider.avatar
                      ? (selectedProvider.avatar.startsWith('http') || selectedProvider.avatar.startsWith('/'))
                        ? <img src={selectedProvider.avatar} alt={selectedProvider.name} className="w-full h-full object-cover" />
                        : <span>{selectedProvider.avatar}</span>
                      : selectedProvider.name.charAt(0).toUpperCase()
                    }
                  </div>
                  <div className="flex items-center gap-2 w-full max-w-xs">
                    <Input
                      placeholder={t('Avatar URL or emoji (e.g. 🤖 or https://...)')}
                      value={selectedProvider.avatar || ''}
                      onChange={(e) => updateProvider(selectedProvider.id, { avatar: e.target.value })}
                      className="h-8 text-xs"
                    />
                    {selectedProvider.avatar && (
                      <Button variant="ghost" size="sm" className="h-8 px-2 shrink-0 text-muted-foreground"
                        onClick={() => updateProvider(selectedProvider.id, { avatar: '' })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label>{t("Name")}</Label>
                  <Input value={selectedProvider.name} onChange={(e) => updateProvider(selectedProvider.id, { name: e.target.value })} />
                </div>

                {/* API Format */}
                {(selectedProvider.type === 'openai' || selectedProvider.type === 'siliconflow' || selectedProvider.type === 'deepseek' || selectedProvider.type === 'custom') && (
                  <div className="space-y-2">
                    <Label>{t('API Format')}</Label>
                    <Select value={selectedProvider.apiFormat || 'openai-chat'}
                      onValueChange={(val: 'openai-responses' | 'openai-chat' | 'anthropic-messages') => updateProvider(selectedProvider.id, { apiFormat: val })}>
                      <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai-chat">OpenAI Chat Completions</SelectItem>
                        <SelectItem value="openai-responses">OpenAI Responses</SelectItem>
                        <SelectItem value="anthropic-messages">Anthropic Messages</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Base URL */}
                <div className="space-y-2">
                  <Label>{t("Base URL")}</Label>
                  <Input value={selectedProvider.baseUrl} onChange={(e) => updateProvider(selectedProvider.id, { baseUrl: e.target.value })} />
                  <p className="text-xs text-muted-foreground">
                    {t('Example API request sent to')} <code className="px-1 py-0.5 rounded bg-muted text-xs">{selectedProvider.baseUrl.trim().replace(/\/+$/, '')}/v1{selectedProvider.apiFormat === 'openai-responses' ? '/responses' : selectedProvider.apiFormat === 'anthropic-messages' ? '/messages' : '/chat/completions'}</code>
                  </p>
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <Label>{t("API Key")}</Label>
                  <div className="flex gap-2">
                    <Input type={showApiKey ? "text" : "password"} value={selectedProvider.apiKey} className="flex-1"
                      onChange={(e) => updateProvider(selectedProvider.id, { apiKey: e.target.value })} />
                    <Button variant="outline" size="sm" className="h-10 px-3 shrink-0" title={t('按住查看 Key')}
                      onMouseDown={() => setShowApiKey(true)}
                      onMouseUp={() => setShowApiKey(false)}
                      onMouseLeave={() => setShowApiKey(false)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Custom Header */}
                {selectedProvider.type === 'custom' && (
                  <div className="space-y-2">
                    <Label>{t("Custom Header")}</Label>
                    <Input placeholder="Authorization: Bearer TOKEN" value={selectedProvider.customHeader || ''}
                      onChange={(e) => updateProvider(selectedProvider.id, { customHeader: e.target.value })} />
                  </div>
                )}

                {/* Models Section */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">{t("Models")}</Label>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const states = Object.values(modelTestStates);
                        const hasResults = states.length > 0 && states.every(s => s.status !== 'idle');
                        if (hasResults) {
                          const successCount = states.filter(s => s.status === 'success').length;
                          const errorCount = states.filter(s => s.status === 'error').length;
                          return (
                            <span className={cn("flex items-center gap-1 text-xs", errorCount === 0 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400")}>
                              {errorCount === 0 ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                              {successCount}/{states.length} {t('Passed')}{errorCount > 0 ? `，${errorCount} ${t('Failed')}` : ''}
                            </span>
                          );
                        }
                        return null;
                      })()}
                      <span className="text-xs text-muted-foreground">{selectedProvider.models.length} {t("models")}</span>
                      <button onClick={trackClick(() => setTestAllDialogOpen(true), 'model:testAllDialog')}
                        disabled={testAllRunning || selectedProvider.models.length === 0}
                        className={cn("flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-all duration-300 border",
                          testAllRunning ? "text-muted-foreground border-border cursor-not-allowed" : "text-primary border-primary/20 hover:bg-primary/5 hover:border-primary/40")}
                        title={t('测试全部模型连通性')}>
                        {testAllRunning ? <><Loader2 className="h-3 w-3 animate-spin" />{t('测试中')}</> : <><Play className="h-3 w-3" />{t('测试')}</>}
                      </button>
                    </div>
                  </div>

                  {/* Model Groups */}
                  <div className="flex flex-col gap-2">
                    {Object.entries(groupModelsByPrefix(selectedProvider.models)).map(([group, models]) => (
                        <div key={group} className="flex flex-col">
                          <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-2">
                              <button onClick={() => toggleModelGroup(group)}>
                                <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", expandedModelGroups.has(group) ? "" : "-rotate-90")} />
                              </button>
                              {editingGroup === group ? (
                                <input className="text-sm font-medium bg-background border rounded px-2 py-1 w-28 outline-none focus:border-primary"
                                  value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)}
                                  onBlur={() => {
                                    if (editGroupName.trim() && editGroupName !== group) {
                                      const updates = models.map(m => ({ ...m, group: editGroupName.trim() }));
                                      const allModels = selectedProvider.models.map(m => updates.find(u => u.id === m.id) || m);
                                      updateProvider(selectedProvider.id, { models: allModels });
                                    }
                                    setEditingGroup(null);
                                  }}
                                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingGroup(null); }}
                                  autoFocus />
                              ) : (
                                <span className="text-sm font-medium cursor-pointer hover:text-primary transition-colors"
                                  onClick={() => { setEditingGroup(group); setEditGroupName(group); }} title={t('Click to edit group name')}>{group}</span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{models.length}</span>
                          </div>
                          {expandedModelGroups.has(group) && (
                            <div className="flex flex-col gap-1 pl-8 pr-1">
                              {models.map(model => (
                                <div key={model.id} className={cn("flex flex-col gap-1 px-3 py-2 rounded-md border transition-colors",
                                  model.isDefault ? "bg-primary/5 border-primary/20" : "bg-muted/20 border-transparent hover:bg-muted/40")}>
                                  <div className="flex items-center gap-2">
                                    <Bot className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium truncate">{model.name}</div>
                                      <div className="text-xs text-muted-foreground font-mono truncate">{model.modelId}</div>
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                      {(() => {
                                        const ts = modelTestStates[model.id];
                                        if (ts?.status === 'testing') return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
                                        if (ts?.status === 'success') return <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />;
                                        if (ts?.status === 'error') return (
                                          <button className="p-0.5 rounded text-destructive hover:bg-destructive/10 transition-colors"
                                            title={`${ts.error}\n\n${ts.detail || ''}`}
                                            onClick={(e) => { e.stopPropagation(); setExpandedError(expandedError === model.id ? null : model.id); }}>
                                            <AlertTriangle className="h-3 w-3" />
                                          </button>
                                        );
                                        return (
                                          <button onClick={(e) => { e.stopPropagation(); if (selectedProvider) { trackClick(() => testSingleModel(selectedProvider, model), 'model:testSingle')(); } }}
                                            className="p-0.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title={t('Test this model')}>
                                            <Play className="h-3 w-3" />
                                          </button>
                                        );
                                      })()}
                                      <button onClick={trackClick(() => handleSetDefaultModel(model.id), 'model:setDefault')}
                                        className={cn("p-1 rounded transition-colors", model.isDefault ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500")}
                                        title={model.isDefault ? t("Default Model") : t("Set as Default")}>
                                        <Star className={cn("h-3 w-3", model.isDefault && "fill-current")} />
                                      </button>
                                      <button onClick={trackClick(() => handleDeleteModel(model.id), 'model:delete')}
                                        className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors" title={t("Delete")}>
                                        <Minus className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                  {modelTestStates[model.id]?.status === 'error' && (
                                    <div className="flex flex-col gap-1 pl-5 text-xs">
                                      <div className="flex items-center gap-1 text-destructive/80 cursor-pointer"
                                        onClick={() => setExpandedError(expandedError === model.id ? null : model.id)}
                                        title={t('点击查看错误详情')}>
                                        <XCircle className="h-2.5 w-2.5 shrink-0" />
                                        <span className="truncate">{modelTestStates[model.id]?.error}</span>
                                      </div>
                                      {expandedError === model.id && (
                                        <div className="bg-destructive/10 border border-destructive/20 rounded p-2 text-destructive/90 font-mono text-[11px] whitespace-pre-wrap">
                                          {modelTestStates[model.id]?.detail || modelTestStates[model.id]?.error}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>

                  {/* Add Model Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={trackClick(() => setFetchDialogOpen(true), 'model:fetchDialog')}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />{t('获取模型列表')}
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={trackClick(() => setAddModelDialogOpen(true), 'model:addDialog')}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" />{t('添加模型')}
                    </Button>
                  </div>
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

      {/* Fetch Models Dialog */}
      <Dialog open={fetchDialogOpen} onOpenChange={setFetchDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('获取模型列表')}</DialogTitle>
            <DialogDescription>{selectedProvider ? `${t('从')} ${selectedProvider.name} ${t('获取可用模型')}` : ''}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-4">
            {fetchStatus === 'idle' && (
              <div className="text-center py-8 text-muted-foreground"><RefreshCw className="h-8 w-8 mx-auto mb-3 opacity-30" /><p>{t('Click the button below to fetch model list')}</p></div>
            )}
            {fetchStatus === 'fetching' && (
              <div className="text-center py-8"><Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" /><p className="text-muted-foreground">{t('Fetching models...')}</p></div>
            )}
            {fetchStatus === 'error' && (
              <div className="text-center py-8"><XCircle className="h-8 w-8 mx-auto mb-3 text-destructive" /><p className="text-destructive font-medium">{t('Fetch failed')}</p><p className="text-sm text-muted-foreground mt-1">{fetchError}</p></div>
            )}
            {fetchStatus === 'success' && fetchedModels.length === 0 && (
              <div className="text-center py-8 text-muted-foreground"><p>{t('No models found')}</p></div>
            )}
            {fetchStatus === 'success' && fetchedModels.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-2 pb-2">
                  <span className="text-xs text-muted-foreground">{t('models in total,')} {fetchedModels.length} {t('selected')} {selectedFetchedModels.size}</span>
                  <button onClick={() => setSelectedFetchedModels(selectedFetchedModels.size === fetchedModels.length ? new Set() : new Set(fetchedModels.map(m => m.id)))}
                    className="text-xs text-primary hover:underline">
                    {selectedFetchedModels.size === fetchedModels.length ? t('Deselect All') : t('Select All')}
                  </button>
                </div>
                <div className="flex flex-col gap-1 max-h-[50vh] overflow-auto">
                  {fetchedModels.map(model => (
                    <label key={model.id} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                      selectedFetchedModels.has(model.id) ? "bg-primary/5 border-primary/20" : "border-transparent hover:bg-muted/30")}>
                      <input type="checkbox" checked={selectedFetchedModels.has(model.id)}
                        onChange={() => setSelectedFetchedModels(prev => { const next = new Set(prev); if (next.has(model.id)) next.delete(model.id); else next.add(model.id); return next; })}
                        className="rounded border-border" />
                      <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{model.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{model.id}</div>
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
                <Button variant="outline" onClick={() => setFetchDialogOpen(false)}>{t('Cancel')}</Button>
                <Button variant="outline" onClick={handleFetchModels}><RefreshCw className="h-4 w-4 mr-1.5" />{t('Re-fetch')}</Button>
                {fetchStatus === 'success' && fetchedModels.length > 0 && (
                  <Button onClick={handleAddFetchedModels} disabled={selectedFetchedModels.size === 0}>
                    <Plus className="h-4 w-4 mr-1.5" />{t('Add')} {selectedFetchedModels.size > 0 ? `(${selectedFetchedModels.size})` : ''}
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
            <DialogDescription>{t('手动添加一个模型到当前服务商')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1"><span className="text-destructive">*</span><Label>{t('模型 ID')}</Label></div>
              <Input placeholder="e.g., gpt-4o, deepseek-ai/DeepSeek-V3" value={newModel.modelId}
                onChange={(e) => setNewModel(prev => ({ ...prev, modelId: e.target.value }))} />
              <p className="text-xs text-muted-foreground">{t('模型的唯一标识符，必填')}</p>
            </div>
            <div className="space-y-2">
              <Label>{t('模型名称')}</Label>
              <Input placeholder={t('可选，留空则使用模型 ID')} value={newModel.name}
                onChange={(e) => setNewModel(prev => ({ ...prev, name: e.target.value }))} />
              <p className="text-xs text-muted-foreground">{t('显示名称，非必填')}</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddModelDialogOpen(false)}>{t('取消')}</Button>
            <Button onClick={handleAddModel} disabled={!newModel.modelId}><Plus className="h-4 w-4 mr-1.5" />{t('添加')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test All Models Dialog */}
      <Dialog open={testAllDialogOpen} onOpenChange={setTestAllDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Test All Models')}</DialogTitle>
            <DialogDescription>{t('This test will send a short message to each model')} {selectedProvider?.name || ''}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-yellow-600 dark:text-yellow-400">{t('Cost Warning')}</p>
                <p className="text-muted-foreground">
                  {t('此测试会向每个模型发送简短消息')}（"hello"），{t('共')} <strong>{selectedProvider?.models.length || 0}</strong> {t('个模型')}。{t('Although each request consumes very few tokens, a small API call fee may still be incurred')}。{t('Please confirm before continuing')}。
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">{t('Test content: send')} "hello" → {t('Verify streaming response')}</div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTestAllDialogOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={trackClick(() => { setTestAllDialogOpen(false); testAllModels(); }, 'model:confirmTestAll')}><Play className="h-4 w-4 mr-1.5" />{t('Confirm Test')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Provider Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('删除服务商')}</DialogTitle>
            <DialogDescription>
              {t('确定要删除服务商')}「{selectedProvider?.name}」{t('吗？此操作不可撤销，该服务商下的所有模型配置将被删除。')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>{t('取消')}</Button>
            <Button variant="destructive" onClick={() => {
              if (!selectedProvider) return;
              const currentId = selectedProvider.id;
              const remaining = settings.providers.filter(p => p.id !== currentId);
              deleteProvider(currentId);
              setSelectedProviderId(remaining[0]?.id || null);
              setDeleteConfirmOpen(false);
            }}>{t('确认删除')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
