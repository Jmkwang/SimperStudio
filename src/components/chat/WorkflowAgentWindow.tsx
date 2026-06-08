import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { WorkflowConversationWindow, WorkflowNode } from '@/types/models';
import { useAppStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Minus, Send, Square, X, Layers } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 480;

export function WorkflowAgentWindow({ windowData }: { windowData: WorkflowConversationWindow }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const softBorder = 'hsl(var(--border))';
  const [input, setInput] = useState('');
  const [pos, setPos] = useState(windowData.position);
  const size = windowData.size || { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  const { t } = useTranslation();
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  // Sync position from store when windowData changes (e.g. on open)
  useEffect(() => { setPos(windowData.position); }, [windowData.position.x, windowData.position.y]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // Only drag on the title bar, not on buttons
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y };
    const handleMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({
        x: dragRef.current.startPosX + (ev.clientX - dragRef.current.startX),
        y: dragRef.current.startPosY + (ev.clientY - dragRef.current.startY),
      });
    };
    const handleUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [pos]);

  const sessions = useAppStore(state => state.sessions);
  const agents = useAppStore(state => state.agents);
  const workflows = useAppStore(state => state.workflows);
  const closeWorkflowAgentWindow = useAppStore(state => state.closeWorkflowAgentWindow);
  const focusWorkflowAgentWindow = useAppStore(state => state.focusWorkflowAgentWindow);
  const toggleWorkflowAgentWindowMinimized = useAppStore(state => state.toggleWorkflowAgentWindowMinimized);
  const sendToWorkflowAgent = useAppStore(state => state.sendToWorkflowAgent);
  const cancelSessionStream = useAppStore(state => state.cancelSessionStream);
  const activeStreamingSessionIds = useAppStore(state => state.activeStreamingSessionIds);
  const isStreaming = activeStreamingSessionIds.includes(windowData.sessionId);

  const agent = agents.find(item => item.id === windowData.agentId);
  const session = sessions.find(item => item.id === windowData.sessionId);

  const node = useMemo(() => {
    const workflow = workflows.find(w => w.id === windowData.workflowId);
    return workflow?.nodesData.find((n): n is WorkflowNode => n.id === windowData.nodeId && (n.type === 'agent' || n.type === 'dynamic-agent'));
  }, [workflows, windowData.workflowId, windowData.nodeId]);

  const nodeData = node?.data as Record<string, unknown> | undefined;

  // Dynamic agent meta from payload (populated during execution)
  const dynamicMeta = (session?.messages || [])
    .flatMap(m => m.agentResponses || [])
    .find(r => r.nodeId === windowData.nodeId)?._dynamicAgentMeta;

  const hasOverrides = !!(
    nodeData?.overrideProviderId ||
    nodeData?.overrideModelId ||
    nodeData?.overrideSystemPrompt
  );

  const displayName = dynamicMeta?.name || agent?.name || windowData.agentId;
  const displayAvatar = dynamicMeta?.avatar || agent?.avatar;

  // Only show this node's agent responses (not the entire session)
  const nodeResponses = useMemo(() => {
    if (!session) return [];
    const results: { text: string; timestamp: number; status: string; agentId: string; errorSummary?: string; errorDetail?: string }[] = [];
    for (const message of session.messages) {
      if (message.role !== 'assistant' || !message.agentResponses) continue;
      for (const resp of message.agentResponses) {
        if (resp.agentId === windowData.agentId &&
            (resp.nodeId === undefined || resp.nodeId === windowData.nodeId)) {
          results.push({
            text: resp.content.text,
            timestamp: message.timestamp,
            status: resp.status,
            agentId: resp.agentId,
            errorSummary: resp.errorSummary,
            errorDetail: resp.errorDetail,
          });
        }
      }
    }
    return results;
  }, [session, windowData.nodeId, windowData.agentId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendToWorkflowAgent(windowData.sessionId, windowData.nodeId, input);
    setInput('');
  };

  return (
    <div
      className="absolute rounded-xl border bg-popover shadow-xl flex flex-col overflow-hidden"
      style={{
        borderColor: softBorder,
        left: pos.x,
        top: pos.y,
        zIndex: windowData.zIndex,
        width: size.width,
        height: windowData.minimized ? 'auto' : size.height,
      }}
      onMouseDown={() => focusWorkflowAgentWindow(windowData.id)}
    >
      {/* Title bar - draggable */}
      <div
        className="flex items-center justify-between border-b px-3 py-2 shrink-0 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-6 w-6 rounded-md shrink-0">
            <AvatarImage src={displayAvatar} />
            <AvatarFallback className="rounded-md bg-primary/10 text-primary text-xs">
              {displayName?.slice(0, 2) || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{displayName}</div>
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
          {/* Messages area - only this node's responses */}
          <div className="flex-1 overflow-auto p-3 space-y-3">
            {nodeResponses.length === 0 && (
              <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground text-center">
                {t('No messages for this node yet.')}
              </div>
            )}

            {nodeResponses.map((resp, idx) => (
              <div key={idx} className="flex gap-3">
                {/* Left column: avatar spanning 2 lines */}
                <div className="shrink-0">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                    {displayName?.slice(0, 2)?.toUpperCase() || 'AI'}
                  </div>
                </div>
                {/* Right column */}
                <div className="flex flex-col items-start min-w-0 flex-1">
                  <span className="text-sm font-semibold text-foreground mb-0.5 truncate max-w-full">
                    {displayName || 'Agent'}
                  </span>
                  <span className="text-xs text-muted-foreground mb-1 truncate max-w-full">
                    {windowData.nodeId}
                  </span>
                  {resp.status === 'error' ? (
                    <div className="text-destructive text-sm">
                      <span>{resp.errorSummary || t('模型调用失败')}</span>
                    </div>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none break-words whitespace-pre-wrap [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 w-full">
                      {resp.text}
                    </div>
                  )}
                </div>
              </div>
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
