import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useTranslation } from "@/hooks/useTranslation";

export function SettingsView() {
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);
  const { setTheme } = useTheme();
  const { t } = useTranslation();

  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (key: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateSettings(localSettings);
    setTheme(localSettings.theme as any);
    // Optional: Add a toast notification here
    console.log("Settings saved:", localSettings);
  };

  return (
    <div className="flex-1 overflow-auto p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">{t("Settings")}</h2>
        <p className="text-muted-foreground mt-2">
          Manage your application preferences and configurations.
        </p>
      </div>

      <div className="space-y-8">
        <section className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">{t("General")}</h3>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="theme">{t("Theme Preference")}</Label>
              <div className="text-sm text-muted-foreground mb-2">Select your preferred color theme.</div>
              {/* Theme toggle is in sidebar, this could be a select later */}
              <div className="flex items-center gap-2">
                <Button
                  variant={localSettings.theme === 'light' ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleChange('theme', 'light')}
                >{t("Light")}</Button>
                <Button
                  variant={localSettings.theme === 'dark' ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleChange('theme', 'dark')}
                >{t("Dark")}</Button>
                <Button
                  variant={localSettings.theme === 'system' ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleChange('theme', 'system')}
                >{t("System")}</Button>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label>{t("Language")}</Label>
              <div className="text-sm text-muted-foreground mb-2">Select application language.</div>
              <Select value={localSettings.language} onValueChange={(val) => handleChange('language', val)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="zh">Chinese (中文)</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">{t("Model Settings")}</h3>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>{t("API Provider")}</Label>
              <Select value={localSettings.apiProvider} onValueChange={(val) => handleChange('apiProvider', val)}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Select Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="custom">Custom API</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {localSettings.apiProvider === 'openai' && (
              <div className="space-y-2">
                <Label htmlFor="openai-key">OpenAI API Key</Label>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  value={localSettings.openaiKey}
                  onChange={(e) => handleChange('openaiKey', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Used for GPT models.</p>
              </div>
            )}

            {localSettings.apiProvider === 'anthropic' && (
              <div className="space-y-2">
                <Label htmlFor="anthropic-key">Anthropic API Key</Label>
                <Input
                  id="anthropic-key"
                  type="password"
                  placeholder="sk-ant-..."
                  value={localSettings.anthropicKey}
                  onChange={(e) => handleChange('anthropicKey', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Used for Claude models.</p>
              </div>
            )}

            {localSettings.apiProvider === 'custom' && (
              <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                <div className="space-y-2">
                  <Label htmlFor="custom-protocol">{t("Protocol")}</Label>
                  <Select value={localSettings.customProtocol} onValueChange={(val) => handleChange('customProtocol', val)}>
                    <SelectTrigger id="custom-protocol">
                      <SelectValue placeholder="Select Protocol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai-compatible">{t("OpenAI Compatible")}</SelectItem>
                      <SelectItem value="ollama">Ollama</SelectItem>
                      <SelectItem value="lmstudio">LM Studio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-base-url">{t("Base URL")}</Label>
                  <Input
                    id="custom-base-url"
                    placeholder="https://api.yourdomain.com/v1"
                    value={localSettings.customBaseUrl}
                    onChange={(e) => handleChange('customBaseUrl', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-model-id">{t("Model ID")}</Label>
                  <Input
                    id="custom-model-id"
                    placeholder="e.g. meta-llama/Llama-3-8b-instruct"
                    value={localSettings.customModelId}
                    onChange={(e) => handleChange('customModelId', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-api-key">API Key (Optional)</Label>
                  <Input
                    id="custom-api-key"
                    type="password"
                    placeholder="If required by your endpoint"
                    value={localSettings.customApiKey}
                    onChange={(e) => handleChange('customApiKey', e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button onClick={handleSave}>{t("Save Settings")}</Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
