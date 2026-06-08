import { Label } from "@/components/ui/label";
import { useAppStore } from '@/stores';
import { useTheme } from "@/components/theme/ThemeProvider";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { CheckCircle, Sun, Moon } from "lucide-react";

const ACCENT_COLORS = [
  { name: 'Purple', value: '#7C3AED', tw: 'bg-[#7C3AED]' },
  { name: 'Blue', value: '#3B82F6', tw: 'bg-[#3B82F6]' },
  { name: 'Green', value: '#10B981', tw: 'bg-[#10B981]' },
  { name: 'Orange', value: '#F59E0B', tw: 'bg-[#F59E0B]' },
  { name: 'Red', value: '#EF4444', tw: 'bg-[#EF4444]' },
  { name: 'Pink', value: '#EC4899', tw: 'bg-[#EC4899]' },
];

export function SettingsAppearanceTab() {
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);
  const { setTheme } = useTheme();
  const { t } = useTranslation();

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    updateSettings({ theme: newTheme });
    setTheme(newTheme);
  };

  const currentAccent = settings.accentColor || '#7C3AED';

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <div className="setting-card bg-card border rounded-xl p-6 shadow-soft">
        <Label className="text-sm font-medium mb-4 block">{t("Theme")}</Label>
        <div className="grid grid-cols-2 gap-3">
          {/* Light Preview */}
          <button
            onClick={() => handleThemeChange('light')}
            className={cn(
              "relative rounded-xl border-2 p-4 text-left transition-all duration-200",
              settings.theme === 'light'
                ? "border-primary shadow-[0_0_0_3px_hsl(var(--primary)_/_0.1)]"
                : "border-border hover:border-muted-foreground/30"
            )}
          >
            <div className="h-24 rounded-lg bg-[#FAFAF8] border border-gray-200 shadow-sm mb-3 relative overflow-hidden">
              <div className="absolute top-2 left-2 right-2 h-3 rounded-md bg-gray-100" />
              <div className="absolute top-6 left-2 w-16 h-2 rounded-md bg-gray-100" />
              <div className="absolute top-10 left-2 right-2 h-8 rounded-md bg-white border border-gray-100 shadow-sm" />
              <div className="absolute bottom-2 right-2 h-6 w-6 rounded-full bg-[#7C3AED]/20 flex items-center justify-center">
                <Sun className="h-3 w-3 text-[#7C3AED]" />
              </div>
            </div>
            <div className="font-medium text-sm">{t("Light")}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{t("Clean & minimal")}</div>
            {settings.theme === 'light' && (
              <CheckCircle className="absolute top-3 right-3 h-5 w-5 text-primary" />
            )}
          </button>

          {/* Dark Preview */}
          <button
            onClick={() => handleThemeChange('dark')}
            className={cn(
              "relative rounded-xl border-2 p-4 text-left transition-all duration-200",
              settings.theme === 'dark'
                ? "border-primary shadow-[0_0_0_3px_hsl(var(--primary)_/_0.1)]"
                : "border-border hover:border-muted-foreground/30"
            )}
          >
            <div className="h-24 rounded-lg bg-[#0f0f11] border border-white/10 shadow-sm mb-3 relative overflow-hidden">
              <div className="absolute top-2 left-2 right-2 h-3 rounded-md bg-white/5" />
              <div className="absolute top-6 left-2 w-16 h-2 rounded-md bg-white/5" />
              <div className="absolute top-10 left-2 right-2 h-8 rounded-md bg-[#1a1a1c] border border-white/5 shadow-sm" />
              <div className="absolute bottom-2 right-2 h-6 w-6 rounded-full bg-[#7C3AED]/20 flex items-center justify-center">
                <Moon className="h-3 w-3 text-[#7C3AED]" />
              </div>
            </div>
            <div className="font-medium text-sm">{t("Dark")}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{t("Easy on the eyes")}</div>
            {settings.theme === 'dark' && (
              <CheckCircle className="absolute top-3 right-3 h-5 w-5 text-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Accent Color */}
      <div className="setting-card bg-card border rounded-xl p-6 shadow-soft">
        <Label className="text-sm font-medium mb-4 block">{t("Accent Color")}</Label>
        <div className="flex items-center gap-3">
          {ACCENT_COLORS.map(color => (
            <button
              key={color.value}
              onClick={() => updateSettings({ accentColor: color.value })}
              className={cn(
                "h-10 w-10 rounded-full transition-all duration-200 flex items-center justify-center",
                color.tw,
                currentAccent === color.value
                  ? "ring-2 ring-offset-2 ring-primary scale-110 shadow-glow-sm"
                  : "hover:scale-105"
              )}
              title={color.name}
            >
              {currentAccent === color.value && (
                <CheckCircle className="h-5 w-5 text-white" />
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {t("Choose your preferred accent color for buttons, indicators, and highlights throughout the app.")}
        </p>
      </div>
    </div>
  );
}
