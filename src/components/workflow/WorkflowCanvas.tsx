import { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  BackgroundVariant,
  Panel,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TriggerNode } from './nodes/TriggerNode';
import { AgentNode } from './nodes/AgentNode';
import { OutputNode } from './nodes/OutputNode';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useTranslation } from '@/hooks/useTranslation';
import { toast } from 'sonner';

// Create generic nodes for the ones we don't have yet so ReactFlow doesn't crash
const GenericNode = ({ data }: any) => {
  const { t } = useTranslation();
  return (
  <div className="bg-card border-2 border-primary rounded-lg p-3 shadow-md min-w-[150px]">
    <div className="font-semibold text-sm border-b pb-1 mb-2">{data.label}</div>
    <div className="text-xs text-muted-foreground">{t("Configure in sidebar")}</div>
  </div>
  );
};

const nodeTypes = {
  trigger: TriggerNode,
  agent: AgentNode,
  output: OutputNode,
  condition: GenericNode,
  subworkflow: GenericNode,
  action: GenericNode,
  transformation: GenericNode
};

function Flow() {
  const activeWorkflow = useAppStore(state => state.getActiveWorkflow());
  const saveWorkflow = useAppStore(state => state.saveWorkflow);
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Load active workflow into canvas
  useEffect(() => {
    if (activeWorkflow) {
      setNodes(activeWorkflow.nodes_data || []);
      setEdges(activeWorkflow.edges_data || []);
    }
  }, [activeWorkflow?.id]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const addNode = (type: string, label: string) => {
    const newNode: Node = {
      id: `${type}-${nodes.length + 1}-${Date.now()}`,
      type: type,
      position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
      data: { label: label, ...(type === 'agent' ? { agentId: '', prompt: 'Configure me.' } : {}) },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleSave = () => {
    if (activeWorkflow) {
      saveWorkflow(activeWorkflow.id, nodes, edges);
      console.log('Workflow saved!');
      toast.success(t('Workflow saved successfully!'));
    }
  };

  return (
    <div className="flex-1 w-full h-full relative bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
        colorMode={theme === 'dark' ? 'dark' : theme === 'system' ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : 'light'}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} className="opacity-40" />
        <Controls className="bg-card border shadow-sm rounded-lg" />
        <Panel position="top-right" className="flex gap-2">
                      <select 
             className="h-9 px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm border shadow-sm"
             onChange={(e) => {
               if(e.target.value) {
                 addNode(e.target.value, 'New ' + e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1));
                 e.target.value = ''; // reset
               }
             }}
           >
             <option value="">{t("+ Add Node...")}</option>
             <option value="trigger">{t("Trigger Node")}</option>
             <option value="agent">{t("Agent Node")}</option>
             <option value="condition">{t("Condition Node")}</option>
             <option value="subworkflow">{t("SubWorkflow Node")}</option>
             <option value="action">{t("Action Node")}</option>
             <option value="transformation">{t("Data Transformation Node")}</option>
             <option value="output">{t("Output Node")}</option>
           </select>
           <Button onClick={handleSave} size="sm" className="shadow-sm">
             <Save className="h-4 w-4 mr-2" /> {t("Save Workflow")}
           </Button>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}