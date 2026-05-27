import { useState } from "react"
import { Plus, ChevronDown, Workflow } from "lucide-react"
import { ContextItem } from "./ContextItem"
import { DeleteConfirmDialog } from "./DeleteConfirmDialog"
import { cn } from "@/lib/utils"

export function WorkflowChatSidebar({
  workflows,
  sessions,
  activeSessionId,
  setActiveSession,
  openWorkflowSession,
  deleteSession,
  deleteWorkflow,
  t,
}: {
  workflows: any[]
  sessions: any[]
  activeSessionId: string | null
  setActiveSession: (id: string) => void
  openWorkflowSession: (id: string) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  deleteWorkflow: (id: string) => Promise<void>
  t: (key: string) => string
}) {
  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: 'session' | 'workflow' } | null>(null)

  const workflowSessions = sessions.filter(s => s.mode === 'workflow' && s.workflowId)

  const getSessionsForWorkflow = (workflowId: string) =>
    workflowSessions.filter(s => s.workflowId === workflowId)

  const toggleExpand = (workflowId: string) => {
    setExpandedWorkflows(prev => {
      const next = new Set(prev)
      if (next.has(workflowId)) {
        next.delete(workflowId)
      } else {
        next.add(workflowId)
      }
      return next
    })
  }

  const handleWorkflowDoubleClick = async (workflowId: string) => {
    await openWorkflowSession(workflowId)
    setExpandedWorkflows(prev => new Set(prev).add(workflowId))
  }

  const handleSessionSelect = (sessionId: string) => {
    setActiveSession(sessionId)
  }

  const handleNewWorkflowSession = async () => {
    if (workflows.length === 0) return
    const workflow = workflows[0]
    await openWorkflowSession(workflow.id)
    setExpandedWorkflows(prev => new Set(prev).add(workflow.id))
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

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 pt-2 pb-1 border-b border-border">
        <button
          onClick={handleNewWorkflowSession}
          className="flex w-full items-center gap-2.5 px-3 h-10 text-sm text-muted-foreground transition-all duration-400 ease-out hover:bg-hover hover:text-foreground rounded-xl"
        >
          <Plus className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span>{t('新建工作流会话')}</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto px-2 py-2">
        {workflows.length > 0 ? (
          <div className="flex flex-col gap-1">
            {workflows.map(workflow => {
              const wfSessions = getSessionsForWorkflow(workflow.id)
              const isExpanded = expandedWorkflows.has(workflow.id)

              return (
                <div key={workflow.id}>
                  {/* Workflow header */}
                  <div
                    className={cn(
                      "group flex items-center gap-2 px-2 h-9 rounded-xl cursor-pointer transition-all duration-400 ease-out",
                      "hover:bg-hover hover:border-foreground/[0.06] border border-transparent"
                    )}
                    onClick={() => toggleExpand(workflow.id)}
                    onDoubleClick={() => handleWorkflowDoubleClick(workflow.id)}
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
                    <span className="flex-1 text-sm truncate">{workflow.name}</span>
                    <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                      {wfSessions.length}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteClick(workflow.id, workflow.name, 'workflow')
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all rounded"
                      title={t('删除')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
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
                            onDelete={() => handleDeleteClick(session.id, session.title, 'session')}
                            t={t}
                          />
                        ))
                      ) : (
                        <div className="px-3 py-2 text-[11px] text-muted-foreground/50">
                          {t('暂无会话')}
                        </div>
                      )}
                      <button
                        onClick={() => openWorkflowSession(workflow.id)}
                        className="flex items-center gap-2 px-3 h-8 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-hover"
                      >
                        <Plus className="h-3 w-3" strokeWidth={1.5} />
                        {t('新建会话')}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
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
    </div>
  )
}
