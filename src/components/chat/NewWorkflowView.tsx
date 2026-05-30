import { useState } from 'react';
import { useAppStore } from '@/stores';
import { useTranslation } from '@/hooks/useTranslation';
import { Search, Plus, Workflow, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DebugBadge } from '@/components/debug/DebugBadge';

export function NewWorkflowView() {
  const { t } = useTranslation();
  const workflows = useAppStore(state => state.workflows);
  const createWorkflow = useAppStore(state => state.createWorkflow);
  const createSession = useAppStore(state => state.createSession);
  const setCurrentView = useAppStore(state => state.setCurrentView);
  const activeWorkspaceId = useAppStore(state => state.activeWorkspaceId);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredWorkflows = workflows.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNew = () => {
    if (activeWorkspaceId) {
      createWorkflow(t('新工作流'), activeWorkspaceId);
      setCurrentView('workflow');
    }
  };

  const handleOpenWorkflow = (workflowId: string) => {
    createSession(t('新对话'), activeWorkspaceId || 'default-workspace', workflowId, 'workflow');
    setCurrentView('workflowChat');
  };

  return (
    <div className="relative flex-1 flex flex-col h-full overflow-hidden">
      <DebugBadge id="NewWorkflowView" position="bottom-left" />
      <div className="border-b px-6 py-3 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('新建工作流')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('选择工作流开始会话，或创建新的工作流')}</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:brightness-105 active:scale-[0.97] transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          {t('新建工作流')}
        </button>
      </div>

      <div className="px-6 py-3 shrink-0">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('搜索工作流...')}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 pb-4">
        {filteredWorkflows.length === 0 && (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground flex-col gap-3">
            <Workflow className="h-8 w-8 opacity-20" />
            <p>{t('暂无工作流')}</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredWorkflows.map(wf => (
            <button
              key={wf.id}
              onClick={() => handleOpenWorkflow(wf.id)}
              className="text-left rounded-xl border p-4 flex flex-col gap-2 transition-all duration-200 bg-card hover:border-primary/40 shadow-sm hover:shadow-md group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <Workflow className="h-5 w-5 text-primary" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold truncate">{wf.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {wf.nodesData?.length || 0} {t('nodes')}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all -translate-x-1 group-hover:translate-x-0 shrink-0" strokeWidth={1.5} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
