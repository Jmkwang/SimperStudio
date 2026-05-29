import { useState } from "react"
import { Plus, ChevronDown, Workflow, MoreHorizontal, Trash2, Pencil } from "lucide-react"
import { ContextItem } from "./ContextItem"
import { SortableList } from "./SortableList"
import { DeleteConfirmDialog } from "./DeleteConfirmDialog"
import { NewSessionDialog } from "./NewSessionDialog"
import { EditNameDialog } from "./EditNameDialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/stores"

export function WorkflowChatSidebar({
  workflows,
  sessions,
  agents,
  agentCategories,
  activeWorkspaceId,
  activeSessionId,
  setActiveSession,
  openWorkflowSession,
  createSession,
  deleteSession,
  deleteWorkflow,
  t,
}: {
  workflows: any[]
  sessions: any[]
  agents: any[]
  agentCategories: any[]
  activeWorkspaceId: string | null
  activeSessionId: string | null
  setActiveSession: (id: string) => void
  openWorkflowSession: (id: string) => Promise<void>
  createSession: (title: string, workspaceId: string, workflowId?: string, mode?: 'single' | 'workflow') => void
  deleteSession: (id: string) => Promise<void>
  deleteWorkflow: (id: string) => Promise<void>
  t: (key: string) => string
}) {
  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: 'session' | 'workflow' } | null>(null)
  const [editItem, setEditItem] = useState<{ id: string; name: string; type: 'session' | 'workflow' } | null>(null)

  const workflowOrder = useAppStore(state => state.workflowOrder)
  const setWorkflowOrder = useAppStore(state => state.setWorkflowOrder)
  const previewWorkflowTopology = useAppStore(state => state.previewWorkflowTopology)
  const renameSession = useAppStore(state => state.renameSession)
  const renameWorkflow = useAppStore(state => state.renameWorkflow)

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

  const workflowSessions = sessions.filter(s => s.mode === 'workflow' && s.workflowId)

  const getSessionsForWorkflow = (workflowId: string) =>
    workflowSessions.filter(s => s.workflowId === workflowId)

  const toggleExpand = (workflowId: string) => {
    setExpandedWorkflows(prev => {
      const next = new Set(prev)
      const wasExpanded = next.has(workflowId)
      if (wasExpanded) {
        next.delete(workflowId)
      } else {
        next.add(workflowId)
      }
      return next
    })
    previewWorkflowTopology(workflowId)
  }

  const handleWorkflowDoubleClick = async (workflowId: string) => {
    await openWorkflowSession(workflowId)
    setExpandedWorkflows(prev => new Set(prev).add(workflowId))
  }

  const handleSessionSelect = (sessionId: string) => {
    setActiveSession(sessionId)
  }

  const handleCreateWorkflowSession = (title: string, workspaceId: string, workflowId: string) => {
    createSession(title, workspaceId, workflowId, 'workflow')
    setExpandedWorkflows(prev => new Set(prev).add(workflowId))
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
    }
    setItemToDelete(null)
  }

  const handleReorder = (items: typeof workflows) => {
    setWorkflowOrder(items.map(w => w.id))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 pt-2 pb-1 border-b border-border">
        <button
          onClick={() => setDialogOpen(true)}
          className="flex w-full items-center gap-2 px-3 h-10 text-sm text-muted-foreground transition-all duration-400 ease-out hover:bg-hover hover:text-foreground rounded-xl"
        >
          <Plus className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span>{t('新建工作流会话')}</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto px-2 py-2">
        {workflows.length > 0 ? (
          <SortableList
            items={sortedWorkflows}
            getId={w => w.id}
            onReorder={handleReorder}
            className="flex flex-col gap-0.5"
          >
            {(workflow) => {
              const wfSessions = getSessionsForWorkflow(workflow.id)
              const isExpanded = expandedWorkflows.has(workflow.id)
              const isActive = wfSessions.some(s => s.id === activeSessionId)

              return (
                <div>
                  {/* Workflow header — unified with ContextItem design */}
                  <div
                    className={cn(
                      "group relative flex w-full items-center text-sm rounded-xl transition-all duration-400 ease-out",
                      isActive
                        ? "bg-primary/8 text-foreground border border-primary/10 glow-sm"
                        : "border border-transparent text-foreground hover:bg-hover hover:border-foreground/[0.06]"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.5)]" />
                    )}
                    <button
                      onClick={() => toggleExpand(workflow.id)}
                      onDoubleClick={() => handleWorkflowDoubleClick(workflow.id)}
                      className="min-w-0 flex-1 flex items-center gap-2 px-3 h-10 text-left active:scale-[0.98] transition-transform duration-200"
                    >
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                          !isExpanded && "-rotate-90"
                        )}
                        strokeWidth={1.5}
                      />
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border border-foreground/[0.08]">
                        <Workflow className="h-3 w-3" strokeWidth={1.5} />
                      </div>
                      <span className="block truncate flex-1">{workflow.name}</span>
                      <span className="text-xs text-muted-foreground/60 tabular-nums">
                        {wfSessions.length}
                      </span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(event) => event.stopPropagation()}
                          className="mr-1 p-1 text-muted-foreground opacity-0 transition-all duration-400 ease-out hover:bg-hover rounded-lg group-hover:opacity-100"
                          title={t('更多')}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl">
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation()
                            setEditItem({ id: workflow.id, name: workflow.name, type: 'workflow' })
                          }}
                        >
                          <Pencil className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                          {t('编辑')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation()
                            handleDeleteClick(workflow.id, workflow.name, 'workflow')
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                          {t('删除')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Sessions under this workflow */}
                  {isExpanded && (
                    <div className="ml-4 mt-0.5 flex flex-col gap-0.5">
                      {wfSessions.length > 0 ? (
                        wfSessions.map(session => (
                          <ContextItem
                            key={session.id}
                            title={session.title}
                            icon="workflow"
                            active={activeSessionId === session.id}
                            deletable={true}
                            onClick={() => handleSessionSelect(session.id)}
                            onEdit={() => setEditItem({ id: session.id, name: session.title, type: 'session' })}
                            onDelete={() => handleDeleteClick(session.id, session.title, 'session')}
                            t={t}
                          />
                        ))
                      ) : (
                        <div className="px-3 py-2 text-xs text-muted-foreground/70">
                          {t('暂无会话')}
                        </div>
                      )}
                      <button
                        onClick={async () => {
                          await createSession(workflow.name, workflow.workspaceId, workflow.id, 'workflow')
                          setExpandedWorkflows(prev => new Set(prev).add(workflow.id))
                        }}
                        className="flex items-center gap-2 px-3 h-8 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-hover"
                      >
                        <Plus className="h-3 w-3" strokeWidth={1.5} />
                        {t('新建会话')}
                      </button>
                    </div>
                  )}
                </div>
              )
            }}
          </SortableList>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-foreground/[0.08] p-6 text-center text-xs text-muted-foreground">
            {t('暂无工作流，请先创建工作流')}
          </div>
        )}
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={itemToDelete?.name || ''}
        description={
          itemToDelete?.type === 'workflow'
            ? `${t('确定要删除')}「${itemToDelete.name}」？${t('此工作流下的所有会话也将被删除。')}`
            : undefined
        }
        onConfirm={handleConfirmDelete}
        t={t}
      />
      <NewSessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agents={agents}
        agentCategories={agentCategories}
        workflows={workflows}
        activeWorkspaceId={activeWorkspaceId}
        onCreateSingleSession={() => {}}
        onCreateWorkflowSession={handleCreateWorkflowSession}
        defaultMode="workflow"
        t={t}
      />
      <EditNameDialog
        open={!!editItem}
        onOpenChange={(open) => { if (!open) setEditItem(null) }}
        title={editItem?.type === 'workflow' ? t('重命名工作流') : t('重命名会话')}
        value={editItem?.name || ''}
        onConfirm={(name) => {
          if (!editItem) return
          if (editItem.type === 'workflow') {
            renameWorkflow(editItem.id, name)
          } else {
            renameSession(editItem.id, name)
          }
        }}
        t={t}
      />
    </div>
  )
}
