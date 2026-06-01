import { DebugBadge } from "@/components/debug/DebugBadge";
import { useAppStore } from "@/stores";
import { useTranslation } from "@/hooks/useTranslation";
import { Globe, Palette, Key, Terminal } from "lucide-react";
import { SettingsGeneralTab } from "./SettingsGeneralTab";
import { SettingsAppearanceTab } from "./SettingsAppearanceTab";
import { SettingsModelsTab } from "./SettingsModelsTab";
import { SettingsCliTab } from "./SettingsCliTab";

const TAB_META = {
  general: { icon: Globe, labelKey: 'General', descKey: 'Manage your application preferences.' },
  appearance: { icon: Palette, labelKey: 'Appearance', descKey: 'Customize the look and feel.' },
  models: { icon: Key, labelKey: 'Models', descKey: 'Manage model providers and API keys.' },
  cli: { icon: Terminal, labelKey: 'CLI Tools', descKey: 'Configure CLI-based coding agents.' },
} as const;

export function SettingsView() {
  const { t } = useTranslation();
  const activeTab = useAppStore(s => s.settingsActiveTab);
  const meta = TAB_META[activeTab];
  const Icon = meta.icon;

  return (
    <div className="relative flex-1 overflow-auto h-full">
      <DebugBadge id="SettingsView" />
      <div className="border-b px-8 py-5 flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold">{t(meta.labelKey)}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t(meta.descKey)}</p>
        </div>
      </div>
      <div className="p-8">
        {activeTab === 'general' && <SettingsGeneralTab />}
        {activeTab === 'appearance' && <SettingsAppearanceTab />}
        {activeTab === 'models' && <SettingsModelsTab />}
        {activeTab === 'cli' && <SettingsCliTab />}
      </div>
    </div>
  );
}
