import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import { useState } from 'react';
import { Play } from 'lucide-react';
import { NodeBaseConfigSection, applyNodeBaseConfigDraft, createNodeBaseConfigDraft } from '@/components/workflow/NodeBaseConfigSection';


export function TriggerNode({ id, data }: { id: string, data: any }) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const [baseConfig, setBaseConfig] = useState(() => createNodeBaseConfigDraft(data, 'Trigger'));
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = () => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: applyNodeBaseConfigDraft(node.data, baseConfig),
          };
        }
        return node;
      })
    );
    setIsOpen(false);
  };

  return (
    <div className="w-[200px] rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-500">
          <Play className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">{data.label || 'Trigger'}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("Manual Execution")}</p>
        </div>
      </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors p-2 min-h-[44px] min-w-[44px] rounded-md hover:bg-muted" aria-label="Configure trigger node">
              <Settings2 className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-xl">
            <DialogHeader>
              <DialogTitle>{t("Configure Trigger")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <NodeBaseConfigSection value={baseConfig} onChange={setBaseConfig} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave}>{t("Save Changes")}</Button>
            </div>
          </DialogContent>
        </Dialog>
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