import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings2, Code2 } from 'lucide-react';
import { useState } from 'react';
import { NodeBaseConfigSection, applyNodeBaseConfigDraft, createNodeBaseConfigDraft } from '@/components/workflow/NodeBaseConfigSection';

export function CodeNode({ id, data }: { id: string, data: any }) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  
  const [baseConfig, setBaseConfig] = useState(() => createNodeBaseConfigDraft(data, 'Code Snippet'));
  const [code, setCode] = useState(data.code || 'return payload;');
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = () => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...applyNodeBaseConfigDraft(node.data, baseConfig), code: code },
          };
        }
        return node;
      })
    );
    setIsOpen(false);
  };

  return (
    <div className="w-[240px] rounded-xl border border-blue-200 dark:border-blue-900/50 bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 border-2 border-blue-500 bg-popover"
      />
      <div className="flex items-center justify-between border-b p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-500">
            <Code2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{data.label || 'Code Snippet'}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("JS Execution")}</p>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors p-2 min-h-[44px] min-w-[44px] rounded-md hover:bg-muted" aria-label="Configure code node">
              <Settings2 className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-xl">
            <DialogHeader>
              <DialogTitle>{t("Configure Code Node")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <NodeBaseConfigSection value={baseConfig} onChange={setBaseConfig} />
              
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>{t("JavaScript Code")}</Label>
                </div>
                <div className="bg-muted p-2 rounded-md text-xs font-mono text-muted-foreground mb-1">
                  function execute(payload) {'{'}
                </div>
                <textarea 
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="min-h-[150px] w-full rounded-md border border-input bg-popover px-3 py-2 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  spellCheck="false"
                />
                <div className="bg-muted p-2 rounded-md text-xs font-mono text-muted-foreground mt-1">
                  {'}'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Modify the input `payload` object and return it.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave}>{t("Save Changes")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="p-3">
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded font-mono overflow-hidden text-ellipsis whitespace-nowrap h-8 flex items-center">
          {data.code || 'return payload;'}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 border-2 border-blue-500 bg-popover"
      />
    </div>
  );
}
