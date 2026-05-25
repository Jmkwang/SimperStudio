import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Sparkles, Settings2 } from 'lucide-react';
import { useAppStore } from '@/stores';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NodeBaseConfigSection, applyNodeBaseConfigDraft, createNodeBaseConfigDraft } from '@/components/workflow/NodeBaseConfigSection';

export function DynamicAgentNode({ id, data }: { id: string; data: any }) {
  const { setNodes } = useReactFlow();
  const agents = useAppStore((state) => state.agents);
  const providers = useAppStore((state) => state.settings?.providers) || [];

  const [baseConfig, setBaseConfig] = useState(() => createNodeBaseConfigDraft(data, 'Dynamic Agent'));
  const [isOpen, setIsOpen] = useState(false);

  // Config source
  const [configSource, setConfigSource] = useState<'payload' | 'inline'>(data.configSource || 'inline');
  const [configPath, setConfigPath] = useState(data.configPath || 'payload.dynamicAgentConfig');

  // Inline config
  const [nameTemplate, setNameTemplate] = useState(data.inlineConfig?.nameTemplate || '');
  const [systemPromptTemplate, setSystemPromptTemplate] = useState(data.inlineConfig?.systemPromptTemplate || '');
  const [avatarTemplate, setAvatarTemplate] = useState(data.inlineConfig?.avatarTemplate || '');
  const [personalityTemplate, setPersonalityTemplate] = useState(data.inlineConfig?.personalityTemplate || '');
  const [roleTemplate, setRoleTemplate] = useState(data.inlineConfig?.roleTemplate || '');

  // Prompt template
  const [promptTemplate, setPromptTemplate] = useState(data.promptTemplate || '');

  // Fallback
  const [fallbackAgentId, setFallbackAgentId] = useState(data.fallbackAgentId || '');
  const [fallbackProviderId, setFallbackProviderId] = useState(data.fallbackProviderId || '');
  const [fallbackModelId, setFallbackModelId] = useState(data.fallbackModelId || '');

  // Output
  const [outputField, setOutputField] = useState(data.outputField || 'llmResult');
  const [autoSendToNext, setAutoSendToNext] = useState(data.autoSendToNext || false);

  const selectedFallbackProvider = providers.find((p) => p.id === fallbackProviderId);

  const handleSave = () => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...applyNodeBaseConfigDraft(node.data, baseConfig),
              configSource,
              configPath: configSource === 'payload' ? configPath : undefined,
              inlineConfig:
                configSource === 'inline'
                  ? {
                      nameTemplate: nameTemplate || undefined,
                      systemPromptTemplate,
                      avatarTemplate: avatarTemplate || undefined,
                      personalityTemplate: personalityTemplate || undefined,
                      roleTemplate: roleTemplate || undefined,
                    }
                  : undefined,
              promptTemplate: promptTemplate || undefined,
              fallbackAgentId: fallbackAgentId || undefined,
              fallbackProviderId: fallbackProviderId || undefined,
              fallbackModelId: fallbackModelId || undefined,
              outputField: outputField || 'llmResult',
              autoSendToNext,
            },
          };
        }
        return node;
      })
    );
    setIsOpen(false);
  };

  const isValid = configSource === 'payload' ? !!configPath : !!systemPromptTemplate;

  return (
    <div className="w-[280px] rounded-xl border-2 border-purple-200 dark:border-purple-900/50 bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 border-2 border-purple-500 bg-background"
      />
      <div className="flex items-center justify-between border-b border-purple-100 dark:border-purple-900/30 p-3 bg-purple-50/30 dark:bg-purple-950/20">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md border border-purple-200 dark:border-purple-800 bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none truncate max-w-[160px]">{data.label || 'Dynamic Agent'}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate max-w-[160px]">
              {configSource === 'payload' ? 'From payload' : 'Inline template'}
            </p>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button
              className="text-muted-foreground hover:text-foreground transition-colors p-2 min-h-[44px] min-w-[44px] rounded-md hover:bg-muted"
              aria-label="Configure dynamic agent node"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px] rounded-xl">
            <DialogHeader>
              <DialogTitle>Configure Dynamic Agent</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <NodeBaseConfigSection value={baseConfig} onChange={setBaseConfig} />

              {/* Config Source */}
              <div className="grid gap-2">
                <Label>Configuration Source</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={configSource === 'payload' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setConfigSource('payload')}
                    className="flex-1"
                  >
                    From Payload
                  </Button>
                  <Button
                    type="button"
                    variant={configSource === 'inline' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setConfigSource('inline')}
                    className="flex-1"
                  >
                    Inline Template
                  </Button>
                </div>
              </div>

              {/* Payload Mode */}
              {configSource === 'payload' && (
                <div className="grid gap-2">
                  <Label htmlFor="configPath">Config Path</Label>
                  <Input
                    id="configPath"
                    value={configPath}
                    onChange={(e) => setConfigPath(e.target.value)}
                    placeholder="payload.dynamicAgentConfig"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Path to a DynamicAgentConfig object in the payload. Use dot notation or bracket notation.
                  </p>
                </div>
              )}

              {/* Inline Mode */}
              {configSource === 'inline' && (
                <div className="grid gap-3 border border-purple-100 dark:border-purple-900/30 rounded-lg p-3 bg-purple-50/20 dark:bg-purple-950/10">
                  <h5 className="text-xs font-medium text-purple-700 dark:text-purple-400">Inline Templates</h5>
                  <div className="grid gap-2">
                    <Label htmlFor="nameTemplate" className="text-xs">Name Template</Label>
                    <Input
                      id="nameTemplate"
                      value={nameTemplate}
                      onChange={(e) => setNameTemplate(e.target.value)}
                      placeholder="Player {{loop.index}}"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="systemPromptTemplate" className="text-xs">System Prompt Template *</Label>
                    <Textarea
                      id="systemPromptTemplate"
                      value={systemPromptTemplate}
                      onChange={(e) => setSystemPromptTemplate(e.target.value)}
                      placeholder="You are a {{payload.role}} expert. Please..."
                      className="resize-none h-20 text-sm"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="roleTemplate" className="text-xs">Role Template</Label>
                    <Input
                      id="roleTemplate"
                      value={roleTemplate}
                      onChange={(e) => setRoleTemplate(e.target.value)}
                      placeholder="{{payload.role}}"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="personalityTemplate" className="text-xs">Personality Template</Label>
                    <Input
                      id="personalityTemplate"
                      value={personalityTemplate}
                      onChange={(e) => setPersonalityTemplate(e.target.value)}
                      placeholder="{{payload.personality}}"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="avatarTemplate" className="text-xs">Avatar Template</Label>
                    <Input
                      id="avatarTemplate"
                      value={avatarTemplate}
                      onChange={(e) => setAvatarTemplate(e.target.value)}
                      placeholder="https://..."
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Prompt Template */}
              <div className="grid gap-2">
                <Label htmlFor="promptTemplate">Prompt Template (optional)</Label>
                <Textarea
                  id="promptTemplate"
                  value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                  placeholder="{{payload.userInput}}"
                  className="resize-none h-16 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  If set, this template is used as the user prompt. Otherwise the entire payload is sent.
                </p>
              </div>

              {/* Fallback Model */}
              <div className="border border-amber-200 dark:border-amber-900/40 rounded-lg p-3 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
                <h5 className="text-xs font-medium text-amber-700 dark:text-amber-400">Model Fallback Chain</h5>
                <div className="grid gap-2">
                  <Label className="text-xs">Fallback Agent</Label>
                  <Select value={fallbackAgentId} onValueChange={setFallbackAgentId}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Fallback Provider</Label>
                  <Select
                    value={fallbackProviderId}
                    onValueChange={(v) => {
                      setFallbackProviderId(v);
                      setFallbackModelId('');
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {providers.filter(p => p.isEnabled).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Fallback Model</Label>
                  <Select
                    value={fallbackModelId}
                    onValueChange={setFallbackModelId}
                    disabled={!fallbackProviderId}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder={fallbackProviderId ? 'Select model' : 'Select provider first'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Default</SelectItem>
                      {selectedFallbackProvider?.models.map((m) => (
                        <SelectItem key={m.id} value={m.modelId}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Output */}
              <div className="grid gap-2">
                <Label htmlFor="outputField">Output Field</Label>
                <Input
                  id="outputField"
                  value={outputField}
                  onChange={(e) => setOutputField(e.target.value)}
                  placeholder="llmResult"
                  className="h-8 text-sm"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Auto Send to Next</Label>
                  <p className="text-xs text-muted-foreground">Automatically forward this agent&apos;s reply to the next agent node.</p>
                </div>
                <Switch checked={autoSendToNext} onCheckedChange={setAutoSendToNext} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {!isValid && (
                <p className="text-xs text-red-500 mr-auto">
                  {configSource === 'payload' ? 'Config path is required' : 'System prompt template is required'}
                </p>
              )}
              <Button onClick={handleSave} disabled={!isValid}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="p-3">
        <p className="text-xs text-muted-foreground line-clamp-2 italic">
          {configSource === 'payload'
            ? `From: ${configPath}`
            : systemPromptTemplate || 'Configure dynamic persona...'}
        </p>
        {autoSendToNext && (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Auto-forward enabled
          </p>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 border-2 border-purple-500 bg-background"
      />
    </div>
  );
}
