import { useAppStore } from '@/stores';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, RotateCcw, Download, ChevronDown, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useDebugTrack } from '@/hooks/useDebugTrack';
import { toast } from 'sonner';

const statusConfig: Record<string, {
  dotClass: string;
  textClass: string;
  label: string;
  icon: typeof CheckCircle2 | null;
  animate: string;
}> = {
  running: {
    dotClass: 'bg-primary motion-safe:animate-pulse',
    textClass: 'text-primary',
    label: 'Running',
    icon: null,
    animate: '',
  },
  success: {
    dotClass: 'bg-green-500',
    textClass: 'text-green-600 dark:text-green-400',
    label: 'Completed',
    icon: CheckCircle2,
    animate: 'motion-safe:animate-success-pop',
  },
  error: {
    dotClass: 'bg-destructive',
    textClass: 'text-destructive',
    label: 'Execution Error',
    icon: AlertCircle,
    animate: 'motion-safe:animate-error-shake',
  },
  skipped: {
    dotClass: 'bg-muted-foreground/30',
    textClass: 'text-muted-foreground',
    label: 'Skipped',
    icon: null,
    animate: '',
  },
  pending: {
    dotClass: 'bg-muted-foreground/20',
    textClass: 'text-muted-foreground',
    label: 'Waiting',
    icon: null,
    animate: '',
  },
  retrying: {
    dotClass: 'bg-yellow-500 motion-safe:animate-pulse',
    textClass: 'text-yellow-600 dark:text-yellow-400',
    label: 'Retrying',
    icon: null,
    animate: '',
  },
};

export function ExecutionTimeline() {
  const { t } = useTranslation();
  const workflowExecution = useAppStore(state => state.workflowExecution);
  const activeWorkflow = useAppStore(state => state.getActiveWorkflow());
  const executeWorkflow = useAppStore(state => state.executeWorkflow);
  const setWorkflowExecutionState = useAppStore(state => state.setWorkflowExecutionState);
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const prevStatusRef = useRef(workflowExecution.status);
  const [showGlobalFeedback, setShowGlobalFeedback] = useState(false);
  const { trackClick } = useDebugTrack('ExecutionTimeline');

  useEffect(() => {
    const prev = prevStatusRef.current;
    const curr = workflowExecution.status;
    if (prev === 'running' && (curr === 'completed' || curr === 'error')) {
      setShowGlobalFeedback(true);
      // Toast notification for workflow completion/failure
      if (curr === 'completed') {
        toast.success(t('工作流执行完成'));
      } else {
        toast.error(t('工作流执行失败'));
      }
      const timer = setTimeout(() => setShowGlobalFeedback(false), 3000);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = curr;
  }, [workflowExecution.status]);

  if (workflowExecution.status === 'idle') return null;

  const nodeRecords = workflowExecution.nodeRecords || {};
  const nodes = activeWorkflow?.nodesData || [];
  const sortedNodes = nodes.filter(n => nodeRecords[n.id]).sort((a, b) => {
    const ta = nodeRecords[a.id]?.startTime || 0;
    const tb = nodeRecords[b.id]?.startTime || 0;
    return ta - tb;
  });

  const successCount = sortedNodes.filter(n => nodeRecords[n.id]?.status === 'success').length;
  const errorCount = sortedNodes.filter(n => nodeRecords[n.id]?.status === 'error').length;
  const totalCount = sortedNodes.length;

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

  const handleRerunAll = () => {
    if (!activeWorkflow) return;
    executeWorkflow(activeWorkflow.id, {});
  };

  const isCompleted = workflowExecution.status === 'completed';
  const isError = workflowExecution.status === 'error';

  return (
    <div className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur border rounded-xl shadow-lg p-4 z-10 max-w-3xl mx-auto pointer-events-auto max-sm:bottom-2 max-sm:left-2 max-sm:right-2 max-sm:p-3">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          {/* Global status indicator with micro-interaction */}
          <div className="relative">
            <div
              className={cn('w-2.5 h-2.5 rounded-full', {
                'bg-primary motion-safe:animate-pulse': workflowExecution.status === 'running',
                'bg-green-500 motion-safe:animate-success-pop': isCompleted,
                'bg-destructive motion-safe:animate-error-shake': isError,
              })}
            />
            {/* Success ring expansion effect */}
            {showGlobalFeedback && isCompleted && (
              <span className="absolute inset-0 rounded-full bg-green-500/30 motion-safe:animate-ring-expand" />
            )}
          </div>

          <h3 className="font-semibold text-sm">
            {t('Execution Timeline')}
          </h3>

          {/* Global feedback badge */}
          {showGlobalFeedback && (
            <span
              className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full motion-safe:animate-fade-in-up',
                isCompleted
                  ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                  : 'bg-destructive/15 text-destructive'
              )}
            >
              {isCompleted
                ? `${t('执行完成')} (${successCount}/${totalCount})`
                : `${t('执行出错')} (${errorCount} ${t('个节点失败')})`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isError && (
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] px-2 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={trackClick(handleRerunAll, 'timeline:rerunAll')}
              aria-label={t('一键重试')}
            >
              <RotateCcw className="h-3 w-3 mr-1" /> {t('一键重试')}
            </Button>
          )}
          <Button variant="ghost" size="sm" className="min-h-[44px] px-2 text-xs" onClick={trackClick(handleExport, 'timeline:export')} aria-label={t('导出执行日志')}>
            <Download className="h-3 w-3 mr-1" /> Export
          </Button>
          <Button variant="ghost" size="sm" className="min-h-[44px] px-2 text-xs" onClick={trackClick(() => setWorkflowExecutionState({ status: 'idle' }), 'timeline:close')} aria-label={t('关闭执行时间线')}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          {successCount} {t('成功')}
        </span>
        {errorCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
            {errorCount} {t('失败')}
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
          {totalCount - successCount - errorCount} {t('其他')}
        </span>
      </div>

      {/* Node list */}
      <div className="space-y-1 max-h-[250px] max-sm:max-h-[180px] overflow-y-auto pr-1">
        {sortedNodes.map((node) => {
          const record = nodeRecords[node.id];
          if (!record) return null;
          const isExpanded = expandedNode === node.id;
          const config = statusConfig[record.status] || statusConfig.pending;
          const StatusIcon = config.icon;

          return (
            <div key={node.id} className="border rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-3 min-h-[44px] text-left hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedNode(isExpanded ? null : node.id)}
                aria-expanded={isExpanded}
                aria-controls={`node-detail-${node.id}`}
              >
                {/* Status dot with micro-interaction */}
                <div className="relative shrink-0">
                  <div className={cn('w-2 h-2 rounded-full', config.dotClass, config.animate)} />
                  {record.status === 'success' && (
                    <span className="absolute inset-0 rounded-full bg-green-500/20 motion-safe:animate-ring-expand" />
                  )}
                </div>

                {/* Node label */}
                <span className="text-xs font-medium flex-1 truncate">{node.data?.label || node.id}</span>

                {/* Status icon + text */}
                <div className="flex items-center gap-2">
                  {StatusIcon && (
                    <StatusIcon className={cn('h-3.5 w-3.5 motion-safe:animate-icon-reveal', config.textClass)} />
                  )}
                  <span className={cn('text-xs font-medium', config.textClass)}>
                    {t(config.label)}
                  </span>
                </div>

                {record.durationMs != null && (
                  <span className="text-xs text-muted-foreground font-mono">{record.durationMs}ms</span>
                )}

                {/* Retry button for failed nodes */}
                {record.status === 'error' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-[44px] px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleRerunFromNode(node.id); }}
                    aria-label={`${t('重试节点')} ${node.data?.label || node.id}`}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" /> {t('重试')}
                  </Button>
                )}

                {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </button>

              {/* Expanded detail panel */}
              {isExpanded && (
                <div id={`node-detail-${node.id}`} className="px-3 pb-2 border-t bg-muted/20">
                  {record.error && (
                    <div className="mt-2 p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="h-3 w-3 text-destructive" />
                        <span className="text-xs font-medium text-destructive">{t('执行出错')}</span>
                      </div>
                      <p className="text-xs text-destructive">{record.error}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 min-h-[44px] text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => handleRerunFromNode(node.id)}
                        aria-label={`${t('重新执行节点')} ${node.data?.label || node.id}`}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" /> {t('重新执行')}
                      </Button>
                    </div>
                  )}
                  {record.attempts > 1 && (
                    <p className="text-xs text-foreground/70 mt-2">{t('尝试次数')}: {record.attempts}</p>
                  )}
                  {workflowExecution.results[node.id] && (
                    <pre className="text-xs font-mono text-foreground/80 mt-2 max-h-[100px] overflow-auto bg-muted/50 p-2 rounded">
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
