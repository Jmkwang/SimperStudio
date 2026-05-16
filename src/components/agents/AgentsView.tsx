import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Plus, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { DebugBadge } from '@/components/debug/DebugBadge';
import { cn } from '@/lib/utils';

interface AgentCardProps {
  agent: any;
  bulkMode: boolean;
  selectedIds: Set<string>;
  providers: any[];
  onToggle: (id: string) => void;
  onEdit: (agent: any) => void;
  t: (key: string) => string;
}

function AgentCard({ agent, bulkMode, selectedIds, providers, onToggle, onEdit, t }: AgentCardProps) {
  return (
    <div
      key={agent.id}
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
    >
      {bulkMode && (
        <label
          className="absolute top-2 left-2 z-10 flex items-center justify-center w-5 h-5 rounded border border-foreground/20 bg-background/80 hover:border-primary/50 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            aria-label={`Select ${agent.name}`}
            className="w-3.5 h-3.5 accent-primary cursor-pointer"
            checked={selectedIds.has(agent.id)}
            onChange={() => onToggle(agent.id)}
          />
        </label>
      )}
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-10 w-10 border shadow-sm">
          <AvatarImage src={agent.avatar} />
          <AvatarFallback className="bg-primary/10 text-primary">
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
  const settings = useAppStore(state => state.settings);
  const providers = settings.providers || [];
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  const batchUpdateAgents = useAppStore(state => state.batchUpdateAgents);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProviderId, setBulkProviderId] = useState('');
  const [bulkModelId, setBulkModelId] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);

  const defaultAgentState = {
    name: '',
    description: '',
    systemPrompt: '',
    avatar: '',
    industry: 'General',
    providerId: '',
    modelId: '',
    temperature: 0.7,
    maxTokens: undefined as number | undefined,
    parameters: {}
  };

  const [formData, setFormData] = useState(defaultAgentState);

  useEffect(() => {
    if (activeAgentId === '__create_new__') {
      setEditingId(null);
      setFormData(defaultAgentState);
      setIsOpen(true);
      setActiveAgent(null);
    }
  }, [activeAgentId, setActiveAgent]);

  const handleSave = () => {
    if (formData.name && formData.systemPrompt) {
      if (editingId) {
        updateAgent(editingId, formData);
      } else {
        addAgent(formData);
      }
      setIsOpen(false);
      setFormData(defaultAgentState);
      setEditingId(null);
    }
  };

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
    setIsOpen(true);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData(defaultAgentState);
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

  const handleBulkApply = () => {
    if (selectedIds.size === 0 || !bulkProviderId) return;
    batchUpdateAgents(Array.from(selectedIds), {
      providerId: bulkProviderId,
      modelId: bulkModelId || undefined,
    });
    exitBulkMode();
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
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Agent
                </Button>
              </DialogTrigger>
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
                  <Label htmlFor="industry">{t("Industry")}</Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value: string) => setFormData({ ...formData, industry: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General">General</SelectItem>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Education">Education</SelectItem>
                      <SelectItem value="Creative">Creative</SelectItem>
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
                  />
                </div>

                <div className="border-t pt-4 mt-2">
                  <h4 className="text-sm font-medium mb-3">{t("Model Configuration")}</h4>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>{t("Provider")}</Label>
                      <Select
                        value={formData.providerId}
                        onValueChange={(value: string) => setFormData({ ...formData, providerId: value, modelId: '' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("Select a provider")} />
                        </SelectTrigger>
                        <SelectContent>
                          {providers.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>{t("Model")}</Label>
                      <Select
                        value={formData.modelId}
                        onValueChange={(value: string) => setFormData({ ...formData, modelId: value })}
                        disabled={!formData.providerId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={formData.providerId ? t("Select a model") : t("Select a provider first")} />
                        </SelectTrigger>
                        <SelectContent>
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
                  <h4 className="text-sm font-medium mb-3">{t("Advanced Parameters")}</h4>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <div className="flex justify-between">
                        <Label>{t("Temperature")}</Label>
                        <span className="text-xs text-muted-foreground">{formData.temperature}</span>
                      </div>
                      <Slider
                        value={[formData.temperature]}
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
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSave}>{editingId ? 'Save Changes' : 'Create Agent'}</Button>
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
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <span>{selectedAgentCategory}</span>
                <X className="h-3 w-3" />
              </button>
              <span className="text-xs text-muted-foreground">
                {agents.filter(a => (a.category || a.industry || 'General') === selectedAgentCategory).length} {t('个助手')}
              </span>
            </div>
          )}

          {selectedAgentCategory ? (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b pb-2">{selectedAgentCategory}</h3>
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
                      t={t}
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
                  <h3 className="text-xl font-semibold border-b pb-2">{category}</h3>
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
                {providers.map(p => (
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
                <SelectItem value="">{t('Use Default')}</SelectItem>
                {providers.find(p => p.id === bulkProviderId)?.models.map(m => (
                  <SelectItem key={m.id} value={m.modelId}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!bulkProviderId}
              onClick={handleBulkApply}
            >
              {t('Apply')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={exitBulkMode}
            >
              {t('Done')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
