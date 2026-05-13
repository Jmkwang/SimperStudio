import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Bot, Settings2 } from 'lucide-react';
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
  const { setNodes } = useReactFlow();
  const agents = useAppStore(state => state.agents);

  const [baseConfig, setBaseConfig] = useState(() => createNodeBaseConfigDraft(data, 'Agent Node'));
  const [localPrompt, setLocalPrompt] = useState(data.prompt || '');
  const [selectedAgentId, setSelectedAgentId] = useState(data.agentId || agents[0]?.id);
  const [localAutoSend, setLocalAutoSend] = useState(data.autoSendToNext || false);
  const [localSchema, setLocalSchema] = useState(data.schema || '');
  const [isOpen, setIsOpen] = useState(false);

  const activeAgent = agents.find(a => a.id === selectedAgentId);

  const handleSave = () => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...applyNodeBaseConfigDraft(node.data, baseConfig),
              agentId: selectedAgentId,
              prompt: localPrompt,
              autoSendToNext: localAutoSend,
              schema: localSchema,
            },
          };
        }
        return node;
      })
    );
    setIsOpen(false);
  };

  return (
    <div className="w-[260px] rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 border-2 border-primary bg-background"
      />
      <div className="flex items-center justify-between border-b p-3 bg-muted/20">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 rounded-md border shadow-sm">
            <AvatarImage src={activeAgent?.avatar} />
            <AvatarFallback className="rounded-md bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold leading-none truncate max-w-[140px]">{data.label || 'Agent Node'}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate max-w-[140px]">{activeAgent?.name || 'Select an Agent'}</p>
            {data.schema && <p className="text-[10px] text-primary mt-0.5">Tool Calling Enabled</p>}
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors p-2 min-h-[44px] min-w-[44px] rounded-md hover:bg-muted" aria-label="Configure agent node">
              <Settings2 className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-xl">
            <DialogHeader>
              <DialogTitle>Configure Agent Node</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <NodeBaseConfigSection value={baseConfig} onChange={setBaseConfig} />
              <div className="grid gap-2">
                <Label>Assigned Agent</Label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="schema">Output Schema (JSON)</Label>
                <Textarea
                  id="schema"
                  value={localSchema}
                  onChange={(e) => setLocalSchema(e.target.value)}
                  placeholder='{"targetId": "string"}'
                  className="resize-none h-20 font-mono text-xs"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prompt">Node Prompt / Instructions</Label>
                <Textarea
                  id="prompt"
                  value={localPrompt}
                  onChange={(e) => setLocalPrompt(e.target.value)}
                  placeholder="What should this agent do when triggered?"
                  className="resize-none h-24"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Auto Send to Next</Label>
                  <p className="text-xs text-muted-foreground">Automatically forward this agent's reply to the next agent node.</p>
                </div>
                <Switch
                  checked={localAutoSend}
                  onCheckedChange={setLocalAutoSend}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
      <div className="p-3">
         <p className="text-xs text-muted-foreground line-clamp-2 italic">
            {data.prompt || 'Process input using assigned agent capabilities.'}
         </p>
         {data.autoSendToNext && (
           <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
             <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
             Auto-forward enabled
           </p>
         )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 border-2 border-primary bg-background"
      />
    </div>
  );
}