import { useMemo, useState } from 'react';
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
import { Bot, Users, Send, LayoutGrid, List } from 'lucide-react';

export function WorkflowChatView({ session }: { session: ChatSession }) {
  const workflows = useAppStore(state => state.workflows);
  const agents = useAppStore(state => state.agents);
  const openWorkflowAgentWindow = useAppStore(state => state.openWorkflowAgentWindow);
  const workflowChatUI = useAppStore(state => state.workflowChatUI);
  const setWorkflowSidebarCollapsed = useAppStore(state => state.setWorkflowSidebarCollapsed);
  const sendMessageToAgents = useAppStore(state => state.sendMessageToAgents);
  const chatLayoutMode = useAppStore(state => state.chatLayoutMode);
  const setChatLayoutMode = useAppStore(state => state.setChatLayoutMode);
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [multiAgentMode, setMultiAgentMode] = useState(true);
  const [input, setInput] = useState("");

  const workflow = session.workflowId ? workflows.find(item => item.id === session.workflowId) : undefined;

  const isCollapsed = workflowChatUI.sidebarCollapsedBySession[session.id] ?? true;

  const agentNodes = workflow?.nodesData?.filter(node => node.type === 'agent' && node.data?.agentId) || [];
  const linkedAgents = agentNodes
    .map(node => agents.find(a => a.id === node.data?.agentId))
    .filter(Boolean) as Agent[];

  const hasMultipleAgents = linkedAgents.length > 1;

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

      if (nodeType === 'agent' && node.data?.agentId) {
        return {
          ...node,
          type: 'agent',
          data: {
            ...baseData,
            agentId: node.data.agentId,
            onClick: () => openWorkflowAgentWindow(session.id, workflow.id, node.id, node.data.agentId!),
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

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const handleSend = async () => {
    if (!input.trim() || linkedAgents.length === 0) return;
    await sendMessageToAgents(session.id, input, linkedAgents);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-2 shrink-0 h-[80px] flex items-center justify-between">
        <h2 className="text-lg font-semibold">{workflow.name}</h2>
        <div className="flex items-center gap-2">
          {hasMultipleAgents && multiAgentMode && (
            <button
              onClick={() => setChatLayoutMode(chatLayoutMode === 'A' ? 'B' : 'A')}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${
                chatLayoutMode === 'B'
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "bg-muted hover:bg-muted/70 text-muted-foreground border border-transparent"
              }`}
              title={chatLayoutMode === 'B' ? t("切换为并排视图") : t("切换为竖直视图")}
            >
              {chatLayoutMode === 'B' ? <List className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
              {chatLayoutMode === 'B' ? 'B' : 'A'}
            </button>
          )}
          {hasMultipleAgents && (
            <button
              onClick={() => setMultiAgentMode(!multiAgentMode)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${
                multiAgentMode
                  ? "bg-emerald-500/20 text-emerald-500"
                  : "bg-muted hover:bg-muted/70 text-muted-foreground"
              }`}
              title={multiAgentMode ? t("切换为拓扑视图") : t("切换为聊天视图")}
            >
              <Users className="h-3.5 w-3.5" />
              {multiAgentMode ? t("聊天") : t("拓扑")}
            </button>
          )}
          {isCollapsed && (
            <button
              onClick={() => setWorkflowSidebarCollapsed(session.id, false)}
              className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
              title={t('Show workflow panel')}
            >
              <Bot className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

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
                layoutMode={chatLayoutMode}
                actions={message.role === "assistant" ? {
                  canCopy: true,
                } : undefined}
              />
            ))}
          </div>
          <div className="border-t p-4 shrink-0">
            <div className="flex gap-2 max-w-4xl mx-auto">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`${t("Send message to all agents")}...`}
                className="min-h-[64px] text-sm"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim()}
                className="self-end h-11 w-11"
                aria-label={t("Send")}
              >
                <Send className="h-4 w-4" />
              </Button>
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
