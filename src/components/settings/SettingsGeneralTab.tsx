import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useAppStore } from '@/stores';
import { useTranslation } from "@/hooks/useTranslation";

const FONT_SIZE_PRESETS = [
  { value: 90, label: '90%' },
  { value: 100, label: '100%' },
  { value: 110, label: '110%' },
  { value: 115, label: '115%' },
  { value: 120, label: '120%' },
  { value: 130, label: '130%' },
  { value: 140, label: '140%' },
];

export function SettingsGeneralTab() {
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);
  const debugMode = useAppStore(state => state.debugMode);
  const toggleDebugMode = useAppStore(state => state.toggleDebugMode);
  const { t } = useTranslation();
  const [portValue, setPortValue] = useState(String(settings.remoteAccessPort || 1420));

  useEffect(() => {
    document.documentElement.style.fontSize = `${settings.fontSize ?? 100}%`;
  }, [settings.fontSize]);

  // Auto-title settings helpers
  const autoTitle = settings.autoTitle ?? { enabled: true };
  const enabledProviders = (settings.providers ?? []).filter(p => p.isEnabled);
  const selectedProvider = enabledProviders.find(p => p.id === autoTitle.providerId) ?? enabledProviders[0];
  const availableModels = selectedProvider?.models ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-4 bg-card border rounded-lg p-6 shadow-sm">
        <div className="space-y-2">
          <Label>{t("Language")}</Label>
          <Select value={settings.language} onValueChange={(val) => updateSettings({ language: val })}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('Select Language')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("Font Size")}</Label>
          <div className="flex items-center gap-2 flex-wrap">
            {FONT_SIZE_PRESETS.map(preset => (
              <button
                key={preset.value}
                onClick={() => updateSettings({ fontSize: preset.value })}
                className={`px-3 py-1 rounded-md text-xs transition-colors ${
                  (settings.fontSize ?? 100) === preset.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/70 text-muted-foreground"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 bg-card border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("Allow Remote Access")}</Label>
            <div className="text-sm text-muted-foreground">
              {t('Allow other devices on the LAN to access this app')}
            </div>
          </div>
          <Switch
            checked={settings.allowRemoteAccess}
            onCheckedChange={(checked: boolean) => updateSettings({ allowRemoteAccess: checked })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="remote-access-port">{t('Remote Access Port')}</Label>
          <Input
            id="remote-access-port"
            type="number"
            min={1}
            max={65535}
            value={portValue}
            disabled={!settings.allowRemoteAccess}
            onChange={(e) => setPortValue(e.target.value)}
            onBlur={(e) => {
              const num = Number(e.target.value);
              if (num >= 1 && num <= 65535) updateSettings({ remoteAccessPort: num });
            }}
          />
        </div>
      </div>

      <div className="space-y-4 bg-card border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("Agent Mode")}</Label>
            <div className="text-sm text-muted-foreground">
              {t('Show Agent (Chat) mode in the sidebar mode switcher')}
            </div>
          </div>
          <Switch
            checked={settings.showSidebarAgentMode !== false}
            onCheckedChange={(checked: boolean) => {
              if (!checked && settings.showSidebarWorkflowMode === false) {
                updateSettings({ showSidebarAgentMode: false, showSidebarWorkflowMode: true })
              } else {
                updateSettings({ showSidebarAgentMode: checked })
              }
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("Workflow Mode")}</Label>
            <div className="text-sm text-muted-foreground">
              {t('Show Workflow mode in the sidebar mode switcher')}
            </div>
          </div>
          <Switch
            checked={settings.showSidebarWorkflowMode !== false}
            onCheckedChange={(checked: boolean) => {
              if (!checked && settings.showSidebarAgentMode === false) {
                updateSettings({ showSidebarWorkflowMode: false, showSidebarAgentMode: true })
              } else {
                updateSettings({ showSidebarWorkflowMode: checked })
              }
            }}
          />
        </div>
      </div>

      <div className="space-y-4 bg-card border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("Debug Mode")}</Label>
            <div className="text-sm text-muted-foreground">
              {t('Show interface container ID labels for debugging layout issues')}
            </div>
          </div>
          <Switch
            checked={debugMode}
            onCheckedChange={() => toggleDebugMode()}
          />
        </div>
      </div>

      <div className="space-y-4 bg-card border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("Execution Feedback")}</Label>
            <div className="text-sm text-muted-foreground">
              {t('Screen shake and notification when workflow completes')}
            </div>
          </div>
          <Switch
            checked={settings.executionFeedback !== false}
            onCheckedChange={(checked: boolean) => updateSettings({ executionFeedback: checked })}
          />
        </div>
      </div>

      <div className="space-y-4 bg-card border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("工作流通知")}</Label>
            <div className="text-sm text-muted-foreground">
              {t('工作流完成时显示通知')}
            </div>
          </div>
          <Switch
            checked={settings.workflowNotifications ?? false}
            onCheckedChange={(checked: boolean) => updateSettings({ workflowNotifications: checked })}
          />
        </div>

        {settings.workflowNotifications && (
          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="webhook-url">{t('Webhook URL')}</Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://example.com/webhook"
              value={settings.webhookUrl ?? ''}
              onChange={(e) => updateSettings({ webhookUrl: e.target.value || undefined })}
            />
          </div>
        )}
      </div>

      <div className="space-y-4 bg-card border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("Auto-summarize Topic")}</Label>
            <div className="text-sm text-muted-foreground">
              {t('Automatically generate a title from the first message in a new session')}
            </div>
          </div>
          <Switch
            checked={autoTitle.enabled}
            onCheckedChange={(checked: boolean) =>
              updateSettings({ autoTitle: { ...autoTitle, enabled: checked } })
            }
          />
        </div>

        {autoTitle.enabled && (
          <div className="space-y-3 pt-2 border-t">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('Provider')}</Label>
              <Select
                value={autoTitle.providerId ?? '__active__'}
                onValueChange={val =>
                  updateSettings({
                    autoTitle: {
                      ...autoTitle,
                      providerId: val === '__active__' ? undefined : val,
                      modelId: undefined,
                    },
                  })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={t('Use active provider')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__active__">{t('Use active provider')}</SelectItem>
                  {enabledProviders.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('Model')}</Label>
              <Select
                value={autoTitle.modelId ?? '__default__'}
                onValueChange={val =>
                  updateSettings({
                    autoTitle: {
                      ...autoTitle,
                      modelId: val === '__default__' ? undefined : val,
                    },
                  })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={t('Use default model')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">{t('Use default model')}</SelectItem>
                  {availableModels.map(m => (
                    <SelectItem key={m.id} value={m.modelId}>{m.name || m.modelId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
