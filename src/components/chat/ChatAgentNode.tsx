import { Handle, Position } from '@xyflow/react';
import { Bot } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/stores';

export function ChatAgentNode({ data }: { data: any }) {
  const agents = useAppStore(state => state.agents);
  const activeAgent = data.agentId ? agents.find(a => a.id === data.agentId) : undefined;

  return (
    <div
      className="w-[260px] rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md cursor-pointer"
      onClick={data.onClick}
    >
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
            {data.schema && <p className="text-xs text-primary mt-0.5">Tool Calling Enabled</p>}
          </div>
        </div>
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
