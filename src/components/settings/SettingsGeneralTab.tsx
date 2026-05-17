import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
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

  const [local, setLocal] = useState({
    allowRemoteAccess: settings.allowRemoteAccess,
    remoteAccessPort: settings.remoteAccessPort,
    language: settings.language,
    fontSize: settings.fontSize ?? 100,
  });

  useEffect(() => {
    setLocal({
      allowRemoteAccess: settings.allowRemoteAccess,
      remoteAccessPort: settings.remoteAccessPort,
      language: settings.language,
      fontSize: settings.fontSize ?? 100,
    });
  }, [settings]);

  // Apply font size to document root
  useEffect(() => {
    document.documentElement.style.fontSize = `${local.fontSize}%`;
  }, [local.fontSize]);

  const handleChange = (key: string, value: string | boolean | number) => {
    setLocal(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateSettings({
      allowRemoteAccess: local.allowRemoteAccess,
      remoteAccessPort: Number(local.remoteAccessPort),
      language: local.language,
      fontSize: local.fontSize,
    });
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("General Settings")}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t("Manage your application preferences.")}</p>
      </div>

      <div className="space-y-4 bg-card border rounded-lg p-6 shadow-sm">
        <div className="space-y-2">
          <Label>{t("Language")}</Label>
          <Select value={local.language} onValueChange={(val) => handleChange('language', val)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Language" />
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
                onClick={() => handleChange('fontSize', preset.value)}
                className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                  local.fontSize === preset.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/70 text-muted-foreground"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button onClick={handleSave}>{t("Save Settings")}</Button>
        </div>
      </div>

      <div className="space-y-4 bg-card border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("Allow Remote Access")}</Label>
            <div className="text-sm text-muted-foreground">
              允许局域网内其他设备访问此应用
            </div>
          </div>
          <Switch
            checked={local.allowRemoteAccess}
            onCheckedChange={(checked: boolean) => handleChange('allowRemoteAccess', checked)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="remote-access-port">远程访问端口</Label>
          <Input
            id="remote-access-port"
            type="number"
            min={1}
            max={65535}
            value={local.remoteAccessPort || 1420}
            disabled={!local.allowRemoteAccess}
            onChange={(e) => handleChange('remoteAccessPort', Number(e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-4 bg-card border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("Debug Mode")}</Label>
            <div className="text-sm text-muted-foreground">
              显示界面容器 ID 标签，用于调试布局问题
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
