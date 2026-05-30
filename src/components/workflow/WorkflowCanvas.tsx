import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
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
  ReactFlowProvider,
  useReactFlow
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
import { MergeNode } from './nodes/MergeNode';
import { WebhookTriggerNode } from './nodes/WebhookTriggerNode';
import { SubWorkflowNode } from './nodes/SubWorkflowNode';
import { DynamicAgentNode } from './nodes/DynamicAgentNode';
import { CliAgentNode } from './nodes/CliAgentNode';
import { ExecutionTimeline } from './ExecutionTimeline';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Save, Trash2, Download, PlayCircle, MoreHorizontal } from 'lucide-react';
import { useAppStore } from '@/stores';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useTranslation } from '@/hooks/useTranslation';
import { toast } from 'sonner';
import { DebugBadge } from '@/components/debug/DebugBadge';
import { useDebugTrack } from '@/hooks/useDebugTrack';
import type { Workflow } from '@/types/models';

// Create generic nodes for the ones we don't have yet so ReactFlow doesn't crash
const GenericNode = ({ data, id }: any) => {
  const { t } = useTranslation();
  return (
    <div className="bg-card border-2 border-primary rounded-lg p-3 shadow-md min-w-[150px]">
      <div className="font-semibold text-sm border-b pb-1 mb-2">{data.label}</div>
      <div className="text-xs text-muted-foreground">{t("Configure in sidebar")}</div>
      <div className="mt-2 text-right">
        <Button variant="ghost" size="sm" onClick={() => data.deleteNode && data.deleteNode(id)} className="h-6 px-2 text-xs text-destructive hover:text-destructive/80 hover:bg-destructive/10 flex items-center gap-1 ml-auto">
          <Trash2 className="h-3 w-3" /> {t("Delete")}
        </Button>
      </div>
    </div>
  );
};

  const nodeTypes = {
  trigger: TriggerNode,
  agent: AgentNode,
  'dynamic-agent': DynamicAgentNode,
  output: OutputNode,
  condition: RouterNode,
  code: CodeNode,
  loop: LoopNode,
  http: HttpRequestNode,
  set: SetTransformNode,
  switch: IfSwitchNode,
  wait: WaitDelayNode,
  merge: MergeNode,
  webhook: WebhookTriggerNode,
  subworkflow: SubWorkflowNode,
  'cli-agent': CliAgentNode,
  action: GenericNode,
  transformation: GenericNode
};

const nodeDefaultDataBuilders: Record<string, () => Record<string, any>> = {
  agent: () => ({ agentId: '', prompt: 'Configure me.' }),
  'dynamic-agent': () => ({
    configSource: 'inline',
    inlineConfig: { systemPromptTemplate: '' },
    outputField: 'llmResult',
  }),
  loop: () => ({
    itemsPath: 'payload.alivePlayers',
    itemAlias: 'item',
    indexAlias: 'index',
    maxIterations: 20,
    breakCondition: ''
  }),
  http: () => ({ method: 'GET', url: '', headers: '', body: '', timeoutMs: 30000 }),
  set: () => ({ mappings: [{ sourcePath: 'payload.llmResult', targetPath: 'output' }], constants: '', whitelist: '' }),
  switch: () => ({
    branches: [
      { id: 'true', label: 'True', condition: 'payload.value > 0' },
      { id: 'false', label: 'False', condition: 'true' },
    ]
  }),
  wait: () => ({ waitMode: 'fixed', delayMs: 1000, untilExpression: '' }),
  merge: () => ({ strategy: 'append', mergeKey: 'id' }),
  webhook: () => ({ webhookMethod: 'POST', webhookPath: '/webhook/' + Date.now(), authToken: '' }),
  subworkflow: () => ({ subWorkflowId: '', inputMapping: '' }),
  'cli-agent': () => ({
    mode: 'preset',
    presetId: 'claude-code',
    inputMode: 'prompt-template',
    promptTemplate: '',
    outputField: 'cliOutput',
    parseJson: true,
    captureStderr: true,
    streamToChat: true,
    requireConfirmation: true,
  })
};

function Flow() {
  const activeWorkflow = useAppStore(state => state.getActiveWorkflow());
  const saveWorkflow = useAppStore(state => state.saveWorkflow);
  const workflowExecution = useAppStore(state => state.workflowExecution);
  const executeWorkflow = useAppStore(state => state.executeWorkflow);
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const { t } = useTranslation();
  const { trackClick, track } = useDebugTrack('WorkflowCanvas');
  const reactFlowInstance = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, []);

  // Load active workflow into canvas
  useEffect(() => {
    if (activeWorkflow) {
      setNodes((activeWorkflow.nodesData || []).map((n: any) => ({
        ...n,
        className: workflowExecution.currentNodeId === n.id ? 'ring-2 ring-primary ring-offset-2 motion-safe:animate-pulse' : '',
        data: { ...n.data, deleteNode }
      })));
      setEdges(activeWorkflow.edgesData || []);
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
    track('click', `addNode:${type}`, { label });
    const defaultDataBuilder = nodeDefaultDataBuilders[type];
    const defaultData = defaultDataBuilder ? defaultDataBuilder() : {};

    // Place node at viewport center, with slight random offset
    let position = { x: 100, y: 100 };
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      position = reactFlowInstance.screenToFlowPosition({
        x: rect.left + rect.width / 2 + (Math.random() - 0.5) * 60,
        y: rect.top + rect.height / 2 + (Math.random() - 0.5) * 60,
      });
    }

    const newNode: Node = {
      id: `${type}-${nodes.length + 1}-${Date.now()}`,
      type: type,
      position,
      data: { label, deleteNode, ...defaultData },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleSave = trackClick(() => {
    if (activeWorkflow) {
      saveWorkflow(activeWorkflow.id, nodes as any, edges as any);
      console.log('Workflow saved!');
      toast.success(t('Workflow saved successfully!'));
    }
  }, 'workflow:save');

  const handleExport = trackClick(() => {
    const exportData = {
      nodes: nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: { ...n.data, deleteNode: undefined } })),
      edges,
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeWorkflow?.name || 'workflow'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('Workflow exported'));
  }, 'workflow:export');

  return (
    <div ref={containerRef} className="flex-1 w-full h-full relative bg-background">
      <DebugBadge id="WorkflowCanvas" />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
        colorMode={isDark ? 'dark' : 'light'}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} className="opacity-40" />
        <Controls className="bg-card border shadow-sm rounded-lg" />
        <MiniMap
          bgColor={isDark ? 'hsl(224 16% 6%)' : 'hsl(0 0% 100%)'}
          maskColor={isDark ? 'hsla(224, 16%, 6%, 0.65)' : 'hsla(0, 0%, 100%, 0.65)'}
          nodeColor={isDark ? 'hsl(220 8% 52%)' : 'hsl(240 5% 42%)'}
          maskStrokeColor={isDark ? 'hsl(220 8% 52%)' : 'hsl(240 8% 85%)'}
        />
        <Panel position="top-right" className="flex gap-2 items-start">
           <Popover>
             <PopoverTrigger asChild>
               <Button variant="outline" size="sm" className="h-8 shadow-sm">
                 <Plus className="h-4 w-4 mr-1" /> {t("Add Node")}
               </Button>
             </PopoverTrigger>
             <PopoverContent className="w-[260px] p-0" align="end">
               <Command>
                 <CommandInput placeholder={t("Search nodes...")} />
                 <CommandList>
                   <CommandEmpty>{t("No node found.")}</CommandEmpty>
                   <CommandGroup heading={t("Trigger")}>
                     <CommandItem onSelect={() => addNode('trigger', 'Trigger')}>{t("Trigger")}</CommandItem>
                     <CommandItem onSelect={() => addNode('webhook', 'Webhook Trigger')}>{t("Webhook Trigger")}</CommandItem>
                   </CommandGroup>
                   <CommandGroup heading={t("Flow Control")}>
                     <CommandItem onSelect={() => addNode('switch', 'IF / Switch')}>{t("IF / Switch")}</CommandItem>
                     <CommandItem onSelect={() => addNode('condition', 'Router')}>{t("Router / Condition")}</CommandItem>
                     <CommandItem onSelect={() => addNode('loop', 'Loop')}>{t("Loop")}</CommandItem>
                     <CommandItem onSelect={() => addNode('merge', 'Merge')}>{t("Merge")}</CommandItem>
                     <CommandItem onSelect={() => addNode('wait', 'Wait / Delay')}>{t("Wait / Delay")}</CommandItem>
                   </CommandGroup>
                   <CommandGroup heading={t("Data")}>
                     <CommandItem onSelect={() => addNode('http', 'HTTP Request')}>{t("HTTP Request")}</CommandItem>
                     <CommandItem onSelect={() => addNode('set', 'Set / Transform')}>{t("Set / Transform")}</CommandItem>
                     <CommandItem onSelect={() => addNode('code', 'Code Execution')}>{t("Code Execution")}</CommandItem>
                   </CommandGroup>
                   <CommandGroup heading={t("AI")}>
                     <CommandItem onSelect={() => addNode('agent', 'Agent')}>{t("Agent")}</CommandItem>
                     <CommandItem onSelect={() => addNode('dynamic-agent', 'Dynamic Agent')}>{t("Dynamic Agent")}</CommandItem>
                   </CommandGroup>
                   <CommandGroup heading={t("Integration")}>
                     <CommandItem onSelect={() => addNode('subworkflow', 'Sub-workflow')}>{t("Sub-workflow")}</CommandItem>
                   </CommandGroup>
                   <CommandGroup heading={t("CLI")}>
                     <CommandItem onSelect={() => addNode('cli-agent', 'CLI Agent')}>{t("CLI Agent")}</CommandItem>
                   </CommandGroup>
                   <CommandGroup heading={t("Output")}>
                     <CommandItem onSelect={() => addNode('output', 'Output')}>{t("Output")}</CommandItem>
                   </CommandGroup>
                 </CommandList>
               </Command>
             </PopoverContent>
           </Popover>
           <Button
             variant="outline"
             onClick={trackClick(() => {
               const initialPayload = (activeWorkflow as Workflow)?.testPayload ?? { text: "Hello from test input!", value: 75 };
               executeWorkflow(activeWorkflow!.id, initialPayload);
             }, 'workflow:test-run')}
             size="sm"
             className="h-8 shadow-sm"
             disabled={workflowExecution.status === 'running'}
           >
             <PlayCircle className="h-4 w-4 mr-1" />
             {workflowExecution.status === 'running' ? t('Running...') : t('Test Run')}
           </Button>
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button size="sm" className="h-8 shadow-sm">
                 <Save className="h-4 w-4 mr-1" /> {t("Save")}
                 <MoreHorizontal className="h-3 w-3 ml-1 opacity-60" />
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end">
               <DropdownMenuItem onClick={handleSave}>
                 <Save className="h-4 w-4 mr-2" /> {t("Save")}
               </DropdownMenuItem>
               <DropdownMenuItem onClick={handleExport}>
                 <Download className="h-4 w-4 mr-2" /> {t("Export")}
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
        </Panel>
      </ReactFlow>
      <ExecutionTimeline />
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
