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
import { RouterNode } from './nodes/RouterNode';
import { CodeNode } from './nodes/CodeNode';
import { LoopNode } from './nodes/LoopNode';
import { HttpRequestNode } from './nodes/HttpRequestNode';
import { SetTransformNode } from './nodes/SetTransformNode';
import { IfSwitchNode } from './nodes/IfSwitchNode';
import { WaitDelayNode } from './nodes/WaitDelayNode';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Trash2 } from 'lucide-react';

import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useTranslation } from '@/hooks/useTranslation';
import { PlayCircle } from 'lucide-react';
import { toast } from 'sonner';

// Create generic nodes for the ones we don't have yet so ReactFlow doesn't crash
const GenericNode = ({ data, id }: any) => {
  const { t } = useTranslation();
  return (
    <div className="bg-card border-2 border-primary rounded-lg p-3 shadow-md min-w-[150px]">
      <div className="font-semibold text-sm border-b pb-1 mb-2">{data.label}</div>
      <div className="text-xs text-muted-foreground">{t("Configure in sidebar")}</div>
      <div className="mt-2 text-right">
        <Button variant="ghost" size="sm" onClick={() => data.deleteNode && data.deleteNode(id)} className="h-6 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-1 ml-auto">
          <Trash2 className="h-3 w-3" /> {t("Delete")}
        </Button>
      </div>
    </div>
  );
};

  const nodeTypes = {
  trigger: TriggerNode,
  agent: AgentNode,
  output: OutputNode,
  condition: RouterNode,
  code: CodeNode,
  loop: LoopNode,
  http: HttpRequestNode,
  set: SetTransformNode,
  switch: IfSwitchNode,
  wait: WaitDelayNode,
  subworkflow: GenericNode,
  action: GenericNode,
  transformation: GenericNode
};

function Flow() {
  const activeWorkflow = useAppStore(state => state.getActiveWorkflow());
  const saveWorkflow = useAppStore(state => state.saveWorkflow);
  const workflowExecution = useAppStore(state => state.workflowExecution);
  const executeWorkflow = useAppStore(state => state.executeWorkflow);
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, []);

  // Load active workflow into canvas
  useEffect(() => {
    if (activeWorkflow) {
      setNodes((activeWorkflow.nodes_data || []).map((n: any) => ({ 
        ...n, 
        className: workflowExecution.currentNodeId === n.id ? 'ring-2 ring-primary ring-offset-2 animate-pulse' : '',
        data: { ...n.data, deleteNode } 
      })));
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
    const baseData: Record<string, any> = { label, deleteNode };

    if (type === 'agent') {
      Object.assign(baseData, { agentId: '', prompt: 'Configure me.' });
    }

    if (type === 'loop') {
      Object.assign(baseData, {
        itemsPath: 'payload.alivePlayers',
        itemAlias: 'item',
        indexAlias: 'index',
        maxIterations: 20,
        breakCondition: ''
      });
    }

    if (type === 'http') {
      Object.assign(baseData, { method: 'GET', url: '', headers: '', body: '', timeoutMs: 30000 });
    }

    if (type === 'set') {
      Object.assign(baseData, { mappings: [{ sourcePath: 'payload.llmResult', targetPath: 'output' }], constants: '', whitelist: '' });
    }

    if (type === 'switch') {
      Object.assign(baseData, {
        branches: [
          { id: 'true', label: 'True', condition: 'payload.value > 0' },
          { id: 'false', label: 'False', condition: 'true' },
        ]
      });
    }

    if (type === 'wait') {
      Object.assign(baseData, { waitMode: 'fixed', delayMs: 1000, untilExpression: '' });
    }

    const newNode: Node = {
      id: `${type}-${nodes.length + 1}-${Date.now()}`,
      type: type,
      position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
      data: baseData,
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleSave = () => {
    if (activeWorkflow) {
      saveWorkflow(activeWorkflow.id, nodes as any, edges as any);
      console.log('Workflow saved!');
      toast.success(t('Workflow saved successfully!'));
    }
  };

  // Re-sync local state when activeWorkflow changes
  useEffect(() => {
    if (activeWorkflow) {
      setNodes((activeWorkflow.nodes_data || []).map((n: any) => ({ ...n, data: { ...n.data, deleteNode } })));
      setEdges(activeWorkflow.edges_data || []);
    }
  }, [activeWorkflow]);

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
                      <div className="w-[180px]">
             <Select 
               onValueChange={(val) => {
                 if(val) {
                   addNode(val, 'New ' + val.charAt(0).toUpperCase() + val.slice(1));
                   // To "reset" the select, we don't control its value here directly, 
                   // but usually users just select and want to keep selecting, or it resets when losing focus/selecting same.
                   // As it's uncontrolled here without a value prop, it just triggers onValueChange.
                 }
               }}
             >
               <SelectTrigger className="h-9 bg-secondary text-secondary-foreground border shadow-sm">
                 <SelectValue placeholder={t("+ Add Node...")} />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="trigger">{t("Trigger Node")}</SelectItem>
                 <SelectItem value="agent">{t("Agent Node")}</SelectItem>
                 <SelectItem value="http">{t("HTTP Request")}</SelectItem>
                 <SelectItem value="set">{t("Set / Transform")}</SelectItem>
                 <SelectItem value="switch">{t("IF / Switch")}</SelectItem>
                 <SelectItem value="wait">{t("Wait / Delay")}</SelectItem>
                 <SelectItem value="condition">{t("Router/Condition Node")}</SelectItem>
                 <SelectItem value="code">{t("Code Execution Node")}</SelectItem>
                 <SelectItem value="loop">{t("Loop Node")}</SelectItem>
                 <SelectItem value="subworkflow">{t("SubWorkflow Node")}</SelectItem>
                 <SelectItem value="action">{t("Action Node")}</SelectItem>
                 <SelectItem value="transformation">{t("Data Transformation Node")}</SelectItem>
                 <SelectItem value="output">{t("Output Node")}</SelectItem>
               </SelectContent>
             </Select>
           </div>
           <Button
             variant="outline"
             onClick={() => {
               const isWerewolf = activeWorkflow?.name === 'Werewolf Game Logic';
               const initialPayload = isWerewolf 
                 ? { 
                     phase: "night", 
                     gameStatus: "playing",
                     players: [
                       { id: "p1", role: "werewolf", status: "alive" },
                       { id: "p2", role: "seer", status: "alive" },
                       { id: "p3", role: "witch", status: "alive" },
                       { id: "p4", role: "villager", status: "alive" }
                     ]
                   } 
                 : { text: "Hello from test input!", value: 75 };
               executeWorkflow(activeWorkflow!.id, initialPayload);
             }}
             size="sm"
             className="shadow-sm mr-2"
             disabled={workflowExecution.status === 'running'}
           >
             <PlayCircle className="h-4 w-4 mr-2" />
             {workflowExecution.status === 'running' ? 'Running...' : 'Test Run'}
           </Button>
           <Button onClick={handleSave} size="sm" className="shadow-sm">
             <Save className="h-4 w-4 mr-2" /> {t("Save Workflow")}
           </Button>
        </Panel>
      </ReactFlow>
      {workflowExecution.status !== 'idle' && (
        <div className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur border rounded-xl shadow-lg p-4 z-10 max-w-3xl mx-auto pointer-events-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-sm flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                workflowExecution.status === 'running' ? 'bg-blue-500 animate-pulse' :
                workflowExecution.status === 'completed' ? 'bg-emerald-500' : 'bg-red-500'
              }`}></div>
              Execution Result
            </h3>
            <div className="text-xs text-muted-foreground flex gap-4">
              {workflowExecution.status === 'error' && <span className="text-red-500">Error executing workflow</span>}
              <span>Current Node: {workflowExecution.currentNodeId || 'None'}</span>

              <button 
                className="hover:text-foreground underline ml-4 font-semibold text-primary" 
                onClick={() => {
                  const finalOutputId = Object.keys(workflowExecution.results).find(id => {
                     const node = activeWorkflow?.nodes_data.find(n => n.id === id);
                     return node && node.type === 'output';
                  });
                  const finalOutputPayload = finalOutputId ? workflowExecution.results[finalOutputId] : null;
                  
                  if (finalOutputPayload) {
                     executeWorkflow(activeWorkflow!.id, finalOutputPayload);
                  }
                }}
                disabled={workflowExecution.status === 'running'}
              >
                {workflowExecution.status === 'running' ? 'Running...' : 'Next Round (Loop)'}
              </button>
              <button 
                className="hover:text-foreground underline" 
                onClick={() => useAppStore.getState().setWorkflowExecutionState({ status: 'idle' })}
              >
                Clear
              </button>
            </div>
          </div>
          <div className="text-xs font-mono bg-muted/50 p-2 rounded-md max-h-[250px] overflow-auto">
            <pre>{JSON.stringify(workflowExecution.results[workflowExecution.currentNodeId || Object.keys(workflowExecution.results).pop() || ''] || {}, null, 2)}</pre>
          </div>
        </div>
      )}
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