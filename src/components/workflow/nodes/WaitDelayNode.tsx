import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, Timer } from 'lucide-react';
import { useState } from 'react';
import { NodeBaseConfigSection, applyNodeBaseConfigDraft, createNodeBaseConfigDraft } from '@/components/workflow/NodeBaseConfigSection';

export function WaitDelayNode({ id, data }: { id: string, data: any }) {
  const { setNodes } = useReactFlow();
  const [isOpen, setIsOpen] = useState(false);

  const [baseConfig, setBaseConfig] = useState(() => createNodeBaseConfigDraft(data, 'Wait / Delay'));
  const [mode, setMode] = useState<'fixed' | 'until'>(data.waitMode || 'fixed');
  const [delayMs, setDelayMs] = useState(data.delayMs ?? 1000);
  const [untilExpression, setUntilExpression] = useState(data.untilExpression || '');

  const handleSave = () => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...applyNodeBaseConfigDraft(node.data, baseConfig), waitMode: mode, delayMs, untilExpression },
          };
        }
        return node;
      })
    );
    setIsOpen(false);
  };

  return (
    <div className="w-[220px] rounded-xl border border-violet-200 dark:border-violet-900/50 bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
      <Handle type="target" position={Position.Left} className="w-3 h-3 border-2 border-violet-500 bg-background" />
      <div className="flex items-center justify-between border-b p-3 bg-violet-50/50 dark:bg-violet-950/20 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-500">
            <Timer className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{data.label || 'Wait / Delay'}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.waitMode === 'until' ? 'Until condition' : `${data.delayMs ?? 1000}ms`}</p>
          </div>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors p-2 min-h-[44px] min-w-[44px] rounded-md hover:bg-muted" aria-label="Configure wait node">
              <Settings2 className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-xl">
            <DialogHeader>
              <DialogTitle>Configure Wait / Delay</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <NodeBaseConfigSection value={baseConfig} onChange={setBaseConfig} />
              <div className="grid gap-2">
                <Label>Wait Mode</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as 'fixed' | 'until')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Delay</SelectItem>
                    <SelectItem value="until">Until Condition</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {mode === 'fixed' ? (
                <div className="grid gap-2">
                  <Label>Delay (ms)</Label>
                  <Input type="number" value={delayMs} onChange={(e) => setDelayMs(Number(e.target.value))} />
                  <p className="text-xs text-muted-foreground">{delayMs >= 1000 ? `${(delayMs / 1000).toFixed(1)}s` : `${delayMs}ms`}</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>Until Expression (JS, truthy to continue)</Label>
                  <Input value={untilExpression} onChange={(e) => setUntilExpression(e.target.value)} placeholder="payload.ready === true" className="font-mono text-xs" />
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="p-3">
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded font-mono truncate">
          {mode === 'until' ? (untilExpression || 'Not configured') : `sleep ${delayMs}ms`}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 border-2 border-violet-500 bg-background" />
    </div>
  );
}
