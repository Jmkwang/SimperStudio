import { Handle, Position, useNodeConnections } from '@xyflow/react';
import { FileOutput } from 'lucide-react';

export function OutputNode({ data }: { data: any }) {
  const connections = useNodeConnections({ type: 'target' });
  
  return (
    <div className="w-[200px] rounded-xl border bg-card text-card-foreground shadow-sm">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={connections.length < 1}
        className="w-3 h-3 border-2 border-slate-500 bg-background"
      />
      <div className="flex items-center gap-3 border-b p-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          <FileOutput className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">{data.label || 'Output'}</p>
          <p className="text-xs text-muted-foreground mt-1">Final Result</p>
        </div>
      </div>
      <div className="p-3 text-xs text-muted-foreground">
        Returns data to the user or system.
      </div>
    </div>
  );
}