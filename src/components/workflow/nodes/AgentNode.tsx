import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Bot, Settings2 } from 'lucide-react';
import { NodeDeleteButton } from './NodeDeleteButton';
import { useAppStore } from '@/stores';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { NodeBaseConfigSection, applyNodeBaseConfigDraft, createNodeBaseConfigDraft } from '@/components/workflow/NodeBaseConfigSection';

export function AgentNode({ id, data }: { id: string, data: any }) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const agents = useAppStore(state => state.agents);
  const providers = useAppStore(state => state.settings?.providers) || [];

  const [baseConfig, setBaseConfig] = useState(() => createNodeBaseConfigDraft(data, t('Agent Node')));
  const [selectedAgentId, setSelectedAgentId] = useState(data.agentId || agents[0]?.id);
  const [localSchema, setLocalSchema] = useState(data.schema || '');
  const [localAutoSend, setLocalAutoSend] = useState(data.autoSendToNext || false);
  const [overrideProviderId, setOverrideProviderId] = useState(data.overrideProviderId || '');
  const [overrideModelId, setOverrideModelId] = useState(data.overrideModelId || '');
  const [overrideSystemPrompt, setOverrideSystemPrompt] = useState(data.overrideSystemPrompt || '');
  const [isOpen, setIsOpen] = useState(false);

  const activeAgent = agents.find(a => a.id === selectedAgentId);
  const selectedOverrideProvider = providers.find(p => p.id === overrideProviderId);

  const handleSave = () => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...applyNodeBaseConfigDraft(node.data, baseConfig),
              agentId: selectedAgentId,
              schema: localSchema,
              autoSendToNext: localAutoSend,
              overrideProviderId: overrideProviderId || undefined,
              overrideModelId: overrideModelId || undefined,
              overrideSystemPrompt: overrideSystemPrompt || undefined,
            },
          };
        }
        return node;
      })
    );
    setIsOpen(false);
  };

  return (
    <div className="node-card w-[260px] rounded-xl border border-border/60 bg-card text-card-foreground shadow-soft overflow-hidden group">
      <Handle
        type="target"
        position={Position.Left}
        className="w-5 h-5 border-2 border-primary bg-popover"
      />
      <div className="gradient-header flex items-center justify-between border-b border-border/50 p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 rounded-lg ring-2 ring-primary/10 shadow-sm">
            <AvatarImage src={activeAgent?.avatar} />
            <AvatarFallback className="rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none truncate max-w-[140px]">{data.label || t('Agent Node')}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate max-w-[140px]">{activeAgent?.name || t('Select an Agent')}</p>
            {data.schema && <p className="text-xs text-primary mt-0.5 font-medium">{t("Tool Calling Enabled")}</p>}
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-muted-foreground hover:text-foreground p-2 min-h-[44px] min-w-[44px] rounded-lg hover:bg-muted/80" aria-label={t('Configure agent node')}>
              <Settings2 className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <NodeDeleteButton
            nodeId={id}
            deleteNode={data.deleteNode}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-destructive hover:text-destructive/80 p-2 min-h-[44px] min-w-[44px] rounded-lg hover:bg-destructive/10"
          />
          <DialogContent className="sm:max-w-[500px] rounded-xl">
            <DialogHeader>
              <DialogTitle>{t("Configure Agent Node")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <NodeBaseConfigSection value={baseConfig} onChange={setBaseConfig} />
              <div className="grid gap-2">
                <Label>{t("Assigned Agent")}</Label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select an agent')} />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="schema">{t('Output Schema (JSON)')}</Label>
                <Textarea
                  id="schema"
                  value={localSchema}
                  onChange={(e) => setLocalSchema(e.target.value)}
                  placeholder='{"targetId": "string"}'
                  className="resize-none h-20 font-mono text-xs"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="systemPrompt">{t("Override System Prompt")}</Label>
                <Textarea
                  id="systemPrompt"
                  value={overrideSystemPrompt}
                  onChange={(e) => setOverrideSystemPrompt(e.target.value)}
                  placeholder={t("Leave empty to use the agent's default system prompt")}
                  className="resize-none h-24"
                />
                <p className="text-xs text-muted-foreground">{t("If set, this replaces the agent's system prompt for this node only.")}</p>
              </div>

              {/* Node-level overrides */}
              <div className="border border-amber-200 dark:border-amber-900/40 rounded-lg p-3 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
                <h5 className="text-xs font-medium text-amber-700 dark:text-amber-400">{t('Node-level Overrides (local only)')}</h5>
                <div className="grid gap-2">
                  <Label className="text-xs">{t('Override Provider')}</Label>
                  <Select
                    value={overrideProviderId || '__none__'}
                    onValueChange={(v) => { setOverrideProviderId(v === '__none__' ? '' : v); setOverrideModelId(''); }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('Use agent default')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("Use agent default")}</SelectItem>
                      {providers.filter(p => p.isEnabled).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">{t('Override Model')}</Label>
                  <Select
                    value={overrideModelId || '__none__'}
                    onValueChange={(v) => setOverrideModelId(v === '__none__' ? '' : v)}
                    disabled={!overrideProviderId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={overrideProviderId ? t('Use provider default') : t('Select a provider first')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("Use provider default")}</SelectItem>
                      {selectedOverrideProvider?.models.map(m => (
                        <SelectItem key={m.id} value={m.modelId}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>{t('Auto Send to Next')}</Label>
                  <p className="text-xs text-muted-foreground">{t("Automatically forward this agent's reply to the next agent node.")}</p>
                </div>
                <Switch
                  checked={localAutoSend}
                  onCheckedChange={setLocalAutoSend}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave}>{t("Save Changes")}</Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
      <div className="p-3 space-y-2">
         <p className="text-xs text-muted-foreground/70 line-clamp-2 leading-relaxed">
            {data.prompt || t('Process input using assigned agent capabilities.')}
         </p>
         {data.autoSendToNext && (
           <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-md px-2 py-1">
             <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
             <span className="font-medium">{t('Auto-forward enabled')}</span>
           </div>
         )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-5 h-5 border-2 border-primary bg-popover"
      />
    </div>
  );
}
