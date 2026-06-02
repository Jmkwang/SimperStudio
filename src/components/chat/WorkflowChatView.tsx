import { useMemo, useState, useRef } from 'react';
import { ChatSession, WorkflowNode, WorkflowNodeData, Agent } from '@/types/models';
import { useAppStore } from '@/stores';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/components/theme/ThemeProvider';
import { WorkflowAgentWindow } from './WorkflowAgentWindow';
import { ChatTriggerNode } from './ChatTriggerNode';
import { ChatAgentNode } from './ChatAgentNode';
import { ChatOutputNode } from './ChatOutputNode';
import { ChatCodeNode } from './ChatCodeNode';
import { ChatLoopNode } from './ChatLoopNode';
import { ChatRouterNode } from './ChatRouterNode';
import { ChatMessageBubble } from './ChatMessageBubble';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Bot, Send, PlayCircle, Square, Loader2, AlertCircle, CheckCircle2, MessageSquare, GitBranch, Paperclip, X } from 'lucide-react';
import { DebugBadge } from '@/components/debug/DebugBadge';
import { useDebugTrack } from '@/hooks/useDebugTrack';

export function WorkflowChatView({ session }: { session: ChatSession }) {
  const workflows = useAppStore(state => state.workflows);
  const agents = useAppStore(state => state.agents);
  const openWorkflowAgentWindow = useAppStore(state => state.openWorkflowAgentWindow);
  const workflowChatUI = useAppStore(state => state.workflowChatUI);
  const setWorkflowSidebarCollapsed = useAppStore(state => state.setWorkflowSidebarCollapsed);
  const sendMessageToAgents = useAppStore(state => state.sendMessageToAgents);
  const cancelSessionStream = useAppStore(state => state.cancelSessionStream);
  const activeStreamingSessionIds = useAppStore(state => state.activeStreamingSessionIds);
  const retryAgentResponse = useAppStore(state => state.retryAgentResponse);
  const chatLayoutMode = useAppStore(state => state.chatLayoutMode);
  const setChatLayoutMode = useAppStore(state => state.setChatLayoutMode);
  const executeWorkflow = useAppStore(state => state.executeWorkflow);
  const cancelWorkflowExecution = useAppStore(state => state.cancelWorkflowExecution);
  const workflowExecution = useAppStore(state => state.workflowExecution);
  const settings = useAppStore(state => state.settings);
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { trackClick } = useDebugTrack('WorkflowChatView');

  const [multiAgentMode, setMultiAgentMode] = useState(true);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const workflow = session.workflowId ? workflows.find(item => item.id === session.workflowId) : undefined;

  const isCollapsed = workflowChatUI.sidebarCollapsedBySession[session.id] ?? true;

  const agentNodes = workflow?.nodesData?.filter(node =>
    (node.type === 'agent' && (node.data as Record<string, unknown>)?.agentId) ||
    node.type === 'dynamic-agent'
  ) || [];
  const linkedAgents = agentNodes
    .map(node => {
      if (node.type === 'dynamic-agent') {
        // Virtual agent for dynamic-agent nodes
        return { id: `dynamic-${node.id}`, name: (node.data as Record<string, unknown>)?.label || 'Dynamic Agent', avatar: '' } as Agent;
      }
      return agents.find(a => a.id === (node.data as Record<string, unknown>)?.agentId);
    })
    .filter(Boolean)
    .filter((a, i, arr) => arr.findIndex(x => (x as Agent).id === (a as Agent).id) === i) as Agent[];

  if (!workflow) {
    return <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">{t('Current session is not linked to a workflow.')}</div>;
  }

  const sessionWindows = workflowChatUI.windows.filter(window => window.sessionId === session.id);

  const colorMode = theme === 'dark'
    ? 'dark'
    : theme === 'system'
      ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : 'light';
  const isDark = colorMode === 'dark';

  const nodeTypes = useMemo(() => ({
    trigger: ChatTriggerNode,
    agent: ChatAgentNode,
    output: ChatOutputNode,
    code: ChatCodeNode,
    loop: ChatLoopNode,
    condition: ChatRouterNode,
  }), []);

  const initialNodes = useMemo(() => {
    return (workflow.nodesData || []).map((node: WorkflowNode) => {
      const nodeType = node.type || 'default';
      const baseData: WorkflowNodeData = {
        ...node.data,
        label: node.data?.label || node.id,
      };

      if (nodeType === 'agent' && (node.data as Record<string, unknown>)?.agentId) {
        const agentId = (node.data as Record<string, unknown>).agentId as string;
        return {
          ...node,
          type: 'agent',
          data: {
            ...baseData,
            agentId,
            onClick: () => openWorkflowAgentWindow(session.id, workflow.id, node.id, agentId),
          },
        };
      }

      if (nodeType === 'dynamic-agent') {
        const dynamicAgentId = `dynamic-${node.id}`;
        return {
          ...node,
          type: 'agent',
          data: {
            ...baseData,
            agentId: dynamicAgentId,
            onClick: () => openWorkflowAgentWindow(session.id, workflow.id, node.id, dynamicAgentId),
          },
        };
      }

      return {
        ...node,
        type: nodeType,
        data: baseData,
      };
    });
  }, [workflow, session.id, openWorkflowAgentWindow]);

  const initialEdges = useMemo(() => workflow.edgesData || [], [workflow]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes as any[]);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const handleSend = async () => {
    if (!input.trim() || linkedAgents.length === 0) return;
    const text = input.trim();
    const files = [...attachments];
    setInput("");
    setAttachments([]);
    const attachmentList = files.length > 0 ? files.map(f => ({
      id: f.name + Date.now(),
      name: f.name,
      mimeType: f.type,
      size: f.size,
      kind: (f.type.startsWith('image/') ? 'image' : 'file') as 'image' | 'file',
    })) : undefined;
    await sendMessageToAgents(session.id, text, linkedAgents, { attachments: attachmentList });
  };

  const isStreaming = activeStreamingSessionIds.includes(session.id);

  const handleStop = () => {
    cancelSessionStream(session.id);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const [runError, setRunError] = useState<string | null>(null);

  const handleRunWorkflow = async () => {
    if (!workflow || workflowExecution.status === 'running') return;
    setRunError(null);

    // Pre-check: ensure at least one provider with an API key is configured
    const hasConfiguredProvider = settings.providers?.some(
      (p: any) => p.isEnabled && p.apiKey
    );
    if (!hasConfiguredProvider) {
      setRunError(t('No API provider configured. Please set up a provider with a valid API key in Settings > Models.'));
      return;
    }

    try {
      const result = await executeWorkflow(workflow.id, {});
      if (result && result._error) {
        setRunError(result._error);
      }
    } catch (e: any) {
      setRunError(e.message || 'Execution failed');
    }
  };

  const handleCancelWorkflow = () => {
    cancelWorkflowExecution();
  };

  return (
    <div className="flex flex-col h-full relative">
      <DebugBadge id="WorkflowChatView" position="bottom-left" />
      <div className="p-6 pb-2 shrink-0 h-[80px] flex items-center justify-between">
        <h2 className="text-lg font-semibold">{workflow.name}</h2>
        <div className="flex items-center gap-2">
          {workflowExecution.status === 'running' ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={trackClick(handleCancelWorkflow, 'workflow:cancel')}
              className="h-8 shadow-sm"
              aria-label={t('Stop')}
            >
              <Square className="h-4 w-4 mr-1" />
              {t('Stop')}
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={trackClick(handleRunWorkflow, 'workflow:run')}
              className="h-8 shadow-sm"
              aria-label={t('Run Workflow')}
            >
              <PlayCircle className="h-4 w-4 mr-1" />
              {t('Run Workflow')}
            </Button>
          )}
          {workflowExecution.status === 'running' && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t('Running...')}
            </span>
          )}
          {isCollapsed && (
            <button
              onClick={trackClick(() => setWorkflowSidebarCollapsed(session.id, false), 'workflow:expandSidebar')}
              className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
              title={t('Show workflow panel')}
              data-debug-source="WorkflowChatView"
              data-debug-action="workflow:expandSidebar"
            >
              <Bot className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={trackClick(() => setMultiAgentMode(!multiAgentMode), 'workflow:toggleMode')}
            className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
            title={multiAgentMode ? t('拓扑') : t('聊天')}
            data-debug-source="WorkflowChatView"
            data-debug-action="workflow:toggleMode"
          >
            {multiAgentMode ? <GitBranch className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Execution status feedback */}
      {runError && (
        <div className="mx-6 mb-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive shrink-0">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">{runError}</span>
          <button onClick={() => setRunError(null)} className="text-xs underline shrink-0">{t('Dismiss')}</button>
        </div>
      )}
      {workflowExecution.status === 'completed' && !runError && (
        <div className="mx-6 mb-2 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400 shrink-0">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{t('Workflow completed')}</span>
        </div>
      )}

      {multiAgentMode ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-auto p-6 space-y-4">
            {session.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <div className="text-4xl opacity-30">💬</div>
                <p className="text-sm">{t("Start a conversation")}</p>
                <p className="text-xs text-muted-foreground">{t("消息将同时发送给所有Agent")}</p>
              </div>
            )}
            {session.messages.map(message => (
              <ChatMessageBubble
                key={message.id}
                message={message}
                agents={linkedAgents.map(a => ({ id: a.id, name: a.name, avatar: a.avatar }))}
                layoutMode={chatLayoutMode}
                onLayoutChange={setChatLayoutMode}
                onRetry={(agentId, messageId) => {
                  const lastUserMsg = [...session.messages].reverse().find(m => m.role === 'user');
                  if (lastUserMsg) {
                    retryAgentResponse(session.id, messageId, agentId, lastUserMsg.content.text);
                  }
                }}
              />
            ))}
          </div>
          <div className="p-4 shrink-0">
            <div className="max-w-4xl mx-auto relative">
              {attachments.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 flex flex-wrap gap-1.5 p-2 pb-0 max-w-full">
                  {attachments.map((file, i) => (
                    <div key={i} className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs max-w-[160px] overflow-hidden">
                      <span className="truncate">{file.name}</span>
                      <button onClick={() => handleRemoveAttachment(i)} className="shrink-0 hover:text-foreground text-muted-foreground" aria-label={t('Remove')}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative rounded-2xl border bg-card shadow-sm">
                <Textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey && !isStreaming) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={`${t("Send message to all agents")}...`}
                  className="min-h-[80px] text-sm border-0 focus-visible:ring-0 resize-none pb-12"
                />
                {/* Bottom bar inside input */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileSelect} />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
                      aria-label={t('Attach file')}
                      disabled={isStreaming}
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {isStreaming ? (
                    <button
                      onClick={trackClick(handleStop, 'workflow:stop')}
                      className="h-7 w-7 flex items-center justify-center rounded text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label={t('Stop')}
                    >
                      <Square className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={trackClick(handleSend, 'workflow:send')}
                      disabled={!input.trim()}
                      className="h-7 w-7 flex items-center justify-center rounded text-primary hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:text-muted-foreground"
                      aria-label={t("Send")}
                      data-debug-source="WorkflowChatView"
                      data-debug-action="workflow:send"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 relative bg-background">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              colorMode={colorMode}
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={1} className={isDark ? 'opacity-30' : 'opacity-40'} color={isDark ? '#4b5563' : undefined} />
              <Controls className="bg-card border shadow-sm rounded-lg [&>button]:border-border [&>button]:bg-card [&>button:hover]:bg-muted" />
              <MiniMap
                bgColor={isDark ? '#111827' : '#ffffff'}
                maskColor={isDark ? 'rgba(17, 24, 39, 0.65)' : 'rgba(240, 240, 240, 0.65)'}
                nodeColor={isDark ? '#374151' : '#e5e7eb'}
                maskStrokeColor={isDark ? '#374151' : '#d1d5db'}
              />
            </ReactFlow>
          </div>

          {sessionWindows.map(windowData => (
            <WorkflowAgentWindow key={windowData.id} windowData={windowData} />
          ))}
        </>
      )}
    </div>
  );
}
