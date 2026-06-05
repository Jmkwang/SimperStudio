import { Workflow, WorkflowNode } from '@/types/models';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { DebugBadge } from '@/components/debug/DebugBadge';
import { ChatTriggerNode } from '@/components/chat/ChatTriggerNode';
import { ChatAgentNode } from '@/components/chat/ChatAgentNode';
import { ChatOutputNode } from '@/components/chat/ChatOutputNode';
import { ChatCodeNode } from '@/components/chat/ChatCodeNode';
import { ChatLoopNode } from '@/components/chat/ChatLoopNode';
import { ChatRouterNode } from '@/components/chat/ChatRouterNode';

const genericNodeConfig: Record<string, { color: string; bg: string; label: string }> = {
  http: { color: '#06b6d4', bg: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-500', label: 'HTTP Request' },
  set: { color: '#6366f1', bg: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-500', label: 'Set / Transform' },
  switch: { color: '#f59e0b', bg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500', label: 'Switch' },
  wait: { color: '#14b8a6', bg: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-500', label: 'Wait / Delay' },
  merge: { color: '#f97316', bg: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-500', label: 'Merge' },
  webhook: { color: '#ef4444', bg: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-500', label: 'Webhook' },
  subworkflow: { color: '#a855f7', bg: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-500', label: 'Sub-workflow' },
};

function ChatGenericNode({ data, type }: { data: any; type: string }) {
  const c = genericNodeConfig[type] || { color: '#64748b', bg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', label: type };
  return (
    <div className="w-[240px] rounded-xl border bg-card text-card-foreground shadow-sm">
      <Handle type="target" position={Position.Left} className="w-3 h-3 border-2 bg-background" style={{ borderColor: c.color }} />
      <div className="flex items-center gap-3 border-b p-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${c.bg}`}>
          {type.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold leading-none truncate max-w-[140px]">{data.label || c.label}</p>
          <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 border-2 bg-background" style={{ borderColor: c.color }} />
    </div>
  );
}

function createGenericNode(type: string) {
  return function GenericNode({ data }: { data: any }) {
    return <ChatGenericNode data={data} type={type} />;
  };
}

export function WorkflowTopologyPreview({ workflow }: { workflow: Workflow }) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const colorMode = theme === 'dark'
    ? 'dark'
    : theme === 'system'
      ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : 'light';

  const nodeTypes = useMemo(() => ({
    trigger: ChatTriggerNode,
    agent: ChatAgentNode,
    output: ChatOutputNode,
    code: ChatCodeNode,
    loop: ChatLoopNode,
    condition: ChatRouterNode,
    http: createGenericNode('http'),
    set: createGenericNode('set'),
    switch: createGenericNode('switch'),
    wait: createGenericNode('wait'),
    merge: createGenericNode('merge'),
    webhook: createGenericNode('webhook'),
    subworkflow: createGenericNode('subworkflow'),
  }), []);

  const initialNodes = useMemo(() => {
    return (workflow.nodesData || []).map((node: WorkflowNode) => {
      const nodeType = node.type || 'default';

      if (nodeType === 'agent' && (node.data as any)?.agentId) {
        return {
          ...node,
          type: 'agent',
          data: {
            ...node.data,
            onClick: () => {},
          },
        };
      }

      return {
        ...node,
        type: nodeType,
      };
    });
  }, [workflow]);

  const initialEdges = useMemo(() => workflow.edgesData || [], [workflow]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes as any[]);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="relative flex-1 flex flex-col h-full">
      <DebugBadge id="WorkflowTopologyPreview" />
      <div className="absolute top-3 left-3 z-10 bg-background/80 backdrop-blur-sm border rounded-lg px-3 py-1 shadow-sm">
        <div className="text-sm font-medium">{workflow.name}</div>
        <div className="text-xs text-muted-foreground">
          {workflow.nodesData.length} {t('nodes')} · {workflow.edgesData.length} {t('edges')}
        </div>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={true}
        panOnScroll={false}
        panOnDrag={true}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        colorMode={colorMode}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="hsl(var(--muted-foreground) / 0.3)" />
        <Controls showInteractive={false} className="bg-card border shadow-sm rounded-lg [&>button]:border-border [&>button]:bg-card [&>button:hover]:bg-muted" />
        <MiniMap
          style={{ backgroundColor: 'hsl(var(--card))' }}
          nodeColor={(n) => {
            const colors: Record<string, string> = {
              trigger: '#10b981', agent: '#3b82f6', code: '#8b5cf6',
              condition: '#f59e0b', switch: '#f59e0b', loop: '#ec4899',
              http: '#06b6d4', set: '#6366f1', wait: '#14b8a6',
              merge: '#f97316', subworkflow: '#a855f7', output: '#22c55e',
              webhook: '#ef4444', router: '#f59e0b',
            };
            return colors[n.type as string] || '#64748b';
          }}
          maskColor="hsl(var(--background) / 0.6)"
          className="!rounded-lg !border !shadow-sm"
        />
      </ReactFlow>
      <div className="absolute bottom-3 left-3 z-10 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded border">
        {t('双击工作流进入会话')}
      </div>
    </div>
  );
}
