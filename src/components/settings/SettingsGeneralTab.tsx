import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { useTranslation } from "@/hooks/useTranslation";

export function SettingsGeneralTab() {
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);
  const { t } = useTranslation();

  const [local, setLocal] = useState({
    allowRemoteAccess: settings.allowRemoteAccess,
    remoteAccessPort: settings.remoteAccessPort,
    language: settings.language,
  });

  useEffect(() => {
    setLocal({
      allowRemoteAccess: settings.allowRemoteAccess,
      remoteAccessPort: settings.remoteAccessPort,
      language: settings.language,
    });
  }, [settings]);

  const handleChange = (key: string, value: string | boolean | number) => {
    setLocal(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateSettings({
      allowRemoteAccess: local.allowRemoteAccess,
      remoteAccessPort: Number(local.remoteAccessPort),
      language: local.language,
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
    </div>
  );
}
