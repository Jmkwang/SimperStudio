import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, Webhook } from 'lucide-react';
import { useState } from 'react';

export function WebhookTriggerNode({ id, data }: { id: string, data: any }) {
  const { setNodes } = useReactFlow();
  const [isOpen, setIsOpen] = useState(false);

  const [localLabel, setLocalLabel] = useState(data.label || 'Webhook Trigger');
  const [method, setMethod] = useState(data.webhookMethod || 'POST');
  const [path, setPath] = useState(data.webhookPath || '/webhook/' + id);
  const [authToken, setAuthToken] = useState(data.authToken || '');

  const handleSave = () => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, label: localLabel, webhookMethod: method, webhookPath: path, authToken } };
        }
        return node;
      })
    );
    setIsOpen(false);
  };

  return (
    <div className="w-[240px] rounded-xl border border-lime-200 dark:border-lime-900/50 bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between border-b p-3 bg-lime-50/50 dark:bg-lime-950/20 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-100 text-lime-600 dark:bg-lime-900/30 dark:text-lime-500">
            <Webhook className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{data.label || 'Webhook Trigger'}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.webhookMethod || 'POST'} {data.webhookPath || '/webhook/...'}</p>
          </div>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors p-2 min-h-[44px] min-w-[44px] rounded-md hover:bg-muted" aria-label="Configure webhook trigger">
              <Settings2 className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-xl">
            <DialogHeader>
              <DialogTitle>Configure Webhook Trigger</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Node Label</Label>
                <Input value={localLabel} onChange={(e) => setLocalLabel(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>HTTP Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Webhook Path</Label>
                <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/webhook/my-hook" className="font-mono text-xs" />
              </div>
              <div className="grid gap-2">
                <Label>Auth Token (optional)</Label>
                <Input value={authToken} onChange={(e) => setAuthToken(e.target.value)} placeholder="Bearer token for auth" className="font-mono text-xs" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="p-3">
        <div className="text-[10px] text-muted-foreground bg-muted/50 p-2 rounded font-mono truncate">
          {data.webhookMethod || 'POST'} {data.webhookPath || '/webhook/...'}
        </div>
        {data.authToken && <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">Auth required</p>}
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 border-2 border-lime-500 bg-background" />
    </div>
  );
}
