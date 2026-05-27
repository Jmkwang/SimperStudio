import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, Merge } from 'lucide-react';
import { useState } from 'react';
import { NodeBaseConfigSection, applyNodeBaseConfigDraft, createNodeBaseConfigDraft } from '@/components/workflow/NodeBaseConfigSection';

export function MergeNode({ id, data }: { id: string, data: any }) {
  const { setNodes } = useReactFlow();
  const [isOpen, setIsOpen] = useState(false);

  const [baseConfig, setBaseConfig] = useState(() => createNodeBaseConfigDraft(data, 'Merge'));
  const [strategy, setStrategy] = useState(data.strategy || 'append');
  const [mergeKey, setMergeKey] = useState(data.mergeKey || 'id');

  const handleSave = () => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...applyNodeBaseConfigDraft(node.data, baseConfig), strategy, mergeKey } };
        }
        return node;
      })
    );
    setIsOpen(false);
  };

  return (
    <div className="w-[220px] rounded-xl border border-pink-200 dark:border-pink-900/50 bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
      <Handle type="target" position={Position.Left} id="input-1" style={{ top: '35%' }} className="w-3 h-3 border-2 border-pink-500 bg-background" />
      <Handle type="target" position={Position.Left} id="input-2" style={{ top: '65%' }} className="w-3 h-3 border-2 border-pink-500 bg-background" />
      <div className="flex items-center justify-between border-b p-3 bg-pink-50/50 dark:bg-pink-950/20 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-500">
            <Merge className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{data.label || 'Merge'}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.strategy === 'byKey' ? `by ${data.mergeKey || 'id'}` : data.strategy || 'append'}</p>
          </div>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors p-2 min-h-[44px] min-w-[44px] rounded-md hover:bg-muted" aria-label="Configure merge node">
              <Settings2 className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-xl">
            <DialogHeader>
              <DialogTitle>Configure Merge</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <NodeBaseConfigSection value={baseConfig} onChange={setBaseConfig} />
              <div className="grid gap-2">
                <Label>Merge Strategy</Label>
                <Select value={strategy} onValueChange={setStrategy}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="append">Append (concat arrays)</SelectItem>
                    <SelectItem value="byKey">Merge by Key</SelectItem>
                    <SelectItem value="waitForAll">Wait for All (combine objects)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {strategy === 'byKey' && (
                <div className="grid gap-2">
                  <Label>Merge Key</Label>
                  <Input value={mergeKey} onChange={(e) => setMergeKey(e.target.value)} placeholder="id" className="font-mono text-xs" />
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
          {strategy === 'byKey' ? `merge by "${mergeKey}"` : strategy}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 border-2 border-pink-500 bg-background" />
    </div>
  );
}
