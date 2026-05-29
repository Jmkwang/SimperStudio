import { useAppStore } from '@/stores';
import { useTranslation } from '@/hooks/useTranslation';
import { Workflow, GitBranch, ArrowRight, Zap } from 'lucide-react';
import { DebugBadge } from '@/components/debug/DebugBadge';

export function WorkflowChatPlaceholder() {
  const { t } = useTranslation();
  const workflows = useAppStore(state => state.workflows);
  const openWorkflowSession = useAppStore(state => state.openWorkflowSession);

  const recentWorkflows = workflows.slice(0, 4);

  return (
    <div className="relative flex-1 flex flex-col h-full">
      <DebugBadge id="WorkflowChatPlaceholder" position="bottom-left" />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center max-w-lg w-full gap-8">
          {/* Icon area */}
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
              <GitBranch className="h-10 w-10 text-primary/60" strokeWidth={1.5} />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/15">
              <Zap className="h-4 w-4 text-emerald-500/70" strokeWidth={1.5} />
            </div>
          </div>

          {/* Text */}
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              {t('工作流对话')}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              {t('创建工作流会话，与多个 Agent 协同对话，执行自动化工作流。')}
            </p>
          </div>

          {/* Quick start cards */}
          {recentWorkflows.length > 0 ? (
            <div className="w-full space-y-3">
              <p className="text-xs text-muted-foreground text-center">
                {t('快速开始')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {recentWorkflows.map(workflow => {
                  const nodeCount = workflow.nodesData?.length || 0;
                  return (
                    <button
                      key={workflow.id}
                      onClick={() => openWorkflowSession(workflow.id)}
                      className="group flex items-center gap-3 rounded-lg border border-border bg-card/50 p-2.5 text-left transition-all duration-200 hover:bg-muted/50 hover:border-primary/20 hover:shadow-sm"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 border border-border/50 group-hover:bg-primary/10 group-hover:border-primary/15 transition-colors">
                        <Workflow className="h-4 w-4 text-muted-foreground group-hover:text-primary/70 transition-colors" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{workflow.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {nodeCount} {t('节点')}
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all -translate-x-1 group-hover:translate-x-0" strokeWidth={1.5} />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-lg border border-dashed border-foreground/[0.08] bg-muted/20 px-6 py-4 text-center">
                <p className="text-xs text-muted-foreground">
                  {t('暂无工作流，请先在「工作流」中创建工作流。')}
                </p>
              </div>
            </div>
          )}

          {/* Help text */}
          <p className="text-xs text-muted-foreground/60 text-center">
            {t('或从左侧面板选择已有工作流开始对话')}
          </p>
        </div>
      </div>
    </div>
  );
}
