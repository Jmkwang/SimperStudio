import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { Minus, RefreshCw, Send, X, Copy } from 'lucide-react';
import { AgentChatWindowData } from '@/types/models';

export function AgentChatWindow({ windowData }: { windowData: AgentChatWindowData }) {
  const [input, setInput] = useState('');
  const { t } = useTranslation();

  const sessions = useAppStore(state => state.sessions);
  const agents = useAppStore(state => state.agents);
  const focusAgentChatWindow = useAppStore(state => state.focusAgentChatWindow);
  const closeAgentChatWindow = useAppStore(state => state.closeAgentChatWindow);
  const toggleAgentChatWindowMinimized = useAppStore(state => state.toggleAgentChatWindowMinimized);
  const sendToAgent = useAppStore(state => state.sendToAgent);

  const agent = agents.find(item => item.id === windowData.agentId);
  const session = sessions.find(item => item.id === windowData.sessionId);

  const messages = useMemo(() => {
    if (!session) return [];
    return session.messages.filter(message => {
      if (message.role === 'user') {
        return message.meta?.targetAgentId === windowData.agentId;
      }
      if (message.role === 'assistant') {
        return message.agentResponses?.some(response => response.agentId === windowData.agentId);
      }
      return false;
    });
  }, [session, windowData.agentId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendToAgent(windowData.sessionId, windowData.agentId, input);
    setInput('');
  };

  return (
    <div
      className="absolute w-[420px] rounded-xl border bg-background shadow-xl"
      style={{ left: windowData.position.x, top: windowData.position.y, zIndex: windowData.zIndex }}
      onMouseDown={() => focusAgentChatWindow(windowData.id)}
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{agent?.name || windowData.agentId}</div>
          <div className="truncate text-xs text-muted-foreground">{t('智能体对话')}</div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleAgentChatWindowMinimized(windowData.id)}>
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => closeAgentChatWindow(windowData.id)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {!windowData.minimized && (
        <>
          <div className="max-h-[320px] overflow-auto p-3 space-y-2">
            {messages.length === 0 && (
              <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                {t('暂无消息，开始对话吧。')}
              </div>
            )}

            {messages.map(message => (
              <div key={message.id} className="space-y-2">
                {message.role === 'user' && (
                  <div className="rounded-lg bg-primary/10 px-3 py-2 text-sm whitespace-pre-wrap">
                    {message.content.text || t('已发送消息')}
                  </div>
                )}

                {message.role === 'assistant' && (message.agentResponses || [])
                  .filter(response => response.agentId === windowData.agentId)
                  .map((response, idx) => (
                    <div key={`${message.id}-${idx}`} className="rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap">
                      <div>{response.content.text}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" className="h-7" onClick={() => navigator.clipboard.writeText(response.content.text).catch(() => {})}>
                          <Copy className="mr-1 h-3 w-3" />{t('复制')}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7" onClick={async () => {
                          const prompt = response.content.text;
                          await sendToAgent(windowData.sessionId, windowData.agentId, prompt);
                        }}>
                          <RefreshCw className="mr-1 h-3 w-3" />{t('重新生成')}
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>

          <div className="border-t p-3">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={t('发送消息给智能体...')}
                className="min-h-[64px]"
              />
              <Button onClick={handleSend} disabled={!input.trim()} className="self-end">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
