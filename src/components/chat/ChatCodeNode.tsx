import { Handle, Position } from '@xyflow/react';
import { Code2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export function ChatCodeNode({ data }: { data: any }) {
  const { t } = useTranslation();
  return (
    <div className="w-[220px] rounded-xl border border-blue-200 dark:border-blue-900/50 bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 border-2 border-blue-500 bg-background"
      />
      <div className="flex items-center justify-between border-b p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-500">
            <Code2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{data.label || t('Code Snippet')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('JS Execution')}</p>
          </div>
        </div>
      </div>
      <div className="p-3">
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded font-mono overflow-hidden text-ellipsis whitespace-nowrap h-8 flex items-center">
          {data.code || 'return payload;'}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 border-2 border-blue-500 bg-background"
      />
    </div>
  );
}
