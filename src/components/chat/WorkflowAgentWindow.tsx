import { useState, useMemo } from 'react';
import { WorkflowConversationWindow, WorkflowNode } from '@/types/models';
import { useAppStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { Minus, Send, X, Layers } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatMessageBubble } from './ChatMessageBubble';

const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 480;

export function WorkflowAgentWindow({ windowData }: { windowData: WorkflowConversationWindow }) {
  const [input, setInput] = useState('');
  const pos = windowData.position;
  const size = windowData.size || { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  const { t } = useTranslation();

  const sessions = useAppStore(state => state.sessions);
  const agents = useAppStore(state => state.agents);
  const workflows = useAppStore(state => state.workflows);
  const closeWorkflowAgentWindow = useAppStore(state => state.closeWorkflowAgentWindow);
  const focusWorkflowAgentWindow = useAppStore(state => state.focusWorkflowAgentWindow);
  const toggleWorkflowAgentWindowMinimized = useAppStore(state => state.toggleWorkflowAgentWindowMinimized);
  const sendToWorkflowAgent = useAppStore(state => state.sendToWorkflowAgent);
  const rerunAgentReply = useAppStore(state => state.rerunAgentReply);

  const agent = agents.find(item => item.id === windowData.agentId);
  const session = sessions.find(item => item.id === windowData.sessionId);

  const node = useMemo(() => {
    const workflow = workflows.find(w => w.id === windowData.workflowId);
    return workflow?.nodesData.find((n): n is WorkflowNode => n.id === windowData.nodeId && n.type === 'agent');
  }, [workflows, windowData.workflowId, windowData.nodeId]);

  const hasOverrides = !!(
    node?.data?.overrideProviderId ||
    node?.data?.overrideModelId ||
    node?.data?.overrideSystemPrompt
  );

  const messages = useMemo(() => {
    if (!session) return [];
    const msgs: typeof session.messages = [];
    for (const message of session.messages) {
      if (message.role === 'user') {
        if (!message.meta?.targetAgentId && !message.meta?.workflowNodeId) {
          msgs.push(message);
        } else if (message.meta?.workflowNodeId === windowData.nodeId || message.meta?.targetAgentId === windowData.agentId) {
          msgs.push(message);
        }
      }
      if (message.role === 'assistant' && message.agentResponses) {
        const hasResponse = message.agentResponses.some(response => response.agentId === windowData.agentId && response.nodeId === windowData.nodeId);
        if (hasResponse) {
          msgs.push(message);
        }
      }
    }
    return msgs;
  }, [session, windowData.nodeId, windowData.agentId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendToWorkflowAgent(windowData.sessionId, windowData.nodeId, input);
    setInput('');
  };

  return (
    <div
      className="absolute rounded-xl border bg-background shadow-xl flex flex-col overflow-hidden"
      style={{
        left: pos.x,
        top: pos.y,
        zIndex: windowData.zIndex,
        width: size.width,
        height: windowData.minimized ? 'auto' : size.height,
      }}
      onMouseDown={() => focusWorkflowAgentWindow(windowData.id)}
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
            <div className="truncate text-xs text-muted-foreground flex items-center gap-1">
              {t('Node')}: {windowData.nodeId}
              {hasOverrides && (
                <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                  <Layers className="h-3 w-3" />
                  {t('Override')}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            aria-label={windowData.minimized ? t('Expand') : t('Minimize')}
            onClick={() => toggleWorkflowAgentWindowMinimized(windowData.id)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={t('Close')} onClick={() => closeWorkflowAgentWindow(windowData.id)}>
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
                {t('No messages for this node yet.')}
              </div>
            )}

            {messages.map(message => (
              <ChatMessageBubble
                key={message.id}
                message={message}
                agent={agent ? { name: agent.name, avatar: agent.avatar } : undefined}
                agentId={windowData.agentId}
                nodeId={windowData.nodeId}
                emptyText={t('Copied attachment')}
                onRetry={message.role === 'assistant' ? (agentId: string) => {
                  const text = message.agentResponses?.find(
                    r => r.agentId === agentId && r.nodeId === windowData.nodeId
                  )?.content.text;
                  if (text) rerunAgentReply(windowData.sessionId, windowData.nodeId, text);
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
                placeholder={t('Send to current node agent...')}
                className="min-h-[64px] text-sm"
              />
              <Button onClick={handleSend} disabled={!input.trim()} className="self-end h-11 w-11" aria-label={t('Send')}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

        </>
      )}
    </div>
  );
}
