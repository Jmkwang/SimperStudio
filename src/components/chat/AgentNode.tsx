import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Agent } from '@/types/models';
import { useTranslation } from '@/hooks/useTranslation';

type AgentNodeData = {
  agent: Agent;
  onClick: () => void;
};

export const AgentNode = memo(({ data }: { data: AgentNodeData }) => {
  const { agent, onClick } = data;
  const { t } = useTranslation();

  return (
    <div className="px-4 py-3 shadow-md rounded-xl bg-background border border-border min-w-[160px] hover:border-primary/50 transition-colors">
      <Handle type="target" position={Position.Top} className="!bg-primary !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{agent.name}</div>
          <div className="text-xs text-muted-foreground">
            {agent.modelId || 'No model'}
          </div>
        </div>
      </div>
      <Button variant="outline" size="sm" className="mt-2 w-full h-7 text-xs" onClick={onClick}>
        {t('Open Chat')}
      </Button>
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2" />
    </div>
  );
});
