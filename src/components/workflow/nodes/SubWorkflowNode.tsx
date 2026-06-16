import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, Workflow } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '@/stores';
import { NodeBaseConfigSection, applyNodeBaseConfigDraft, createNodeBaseConfigDraft } from '@/components/workflow/NodeBaseConfigSection';
import { NodeDeleteButton } from './NodeDeleteButton';

export function SubWorkflowNode({ id, data }: { id: string, data: any }) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const workflows = useAppStore(state => state.workflows);
  const [isOpen, setIsOpen] = useState(false);

  const [baseConfig, setBaseConfig] = useState(() => createNodeBaseConfigDraft(data, 'Sub-workflow'));
  const [subWorkflowId, setSubWorkflowId] = useState(data.subWorkflowId || '');
  const [inputMapping, setInputMapping] = useState(data.inputMapping || '');

  const selectedWorkflow = workflows.find(w => w.id === subWorkflowId);

  const handleSave = () => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...applyNodeBaseConfigDraft(node.data, baseConfig), subWorkflowId, inputMapping } };
        }
        return node;
      })
    );
    setIsOpen(false);
  };

  return (
    <div className="w-[240px] rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-card text-card-foreground shadow-sm transition-all hover:shadow-md group">
      <Handle type="target" position={Position.Left} className="w-5 h-5 border-2 border-indigo-500 bg-popover" />
      <div className="flex items-center justify-between border-b p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-500">
            <Workflow className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{data.label || 'Sub-workflow'}</p>
            <p className="text-xs text-muted-foreground mt-1">{selectedWorkflow?.name || 'Not configured'}</p>
          </div>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-muted-foreground hover:text-foreground transition-colors p-2 min-h-[44px] min-w-[44px] rounded-md hover:bg-muted" aria-label="Configure sub-workflow node">
              <Settings2 className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <NodeDeleteButton
            nodeId={id}
            deleteNode={data.deleteNode}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-destructive hover:text-destructive/80 p-2 min-h-[44px] min-w-[44px] rounded-md hover:bg-destructive/10"
          />
          <DialogContent className="sm:max-w-[500px] rounded-xl">
            <DialogHeader>
              <DialogTitle>{t("Configure Sub-workflow")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <NodeBaseConfigSection value={baseConfig} onChange={setBaseConfig} />
              <div className="grid gap-2">
                <Label>{t("Target Workflow")}</Label>
                <Select value={subWorkflowId || '__none__'} onValueChange={(v) => setSubWorkflowId(v === '__none__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select a workflow" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select a workflow</SelectItem>
                    {workflows.filter(w => w.id !== id).map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Input Mapping (JS expression, return payload for sub-workflow)</Label>
                <Textarea value={inputMapping} onChange={(e) => setInputMapping(e.target.value)} placeholder="return { data: payload.output }" className="font-mono text-xs h-20 resize-none" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave}>{t("Save Changes")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="p-3">
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded font-mono truncate">
          {selectedWorkflow?.name || 'Select workflow...'}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-5 h-5 border-2 border-indigo-500 bg-popover" />
    </div>
  );
}
