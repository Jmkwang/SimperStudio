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
import { Bot, Plus } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { DebugBadge } from '@/components/debug/DebugBadge';

export function AgentsView() {
  const agents = useAppStore(state => state.agents);
  const activeAgentId = useAppStore(state => state.activeAgentId);
  const setActiveAgent = useAppStore(state => state.setActiveAgent);
  const addAgent = useAppStore(state => state.addAgent);
  const updateAgent = useAppStore(state => state.updateAgent);
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  const [editingId, setEditingId] = useState<string | null>(null);
  
  const defaultAgentState = {
    name: '',
    description: '',
    systemPrompt: '',
    avatar: '',
    industry: 'General',
    modelProvider: 'local' as const,
    modelId: 'default',
    temperature: 0.7,
    maxTokens: undefined as number | undefined,
    apiKey: '',
    baseUrl: '',
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
      modelProvider: agent.modelProvider,
      modelId: agent.modelId,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      apiKey: agent.apiKey || '',
      baseUrl: agent.baseUrl || '',
      parameters: agent.parameters || {}
    });
    setIsOpen(true);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData(defaultAgentState);
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
                      <Label>Model Provider</Label>
                      <Select 
                        value={formData.modelProvider} 
                        onValueChange={(value: any) => setFormData({ ...formData, modelProvider: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="local">Local (Ollama/LM Studio)</SelectItem>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">Anthropic</SelectItem>
                          <SelectItem value="custom">Custom Endpoint</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {formData.modelProvider !== 'local' && (
                      <>
                        <div className="grid gap-2">
                          <Label htmlFor="apiKey">API Key</Label>
                          <Input
                            id="apiKey"
                            type="password"
                            value={formData.apiKey}
                            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                            placeholder="sk-..."
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="baseUrl">Base URL (Optional)</Label>
                          <Input
                            id="baseUrl"
                            value={formData.baseUrl}
                            onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                            placeholder="https://api.openai.com/v1"
                          />
                        </div>
                      </>
                    )}
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

        <div className="space-y-8">
          {activeAgentId ? (
            <div className="bg-card rounded-xl border p-6 flex flex-col shadow-sm">
              {(() => {
                const agent = agents.find(a => a.id === activeAgentId);
                if (!agent) return <p>Agent not found.</p>;
                return (
                  <>
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="h-16 w-16 border shadow-sm">
                        <AvatarImage src={agent.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          <Bot className="h-8 w-8" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-2xl">{agent.name}</h3>
                        <p className="text-sm text-muted-foreground">{agent.modelProvider} • {agent.modelId} • {agent.industry}</p>
                      </div>
                    </div>
                    <div className="mb-6">
                      <h4 className="font-medium mb-2">{t("System Prompt")}</h4>
                      <div className="bg-muted p-4 rounded-lg text-sm font-mono whitespace-pre-wrap">
                        {agent.systemPrompt}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                      <div>
                        <span className="text-muted-foreground block">{t("Temperature")}</span>
                        {agent.temperature}
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Max Tokens</span>
                        {agent.maxTokens || 'Default'}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4 border-t">
                      <Button onClick={() => handleEdit(agent)}>{t("Edit Agent Configuration")}</Button>
                      <Button variant="secondary">{t("Test Chat")}</Button>
                    </div>
                  </>
                );
              })()}
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
                      <div 
                        key={agent.id} 
                        className="bg-card rounded-xl border p-4 flex flex-col shadow-sm cursor-pointer hover:border-primary transition-colors"
                        onClick={() => setActiveAgent(agent.id)}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="h-10 w-10 border shadow-sm">
                            <AvatarImage src={agent.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              <Bot className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold">{agent.name}</h4>
                            <p className="text-xs text-muted-foreground">{agent.modelProvider}</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {agent.description || agent.systemPrompt}
                        </p>
                      </div>
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
      </div>
    </div>
  );
}
