import { Handle, Position, useReactFlow, useUpdateNodeInternals } from '@xyflow/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings2, SplitSquareHorizontal, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { NodeBaseConfigSection, applyNodeBaseConfigDraft, createNodeBaseConfigDraft } from '@/components/workflow/NodeBaseConfigSection';

export function RouterNode({ id, data }: { id: string, data: any }) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  
  const [baseConfig, setBaseConfig] = useState(() => createNodeBaseConfigDraft(data, 'Router'));
  // Default to two routes if none provided
  const [routes, setRoutes] = useState<{id: string, condition: string}[]>(
    data.routes || [
      { id: 'route-1', condition: 'payload.value > 50' },
      { id: 'route-2', condition: 'payload.value <= 50' }
    ]
  );
  const [isOpen, setIsOpen] = useState(false);

  // Notify ReactFlow when handles change
  useEffect(() => {
    updateNodeInternals(id);
  }, [routes.length, id, updateNodeInternals]);

  const handleSave = () => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...applyNodeBaseConfigDraft(node.data, baseConfig), routes: routes },
          };
        }
        return node;
      })
    );
    setIsOpen(false);
  };

  const addRoute = () => {
    setRoutes([...routes, { id: `route-${Date.now()}`, condition: 'true' }]);
  };

  const removeRoute = (index: number) => {
    if (routes.length <= 1) return; // Keep at least one route
    const newRoutes = [...routes];
    newRoutes.splice(index, 1);
    setRoutes(newRoutes);
  };

  const updateRoute = (index: number, value: string) => {
    const newRoutes = [...routes];
    newRoutes[index].condition = value;
    setRoutes(newRoutes);
  };

  return (
    <div className="w-[240px] rounded-xl border border-orange-200 dark:border-orange-900/50 bg-card text-card-foreground shadow-sm transition-all hover:shadow-md min-h-[100px]">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 border-2 border-orange-500 bg-popover"
      />
      <div className="flex items-center justify-between border-b p-3 bg-orange-50/50 dark:bg-orange-950/20 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-500">
            <SplitSquareHorizontal className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{data.label || 'Router'}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("Condition Branching")}</p>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors p-2 min-h-[44px] min-w-[44px] rounded-md hover:bg-muted" aria-label="Configure router node">
              <Settings2 className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-xl">
            <DialogHeader>
              <DialogTitle>{t("Configure Router")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <NodeBaseConfigSection value={baseConfig} onChange={setBaseConfig} />
              
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>{t("Routes (JavaScript Conditions)")}</Label>
                  <Button variant="outline" size="sm" onClick={addRoute} className="h-7 px-2 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> {t("Add Route")}
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                  {routes.map((route, idx) => (
                    <div key={route.id} className="flex items-center gap-2">
                      <div className="w-6 text-xs text-muted-foreground text-center">{idx + 1}.</div>
                      <Input 
                        value={route.condition}
                        onChange={(e) => updateRoute(idx, e.target.value)}
                        placeholder="e.g. payload.score > 90"
                        className="font-mono text-xs flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                        onClick={() => removeRoute(idx)}
                        disabled={routes.length <= 1}
                        aria-label="Remove route"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Conditions are evaluated as JS expressions. The first one that evaluates to true will be taken.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave}>{t("Save Changes")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="p-3 py-2 flex flex-col gap-2 relative">
        {/* Render dynamic source handles based on configured routes */}
        {(data.routes || routes).map((route: any) => {

          return (
            <div key={route.id} className="flex justify-end items-center relative h-6">
              <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded truncate max-w-[150px] font-mono mr-2" title={route.condition}>
                {route.condition}
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id={route.id}
                style={{ top: '50%', right: '-6px', transform: 'translateY(-50%)' }}
                className="w-3 h-3 border-2 border-orange-500 bg-popover absolute"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
