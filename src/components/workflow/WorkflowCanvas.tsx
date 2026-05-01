import { useState, useCallback, useEffect, useRef } from 'react';
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
import { MergeNode } from './nodes/MergeNode';
import { WebhookTriggerNode } from './nodes/WebhookTriggerNode';
import { SubWorkflowNode } from './nodes/SubWorkflowNode';
import { ExecutionTimeline } from './ExecutionTimeline';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus } from 'lucide-react';
import { Save, Trash2, Download, Upload, ClipboardPaste } from 'lucide-react';

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
  merge: MergeNode,
  webhook: WebhookTriggerNode,
  subworkflow: SubWorkflowNode,
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pasteJson, setPasteJson] = useState('');
  const [pasteError, setPasteError] = useState('');

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
        className: workflowExecution.currentNodeId === n.id ? 'ring-2 ring-primary ring-offset-2 motion-safe:animate-pulse' : '',
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

    if (type === 'merge') {
      Object.assign(baseData, { strategy: 'append', mergeKey: 'id' });
    }

    if (type === 'webhook') {
      Object.assign(baseData, { webhookMethod: 'POST', webhookPath: '/webhook/' + Date.now(), authToken: '' });
    }

    if (type === 'subworkflow') {
      Object.assign(baseData, { subWorkflowId: '', inputMapping: '' });
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

  const handleExport = () => {
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
  };

  const validateAndImport = (json: string) => {
    setPasteError('');
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed.nodes)) throw new Error('Missing "nodes" array');
      if (!Array.isArray(parsed.edges)) throw new Error('Missing "edges" array');
      for (const node of parsed.nodes) {
        if (!node.id || !node.type || !node.position) throw new Error(`Node missing id/type/position: ${JSON.stringify(node)}`);
      }
      const nodeIds = new Set(parsed.nodes.map((n: any) => n.id));
      for (const edge of parsed.edges) {
        if (!edge.source || !edge.target) throw new Error(`Edge missing source/target: ${JSON.stringify(edge)}`);
        if (!nodeIds.has(edge.source)) throw new Error(`Edge references non-existent source node: ${edge.source}`);
        if (!nodeIds.has(edge.target)) throw new Error(`Edge references non-existent target node: ${edge.target}`);
      }
      const importNodes = parsed.nodes.map((n: any) => ({ ...n, data: { ...n.data, deleteNode } }));
      setNodes(importNodes);
      setEdges(parsed.edges);
      setShowPasteDialog(false);
      setPasteJson('');
      toast.success(t('Workflow imported'));
    } catch (e: any) {
      setPasteError(e.message);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => validateAndImport(reader.result as string);
    reader.readAsText(file);
    e.target.value = '';
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
           <Popover>
             <PopoverTrigger asChild>
               <Button variant="secondary" size="sm" className="h-9 shadow-sm border">
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
                   </CommandGroup>
                   <CommandGroup heading={t("Integration")}>
                     <CommandItem onSelect={() => addNode('subworkflow', 'Sub-workflow')}>{t("Sub-workflow")}</CommandItem>
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
           <Button onClick={handleExport} variant="outline" size="sm" className="shadow-sm">
             <Download className="h-4 w-4 mr-1" /> {t("Export")}
           </Button>
           <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm" className="shadow-sm">
             <Upload className="h-4 w-4 mr-1" /> {t("Import")}
           </Button>
           <Button onClick={() => { setShowPasteDialog(true); setPasteJson(''); setPasteError(''); }} variant="outline" size="sm" className="shadow-sm">
             <ClipboardPaste className="h-4 w-4 mr-1" /> {t("Paste")}
           </Button>
           <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileImport} />
        </Panel>
      </ReactFlow>
      <ExecutionTimeline />
      <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
        <DialogContent className="sm:max-w-[600px] rounded-xl">
          <DialogHeader>
            <DialogTitle>{t("Paste Workflow JSON")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              value={pasteJson}
              onChange={(e) => { setPasteJson(e.target.value); setPasteError(''); }}
              placeholder='{"nodes": [...], "edges": [...]}'
              className="font-mono text-xs h-[300px] resize-none"
            />
            {pasteError && <p className="text-sm text-red-500">{pasteError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasteDialog(false)}>{t("Cancel")}</Button>
            <Button onClick={() => validateAndImport(pasteJson)}>{t("Import")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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