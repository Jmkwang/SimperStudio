import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect } from "react";
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

  useEffect(() => {
    document.documentElement.style.fontSize = `${settings.fontSize ?? 100}%`;
  }, [settings.fontSize]);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("General Settings")}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t("Manage your application preferences.")}</p>
      </div>

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
            value={settings.remoteAccessPort || 1420}
            disabled={!settings.allowRemoteAccess}
            onBlur={(e) => updateSettings({ remoteAccessPort: Number(e.target.value) })}
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
    </div>
  );
}
