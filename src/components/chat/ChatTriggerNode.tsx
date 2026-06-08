import { Handle, Position } from '@xyflow/react';
import { Play } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export function ChatTriggerNode({ data }: { data: any }) {
  const { t } = useTranslation();
  return (
    <div className="w-[240px] rounded-xl border bg-card text-card-foreground shadow-sm">
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 border-2 border-emerald-500 bg-popover"
      />
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-500">
            <Play className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{data.label || t('Trigger')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('Manual Execution')}</p>
          </div>
        </div>
      </div>
      <div className="p-3 text-xs text-muted-foreground">
        {t('Initiates the workflow when clicked.')}
      </div>
    </div>
  );
}
