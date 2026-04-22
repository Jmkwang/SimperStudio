import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Bot, Settings2 } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function AgentNode({ id, data }: { id: string, data: any }) {
  const { setNodes } = useReactFlow();
  const agents = useAppStore(state => state.agents);

  const [localPrompt, setLocalPrompt] = useState(data.prompt || '');
  const [selectedAgentId, setSelectedAgentId] = useState(data.agentId || agents[0]?.id);
  const [isOpen, setIsOpen] = useState(false);

  const activeAgent = agents.find(a => a.id === selectedAgentId);

  const handleSave = () => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              agentId: selectedAgentId,
              prompt: localPrompt,
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
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted">
              <Settings2 className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-xl">
            <DialogHeader>
              <DialogTitle>Configure Agent Node</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Assigned Agent</Label>
                {/* Fallback to simple select since shadcn select didn't install perfectly */}
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                >
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
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
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 border-2 border-primary bg-background"
      />
    </div>
  );
}