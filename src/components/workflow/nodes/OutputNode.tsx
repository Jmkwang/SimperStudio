import { Handle, Position, useNodeConnections, useReactFlow } from '@xyflow/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import { useState } from 'react';
import { FileOutput } from 'lucide-react';


export function OutputNode({ id, data }: { id: string, data: any }) {
  const { setNodes } = useReactFlow();
  const connections = useNodeConnections({ handleType: "target" });
  const [localLabel, setLocalLabel] = useState(data.label || 'Output');
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = () => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...node.data, label: localLabel },
          };
        }
        return node;
      })
    );
    setIsOpen(false);
  };

  
  return (
    <div className="w-[200px] rounded-xl border bg-card text-card-foreground shadow-sm">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={connections.length < 1}
        className="w-3 h-3 border-2 border-slate-500 bg-background"
      />
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          <FileOutput className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">{data.label || 'Output'}</p>
          <p className="text-xs text-muted-foreground mt-1">Final Result</p>
        </div>
      </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted">
              <Settings2 className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-xl">
            <DialogHeader>
              <DialogTitle>Configure Output</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="label">Node Label</Label>
                <Input
                  id="label"
                  value={localLabel}
                  onChange={(e) => setLocalLabel(e.target.value)}
                  placeholder="Output Name"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="p-3 text-xs text-muted-foreground">
        Returns data to the user or system.
      </div>
    </div>
  );
}