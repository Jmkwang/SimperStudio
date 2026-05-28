import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, Globe } from 'lucide-react';
import { useState } from 'react';
import { NodeBaseConfigSection, applyNodeBaseConfigDraft, createNodeBaseConfigDraft } from '@/components/workflow/NodeBaseConfigSection';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export function HttpRequestNode({ id, data }: { id: string, data: any }) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const [isOpen, setIsOpen] = useState(false);

  const [baseConfig, setBaseConfig] = useState(() => createNodeBaseConfigDraft(data, 'HTTP Request'));
  const [method, setMethod] = useState(data.method || 'GET');
  const [url, setUrl] = useState(data.url || '');
  const [headers, setHeaders] = useState(data.headers || '');
  const [body, setBody] = useState(data.body || '');

  const handleSave = () => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...applyNodeBaseConfigDraft(node.data, baseConfig), method, url, headers, body },
          };
        }
        return node;
      })
    );
    setIsOpen(false);
  };

  return (
    <div className="w-[240px] rounded-xl border border-cyan-200 dark:border-cyan-900/50 bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
      <Handle type="target" position={Position.Left} className="w-3 h-3 border-2 border-cyan-500 bg-background" />
      <div className="flex items-center justify-between border-b p-3 bg-cyan-50/50 dark:bg-cyan-950/20 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-500">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{data.label || 'HTTP Request'}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.method || 'GET'} {data.url ? new URL(data.url.replace(/\{\{.*?\}\}/g, 'https://x')).hostname : '...'}</p>
          </div>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors p-2 min-h-[44px] min-w-[44px] rounded-md hover:bg-muted" aria-label="Configure HTTP node">
              <Settings2 className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-xl">
            <DialogHeader>
              <DialogTitle>{t("Configure HTTP Request")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <NodeBaseConfigSection value={baseConfig} onChange={setBaseConfig} />
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <Label>Method</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label>URL</Label>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com/data" className="font-mono text-xs" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Headers (JSON)</Label>
                <Textarea value={headers} onChange={(e) => setHeaders(e.target.value)} placeholder='{"Authorization": "Bearer {{payload.token}}"}' className="font-mono text-xs h-16 resize-none" />
              </div>
              {method !== 'GET' && (
                <div className="grid gap-2">
                  <Label>Body (JSON)</Label>
                  <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder='{"key": "value"}' className="font-mono text-xs h-20 resize-none" />
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave}>{t("Save Changes")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="p-3">
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded font-mono truncate">
          {data.method || 'GET'} {data.url || 'Not configured'}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 border-2 border-cyan-500 bg-background" />
    </div>
  );
}
