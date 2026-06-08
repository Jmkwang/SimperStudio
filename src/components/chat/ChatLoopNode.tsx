import { Handle, Position } from '@xyflow/react';
import { Repeat } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export function ChatLoopNode({ data }: { data: any }) {
  const { t } = useTranslation();
  return (
    <div className="w-[240px] rounded-xl border border-violet-200 dark:border-violet-900/50 bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 border-2 border-violet-500 bg-popover"
      />

      <div className="flex items-center justify-between border-b p-3 bg-violet-50/50 dark:bg-violet-950/20 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-500">
            <Repeat className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{data.label || t('Loop')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('Iteration Control')}</p>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-1">
        <p className="text-xs text-muted-foreground truncate" title={data.itemsPath || 'payload.alivePlayers'}>
          items: {data.itemsPath || 'payload.alivePlayers'}
        </p>
        <p className="text-xs text-muted-foreground">
          aliases: {data.itemAlias || 'item'} / {data.indexAlias || 'index'}
        </p>
        <p className="text-xs text-muted-foreground">max: {data.maxIterations ?? 20}</p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 border-2 border-violet-500 bg-popover"
      />
    </div>
  );
}
