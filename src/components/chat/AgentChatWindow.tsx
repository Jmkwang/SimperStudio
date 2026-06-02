import { useState, useMemo } from 'react';
import { useAppStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Send, Square, X } from 'lucide-react';
import { AgentChatWindowData } from '@/types/models';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatMessageBubble } from './ChatMessageBubble';

const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 480;

export function AgentChatWindow({ windowData }: { windowData: AgentChatWindowData }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const softBorder = isDark ? '#333333' : '#EAEAE9';
  const [input, setInput] = useState('');
  const sendToAgent = useAppStore(state => state.sendToAgent);
  const cancelSessionStream = useAppStore(state => state.cancelSessionStream);
  const activeStreamingSessionIds = useAppStore(state => state.activeStreamingSessionIds);
  const isStreaming = activeStreamingSessionIds.includes(windowData.sessionId);
  const pos = windowData.position;
  const size = windowData.size || { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  const { t } = useTranslation();

  const sessions = useAppStore(state => state.sessions);
  const agents = useAppStore(state => state.agents);
  const closeAgentChatWindow = useAppStore(state => state.closeAgentChatWindow);
  const retryAgentResponse = useAppStore(state => state.retryAgentResponse);

  const agent = agents.find(item => item.id === windowData.agentId);
  const session = sessions.find(item => item.id === windowData.sessionId);

  const messages = useMemo(() => {
    if (!session) return [];
    const msgs: typeof session.messages = [];
    for (const message of session.messages) {
      if (message.role === 'user') {
        if (!message.meta?.targetAgentId || message.meta.targetAgentId === windowData.agentId) {
          msgs.push(message);
        }
      }
      if (message.role === 'assistant' && message.agentResponses) {
        const hasResponse = message.agentResponses.some(response => response.agentId === windowData.agentId);
        if (hasResponse) {
          msgs.push(message);
        }
      }
    }
    return msgs;
  }, [session, windowData.agentId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendToAgent(windowData.sessionId, windowData.agentId, input);
    setInput('');
  };

  return (
    <div
      className="absolute rounded-xl border bg-background shadow-xl flex flex-col overflow-hidden"
      style={{
        borderColor: softBorder,
        left: pos.x,
        top: pos.y,
        zIndex: windowData.zIndex,
        width: size.width,
        height: windowData.minimized ? 'auto' : size.height,
      }}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between border-b px-3 py-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-6 w-6 rounded-md shrink-0">
            <AvatarImage src={agent?.avatar} />
            <AvatarFallback className="rounded-md bg-primary/10 text-primary text-xs">
              {agent?.name?.slice(0, 2) || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{agent?.name || windowData.agentId}</div>
            <div className="truncate text-xs text-muted-foreground">{t('智能体对话')}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={t('Close')} onClick={() => closeAgentChatWindow(windowData.id)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!windowData.minimized && (
        <>
          {/* Messages area */}
          <div className="flex-1 overflow-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground text-center">
                {t('暂无消息，开始对话吧。')}
              </div>
            )}

            {messages.map(message => (
              <ChatMessageBubble
                key={message.id}
                message={message}
                agent={agent ? { name: agent.name, avatar: agent.avatar } : undefined}
                agentId={windowData.agentId}
                emptyText={t('Sent message')}
                onRetry={message.role === 'assistant' ? (agentId: string, messageId: string) => {
                  const allMessages = session?.messages || [];
                  const msgIndex = allMessages.findIndex(m => m.id === message.id);
                  const lastUserMsg = msgIndex >= 0
                    ? [...allMessages.slice(0, msgIndex)].reverse().find(m => m.role === 'user')
                    : undefined;
                  if (lastUserMsg) retryAgentResponse(windowData.sessionId, messageId, agentId, lastUserMsg.content.text);
                } : undefined}
              />
            ))}
          </div>

          {/* Input area */}
          <div className="border-t p-3 shrink-0">
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
                className="min-h-[64px] text-sm"
              />
              <Button
                onClick={isStreaming ? () => cancelSessionStream(windowData.sessionId) : handleSend}
                disabled={!isStreaming && !input.trim()}
                variant={isStreaming ? 'destructive' : 'default'}
                className="self-end h-11 w-11"
                aria-label={isStreaming ? t('Stop') : t('Send')}
              >
                {isStreaming ? <Square className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>

        </>
      )}
    </div>
  );
}
