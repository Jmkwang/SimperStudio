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
import {
  Plus, Trash2, Power, ChevronRight, Star, Minus,
  Play, CheckCircle, XCircle, Loader2, RefreshCw, ChevronDown, Bot, AlertTriangle, Eye
} from "lucide-react";
import { fetchFromProvider } from "@/lib/api";
import type { ModelProvider, ProviderModel } from "@/types/models";
import { v4 as uuidv4 } from 'uuid';

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-emerald-500/20 text-emerald-500',
  anthropic: 'bg-orange-500/20 text-orange-500',
  gemini: 'bg-blue-500/20 text-blue-500',
  deepseek: 'bg-indigo-500/20 text-indigo-500',
  siliconflow: 'bg-cyan-500/20 text-cyan-500',
  custom: 'bg-purple-500/20 text-purple-500',
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
  if (message.includes('401') || message.includes('Unauthorized')) return 'API Key 错误 (401)';
  if (message.includes('403') || message.includes('Forbidden')) return '无权访问 (403)';
  if (message.includes('404') || message.includes('Not Found')) return '模型不存在 (404)';
  if (message.includes('429') || message.includes('Too Many Requests')) return '请求频率限制 (429)';
  if (message.includes('500') || message.includes('Internal Server')) return '服务器错误 (500)';
  if (message.includes('503') || message.includes('Service Unavailable')) return '服务不可用 (503)';
  if (message.includes('timeout') || message.includes('Timeout')) return '请求超时';
  if (message.includes('NetworkError') || message.includes('Failed to fetch') || message.includes('fetch')) return '网络连接失败';
  return message.length > 50 ? message.substring(0, 50) + '…' : message;
}

export function SettingsModelsTab() {
  const settings = useAppStore(state => state.settings);
  const addProvider = useAppStore(state => state.addProvider);
  const updateProvider = useAppStore(state => state.updateProvider);
  const deleteProvider = useAppStore(state => state.deleteProvider);
  const setActiveProvider = useAppStore(state => state.setActiveProvider);
  const { t } = useTranslation();

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

  const selectedProvider = settings.providers.find(p => p.id === selectedProviderId);

  useEffect(() => {
    if (settings.activeProviderId && !selectedProviderId) {
      setSelectedProviderId(settings.activeProviderId);
    }
  }, [settings.activeProviderId, selectedProviderId]);

  useEffect(() => {
    setModelTestStates({});
  }, [selectedProviderId]);

  const handleInlineAddProvider = () => {
    const newProvider: ModelProvider = {
      id: uuidv4(),
      name: '新服务商',
      type: 'custom',
      apiKey: '',
      baseUrl: '',
      isEnabled: true,
      apiFormat: 'openai-chat',
      models: [{ id: uuidv4(), name: 'Default Model', modelId: 'gpt-4o', isDefault: true }],
    };
    addProvider(newProvider);
    setSelectedProviderId(newProvider.id);
  };

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
      if (!selectedProvider.baseUrl) throw new Error('请先填写 Base URL');
      if (!selectedProvider.apiKey) throw new Error('请先填写 API Key');
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
    if (!selectedProvider || selectedProvider.models.length <= 1) return;
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
        setModelTestStates(prev => ({ ...prev, [key]: { status: 'error', error: '无响应', detail: 'API 未返回任何内容' } }));
      }
    } catch (err: any) {
      const message = err.message || String(err);
      setModelTestStates(prev => ({ ...prev, [key]: { status: 'error', error: shortError(message), detail: message } }));
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
              <div key={provider.id} onClick={() => setSelectedProviderId(provider.id)} className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                selectedProviderId === provider.id
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted/50 border border-transparent"
              )}>
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold shrink-0", PROVIDER_COLORS[provider.type] || 'bg-muted text-muted-foreground')}>
                  {provider.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{provider.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{provider.baseUrl || '(空)'}</div>
                </div>
                <div className="flex items-center gap-1">
                  {provider.isEnabled && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-medium">ON</span>
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
                  <Button variant="ghost" size="sm" className={cn("h-8 px-2", selectedProvider.isEnabled ? "text-emerald-500" : "text-muted-foreground")}
                    onClick={() => updateProvider(selectedProvider.id, { isEnabled: !selectedProvider.isEnabled })}>
                    <Power className="h-4 w-4 mr-1" />
                    {selectedProvider.isEnabled ? t("Enabled") : t("Disabled")}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive" onClick={() => {
                    if (!selectedProvider) return;
                    const currentId = selectedProvider.id;
                    const remaining = settings.providers.filter(p => p.id !== currentId);
                    deleteProvider(currentId);
                    setSelectedProviderId(remaining[0]?.id || null);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4 bg-card border rounded-lg p-6 shadow-sm">
                {/* Name */}
                <div className="space-y-2">
                  <Label>{t("Name")}</Label>
                  <Input value={selectedProvider.name} onChange={(e) => updateProvider(selectedProvider.id, { name: e.target.value })} />
                </div>

                {/* API Format */}
                {(selectedProvider.type === 'openai' || selectedProvider.type === 'siliconflow' || selectedProvider.type === 'deepseek' || selectedProvider.type === 'custom') && (
                  <div className="space-y-2">
                    <Label>API 格式</Label>
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
                    示例：API 请求发送至 <code className="px-1 py-0.5 rounded bg-muted text-[11px]">{selectedProvider.baseUrl.trim().replace(/\/+$/, '')}/v1{selectedProvider.apiFormat === 'openai-responses' ? '/responses' : selectedProvider.apiFormat === 'anthropic-messages' ? '/messages' : '/chat/completions'}</code>
                  </p>
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <Label>{t("API Key")}</Label>
                  <div className="flex gap-2">
                    <Input type="password" value={selectedProvider.apiKey} className="flex-1" id="api-key-input"
                      onChange={(e) => updateProvider(selectedProvider.id, { apiKey: e.target.value })} />
                    <Button variant="outline" size="sm" className="h-10 px-3 shrink-0" title="按住显示密钥"
                      onMouseDown={() => { const el = document.getElementById('api-key-input') as HTMLInputElement; if (el) el.type = 'text'; }}
                      onMouseUp={() => { const el = document.getElementById('api-key-input') as HTMLInputElement; if (el) el.type = 'password'; }}
                      onMouseLeave={() => { const el = document.getElementById('api-key-input') as HTMLInputElement; if (el) el.type = 'password'; }}>
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
                            <span className={cn("flex items-center gap-1 text-xs", errorCount === 0 ? "text-emerald-500" : "text-amber-500")}>
                              {errorCount === 0 ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                              {successCount}/{states.length} 通过{errorCount > 0 ? `，${errorCount} 失败` : ''}
                            </span>
                          );
                        }
                        return null;
                      })()}
                      <span className="text-xs text-muted-foreground">{selectedProvider.models.length} {t("models")}</span>
                      <button onClick={() => setTestAllDialogOpen(true)}
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
                    {(() => {
                      const groups = groupModelsByPrefix(selectedProvider.models);
                      useEffect(() => {
                        if (Object.keys(groups).length > 0) setExpandedModelGroups(new Set(Object.keys(groups)));
                      }, [selectedProvider?.id]);
                      return Object.entries(groups).map(([group, models]) => (
                        <div key={group} className="flex flex-col">
                          <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-2">
                              <button onClick={() => toggleModelGroup(group)}>
                                <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", expandedModelGroups.has(group) ? "" : "-rotate-90")} />
                              </button>
                              {editingGroup === group ? (
                                <input className="text-sm font-medium bg-background border rounded px-1.5 py-0.5 w-28 outline-none focus:border-primary"
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
                                  onClick={() => { setEditingGroup(group); setEditGroupName(group); }} title="点击修改分组名">{group}</span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground">{models.length}</span>
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
                                      <div className="text-[10px] text-muted-foreground font-mono truncate">{model.modelId}</div>
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                      {(() => {
                                        const ts = modelTestStates[model.id];
                                        if (ts?.status === 'testing') return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
                                        if (ts?.status === 'success') return <CheckCircle className="h-3 w-3 text-emerald-500" />;
                                        if (ts?.status === 'error') return (
                                          <button className="p-0.5 rounded text-destructive hover:bg-destructive/10 transition-colors"
                                            title={`${ts.error}\n\n${ts.detail || ''}\n（点击查看详情）`}
                                            onClick={() => { const detail = ts.detail || ts.error || ''; alert(`测试失败详情:\n\n错误: ${ts.error}\n详细信息: ${detail}`); }}>
                                            <AlertTriangle className="h-3 w-3" />
                                          </button>
                                        );
                                        return (
                                          <button onClick={(e) => { e.stopPropagation(); if (selectedProvider) testSingleModel(selectedProvider, model); }}
                                            className="p-0.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="测试该模型">
                                            <Play className="h-3 w-3" />
                                          </button>
                                        );
                                      })()}
                                      <button onClick={() => handleSetDefaultModel(model.id)}
                                        className={cn("p-1 rounded transition-colors", model.isDefault ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500")}
                                        title={model.isDefault ? t("Default Model") : t("Set as Default")}>
                                        <Star className={cn("h-3 w-3", model.isDefault && "fill-current")} />
                                      </button>
                                      <button onClick={() => handleDeleteModel(model.id)}
                                        className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors" title={t("Delete")}>
                                        <Minus className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                  {modelTestStates[model.id]?.status === 'error' && (
                                    <div className="flex items-center gap-1 pl-5 text-[10px] text-destructive/80 cursor-pointer"
                                      onClick={() => { const ts = modelTestStates[model.id]; alert(`测试失败详情:\n\n错误: ${ts?.error}\n详细信息: ${ts?.detail || ''}`); }}
                                      title="点击查看详细错误日志">
                                      <XCircle className="h-2.5 w-2.5 shrink-0" />
                                      <span className="truncate">{modelTestStates[model.id]?.error}</span>
                                    </div>
                                  )}
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
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setFetchDialogOpen(true)}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />{t('获取模型列表')}
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setAddModelDialogOpen(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" />{t('添加模型')}
                    </Button>
                  </div>
                </div>

                {/* Set Active */}
                <div className="pt-4 border-t">
                  <Button variant={settings.activeProviderId === selectedProvider.id ? "secondary" : "default"}
                    onClick={() => setActiveProvider(selectedProvider.id)} disabled={settings.activeProviderId === selectedProvider.id}>
                    {settings.activeProviderId === selectedProvider.id ? t("Active Provider") : t("Set as Active")}
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

      {/* Fetch Models Dialog */}
      <Dialog open={fetchDialogOpen} onOpenChange={setFetchDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('获取模型列表')}</DialogTitle>
            <DialogDescription>{selectedProvider ? `${t('从')} ${selectedProvider.name} ${t('获取可用模型')}` : ''}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-4">
            {fetchStatus === 'idle' && (
              <div className="text-center py-8 text-muted-foreground"><RefreshCw className="h-8 w-8 mx-auto mb-3 opacity-30" /><p>点击下方按钮获取模型列表</p></div>
            )}
            {fetchStatus === 'fetching' && (
              <div className="text-center py-8"><Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" /><p className="text-muted-foreground">正在获取模型列表...</p></div>
            )}
            {fetchStatus === 'error' && (
              <div className="text-center py-8"><XCircle className="h-8 w-8 mx-auto mb-3 text-destructive" /><p className="text-destructive font-medium">获取失败</p><p className="text-sm text-muted-foreground mt-1">{fetchError}</p></div>
            )}
            {fetchStatus === 'success' && fetchedModels.length === 0 && (
              <div className="text-center py-8 text-muted-foreground"><p>未找到可用模型</p></div>
            )}
            {fetchStatus === 'success' && fetchedModels.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-2 pb-2">
                  <span className="text-xs text-muted-foreground">共 {fetchedModels.length} 个模型，已选择 {selectedFetchedModels.size} 个</span>
                  <button onClick={() => setSelectedFetchedModels(selectedFetchedModels.size === fetchedModels.length ? new Set() : new Set(fetchedModels.map(m => m.id)))}
                    className="text-xs text-primary hover:underline">
                    {selectedFetchedModels.size === fetchedModels.length ? '取消全选' : '全选'}
                  </button>
                </div>
                <div className="flex flex-col gap-1 max-h-[50vh] overflow-auto">
                  {fetchedModels.map(model => (
                    <label key={model.id} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors",
                      selectedFetchedModels.has(model.id) ? "bg-primary/5 border-primary/20" : "border-transparent hover:bg-muted/30")}>
                      <input type="checkbox" checked={selectedFetchedModels.has(model.id)}
                        onChange={() => setSelectedFetchedModels(prev => { const next = new Set(prev); if (next.has(model.id)) next.delete(model.id); else next.add(model.id); return next; })}
                        className="rounded border-border" />
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
                <Button variant="outline" onClick={() => setFetchDialogOpen(false)}>取消</Button>
                <Button variant="outline" onClick={handleFetchModels}><RefreshCw className="h-4 w-4 mr-1.5" />重新获取</Button>
                {fetchStatus === 'success' && fetchedModels.length > 0 && (
                  <Button onClick={handleAddFetchedModels} disabled={selectedFetchedModels.size === 0}>
                    <Plus className="h-4 w-4 mr-1.5" />添加 {selectedFetchedModels.size > 0 ? `(${selectedFetchedModels.size})` : ''}
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
            <DialogTitle>测试全部模型</DialogTitle>
            <DialogDescription>将对 {selectedProvider?.name || ''} 下的所有模型逐一进行连通性测试</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-amber-600 dark:text-amber-400">费用提示</p>
                <p className="text-muted-foreground">
                  该测试将向每个模型发送一条简短消息（"hello"），共测试 <strong>{selectedProvider?.models.length || 0}</strong> 个模型。虽然每次请求消耗的 token 极少，但仍可能产生少量 API 调用费用。请确认后继续。
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">测试内容：发送 "hello" → 验证流式响应是否正常返回</div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTestAllDialogOpen(false)}>取消</Button>
            <Button onClick={() => { setTestAllDialogOpen(false); testAllModels(); }}><Play className="h-4 w-4 mr-1.5" />确认测试</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
