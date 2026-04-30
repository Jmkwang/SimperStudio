import { useMemo } from 'react';
import { ChatSession, WorkflowNode, WorkflowNodeData } from '@/types/models';
import { useAppStore } from '@/store/appStore';
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

export function WorkflowChatView({ session }: { session: ChatSession }) {
  const workflows = useAppStore(state => state.workflows);
  const openWorkflowAgentWindow = useAppStore(state => state.openWorkflowAgentWindow);
  const workflowChatUI = useAppStore(state => state.workflowChatUI);
  const { t } = useTranslation();

  const workflow = session.workflowId ? workflows.find(item => item.id === session.workflowId) : undefined;
  const { theme } = useTheme();

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
    return (workflow.nodes_data || []).map((node: WorkflowNode) => {
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

  const initialEdges = useMemo(() => workflow.edges_data || [], [workflow]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-2 shrink-0">
        <h2 className="text-lg font-semibold">{workflow.name}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('Choose a node to open its conversation window.')}</p>
      </div>

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
    </div>
  );
}
