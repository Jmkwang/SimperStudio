import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
  const [editedXmlPreview, setEditedXmlPreview] = useState<string | null>(null);

  useEffect(() => {
    setLocalSettings(settings);
    setEditedXmlPreview(null);
  }, [settings]);

  // Reset edited preview when provider changes
  useEffect(() => {
    setEditedXmlPreview(null);
  }, [localSettings.apiProvider, localSettings.customProtocol]);

  const handleChange = (key: keyof typeof settings | string, value: string | boolean) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const generateXmlPreview = () => {
    if (localSettings.apiProvider === 'openai') {
      return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <url>https://api.openai.com/v1/chat/completions</url>
  <method>POST</method>
  <headers>
    <header name="Content-Type">application/json</header>
    <header name="Authorization">Bearer ${localSettings.openaiKey ? '***' : ''}</header>
  </headers>
  <body>
    <model>${(localSettings as any).openaiModelId || 'gpt-4o'}</model>
    <messages>
      <message role="user">...</message>
    </messages>
  </body>
</request>`;
    } else if (localSettings.apiProvider === 'anthropic') {
      return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <url>https://api.anthropic.com/v1/messages</url>
  <method>POST</method>
  <headers>
    <header name="Content-Type">application/json</header>
    <header name="x-api-key">${localSettings.anthropicKey ? '***' : ''}</header>
    <header name="anthropic-version">2023-06-01</header>
  </headers>
  <body>
    <model>${(localSettings as any).anthropicModelId || 'claude-3-5-sonnet-20240620'}</model>
    <messages>
      <message role="user">...</message>
    </messages>
  </body>
</request>`;
    } else if (localSettings.apiProvider === 'gemini') {
      return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <url>https://generativelanguage.googleapis.com/v1beta/models/${(localSettings as any).geminiModelId || 'gemini-1.5-pro-latest'}:generateContent?key=${localSettings.geminiKey ? '***' : ''}</url>
  <method>POST</method>
  <headers>
    <header name="Content-Type">application/json</header>
  </headers>
  <body>
    <contents>
      <parts>
        <text>...</text>
      </parts>
    </contents>
  </body>
</request>`;
    } else if (localSettings.apiProvider === 'custom') {
      if (localSettings.customProtocol === 'openai-response' || localSettings.customProtocol === 'openai-compatible' || localSettings.customProtocol === 'lmstudio') {
        return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <url>${localSettings.customBaseUrl || 'https://api.openai.com/v1'}/chat/completions</url>
  <method>POST</method>
  <headers>
    <header name="Content-Type">application/json</header>${localSettings.customApiKey ? `\n    <header name="Authorization">Bearer ***</header>` : ''}${localSettings.customHeader ? `\n    <header name="Custom">${localSettings.customHeader}</header>` : ''}
  </headers>
  <body>
    <model>${localSettings.customModelId || 'gpt-3.5-turbo'}</model>
    <messages>
      <message role="user">...</message>
    </messages>
  </body>
</request>`;
      } else if (localSettings.customProtocol === 'openai-completions') {
        return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <url>${localSettings.customBaseUrl || 'https://api.openai.com/v1'}/completions</url>
  <method>POST</method>
  <headers>
    <header name="Content-Type">application/json</header>${localSettings.customApiKey ? `\n    <header name="Authorization">Bearer ***</header>` : ''}${localSettings.customHeader ? `\n    <header name="Custom">${localSettings.customHeader}</header>` : ''}
  </headers>
  <body>
    <model>${localSettings.customModelId || 'text-davinci-003'}</model>
    <prompt>...</prompt>
  </body>
</request>`;
      } else if (localSettings.customProtocol === 'ollama') {
        return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <url>${localSettings.customBaseUrl || 'http://localhost:11434/api'}/chat</url>
  <method>POST</method>
  <headers>
    <header name="Content-Type">application/json</header>${localSettings.customHeader ? `\n    <header name="Custom">${localSettings.customHeader}</header>` : ''}
  </headers>
  <body>
    <model>${localSettings.customModelId || 'llama3'}</model>
    <messages>
      <message role="user">...</message>
    </messages>
  </body>
</request>`;
      } else if (localSettings.customProtocol === 'anthropic') {
        return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <url>${localSettings.customBaseUrl || 'https://api.anthropic.com/v1'}/messages</url>
  <method>POST</method>
  <headers>
    <header name="Content-Type">application/json</header>${localSettings.customApiKey ? `\n    <header name="x-api-key">***</header>` : ''}${localSettings.customHeader ? `\n    <header name="Custom">${localSettings.customHeader}</header>` : ''}
  </headers>
  <body>
    <model>${localSettings.customModelId || 'claude-3-opus-20240229'}</model>
    <messages>
      <message role="user">...</message>
    </messages>
  </body>
</request>`;
      } else {
        return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <url>${localSettings.customBaseUrl || '...'}</url>
  <method>POST</method>
  <headers>
    <header name="Content-Type">application/json</header>${localSettings.customHeader ? `\n    <header name="Custom">${localSettings.customHeader}</header>` : ''}
  </headers>
</request>`;
      }
    }
    return '';
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

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="general">{t("General")}</TabsTrigger>
          <TabsTrigger value="appearance">{t("Appearance")}</TabsTrigger>
          <TabsTrigger value="apikeys">{t("API Keys")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="grid gap-4 bg-card border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-medium border-b pb-2 mb-2">{t("General Settings")}</h3>
            <div className="flex items-center justify-between mt-2">
              <div className="space-y-0.5">
                <Label>{t("Allow Remote Access")}</Label>
                <div className="text-sm text-muted-foreground">
                  Allow other devices on your local network to access this application.
                </div>
              </div>
              <Switch 
                checked={localSettings.allowRemoteAccess} 
                onCheckedChange={(checked: boolean) => handleChange('allowRemoteAccess', checked)} 
              />
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
            
            <div className="pt-6 mt-4 border-t">
              <Button onClick={handleSave}>{t("Save Settings")}</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <div className="grid gap-4 bg-card border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-medium border-b pb-2 mb-2">{t("Appearance Settings")}</h3>
            <div className="space-y-2">
              <Label htmlFor="theme">{t("Theme Preference")}</Label>
              <div className="text-sm text-muted-foreground mb-2">Select your preferred color theme.</div>
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
            
            <div className="pt-6 mt-4 border-t">
              <Button onClick={handleSave}>{t("Save Settings")}</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="apikeys" className="space-y-4">
          <div className="grid gap-4 bg-card border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-medium border-b pb-2 mb-2">{t("API Keys Configuration")}</h3>
            <div className="space-y-2">
              <Label>{t("API Provider")}</Label>
              <Select value={localSettings.apiProvider} onValueChange={(val) => handleChange('apiProvider', val)}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Select Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="custom">Custom API</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {localSettings.apiProvider === 'openai' && (
              <div className="space-y-4 border rounded-md p-4 bg-muted/20 mt-4">
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
                <div className="space-y-2">
                  <Label htmlFor="openai-model">Model ID</Label>
                  <Input
                    id="openai-model"
                    placeholder="gpt-4o"
                    value={(localSettings as any).openaiModelId || ''}
                    onChange={(e) => handleChange('openaiModelId', e.target.value)}
                  />
                </div>
              </div>
            )}

            {localSettings.apiProvider === 'anthropic' && (
              <div className="space-y-4 border rounded-md p-4 bg-muted/20 mt-4">
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
                <div className="space-y-2">
                  <Label htmlFor="anthropic-model">Model ID</Label>
                  <Input
                    id="anthropic-model"
                    placeholder="claude-3-5-sonnet-20240620"
                    value={(localSettings as any).anthropicModelId || ''}
                    onChange={(e) => handleChange('anthropicModelId', e.target.value)}
                  />
                </div>
              </div>
            )}

            {localSettings.apiProvider === 'gemini' && (
              <div className="space-y-4 border rounded-md p-4 bg-muted/20 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="gemini-key">Gemini API Key</Label>
                  <Input
                    id="gemini-key"
                    type="password"
                    placeholder="AIza..."
                    value={localSettings.geminiKey || ''}
                    onChange={(e) => handleChange('geminiKey', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Used for Gemini models.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gemini-model">Model ID</Label>
                  <Input
                    id="gemini-model"
                    placeholder="gemini-1.5-pro-latest"
                    value={(localSettings as any).geminiModelId || ''}
                    onChange={(e) => handleChange('geminiModelId', e.target.value)}
                  />
                </div>
              </div>
            )}

            {localSettings.apiProvider === 'custom' && (
              <div className="space-y-4 border rounded-md p-4 bg-muted/20 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-protocol">{t("Protocol")}</Label>
                  <Select value={localSettings.customProtocol} onValueChange={(val) => handleChange('customProtocol', val)}>
                    <SelectTrigger id="custom-protocol">
                      <SelectValue placeholder="Select Protocol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai-compatible">{t("OpenAI Compatible")}</SelectItem>
                      <SelectItem value="openai-response">{t("OpenAI Response")}</SelectItem>
                      <SelectItem value="openai-completions">{t("OpenAI Completions")}</SelectItem>
                      <SelectItem value="ollama">Ollama</SelectItem>
                      <SelectItem value="lmstudio">LM Studio</SelectItem>
                      <SelectItem value="anthropic">{t("Anthropic")}</SelectItem>
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
                <div className="space-y-2">
                  <Label htmlFor="custom-header">Custom Header (Optional)</Label>
                  <Input
                    id="custom-header"
                    placeholder="e.g. Authorization: Bearer TOKEN"
                    value={localSettings.customHeader || ''}
                    onChange={(e) => handleChange('customHeader', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Editable XML Request Preview */}
            <div className="space-y-2 mt-4 p-4 bg-black/5 rounded-md border border-gray-200 dark:border-gray-800">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs uppercase text-muted-foreground tracking-wider block">XML Request Template</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs px-2"
                  onClick={() => setEditedXmlPreview(null)}
                  disabled={editedXmlPreview === null}
                >
                  Reset to Default
                </Button>
              </div>
              <Textarea 
                className="text-xs p-3 bg-black text-green-400 rounded-md font-mono whitespace-pre-wrap min-h-[250px] resize-y border-0 focus-visible:ring-1 focus-visible:ring-primary"
                value={editedXmlPreview !== null ? editedXmlPreview : generateXmlPreview()}
                onChange={(e) => setEditedXmlPreview(e.target.value)}
                spellCheck={false}
              />
              <p className="text-[10px] text-muted-foreground mt-1">This template defines how requests are structured when sent to the provider. You can customize the XML structure if needed.</p>
            </div>

            <div className="pt-6 mt-4 border-t">
              <Button onClick={() => {
                // We should also save the custom template if edited
                const newSettings = { ...localSettings };
                if (editedXmlPreview !== null) {
                  // Assuming there is a property for this in the actual store schema
                  // For now we just add it to the saved payload
                  (newSettings as any).customXmlTemplate = editedXmlPreview;
                }
                updateSettings(newSettings);
                setTheme(newSettings.theme as any);
                console.log("Settings saved:", newSettings);
              }}>{t("Save Settings")}</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
