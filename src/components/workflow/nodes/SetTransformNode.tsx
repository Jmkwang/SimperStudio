import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Settings2, Shuffle, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { NodeBaseConfigSection, applyNodeBaseConfigDraft, createNodeBaseConfigDraft } from '@/components/workflow/NodeBaseConfigSection';

interface FieldMapping {
  sourcePath: string;
  targetPath: string;
}

export function SetTransformNode({ id, data }: { id: string, data: any }) {
  const { setNodes } = useReactFlow();
  const [isOpen, setIsOpen] = useState(false);

  const [baseConfig, setBaseConfig] = useState(() => createNodeBaseConfigDraft(data, 'Set / Transform'));
  const [mappings, setMappings] = useState<FieldMapping[]>(
    data.mappings || [{ sourcePath: 'payload.llmResult', targetPath: 'output' }]
  );
  const [constants, setConstants] = useState(data.constants || '');
  const [whitelist, setWhitelist] = useState(data.whitelist || '');

  const handleSave = () => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...applyNodeBaseConfigDraft(node.data, baseConfig), mappings, constants, whitelist },
          };
        }
        return node;
      })
    );
    setIsOpen(false);
  };

  const addMapping = () => setMappings([...mappings, { sourcePath: '', targetPath: '' }]);
  const removeMapping = (i: number) => { if (mappings.length > 1) setMappings(mappings.filter((_, idx) => idx !== i)); };
  const updateMapping = (i: number, key: keyof FieldMapping, val: string) => {
    const next = [...mappings]; next[i] = { ...next[i], [key]: val }; setMappings(next);
  };

  return (
    <div className="w-[240px] rounded-xl border border-teal-200 dark:border-teal-900/50 bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
      <Handle type="target" position={Position.Left} className="w-3 h-3 border-2 border-teal-500 bg-background" />
      <div className="flex items-center justify-between border-b p-3 bg-teal-50/50 dark:bg-teal-950/20 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-500">
            <Shuffle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{data.label || 'Set / Transform'}</p>
            <p className="text-xs text-muted-foreground mt-1">{(data.mappings || []).length} mapping(s)</p>
          </div>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors p-2 min-h-[44px] min-w-[44px] rounded-md hover:bg-muted" aria-label="Configure transform node">
              <Settings2 className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-xl">
            <DialogHeader>
              <DialogTitle>Configure Set / Transform</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <NodeBaseConfigSection value={baseConfig} onChange={setBaseConfig} />
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Field Mappings</Label>
                  <Button variant="outline" size="sm" onClick={addMapping} className="h-7 px-2 text-xs"><Plus className="h-3 w-3 mr-1" />Add</Button>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                  {mappings.map((m, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input value={m.sourcePath} onChange={(e) => updateMapping(i, 'sourcePath', e.target.value)} placeholder="payload.src" className="font-mono text-xs flex-1" />
                      <span className="text-muted-foreground text-xs">→</span>
                      <Input value={m.targetPath} onChange={(e) => updateMapping(i, 'targetPath', e.target.value)} placeholder="output.field" className="font-mono text-xs flex-1" />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeMapping(i)} disabled={mappings.length <= 1}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Constants (JSON, merged into output)</Label>
                <Textarea value={constants} onChange={(e) => setConstants(e.target.value)} placeholder='{"version": 1}' className="font-mono text-xs h-16 resize-none" />
              </div>
              <div className="grid gap-2">
                <Label>Output Whitelist (comma-separated paths)</Label>
                <Input value={whitelist} onChange={(e) => setWhitelist(e.target.value)} placeholder="output.name, output.score" className="font-mono text-xs" />
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
          {(data.mappings || []).map((m: FieldMapping) => `${m.sourcePath} → ${m.targetPath}`).join(', ') || 'No mappings'}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 border-2 border-teal-500 bg-background" />
    </div>
  );
}
