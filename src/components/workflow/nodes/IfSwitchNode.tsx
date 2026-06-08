import { Handle, Position, useReactFlow, useUpdateNodeInternals } from '@xyflow/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings2, GitBranch, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { NodeBaseConfigSection, applyNodeBaseConfigDraft, createNodeBaseConfigDraft } from '@/components/workflow/NodeBaseConfigSection';

export function IfSwitchNode({ id, data }: { id: string, data: any }) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const [isOpen, setIsOpen] = useState(false);

  const [baseConfig, setBaseConfig] = useState(() => createNodeBaseConfigDraft(data, 'IF / Switch'));
  const [branches, setBranches] = useState<{ id: string; label: string; condition: string }[]>(
    data.branches || [
      { id: 'true', label: 'True', condition: 'payload.value > 0' },
      { id: 'false', label: 'False', condition: 'true' },
    ]
  );

  useEffect(() => { updateNodeInternals(id); }, [branches.length, id, updateNodeInternals]);

  const handleSave = () => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...applyNodeBaseConfigDraft(node.data, baseConfig), branches } };
        }
        return node;
      })
    );
    setIsOpen(false);
  };

  const addBranch = () => setBranches([...branches, { id: `branch-${Date.now()}`, label: `Branch ${branches.length + 1}`, condition: 'true' }]);
  const removeBranch = (i: number) => { if (branches.length > 1) setBranches(branches.filter((_, idx) => idx !== i)); };
  const updateBranch = (i: number, key: string, val: string) => {
    const next = [...branches]; next[i] = { ...next[i], [key]: val }; setBranches(next);
  };

  return (
    <div className="w-[240px] rounded-xl border border-amber-200 dark:border-amber-900/50 bg-card text-card-foreground shadow-sm transition-all hover:shadow-md min-h-[100px]">
      <Handle type="target" position={Position.Left} className="w-3 h-3 border-2 border-amber-500 bg-popover" />
      <div className="flex items-center justify-between border-b p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500">
            <GitBranch className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{data.label || 'IF / Switch'}</p>
            <p className="text-xs text-muted-foreground mt-1">{branches.length} branch(es)</p>
          </div>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors p-2 min-h-[44px] min-w-[44px] rounded-md hover:bg-muted" aria-label="Configure IF/Switch node">
              <Settings2 className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-xl">
            <DialogHeader>
              <DialogTitle>{t("Configure IF / Switch")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <NodeBaseConfigSection value={baseConfig} onChange={setBaseConfig} />
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Branches (first match wins)</Label>
                  <Button variant="outline" size="sm" onClick={addBranch} className="h-7 px-2 text-xs"><Plus className="h-3 w-3 mr-1" />{t("Add")}</Button>
                </div>
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                  {branches.map((b, i) => (
                    <div key={b.id} className="grid gap-1 border rounded-md p-2">
                      <div className="flex items-center gap-2">
                        <Input value={b.label} onChange={(e) => updateBranch(i, 'label', e.target.value)} placeholder="Label" className="text-xs flex-1" />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeBranch(i)} disabled={branches.length <= 1} aria-label="Remove branch"><Trash2 className="h-3 w-3" /></Button>
                      </div>
                      <Input value={b.condition} onChange={(e) => updateBranch(i, 'condition', e.target.value)} placeholder="payload.score > 90" className="font-mono text-xs" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave}>{t("Save Changes")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="p-3 py-2 flex flex-col gap-2 relative">
        {(data.branches || branches).map((b: any) => (
          <div key={b.id} className="flex justify-end items-center relative h-6">
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded truncate max-w-[150px] font-mono mr-2" title={b.condition}>{b.label}</span>
            <Handle type="source" position={Position.Right} id={b.id} style={{ top: '50%', right: '-6px', transform: 'translateY(-50%)' }} className="w-3 h-3 border-2 border-amber-500 bg-popover absolute" />
          </div>
        ))}
      </div>
    </div>
  );
}
