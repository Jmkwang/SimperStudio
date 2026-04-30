import { useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AgentNode } from './AgentNode';
import { AgentChatWindow } from './AgentChatWindow';
import { useTranslation } from '@/hooks/useTranslation';

export function AgentTopologyView({ sessionId }: { sessionId: string }) {
  const agents = useAppStore(state => state.agents);
  const openAgentChatWindow = useAppStore(state => state.openAgentChatWindow);
  const workflowChatUI = useAppStore(state => state.workflowChatUI);
  const { t } = useTranslation();

  const sessionWindows = workflowChatUI.agentChatWindows.filter(
    window => window.sessionId === sessionId
  );

  const nodeTypes = useMemo(() => ({
    agent: AgentNode,
  }), []);

  const initialNodes = useMemo(() => {
    return agents.map((agent, index) => ({
      id: agent.id,
      type: 'agent',
      position: { x: 100 + (index % 3) * 220, y: 100 + Math.floor(index / 3) * 160 },
      data: { agent, onClick: () => openAgentChatWindow(sessionId, agent.id) },
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
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {sessionWindows.map(windowData => (
        <AgentChatWindow key={windowData.id} windowData={windowData} />
      ))}
    </div>
  );
}
