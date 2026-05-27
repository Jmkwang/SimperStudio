import { useState } from "react"
import { Plus } from "lucide-react"
import { ContextItem } from "./ContextItem"
import { SortableList } from "./SortableList"
import { useAppStore } from "@/stores"
import { NewSessionDialog } from "./NewSessionDialog"
import { DeleteConfirmDialog } from "./DeleteConfirmDialog"

export function ChatSidebar({
  sessions,
  agents,
  agentCategories,
  activeSessionId,
  setActiveSession,
  createSession,
  deleteSession,
  activeWorkspaceId,
  t,
}: {
  sessions: any[]
  agents: any[]
  agentCategories: any[]
  activeSessionId: string | null
  setActiveSession: (id: string) => void
  createSession: (title: string, workspaceId: string, workflowId?: string, mode?: 'single' | 'workflow') => void
  deleteSession: (id: string) => Promise<void>
  activeWorkspaceId: string | null
  t: (key: string) => string
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null)
  const sessionOrder = useAppStore(state => state.sessionOrder)
  const setSessionOrder = useAppStore(state => state.setSessionOrder)
  const setActiveAgent = useAppStore(state => state.setActiveAgent)

  const singleSessions = sessions.filter(s => s.mode === 'single' || !s.workflowId)

  const sortedSessions = sessionOrder.length > 0
    ? [...singleSessions].sort((a, b) => {
        const idxA = sessionOrder.indexOf(a.id)
        const idxB = sessionOrder.indexOf(b.id)
        if (idxA === -1 && idxB === -1) return 0
        if (idxA === -1) return 1
        if (idxB === -1) return -1
        return idxA - idxB
      })
    : singleSessions

  const handleSessionSelect = (sessionId: string) => {
    setActiveSession(sessionId)
  }

  const handleCreateSingleSession = (title: string, workspaceId: string, agentId: string) => {
    createSession(title, workspaceId, undefined, 'single')
    setActiveAgent(agentId)
  }

  const handleDeleteClick = (id: string, name: string) => {
    setItemToDelete({ id, name })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!itemToDelete) return
    deleteSession(itemToDelete.id)
    setItemToDelete(null)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 pt-2 pb-1 border-b border-border">
        <button
          onClick={() => setDialogOpen(true)}
          className="flex w-full items-center gap-2 px-3 h-10 text-sm text-muted-foreground transition-all duration-400 ease-out hover:bg-hover hover:text-foreground rounded-xl"
        >
          <Plus className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span>{t('新建会话')}</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto px-2 py-2">
        {sortedSessions.length > 0 ? (
          <SortableList
            items={sortedSessions}
            getId={s => s.id}
            onReorder={(items) => setSessionOrder(items.map(s => s.id))}
            className="flex flex-col gap-0.5"
          >
            {(s) => {
              const sessionAgent = agents.find(a => a.id === (s as any).activeAgentId) || agents[0]
              return (
                <ContextItem
                  title={s.title}
                  icon="agent"
                  avatar={sessionAgent?.avatar}
                  fallbackName={sessionAgent?.name}
                  active={activeSessionId === s.id}
                  deletable={true}
                  onClick={() => handleSessionSelect(s.id)}
                  onDelete={() => handleDeleteClick(s.id, s.title)}
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
      </div>

      <NewSessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agents={agents}
        agentCategories={agentCategories}
        workflows={[]}
        activeWorkspaceId={activeWorkspaceId}
        onCreateSingleSession={handleCreateSingleSession}
        onCreateWorkflowSession={() => {}}
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
