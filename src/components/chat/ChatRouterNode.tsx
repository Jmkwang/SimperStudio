import { Handle, Position } from '@xyflow/react';
import { SplitSquareHorizontal } from 'lucide-react';

export function ChatRouterNode({ data }: { data: any }) {
  const routes = data.routes || [
    { id: 'route-1', condition: 'payload.value > 50' },
    { id: 'route-2', condition: 'payload.value <= 50' }
  ];

  return (
    <div className="w-[240px] rounded-xl border border-orange-200 dark:border-orange-900/50 bg-card text-card-foreground shadow-sm transition-all hover:shadow-md min-h-[100px]">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 border-2 border-orange-500 bg-background"
      />
      <div className="flex items-center justify-between border-b p-3 bg-orange-50/50 dark:bg-orange-950/20 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-500">
            <SplitSquareHorizontal className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{data.label || 'Router'}</p>
            <p className="text-xs text-muted-foreground mt-1">Condition Branching</p>
          </div>
        </div>
      </div>

      <div className="p-3 py-2 flex flex-col gap-2 relative">
        {routes.map((route: any) => (
          <div key={route.id} className="flex justify-end items-center relative h-6">
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded truncate max-w-[150px] font-mono mr-2" title={route.condition}>
              {route.condition}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={route.id}
              style={{ top: '50%', right: '-6px', transform: 'translateY(-50%)' }}
              className="w-3 h-3 border-2 border-orange-500 bg-background absolute"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
