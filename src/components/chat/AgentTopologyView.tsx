import { useMemo } from 'react';
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
import { ChatAgentNode } from './ChatAgentNode';
import { AgentChatWindow } from './AgentChatWindow';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/components/theme/ThemeProvider';

export function AgentTopologyView({ sessionId }: { sessionId: string }) {
  const agents = useAppStore(state => state.agents);
  const openAgentChatWindow = useAppStore(state => state.openAgentChatWindow);
  const workflowChatUI = useAppStore(state => state.workflowChatUI);
  const { t } = useTranslation();
  const { theme } = useTheme();

  const sessionWindows = workflowChatUI.agentChatWindows.filter(
    window => window.sessionId === sessionId
  );

  const colorMode = theme === 'dark'
    ? 'dark'
    : theme === 'system'
      ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : 'light';
  const isDark = colorMode === 'dark';

  const nodeTypes = useMemo(() => ({
    agent: ChatAgentNode,
  }), []);

  const initialNodes = useMemo(() => {
    return agents.map((agent, index) => ({
      id: agent.id,
      type: 'agent',
      position: { x: 100 + (index % 3) * 220, y: 100 + Math.floor(index / 3) * 160 },
      data: {
        agentId: agent.id,
        label: agent.name,
        onClick: () => openAgentChatWindow(sessionId, agent.id),
      },
    }));
  }, [agents, sessionId]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState([]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-2 shrink-0">
        <h2 className="text-lg font-semibold">{t('选择智能体开始对话')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('点击智能体节点打开对话窗口')}
        </p>
      </div>
      <div className="flex-1 relative bg-card">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          className="bg-card"
          colorMode={colorMode}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} className={isDark ? 'opacity-30' : 'opacity-40'} color="hsl(var(--muted-foreground) / 0.3)" />
          <Controls className="bg-card border shadow-sm rounded-lg [&>button]:border-border [&>button]:bg-card [&>button:hover]:bg-muted" />
          <MiniMap
            bgColor="hsl(var(--card))"
            maskColor="hsl(var(--background) / 0.65)"
            nodeColor="hsl(var(--muted))"
            maskStrokeColor="hsl(var(--muted-foreground) / 0.25)"
          />
        </ReactFlow>
      </div>

      {sessionWindows.map(windowData => (
        <AgentChatWindow key={windowData.id} windowData={windowData} />
      ))}
    </div>
  );
}
