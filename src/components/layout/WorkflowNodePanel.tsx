import { useAppStore } from '@/stores'
import { useTranslation } from "@/hooks/useTranslation"
import { Bot, ChevronRight } from "lucide-react"
import { DebugBadge } from "@/components/debug/DebugBadge"

export function WorkflowNodePanel({ currentView }: { currentView: string }) {
  const { t } = useTranslation()
  const sessions = useAppStore(state => state.sessions)
  const workflows = useAppStore(state => state.workflows)
  const agents = useAppStore(state => state.agents)
  const activeSessionId = useAppStore(state => state.activeSessionId)
  const openWorkflowAgentWindow = useAppStore(state => state.openWorkflowAgentWindow)
  const setWorkflowSidebarCollapsed = useAppStore(state => state.setWorkflowSidebarCollapsed)
  const sidebarCollapsedBySession = useAppStore(state => state.workflowChatUI.sidebarCollapsedBySession)

  const activeSession = sessions.find(s => s.id === activeSessionId)
  const isWorkflowChat = (currentView === 'workflowChat' || currentView === 'chat') && activeSession?.mode === 'workflow'
  const workflowForActiveSession = activeSession?.workflowId
    ? workflows.find(w => w.id === activeSession.workflowId)
    : undefined
  const workflowAgentNodes = (workflowForActiveSession?.nodesData || []).filter(
    node => (node.type === 'agent' || node.type === 'dynamic-agent') && ((node.data as any)?.agentId || node.type === 'dynamic-agent')
  )
  const collapsed = activeSession
    ? (sidebarCollapsedBySession[activeSession.id] ?? true)
    : true

  if (!isWorkflowChat || !activeSession) return null

  if (collapsed) return null

  return (
    <div className="relative flex flex-col border-r bg-background/50 w-72 flex-shrink-0 max-lg:hidden">
      <DebugBadge id="WorkflowNodePanel" position="top-right" />
      <div className="p-2 border-b h-14 flex items-center justify-between">
        <div className="min-w-0 px-2">
          <div className="truncate text-sm font-semibold">{workflowForActiveSession?.name || 'Workflow'}</div>
          <div className="text-xs text-muted-foreground">{workflowAgentNodes.length} {t('nodes')}</div>
        </div>
        <button
          onClick={() => setWorkflowSidebarCollapsed(activeSession.id, true)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          title={t('Collapse workflow panel')}
          aria-label={t('Collapse workflow panel')}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <div className="mb-3 rounded-lg border bg-muted/30 p-3">
          <div className="text-xs text-muted-foreground">{t('Workflow')}</div>
          <div className="mt-1 text-sm font-medium truncate">{workflowForActiveSession?.name || t('Unlinked')}</div>
        </div>

        <div className="text-xs text-muted-foreground mb-2">{t('Agent Nodes')}</div>
        <div className="flex flex-col gap-1">
          {workflowAgentNodes.map(node => {
            const d = node.data as any;
            const isDynamic = node.type === 'dynamic-agent'
            const agentId = isDynamic ? `dynamic-${node.id}` : d?.agentId
            if (!agentId) return null
            const agent = agents.find(item => item.id === agentId)
            const displayName = d?.label || (isDynamic ? 'Dynamic Agent' : node.id)
            const subName = isDynamic ? (d?.inlineConfig?.nameTemplate || 'Dynamic Agent') : (agent?.name || agentId)
            return (
              <button
                key={node.id}
                onClick={() => openWorkflowAgentWindow(activeSession.id, workflowForActiveSession!.id, node.id, agentId)}
                className="flex w-full items-center gap-2 rounded-lg px-3 min-h-[44px] text-left text-sm hover:bg-muted/70"
                aria-label={`${t('打开')} ${displayName}`}
              >
                <Bot className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{displayName}</div>
                  <div className="truncate text-xs text-muted-foreground">{subName}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
