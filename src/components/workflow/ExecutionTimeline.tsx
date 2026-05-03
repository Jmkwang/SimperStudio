import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, RotateCcw, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const statusColors: Record<string, string> = {
  running: 'bg-blue-500 motion-safe:animate-pulse',
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  skipped: 'bg-muted-foreground/30',
  pending: 'bg-muted-foreground/20',
  retrying: 'bg-amber-500 motion-safe:animate-pulse',
};

const statusTextColors: Record<string, string> = {
  running: 'text-blue-600 dark:text-blue-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-red-600 dark:text-red-400',
  skipped: 'text-muted-foreground',
  pending: 'text-muted-foreground',
  retrying: 'text-amber-600 dark:text-amber-400',
};

export function ExecutionTimeline() {
  const workflowExecution = useAppStore(state => state.workflowExecution);
  const activeWorkflow = useAppStore(state => state.getActiveWorkflow());
  const executeWorkflow = useAppStore(state => state.executeWorkflow);
  const setWorkflowExecutionState = useAppStore(state => state.setWorkflowExecutionState);
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  if (workflowExecution.status === 'idle') return null;

  const nodeRecords = workflowExecution.nodeRecords || {};
  const nodes = activeWorkflow?.nodesData || [];
  const sortedNodes = nodes.filter(n => nodeRecords[n.id]).sort((a, b) => {
    const ta = nodeRecords[a.id]?.startTime || 0;
    const tb = nodeRecords[b.id]?.startTime || 0;
    return ta - tb;
  });

  const handleExport = () => {
    const log = {
      workflowId: activeWorkflow?.id,
      workflowName: activeWorkflow?.name,
      status: workflowExecution.status,
      nodeRecords,
      results: workflowExecution.results,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execution-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRerunFromNode = (nodeId: string) => {
    if (!activeWorkflow) return;
    const nodePayload = workflowExecution.results[nodeId] || {};
    executeWorkflow(activeWorkflow.id, nodePayload, { startNodeId: nodeId });
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur border rounded-xl shadow-lg p-4 z-10 max-w-3xl mx-auto pointer-events-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', {
            'bg-blue-500 motion-safe:animate-pulse': workflowExecution.status === 'running',
            'bg-emerald-500': workflowExecution.status === 'completed',
            'bg-red-500': workflowExecution.status === 'error',
          })} />
          Execution Timeline
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleExport}>
            <Download className="h-3 w-3 mr-1" /> Export
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setWorkflowExecutionState({ status: 'idle' })}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
        {sortedNodes.map((node) => {
          const record = nodeRecords[node.id];
          if (!record) return null;
          const isExpanded = expandedNode === node.id;
          return (
            <div key={node.id} className="border rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedNode(isExpanded ? null : node.id)}
              >
                <div className={cn('w-2 h-2 rounded-full shrink-0', statusColors[record.status] || 'bg-gray-400')} />
                <span className="text-xs font-medium flex-1 truncate">{node.data?.label || node.id}</span>
                <span className={cn('text-[10px] font-mono', statusTextColors[record.status])}>{record.status}</span>
                {record.durationMs != null && (
                  <span className="text-[10px] text-muted-foreground font-mono">{record.durationMs}ms</span>
                )}
                {record.status === 'error' && (
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); handleRerunFromNode(node.id); }}
                    aria-label="Rerun from this node"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
                {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </button>
              {isExpanded && (
                <div className="px-3 pb-2 border-t bg-muted/20">
                  {record.error && <p className="text-xs text-red-500 mt-1">Error: {record.error}</p>}
                  {record.attempts > 0 && <p className="text-[10px] text-muted-foreground mt-1">Attempts: {record.attempts}</p>}
                  {workflowExecution.results[node.id] && (
                    <pre className="text-[10px] font-mono text-muted-foreground mt-1 max-h-[100px] overflow-auto bg-muted/50 p-1 rounded">
                      {JSON.stringify(workflowExecution.results[node.id], null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
