import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { Globe, Key, Server } from "lucide-react";
import { DebugBadge } from "@/components/debug/DebugBadge";
import { SettingsGeneralTab } from "./SettingsGeneralTab";
import { SettingsAppearanceTab } from "./SettingsAppearanceTab";
import { SettingsModelsTab } from "./SettingsModelsTab";

export function SettingsView() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'models'>('models');

  const tabs = [
    { id: 'general' as const, label: t('General'), icon: Globe },
    { id: 'appearance' as const, label: t('Appearance'), icon: Server },
    { id: 'models' as const, label: t('Models'), icon: Key },
  ];

  return (
    <div className="relative flex-1 overflow-hidden flex h-full">
      <DebugBadge id="SettingsView" />
      {/* Left Tabs */}
      <div className="w-56 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">{t("Settings")}</h2>
          <p className="text-xs text-muted-foreground mt-1">{t("Manage global application settings.")}</p>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
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
        {activeTab === 'general' && <SettingsGeneralTab />}
        {activeTab === 'appearance' && <SettingsAppearanceTab />}
        {activeTab === 'models' && <SettingsModelsTab />}
      </div>
    </div>
  );
}
