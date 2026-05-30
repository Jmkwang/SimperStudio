import { useState, useMemo } from 'react';
import { useAppStore } from '@/stores';
import { useTranslation } from '@/hooks/useTranslation';
import { Search, Workflow, ChevronDown, Bot, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DebugBadge } from '@/components/debug/DebugBadge';

export function WorkflowListView() {
  const { t } = useTranslation();
  const workflows = useAppStore(state => state.workflows);
  const agents = useAppStore(state => state.agents);
  const createWorkflow = useAppStore(state => state.createWorkflow);
  const setActiveWorkflow = useAppStore(state => state.setActiveWorkflow);
  const setCurrentView = useAppStore(state => state.setCurrentView);
  const activeWorkspaceId = useAppStore(state => state.activeWorkspaceId);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null);

  const filteredWorkflows = useMemo(() =>
    workflows.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [workflows, searchQuery]
  );

  const handleCreateNew = () => {
    if (!activeWorkspaceId) return;
    createWorkflow(t('新工作流'), activeWorkspaceId);
  };

  const handleOpenWorkflow = (wfId: string) => {
    setActiveWorkflow(wfId);
    setCurrentView('workflow-editor');
  };

  const getAgentsForWorkflow = (wf: typeof workflows[0]) => {
    const agentNodes = wf.nodesData?.filter(n => n.type === 'agent' || n.type === 'dynamic-agent') || [];
    return agentNodes.map(n => {
      if (n.type === 'dynamic-agent') {
        const d = n.data as any;
        return { id: `dynamic-${n.id}`, name: d?.label || 'Dynamic Agent', isDynamic: true };
      }
      const d = n.data as any;
      const agent = agents.find(a => a.id === d?.agentId);
      return { id: d?.agentId || n.id, name: agent?.name || d?.label || d?.agentId || n.id, isDynamic: false };
    });
  };

  return (
    <div className="relative flex-1 flex flex-col h-full overflow-hidden">
      <DebugBadge id="WorkflowListView" position="bottom-left" />
      <div className="border-b px-6 py-3 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('工作流')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('管理工作流')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-1" />
            {t('新建工作流')}
          </Button>
        </div>
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
        {filteredWorkflows.map(wf => {
          const wfAgents = getAgentsForWorkflow(wf);
          return (
            <div
              key={wf.id}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer mb-1"
              onClick={() => handleOpenWorkflow(wf.id)}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                <Workflow className="h-4 w-4 text-primary" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{wf.name}</div>
                <div className="text-xs text-muted-foreground">
                  {wf.nodesData?.length || 0} {t('nodes')}
                </div>
              </div>
              {wfAgents.length > 0 && (
                <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setExpandedDropdown(expandedDropdown === wf.id ? null : wf.id)}
                    className="flex items-center gap-1 h-8 px-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-transparent hover:border-border"
                  >
                    <Bot className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>{t('智能体')} ({wfAgents.length})</span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${expandedDropdown === wf.id ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                  </button>
                  {expandedDropdown === wf.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setExpandedDropdown(null)} />
                      <div className="absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded-lg border bg-popover p-1 shadow-md">
                        {wfAgents.map(a => (
                          <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md text-foreground/80">
                            <Bot className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                            <span className="truncate">{a.name}</span>
                          </div>
                        ))}
                      </div>
                    </>
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
