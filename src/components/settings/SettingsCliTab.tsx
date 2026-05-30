import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppStore } from '@/stores';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
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
];

export function SettingsCliTab() {
  const { t } = useTranslation();
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);

  const cliTools = settings?.cliTools || {};
  const [defaultWorkingDir, setDefaultWorkingDir] = useState(cliTools.defaultWorkingDir || '');
  const [allowedExecutables, setAllowedExecutables] = useState<string[]>(cliTools.allowedExecutables || []);
  const [defaultTimeoutMs, setDefaultTimeoutMs] = useState(String(cliTools.defaultTimeoutMs || 300000));
  const [confirmByDefault, setConfirmByDefault] = useState(cliTools.confirmByDefault !== false);
  const [newExecutable, setNewExecutable] = useState('');

  // Preset path overrides
  const [presetOverrides, setPresetOverrides] = useState<Record<string, string>>(() => {
    const overrides: Record<string, string> = {};
    const userPresets = cliTools.presets || [];
    for (const preset of BUILTIN_PRESETS) {
      const userPreset = userPresets.find(p => p.id === preset.id);
      overrides[preset.id] = userPreset?.executable || preset.executable;
    }
    return overrides;
  });

  const handleSave = () => {
    const timeoutMs = Number(defaultTimeoutMs) || 300000;

    // Build custom presets from overrides
    const customPresets: CliToolPreset[] = BUILTIN_PRESETS.map(preset => {
      const overrideExec = presetOverrides[preset.id];
      if (overrideExec && overrideExec !== preset.executable) {
        return { ...preset, executable: overrideExec };
      }
      return preset;
    }).filter(Boolean);

    updateSettings({
      cliTools: {
        defaultWorkingDir: defaultWorkingDir || undefined,
        allowedExecutables: allowedExecutables.length > 0 ? allowedExecutables : undefined,
        presets: customPresets.length > 0 ? customPresets : undefined,
        confirmByDefault,
        defaultTimeoutMs: timeoutMs,
      },
    });
  };

  const addExecutable = () => {
    const trimmed = newExecutable.trim();
    if (trimmed && !allowedExecutables.includes(trimmed)) {
      setAllowedExecutables([...allowedExecutables, trimmed]);
      setNewExecutable('');
    }
  };

  const removeExecutable = (exe: string) => {
    setAllowedExecutables(allowedExecutables.filter(e => e !== exe));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold">{t('CLI Tools')}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure CLI-based coding agents for use in workflow nodes.
        </p>
      </div>

      {/* Default Working Directory */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('Working Directory')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>{t('Default Working Directory')}</Label>
            <Input
              value={defaultWorkingDir}
              onChange={e => setDefaultWorkingDir(e.target.value)}
              placeholder={t('Defaults to app working directory')}
            />
            <p className="text-xs text-muted-foreground">
              Used as the default working directory for all CLI Agent nodes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('Security')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('Allowed Executables')}</Label>
            <p className="text-xs text-muted-foreground">
              If non-empty, only these executables can be run from CLI Agent nodes. Leave empty to allow all.
            </p>
            <div className="space-y-2">
              {allowedExecutables.map(exe => (
                <div key={exe} className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-muted px-2 py-1 rounded">{exe}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExecutable(exe)}
                    aria-label={`Remove ${exe}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newExecutable}
                onChange={e => setNewExecutable(e.target.value)}
                placeholder="e.g. claude, aider"
                onKeyDown={e => e.key === 'Enter' && addExecutable()}
              />
              <Button variant="outline" size="sm" onClick={addExecutable}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t('Add')}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>{t('Require Confirmation')}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Default behavior for new CLI Agent nodes.
              </p>
            </div>
            <Switch checked={confirmByDefault} onCheckedChange={setConfirmByDefault} />
          </div>

          <div className="space-y-2">
            <Label>{t('Default Timeout')} (ms)</Label>
            <Input
              type="number"
              value={defaultTimeoutMs}
              onChange={e => setDefaultTimeoutMs(e.target.value)}
              placeholder="300000"
            />
            <p className="text-xs text-muted-foreground">
              Default: 300000ms (5 minutes)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preset Paths */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('Preset')} Paths</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Override the default executable paths for built-in CLI tool presets.
          </p>
          {BUILTIN_PRESETS.map(preset => (
            <div key={preset.id} className="space-y-1">
              <Label className="text-xs">{preset.name}</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={presetOverrides[preset.id] || preset.executable}
                  onChange={e => setPresetOverrides(prev => ({ ...prev, [preset.id]: e.target.value }))}
                  placeholder={preset.executable}
                  className="font-mono text-sm"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {preset.defaultArgs.join(' ')}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full">
        {t('Save Settings')}
      </Button>
    </div>
  );
}
