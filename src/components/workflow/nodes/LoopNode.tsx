import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Repeat, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { NodeBaseConfigSection, applyNodeBaseConfigDraft, createNodeBaseConfigDraft } from '@/components/workflow/NodeBaseConfigSection';

export function LoopNode({ id, data }: { id: string, data: any }) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();

  const [baseConfig, setBaseConfig] = useState(() => createNodeBaseConfigDraft(data, 'Loop'));
  const [itemsPath, setItemsPath] = useState(data.itemsPath || 'payload.alivePlayers');
  const [itemAlias, setItemAlias] = useState(data.itemAlias || 'item');
  const [indexAlias, setIndexAlias] = useState(data.indexAlias || 'index');
  const [maxIterations, setMaxIterations] = useState(String(data.maxIterations ?? 20));
  const [breakCondition, setBreakCondition] = useState(data.breakCondition || '');
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = () => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...applyNodeBaseConfigDraft(node.data, baseConfig),
              itemsPath,
              itemAlias,
              indexAlias,
              maxIterations: Number(maxIterations) > 0 ? Number(maxIterations) : 20,
              breakCondition,
            },
          };
        }
        return node;
      })
    );
    setIsOpen(false);
  };

  return (
    <div className="w-[240px] rounded-xl border border-violet-200 dark:border-violet-900/50 bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 border-2 border-violet-500 bg-background"
      />

      <div className="flex items-center justify-between border-b p-3 bg-violet-50/50 dark:bg-violet-950/20 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-500">
            <Repeat className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{data.label || 'Loop'}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("Iteration Control")}</p>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors p-2 min-h-[44px] min-w-[44px] rounded-md hover:bg-muted" aria-label="Configure loop node">
              <Settings2 className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px] rounded-xl">
            <DialogHeader>
              <DialogTitle>{t("Configure Loop Node")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <NodeBaseConfigSection value={baseConfig} onChange={setBaseConfig} />

              <div className="grid gap-2">
                <Label htmlFor="items-path">{t("Items Path")}</Label>
                <Input
                  id="items-path"
                  value={itemsPath}
                  onChange={(e) => setItemsPath(e.target.value)}
                  placeholder="payload.alivePlayers"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="item-alias">{t("Item Alias")}</Label>
                  <Input
                    id="item-alias"
                    value={itemAlias}
                    onChange={(e) => setItemAlias(e.target.value)}
                    placeholder="item"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="index-alias">{t("Index Alias")}</Label>
                  <Input
                    id="index-alias"
                    value={indexAlias}
                    onChange={(e) => setIndexAlias(e.target.value)}
                    placeholder="index"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="max-iterations">{t("Max Iterations")}</Label>
                <Input
                  id="max-iterations"
                  type="number"
                  min={1}
                  value={maxIterations}
                  onChange={(e) => setMaxIterations(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="break-condition">Break Condition (optional)</Label>
                <Input
                  id="break-condition"
                  value={breakCondition}
                  onChange={(e) => setBreakCondition(e.target.value)}
                  placeholder="payload.shouldStop === true"
                />
                <p className="text-xs text-muted-foreground">
                  JavaScript expression. When true, loop exits early.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave}>{t("Save Changes")}</Button>
            </div>
          </DialogContent>
        </Dialog>
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
        className="w-3 h-3 border-2 border-violet-500 bg-background"
      />
    </div>
  );
}
