import { useState, useCallback } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { Globe, Key, Palette, Terminal } from "lucide-react";
import { DebugBadge } from "@/components/debug/DebugBadge";
import { SettingsGeneralTab } from "./SettingsGeneralTab";
import { SettingsAppearanceTab } from "./SettingsAppearanceTab";
import { SettingsModelsTab } from "./SettingsModelsTab";
import { SettingsCliTab } from "./SettingsCliTab";

export function SettingsView() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'models' | 'cli'>('general');

  const tabs = [
    { id: 'general' as const, label: t('General'), icon: Globe },
    { id: 'appearance' as const, label: t('Appearance'), icon: Palette },
    { id: 'models' as const, label: t('Models'), icon: Key },
    { id: 'cli' as const, label: t('CLI Tools'), icon: Terminal },
  ];

  const handleKeyDown = useCallback((e: React.KeyboardEvent, tabId: typeof tabs[number]['id']) => {
    const tabIds = tabs.map(t => t.id);
    const idx = tabIds.indexOf(tabId);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = tabIds[(idx + 1) % tabIds.length];
      setActiveTab(next);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = tabIds[(idx - 1 + tabIds.length) % tabIds.length];
      setActiveTab(prev);
    }
  }, []);

  return (
    <div className="relative flex-1 overflow-hidden flex h-full">
      <DebugBadge id="SettingsView" />
      {/* Left Tabs */}
      <div className="w-56 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">{t("Settings")}</h2>
          <p className="text-xs text-muted-foreground mt-1">{t("Manage global application settings.")}</p>
        </div>
        <nav className="flex flex-col gap-1 p-2" role="tablist" aria-label={t("Settings Tabs")}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              id={`settings-tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`settings-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Right Content */}
      <div className="flex-1 overflow-auto p-8">
        {activeTab === 'general' && <div role="tabpanel" id="settings-panel-general" aria-labelledby="settings-tab-general"><SettingsGeneralTab /></div>}
        {activeTab === 'appearance' && <div role="tabpanel" id="settings-panel-appearance" aria-labelledby="settings-tab-appearance"><SettingsAppearanceTab /></div>}
        {activeTab === 'models' && <div role="tabpanel" id="settings-panel-models" aria-labelledby="settings-tab-models"><SettingsModelsTab /></div>}
        {activeTab === 'cli' && <div role="tabpanel" id="settings-panel-cli" aria-labelledby="settings-tab-cli"><SettingsCliTab /></div>}
      </div>
    </div>
  );
}
