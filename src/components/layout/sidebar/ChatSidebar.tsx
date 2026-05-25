import { useState } from "react"
import { cn } from "@/lib/utils"
import { Plus } from "lucide-react"
import { ContextItem } from "./ContextItem"
import { SortableList } from "./SortableList"
import { useAppStore } from "@/stores"
import { NewSessionDialog } from "./NewSessionDialog"
import { DeleteConfirmDialog } from "./DeleteConfirmDialog"

export function ChatSidebar({
  workflows,
  sessions,
  agents,
  activeSessionId,
  selectedChatWorkflowId,
  setSelectedChatWorkflowId,
  setActiveSession,
  openWorkflowSession,
  createSession,
  deleteSession,
  deleteWorkflow,
  activeWorkspaceId,
  t,
}: {
  workflows: any[]
  sessions: any[]
  agents: any[]
  activeSessionId: string | null
  selectedChatWorkflowId: string | null
  setSelectedChatWorkflowId: (id: string | null) => void
  setActiveSession: (id: string) => void
  openWorkflowSession: (id: string) => Promise<void>
  createSession: (title: string, workspaceId: string, workflowId?: string, mode?: 'single' | 'workflow') => void
  deleteSession: (id: string) => Promise<void>
  deleteWorkflow: (id: string) => Promise<void>
  activeWorkspaceId: string | null
  t: (key: string) => string
}) {
  const [chatTab, setChatTab] = useState<'workflows' | 'sessions'>('workflows')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: 'session' | 'workflow' } | null>(null)
  const workflowOrder = useAppStore(state => state.workflowOrder)
  const setWorkflowOrder = useAppStore(state => state.setWorkflowOrder)
  const sessionOrder = useAppStore(state => state.sessionOrder)
  const setSessionOrder = useAppStore(state => state.setSessionOrder)
  const setActiveAgent = useAppStore(state => state.setActiveAgent)

  const sortedWorkflows = workflowOrder.length > 0
    ? [...workflows].sort((a, b) => {
        const idxA = workflowOrder.indexOf(a.id)
        const idxB = workflowOrder.indexOf(b.id)
        if (idxA === -1 && idxB === -1) return 0
        if (idxA === -1) return 1
        if (idxB === -1) return -1
        return idxA - idxB
      })
    : workflows

  const singleSessions = sessions.filter(s => s.mode === 'single' || !s.workflowId)
  const workflowSessions = selectedChatWorkflowId
    ? sessions.filter(s => s.workflowId === selectedChatWorkflowId)
    : []

  const allSessionsToShow = [...singleSessions, ...workflowSessions]
  const sortedSessions = sessionOrder.length > 0
    ? [...allSessionsToShow].sort((a, b) => {
        const idxA = sessionOrder.indexOf(a.id)
        const idxB = sessionOrder.indexOf(b.id)
        if (idxA === -1 && idxB === -1) return 0
        if (idxA === -1) return 1
        if (idxB === -1) return -1
        return idxA - idxB
      })
    : allSessionsToShow

  const handleWorkflowClick = (workflowId: string) => {
    setSelectedChatWorkflowId(workflowId)
    setActiveSession('')
  }

  const handleWorkflowDoubleClick = (workflowId: string) => {
    setSelectedChatWorkflowId(workflowId)
    openWorkflowSession(workflowId)
    setChatTab('sessions')
  }

  const handleSessionSelect = (sessionId: string) => {
    setActiveSession(sessionId)
  }

  const handleCreateSingleSession = (title: string, workspaceId: string, agentId: string) => {
    createSession(title, workspaceId, undefined, 'single')
    setActiveAgent(agentId)
  }

  const handleCreateWorkflowSession = (title: string, workspaceId: string, workflowId: string) => {
    createSession(title, workspaceId, workflowId, 'workflow')
    setSelectedChatWorkflowId(workflowId)
    setChatTab('sessions')
  }

  const handleDeleteClick = (id: string, name: string, type: 'session' | 'workflow') => {
    setItemToDelete({ id, name, type })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!itemToDelete) return
    if (itemToDelete.type === 'session') {
      deleteSession(itemToDelete.id)
    } else if (itemToDelete.type === 'workflow') {
      deleteWorkflow(itemToDelete.id)
      if (selectedChatWorkflowId === itemToDelete.id) {
        setSelectedChatWorkflowId(null)
      }
    }
    setItemToDelete(null)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b border-border px-1">
        <button
          onClick={() => setChatTab('workflows')}
          className={cn(
            "flex-1 inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-400 ease-out text-xs h-10 border-b-2",
            chatTab === 'workflows'
              ? "border-lunar-300/30 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t('工作流')}
        </button>
        <button
          onClick={() => setChatTab('sessions')}
          className={cn(
            "flex-1 inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-400 ease-out text-xs h-10 border-b-2",
            chatTab === 'sessions'
              ? "border-lunar-300/30 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t('会话')}
        </button>
      </div>

      {/* New session button - always visible */}
      <div className="px-2 pt-2 pb-1 border-b border-border"
      >
        <button
          onClick={() => setDialogOpen(true)}
          className="flex w-full items-center gap-2.5 px-3 h-10 text-sm text-muted-foreground transition-all duration-400 ease-out hover:bg-hover hover:text-foreground rounded-xl"
        >
          <Plus className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span>{t('新建会话')}</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto px-2 py-2">
        {chatTab === 'workflows' ? (
          workflows.length > 0 ? (
            <SortableList
              items={sortedWorkflows}
              getId={w => w.id}
              onReorder={(items) => setWorkflowOrder(items.map(w => w.id))}
              className="flex flex-col gap-0.5"
            >
              {(w) => (
                <ContextItem
                  title={w.name}
                  icon="workflow"
                  active={selectedChatWorkflowId === w.id}
                  deletable={true}
                  onClick={() => handleWorkflowClick(w.id)}
                  onDoubleClick={() => handleWorkflowDoubleClick(w.id)}
                  onDelete={() => handleDeleteClick(w.id, w.name, 'workflow')}
                  t={t}
                />
              )}
            </SortableList>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-foreground/[0.08] p-6 text-center text-xs text-muted-foreground">
              {t('暂无工作流')}
            </div>
          )
        ) : (
          <>
            {sortedSessions.length > 0 ? (
              <SortableList
                items={sortedSessions}
                getId={s => s.id}
                onReorder={(items) => setSessionOrder(items.map(s => s.id))}
                className="flex flex-col gap-0.5"
              >
                {(s) => {
                  const sessionAgent = s.mode === 'workflow'
                    ? undefined
                    : agents.find(a => a.id === (s as any).activeAgentId) || agents[0]
                  return (
                    <ContextItem
                      title={s.title}
                      icon="agent"
                      avatar={sessionAgent?.avatar}
                      fallbackName={sessionAgent?.name}
                      active={activeSessionId === s.id}
                      deletable={true}
                      onClick={() => handleSessionSelect(s.id)}
                      onDelete={() => handleDeleteClick(s.id, s.title, 'session')}
                      t={t}
                    />
                  )
                }}
              </SortableList>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-foreground/[0.08] p-6 text-center text-xs text-muted-foreground">
                {t('暂无会话，点击 + 新建')}
              </div>
            )}
          </>
        )}
      </div>

      <NewSessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agents={agents}
        workflows={workflows}
        activeWorkspaceId={activeWorkspaceId}
        onCreateSingleSession={handleCreateSingleSession}
        onCreateWorkflowSession={handleCreateWorkflowSession}
        t={t}
      />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={itemToDelete?.name || ''}
        onConfirm={handleConfirmDelete}
        t={t}
      />
    </div>
  )
}
