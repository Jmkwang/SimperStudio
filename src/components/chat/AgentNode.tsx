import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Agent } from '@/types/models';

type AgentNodeData = {
  agent: Agent;
  onClick: () => void;
};

export const AgentNode = memo(({ data }: { data: AgentNodeData }) => {
  const { agent, onClick } = data;

  return (
    <div className="px-4 py-3 shadow-md rounded-xl bg-background border border-border min-w-[160px] hover:border-primary/50 transition-colors">
      <Handle type="target" position={Position.Top} className="!bg-primary !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{agent.name}</div>
          <div className="text-[11px] text-muted-foreground">
            {agent.modelProvider}/{agent.modelId}
          </div>
        </div>
      </div>
      <Button variant="outline" size="sm" className="mt-2 w-full h-7 text-xs" onClick={onClick}>
        打开对话
      </Button>
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2" />
    </div>
  );
});
