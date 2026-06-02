import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useTranslation } from '@/hooks/useTranslation';
import { Terminal, Settings2 } from 'lucide-react';
import { useAppStore } from '@/stores';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { NodeBaseConfigSection, applyNodeBaseConfigDraft, createNodeBaseConfigDraft } from '@/components/workflow/NodeBaseConfigSection';
import type { CliToolPreset } from '@/types/models';

const BUILTIN_PRESETS: CliToolPreset[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    executable: 'claude',
    defaultArgs: ['--print', '--output-format', 'json'],
    description: 'Anthropic Claude Code CLI agent',
  },
  {
    id: 'aider',
    name: 'Aider',
    executable: 'aider',
    defaultArgs: ['--no-auto-commits', '--yes-always'],
    description: 'Aider AI pair programming tool',
  },
  {
    id: 'cursor-agent',
    name: 'Cursor Agent',
    executable: 'cursor',
    defaultArgs: ['agent'],
    description: 'Cursor IDE CLI agent mode',
  },
  {
    id: 'custom',
    name: 'Custom',
    executable: '',
    defaultArgs: [],
    description: 'Run any arbitrary CLI command',
  },
];

export function CliAgentNode({ id, data }: { id: string; data: any }) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const settings = useAppStore(state => state.settings);
  const userPresets = settings?.cliTools?.presets || [];

  const allPresets = [...BUILTIN_PRESETS, ...userPresets.filter(up => !BUILTIN_PRESETS.find(bp => bp.id === up.id))];

  const [baseConfig, setBaseConfig] = useState(() => createNodeBaseConfigDraft(data, 'CLI Agent'));
  const [mode, setMode] = useState<'preset' | 'custom'>(data.mode || 'preset');
  const [presetId, setPresetId] = useState(data.presetId || 'claude-code');
  const [executable, setExecutable] = useState(data.executable || '');
  const [args, setArgs] = useState(data.args || '');
  const [workingDir, setWorkingDir] = useState(data.workingDir || '');
  const [inputMode, setInputMode] = useState<'payload' | 'prompt-template' | 'none'>(data.inputMode || 'prompt-template');
  const [promptTemplate, setPromptTemplate] = useState(data.promptTemplate || '');
  const [outputField, setOutputField] = useState(data.outputField || 'cliOutput');
  const [parseJson, setParseJson] = useState(data.parseJson !== false);
  const [captureStderr, setCaptureStderr] = useState(data.captureStderr !== false);
  const [streamToChat, setStreamToChat] = useState(data.streamToChat !== false);
  const [requireConfirmation, setRequireConfirmation] = useState(data.requireConfirmation !== false);
  const [envVars, setEnvVars] = useState(data.envVars || '');
  const [isOpen, setIsOpen] = useState(false);

  const selectedPreset = allPresets.find(p => p.id === presetId);

  const handleSave = () => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...applyNodeBaseConfigDraft(node.data, baseConfig),
              mode,
              presetId: mode === 'preset' ? presetId : undefined,
              executable: mode === 'custom' ? executable : undefined,
              args: mode === 'custom' ? args : undefined,
              workingDir: workingDir || undefined,
              inputMode,
              promptTemplate: inputMode === 'prompt-template' ? promptTemplate : undefined,
              outputField,
              parseJson,
              captureStderr,
              streamToChat,
              requireConfirmation,
              envVars: envVars || undefined,
            },
          };
        }
        return node;
      })
    );
    setIsOpen(false);
  };

  const displayCommand = mode === 'preset'
    ? (selectedPreset?.name || presetId)
    : executable || '(not set)';

  return (
    <div className="w-[260px] rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 border-2 border-amber-500 bg-background"
      />
      <div className="flex items-center justify-between border-b p-3 bg-amber-500/10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md border shadow-sm flex items-center justify-center bg-amber-500/10 text-amber-600">
            <Terminal className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none truncate max-w-[140px]">
              {data.label || 'CLI Agent'}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate max-w-[140px]">
              {displayCommand}
            </p>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button
              className="text-muted-foreground hover:text-foreground transition-colors p-2 min-h-[44px] min-w-[44px] rounded-md hover:bg-muted"
              aria-label="Configure CLI agent node"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('Configure CLI Agent')}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Base config */}
              <NodeBaseConfigSection value={baseConfig} onChange={setBaseConfig} />

              {/* Tool selection */}
              <div className="space-y-2">
                <Label>{t('Tool Mode')}</Label>
                <div className="flex gap-2">
                  <Button
                    variant={mode === 'preset' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMode('preset')}
                  >
                    {t('Preset')}
                  </Button>
                  <Button
                    variant={mode === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMode('custom')}
                  >
                    {t('Custom')}
                  </Button>
                </div>
              </div>

              {mode === 'preset' ? (
                <div className="space-y-2">
                  <Label>{t('Select Preset')}</Label>
                  <Select value={presetId} onValueChange={setPresetId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allPresets.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {p.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPreset && (
                    <p className="text-xs text-muted-foreground">
                      {selectedPreset.executable} {selectedPreset.defaultArgs.join(' ')}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>{t('Executable')}</Label>
                    <Input
                      value={executable}
                      onChange={e => setExecutable(e.target.value)}
                      placeholder="e.g. claude, aider, /usr/local/bin/my-tool"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('Arguments')}</Label>
                    <Input
                      value={args}
                      onChange={e => setArgs(e.target.value)}
                      placeholder='e.g. --print --output-format json'
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('Supports {{variable}} template syntax')}
                    </p>
                  </div>
                </>
              )}

              {/* Input mode */}
              <div className="space-y-2">
                <Label>{t('Input Mode')}</Label>
                <Select value={inputMode} onValueChange={(v: any) => setInputMode(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prompt-template">{t('Prompt Template')}</SelectItem>
                    <SelectItem value="payload">{t('Payload as Stdin')}</SelectItem>
                    <SelectItem value="none">{t('No Input')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {inputMode === 'prompt-template' && (
                <div className="space-y-2">
                  <Label>{t('Prompt Template')}</Label>
                  <Textarea
                    value={promptTemplate}
                    onChange={e => setPromptTemplate(e.target.value)}
                    placeholder='e.g. Review this code: {{payload.code}}'
                    rows={3}
                  />
                </div>
              )}

              {/* Output settings */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>{t('Output Field')}</Label>
                  <Input
                    value={outputField}
                    onChange={e => setOutputField(e.target.value)}
                    placeholder="cliOutput"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('Parse JSON')}</Label>
                  <Switch checked={parseJson} onCheckedChange={setParseJson} />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('Capture Stderr')}</Label>
                  <Switch checked={captureStderr} onCheckedChange={setCaptureStderr} />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('Stream to Chat')}</Label>
                  <Switch checked={streamToChat} onCheckedChange={setStreamToChat} />
                </div>
              </div>

              {/* Environment */}
              <div className="space-y-2">
                <Label>{t('Working Directory')}</Label>
                <Input
                  value={workingDir}
                  onChange={e => setWorkingDir(e.target.value)}
                  placeholder={t('Defaults to app working directory')}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('Environment Variables')}</Label>
                <Textarea
                  value={envVars}
                  onChange={e => setEnvVars(e.target.value)}
                  placeholder='{"KEY": "value"}'
                  rows={2}
                />
              </div>

              {/* Security */}
              <div className="flex items-center justify-between">
                <Label className="text-sm">{t('Require Confirmation')}</Label>
                <Switch checked={requireConfirmation} onCheckedChange={setRequireConfirmation} />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave}>{t('Save')}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Node body */}
      <div className="p-3 text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span className="truncate">{displayCommand}</span>
        </div>
        {workingDir && (
          <p className="truncate pl-3 opacity-70">{workingDir}</p>
        )}
        <p className="pl-3 opacity-70">
          {inputMode === 'prompt-template' ? t('Prompt Template') : inputMode === 'payload' ? t('Payload as Stdin') : t('No Input')}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 border-2 border-amber-500 bg-background"
      />
    </div>
  );
}
