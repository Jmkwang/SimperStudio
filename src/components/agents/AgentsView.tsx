import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Plus, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { DebugBadge } from '@/components/debug/DebugBadge';
import { useDebugTrack } from '@/hooks/useDebugTrack';
import { cn } from '@/lib/utils';

interface AgentCardProps {
  agent: any;
  bulkMode: boolean;
  selectedIds: Set<string>;
  providers: any[];
  onToggle: (id: string) => void;
  onEdit: (agent: any) => void;
  onDelete: (id: string, name: string) => void;
  t: (key: string) => string;
  isNew?: boolean;
}

function AgentCard({ agent, bulkMode, selectedIds, providers, onToggle, onEdit, onDelete, t, isNew }: AgentCardProps) {
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      className={cn(
        "bg-card rounded-xl border p-4 flex flex-col shadow-sm cursor-pointer hover:border-primary transition-colors relative",
        bulkMode && selectedIds.has(agent.id) && "border-primary ring-1 ring-primary/20"
      )}
      onClick={() => {
        if (bulkMode) {
          onToggle(agent.id);
        } else {
          onEdit(agent);
        }
      }}
      onContextMenu={handleContextMenu}
    >
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setCtxMenu(null); }} />
          <div
            className="fixed z-50 min-w-[140px] rounded-lg border bg-popover p-1 shadow-md"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => { setCtxMenu(null); onEdit(agent); }}
              className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
            >
              {t('Edit Agent')}
            </button>
            <button
              onClick={() => { setCtxMenu(null); onDelete(agent.id, agent.name); }}
              className="w-full text-left px-3 py-1.5 text-sm rounded-md text-destructive hover:bg-destructive/10 transition-colors"
            >
              {t('Delete')}
            </button>
          </div>
        </>
      )}
      {bulkMode && (
        <div
          className="absolute top-2 right-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
              selectedIds.has(agent.id)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-foreground/30 bg-background hover:border-primary/60"
            )}
            onClick={() => onToggle(agent.id)}
            role="checkbox"
            aria-checked={selectedIds.has(agent.id)}
            aria-label={`Select ${agent.name}`}
          >
            {selectedIds.has(agent.id) && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 mb-3">
        <Avatar className={cn("h-10 w-10 rounded-full border shadow-sm", isNew && "animate-agent-pop animate-agent-glow")}>
          <AvatarImage src={agent.avatar} />
          <AvatarFallback className="rounded-full bg-primary/10 text-primary">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h4 className="font-semibold">{agent.name}</h4>
          <p className="text-xs text-muted-foreground">{agent.providerId ? providers.find(p => p.id === agent.providerId)?.name : t('Global default')}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">
        {agent.description || agent.systemPrompt}
      </p>
    </div>
  );
}

export function AgentsView() {
  const agents = useAppStore(state => state.agents);
  const activeAgentId = useAppStore(state => state.activeAgentId);
  const setActiveAgent = useAppStore(state => state.setActiveAgent);
  const selectedAgentCategory = useAppStore(state => state.selectedAgentCategory);
  const setSelectedAgentCategory = useAppStore(state => state.setSelectedAgentCategory);
  const addAgent = useAppStore(state => state.addAgent);
  const updateAgent = useAppStore(state => state.updateAgent);
  const deleteAgent = useAppStore(state => state.deleteAgent);
  const settings = useAppStore(state => state.settings);
  const providers = settings.providers || [];
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  const { trackClick } = useDebugTrack('AgentsView');
  const batchUpdateAgents = useAppStore(state => state.batchUpdateAgents);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProviderId, setBulkProviderId] = useState('');
  const [bulkModelId, setBulkModelId] = useState('');
  const [recentAgentIds, setRecentAgentIds] = useState<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const defaultAgentState = {
    name: '',
    description: '',
    systemPrompt: '',
    avatar: '',
    industry: 'General',
    providerId: '',
    modelId: '',
    temperature: undefined as number | undefined,
    maxTokens: undefined as number | undefined,
    parameters: {}
  };

  const [formData, setFormData] = useState(defaultAgentState);

  const existingCategories = Array.from(new Set(agents.map((a: any) => a.category || a.industry).filter(Boolean))) as string[];

  useEffect(() => {
    if (activeAgentId === '__create_new__') {
      setEditingId(null);
      setFormData(defaultAgentState);
      setAdvancedOpen(false);
      setIsOpen(true);
      setActiveAgent(null);
    }
  }, [activeAgentId, setActiveAgent]);

  const handleDeleteRequest = (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    await deleteAgent(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      document.getElementById('name')?.focus();
      return;
    }
    if (!formData.systemPrompt.trim()) {
      document.getElementById('systemPrompt')?.focus();
      return;
    }
    try {
      if (editingId) {
        await updateAgent(editingId, formData);
      } else {
        await addAgent(formData);
      }
      setIsOpen(false);
      setFormData(defaultAgentState);
      setEditingId(null);
    } catch (e) {
      console.error('Failed to save agent:', e);
      toast.error(t('保存失败'), { description: String(e) });
    }
  };

  // Track newly created agents for entrance animation (5s window)
  // On first load, mark all existing agents as "not new" so only
  // agents created during this session get the entrance animation.
  useEffect(() => {
    if (agents.length > 0 && !initializedRef.current) {
      initializedRef.current = true;
      setRecentAgentIds(new Set(agents.map(a => a.id)));
    }
  }, [agents]);

  useEffect(() => {
    if (!initializedRef.current || agents.length === 0) return;
    const newIds = agents.filter(a => !recentAgentIds.has(a.id)).map(a => a.id);
    if (newIds.length > 0) {
      setRecentAgentIds(prev => {
        const next = new Set(prev);
        newIds.forEach(id => next.add(id));
        return next;
      });
      const timer = setTimeout(() => {
        setRecentAgentIds(prev => {
          const next = new Set(prev);
          newIds.forEach(id => next.delete(id));
          return next;
        });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [agents.length]);

  const handleEdit = (agent: any) => {
    setEditingId(agent.id);
    setFormData({
      name: agent.name,
      description: agent.description || '',
      systemPrompt: agent.systemPrompt,
      avatar: agent.avatar || '',
      industry: agent.industry || 'General',
      providerId: agent.providerId || '',
      modelId: agent.modelId || '',
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      parameters: agent.parameters || {}
    });
    setAdvancedOpen(agent.temperature !== undefined || agent.maxTokens !== undefined);
    setIsOpen(true);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData(defaultAgentState);
    setAdvancedOpen(false);
    setIsOpen(true);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const exitBulkMode = () => {
    setBulkMode(false);
    clearSelection();
    setBulkProviderId('');
    setBulkModelId('');
  };

  const handleBulkApply = async () => {
    if (selectedIds.size === 0 || !bulkProviderId) return;
    const { successCount, failedIds } = await batchUpdateAgents(Array.from(selectedIds), {
      providerId: bulkProviderId,
      modelId: bulkModelId === '__default__' ? undefined : bulkModelId,
    });
    if (failedIds.length > 0) {
      toast.error(t('部分智能体保存失败'), {
        description: `${t('成功')} ${successCount}，${t('失败')} ${failedIds.length}`,
      });
      return;
    }
    toast.success(`${successCount} ${t('个智能体已更新')}`);
    exitBulkMode();
  };

  const toggleSelectCategory = (categoryAgents: typeof agents) => {
    const categoryIds = categoryAgents.map((a: typeof agents[0]) => a.id);
    const allSelected = categoryIds.every((id: string) => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        categoryIds.forEach((id: string) => next.delete(id));
      } else {
        categoryIds.forEach((id: string) => next.add(id));
      }
      return next;
    });
  };

  // Agents currently visible (respects the active category filter)
  const visibleAgents = selectedAgentCategory
    ? agents.filter(a => (a.category || a.industry || 'General') === selectedAgentCategory)
    : agents;
  const allVisibleSelected = visibleAgents.length > 0 && visibleAgents.every(a => selectedIds.has(a.id));

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        visibleAgents.forEach(a => next.delete(a.id));
        return next;
      }
      const next = new Set(prev);
      visibleAgents.forEach(a => next.add(a.id));
      return next;
    });
  };

  return (
    <div className="relative flex-1 p-8 overflow-y-auto bg-muted/10">
      <DebugBadge id="AgentsView" />
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t("Agents")}</h2>
            <p className="text-muted-foreground mt-1">{t("Manage and configure your AI assistants.")}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={bulkMode ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                if (bulkMode) {
                  exitBulkMode();
                } else {
                  setBulkMode(true);
                }
              }}
            >
              {bulkMode ? t('Exit Bulk') : t('Bulk Edit')}
            </Button>
            {bulkMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                disabled={visibleAgents.length === 0}
              >
                {allVisibleSelected ? t('取消全选') : t('全选')}
              </Button>
            )}
            <Button onClick={trackClick(handleOpenNew, 'agent:openCreate')} data-debug-source="AgentsView" data-debug-action="agent:openCreate">
              <Plus className="mr-2 h-4 w-4" />
              {t('Create Agent')}
            </Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingId ? t("Edit Agent") : t("Create New Agent")}</DialogTitle>
                </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t("Name")}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Code Reviewer"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">{t("Description")}</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the agent"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="avatar">{t("Avatar URL (Optional)")}</Label>
                  <Input
                    id="avatar"
                    value={formData.avatar}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("Industry")}</Label>
                  <Select
                    value={formData.industry || 'General'}
                    onValueChange={(val) => setFormData({ ...formData, industry: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select Industry")} />
                    </SelectTrigger>
                    <SelectContent>
                      {existingCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="systemPrompt">{t("System Prompt")}</Label>
                  <Textarea
                    id="systemPrompt"
                    value={formData.systemPrompt}
                    onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                    placeholder="You are a helpful assistant..."
                    className="h-32"
                    required
                  />
                </div>

                <div className="border-t pt-4 mt-2">
                  <h4 className="text-sm font-medium mb-3">{t("Model Configuration")}</h4>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>{t("Provider")}</Label>
                      <Select
                        value={formData.providerId || '__none__'}
                        onValueChange={(value: string) => setFormData({ ...formData, providerId: value === '__none__' ? '' : value, modelId: '' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("Select a provider")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">{t("Select a provider")}</SelectItem>
                          {providers.filter(p => p.isEnabled).map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>{t("Model")}</Label>
                      <Select
                        value={formData.modelId || '__none__'}
                        onValueChange={(value: string) => setFormData({ ...formData, modelId: value === '__none__' ? '' : value })}
                        disabled={!formData.providerId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={formData.providerId ? t("Select a model") : t("Select a provider first")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">{t("Select a model")}</SelectItem>
                          {providers
                            .find((p) => p.id === formData.providerId)
                            ?.models.map((m) => (
                              <SelectItem key={m.id} value={m.modelId}>{m.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 mt-2">
                  <button
                    type="button"
                    className="flex items-center justify-between w-full text-sm font-medium mb-3"
                    onClick={() => setAdvancedOpen(!advancedOpen)}
                  >
                    {t("Advanced Parameters")}
                    <ChevronDown className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")} />
                  </button>
                  {advancedOpen && (
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <div className="flex justify-between">
                          <Label>{t("Temperature")}</Label>
                          <span className="text-xs text-muted-foreground">{formData.temperature ?? 'Auto'}</span>
                        </div>
                        <Slider
                          value={[formData.temperature ?? 0.7]}
                          min={0}
                          max={2}
                          step={0.1}
                          onValueChange={([value]: number[]) => setFormData({ ...formData, temperature: value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="maxTokens">{t("Max Tokens (Optional)")}</Label>
                        <Input
                          id="maxTokens"
                          type="number"
                          value={formData.maxTokens || ''}
                          onChange={(e) => setFormData({ ...formData, maxTokens: e.target.value ? parseInt(e.target.value) : undefined })}
                          placeholder="e.g. 2048"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={trackClick(handleSave, editingId ? 'agent:update' : 'agent:create')} data-debug-source="AgentsView" data-debug-action={editingId ? 'agent:update' : 'agent:create'}>{editingId ? t('Save Changes') : t('Create Agent')}</Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

      <div className="space-y-8">
          {selectedAgentCategory && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedAgentCategory(null)}
                className="flex items-center gap-2 rounded-full px-3 py-1 text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <span>{selectedAgentCategory}</span>
                <X className="h-3 w-3" />
              </button>
              <span className="text-xs text-muted-foreground">
                {agents.filter(a => (a.category || a.industry || 'General') === selectedAgentCategory).length} {t('agents')}
              </span>
            </div>
          )}

          {selectedAgentCategory ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-xl font-semibold">{selectedAgentCategory}</h3>
                {bulkMode && (
                  <button
                    onClick={() => toggleSelectCategory(agents.filter(agent => (agent.category || agent.industry || 'General') === selectedAgentCategory))}
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
                      agents.filter(agent => (agent.category || agent.industry || 'General') === selectedAgentCategory).every((a) => selectedIds.has(a.id))
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-foreground/30 bg-background hover:border-primary/60"
                    )}
                    aria-label={t('Select all in category')}
                  >
                    {agents.filter(agent => (agent.category || agent.industry || 'General') === selectedAgentCategory).every((a) => selectedIds.has(a.id)) && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents
                  .filter(agent => (agent.category || agent.industry || 'General') === selectedAgentCategory)
                  .map(agent => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      bulkMode={bulkMode}
                      selectedIds={selectedIds}
                      providers={providers}
                      onToggle={toggleSelection}
                      onEdit={handleEdit}
                      onDelete={handleDeleteRequest}
                      t={t}
                      isNew={recentAgentIds.has(agent.id)}
                    />
                  ))}
              </div>
            </div>

          ) : (
            <div className="space-y-8">
              {Object.entries(
                agents.reduce((acc: Record<string, typeof agents>, agent: typeof agents[0]) => {
                  const category = agent.category || agent.industry || 'General';
                  if (!acc[category]) acc[category] = [];
                  acc[category].push(agent);
                  return acc;
                }, {} as Record<string, typeof agents>)
              ).map(([category, categoryAgents]) => (
                <div key={category} className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-xl font-semibold">{category}</h3>
                    {bulkMode && (
                      <button
                        onClick={() => toggleSelectCategory(categoryAgents)}
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
                          categoryAgents.every((a) => selectedIds.has(a.id))
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-foreground/30 bg-background hover:border-primary/60"
                        )}
                        aria-label={t('Select all in category')}
                      >
                        {categoryAgents.every((a) => selectedIds.has(a.id)) && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><polyline points="20 6 9 17 4 12" /></svg>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryAgents.map(agent => (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                        bulkMode={bulkMode}
                        selectedIds={selectedIds}
                        providers={providers}
                        onToggle={toggleSelection}
                        onEdit={handleEdit}
                        onDelete={handleDeleteRequest}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {agents.length === 0 && (
                <div className="text-center py-12 text-muted-foreground bg-muted/50 rounded-xl border border-dashed">
                  <Bot className="mx-auto h-12 w-12 opacity-20 mb-4" />
                  <p>{t("No agents found. Create a new one to get started.")}</p>
                </div>
              )}
            </div>
          )}

        </div>

        {bulkMode && selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-xl border bg-card px-5 py-3 shadow-lg">
            <span className="text-sm font-medium whitespace-nowrap">
              {t('Selected')} {selectedIds.size} {t('items')}
            </span>
            <div className="h-4 w-px bg-border" />
            <Select
              value={bulkProviderId}
              onValueChange={(v: string) => { setBulkProviderId(v); setBulkModelId(''); }}
            >
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder={t('Select Provider')} />
              </SelectTrigger>
              <SelectContent>
                {providers.filter(p => p.isEnabled).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={bulkModelId}
              onValueChange={(v: string) => setBulkModelId(v)}
              disabled={!bulkProviderId}
            >
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder={bulkProviderId ? t('Select Model') : t('Select provider first')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">{t('Use Default')}</SelectItem>
                {providers.find(p => p.id === bulkProviderId)?.models.map(m => (
                  <SelectItem key={m.id} value={m.modelId}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!bulkProviderId}
              onClick={trackClick(handleBulkApply, 'agent:bulkApply')}
            >
              {t('Apply')}
            </Button>
            <div className="h-4 w-px bg-border" />
            <Button
              size="sm"
              variant="destructive"
              onClick={trackClick(() => {
                Array.from(selectedIds).forEach(id => deleteAgent(id));
                exitBulkMode();
              }, 'agent:bulkDelete')}
            >
              {t('删除智能体')}
            </Button>
          </div>
        )}
      </div>

      {/* Delete confirm dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-popover rounded-xl border p-6 shadow-lg min-w-[280px]" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-1">{t('Delete')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('确定删除')} <span className="font-medium text-foreground">"{deleteConfirm.name}"</span>？
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>{t('取消')}</Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteConfirm}>{t('确定')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
