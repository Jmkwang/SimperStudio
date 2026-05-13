import { useState, useEffect } from "react"
import { Bot } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { useTranslation } from "@/hooks/useTranslation"

export function AgentDetailPopover({ agent, children, onSave }: { agent: Record<string, any>; children: React.ReactNode; onSave?: (updates: Record<string, any>) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [editData, setEditData] = useState<Record<string, any>>({})
  const { t } = useTranslation()

  useEffect(() => {
    if (isOpen) {
      setEditData({
        name: agent.name || '',
        description: agent.description || '',
        systemPrompt: agent.systemPrompt || '',
        modelProvider: agent.modelProvider || 'local',
        modelId: agent.modelId || 'default',
        temperature: agent.temperature ?? 0.7,
        maxTokens: agent.maxTokens || '',
        apiKey: agent.apiKey || '',
        baseUrl: agent.baseUrl || '',
      })
    }
  }, [isOpen, agent])

  const handleSave = () => {
    onSave?.(editData)
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" side="right" sideOffset={8} className="w-96 p-0 rounded-2xl overflow-hidden">
        <div className="flex flex-col max-h-[80vh] overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-3">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10 rounded-xl border border-border shrink-0">
                <AvatarImage src={agent.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary rounded-xl">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h4 className="font-semibold text-sm">{agent.name}</h4>
                <p className="text-[10px] text-muted-foreground">{agent.modelProvider} · {agent.modelId}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Editable Fields */}
          <div className="p-4 space-y-3">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('名称')}</label>
              <input
                type="text"
                value={editData.name || ''}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-muted/50 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('描述')}</label>
              <input
                type="text"
                value={editData.description || ''}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-muted/50 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder={t('简短描述该助手的用途')}
              />
            </div>

            {/* System Prompt */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('系统提示词')}</label>
              <textarea
                value={editData.systemPrompt || ''}
                onChange={(e) => setEditData({ ...editData, systemPrompt: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 text-xs bg-muted/50 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>

            <Separator />

            {/* Model Config */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('模型配置')}</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">Provider</span>
                  <select
                    value={editData.modelProvider || 'local'}
                    onChange={(e) => setEditData({ ...editData, modelProvider: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs bg-muted/50 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="local">Local</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">Model ID</span>
                  <input
                    type="text"
                    value={editData.modelId || ''}
                    onChange={(e) => setEditData({ ...editData, modelId: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs bg-muted/50 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            </div>

            {/* Parameters */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('参数')}</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">Temperature</span>
                  <input
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={editData.temperature ?? 0.7}
                    onChange={(e) => setEditData({ ...editData, temperature: parseFloat(e.target.value) })}
                    className="w-full px-2 py-1.5 text-xs bg-muted/50 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">Max Tokens</span>
                  <input
                    type="number"
                    value={editData.maxTokens || ''}
                    onChange={(e) => setEditData({ ...editData, maxTokens: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Default"
                    className="w-full px-2 py-1.5 text-xs bg-muted/50 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            </div>

            {/* API Settings (conditional) */}
            {editData.modelProvider !== 'local' && (
              <>
                <Separator />
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('API 设置')}</label>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">API Key</span>
                      <input
                        type="password"
                        value={editData.apiKey || ''}
                        onChange={(e) => setEditData({ ...editData, apiKey: e.target.value })}
                        placeholder="sk-..."
                        className="w-full px-2 py-1.5 text-xs bg-muted/50 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">Base URL</span>
                      <input
                        type="text"
                        value={editData.baseUrl || ''}
                        onChange={(e) => setEditData({ ...editData, baseUrl: e.target.value })}
                        placeholder="https://api..."
                        className="w-full px-2 py-1.5 text-xs bg-muted/50 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 pt-2 border-t border-border flex justify-end gap-2">
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-hover"
            >
              {t('取消')}
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:brightness-105 transition-all"
            >
              {t('保存')}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
