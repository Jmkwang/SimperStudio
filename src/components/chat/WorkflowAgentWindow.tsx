import { useMemo, useState } from 'react';
import { WorkflowConversationWindow } from '@/types/models';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { Minus, RefreshCw, Send, X } from 'lucide-react';

export function WorkflowAgentWindow({ windowData }: { windowData: WorkflowConversationWindow }) {
  const [input, setInput] = useState('');
  const { t } = useTranslation();

  const sessions = useAppStore(state => state.sessions);
  const agents = useAppStore(state => state.agents);
  const focusWorkflowAgentWindow = useAppStore(state => state.focusWorkflowAgentWindow);
  const closeWorkflowAgentWindow = useAppStore(state => state.closeWorkflowAgentWindow);
  const toggleWorkflowAgentWindowMinimized = useAppStore(state => state.toggleWorkflowAgentWindowMinimized);
  const sendToWorkflowAgent = useAppStore(state => state.sendToWorkflowAgent);
  const rerunAgentReply = useAppStore(state => state.rerunAgentReply);
  const rerunAndForwardAgentReply = useAppStore(state => state.rerunAndForwardAgentReply);
  const forwardAgentReplyToNext = useAppStore(state => state.forwardAgentReplyToNext);

  const agent = agents.find(item => item.id === windowData.agentId);
  const session = sessions.find(item => item.id === windowData.sessionId);

  const messages = useMemo(() => {
    if (!session) return [];
    return session.messages.filter(message => {
      if (message.role === 'user') {
        return message.meta?.workflowNodeId === windowData.nodeId || message.meta?.targetAgentId === windowData.agentId;
      }
      if (message.role === 'assistant') {
        return message.agentResponses?.some(response => response.agentId === windowData.agentId && response.nodeId === windowData.nodeId);
      }
      return false;
    });
  }, [session, windowData.nodeId, windowData.agentId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendToWorkflowAgent(windowData.sessionId, windowData.nodeId, input);
    setInput('');
  };

  return (
    <div
      className="absolute w-[420px] rounded-xl border bg-background shadow-xl"
      style={{ left: windowData.position.x, top: windowData.position.y, zIndex: windowData.zIndex }}
      onMouseDown={() => focusWorkflowAgentWindow(windowData.id)}
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{agent?.name || windowData.agentId}</div>
          <div className="truncate text-xs text-muted-foreground">{t('Node')}: {windowData.nodeId}</div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleWorkflowAgentWindowMinimized(windowData.id)}>
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => closeWorkflowAgentWindow(windowData.id)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {!windowData.minimized && (
        <>
          <div className="max-h-[320px] overflow-auto p-3 space-y-2">
            {messages.length === 0 && (
              <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">{t('No messages for this node yet.')}</div>
            )}

            {messages.map(message => (
              <div key={message.id} className="space-y-2">
                {message.role === 'user' && (
                  <div className="rounded-lg bg-primary/10 px-3 py-2 text-sm whitespace-pre-wrap">{message.content.text || t('Copied attachment')}</div>
                )}

                {message.role === 'assistant' && message.agentResponses
                  ?.filter(response => response.agentId === windowData.agentId && response.nodeId === windowData.nodeId)
                  .map((response, index) => (
                    <div key={`${message.id}-${index}`} className="rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap">
                      <div>{response.content.text}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" className="h-7" onClick={() => navigator.clipboard.writeText(response.content.text).catch(() => {})}>{t('Copy')}</Button>
                        <Button size="sm" variant="outline" className="h-7" onClick={() => rerunAgentReply(windowData.sessionId, windowData.nodeId, response.content.text)}>
                          <RefreshCw className="mr-1 h-3.5 w-3.5" />{t('Regenerate')}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7" onClick={() => forwardAgentReplyToNext(windowData.sessionId, windowData.nodeId, message.id, windowData.agentId, 'manual')}>{t('Send to next')}</Button>
                        <Button size="sm" variant="outline" className="h-7" onClick={() => rerunAndForwardAgentReply(windowData.sessionId, windowData.nodeId, response.content.text)}>{t('Retry and send')}</Button>
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
                onChange={(event) => setInput(event.target.value)}
                placeholder={t('Send to current node agent...')}
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
