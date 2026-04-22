import { Handle, Position } from '@xyflow/react';
import { Play } from 'lucide-react';

export function TriggerNode({ data }: { data: any }) {
  return (
    <div className="w-[200px] rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center gap-3 border-b p-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-500">
          <Play className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">{data.label || 'Trigger'}</p>
          <p className="text-xs text-muted-foreground mt-1">Manual Execution</p>
        </div>
      </div>
      <div className="p-3 text-xs text-muted-foreground">
        Initiates the workflow when clicked.
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 border-2 border-emerald-500 bg-background"
      />
    </div>
  );
}