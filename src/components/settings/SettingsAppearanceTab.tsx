import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useAppStore } from '@/stores';
import { useTheme } from "@/components/theme/ThemeProvider";
import { useTranslation } from "@/hooks/useTranslation";

export function SettingsAppearanceTab() {
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);
  const { setTheme } = useTheme();
  const { t } = useTranslation();

  const [theme, setLocalTheme] = useState(settings.theme);

  useEffect(() => {
    setLocalTheme(settings.theme);
  }, [settings]);

  const handleSave = () => {
    updateSettings({ theme });
    setTheme(theme);
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("Appearance Settings")}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t("Customize the look and feel.")}</p>
      </div>

      <div className="space-y-4 bg-card border rounded-lg p-6 shadow-sm">
        <div className="space-y-2">
          <Label>{t("Theme Preference")}</Label>
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant={theme === 'light' ? "default" : "outline"}
              size="sm"
              onClick={() => setLocalTheme('light')}
            >{t("Light")}</Button>
            <Button
              variant={theme === 'dark' ? "default" : "outline"}
              size="sm"
              onClick={() => setLocalTheme('dark')}
            >{t("Dark")}</Button>
            <Button
              variant={theme === 'system' ? "default" : "outline"}
              size="sm"
              onClick={() => setLocalTheme('system')}
            >{t("System")}</Button>
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button onClick={handleSave}>{t("Save Settings")}</Button>
        </div>
      </div>
    </div>
  );
}
