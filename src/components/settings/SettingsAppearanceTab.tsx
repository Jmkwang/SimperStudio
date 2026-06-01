import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAppStore } from '@/stores';
import { useTheme } from "@/components/theme/ThemeProvider";
import { useTranslation } from "@/hooks/useTranslation";

export function SettingsAppearanceTab() {
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);
  const { setTheme } = useTheme();
  const { t } = useTranslation();

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    updateSettings({ theme: newTheme });
    setTheme(newTheme);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("Appearance Settings")}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t("Customize the look and feel.")}</p>
      </div>

      <div className="space-y-4 bg-card border rounded-lg p-6 shadow-sm">
        <div className="space-y-2">
          <Label>{t("Theme Preference")}</Label>
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant={settings.theme === 'light' ? "default" : "outline"}
              size="sm"
              onClick={() => handleThemeChange('light')}
            >{t("Light")}</Button>
            <Button
              variant={settings.theme === 'dark' ? "default" : "outline"}
              size="sm"
              onClick={() => handleThemeChange('dark')}
            >{t("Dark")}</Button>
            <Button
              variant={settings.theme === 'system' ? "default" : "outline"}
              size="sm"
              onClick={() => handleThemeChange('system')}
            >{t("System")}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
