import { useState } from "react"
import { Plus } from "lucide-react"
import { ContextItem } from "./ContextItem"
import { SortableList } from "./SortableList"
import { useAppStore } from "@/stores"
import { DeleteConfirmDialog } from "./DeleteConfirmDialog"

export function WorkflowSidebar({
  workflows,
  activeWorkflowId,
  setActiveWorkflow,
  createWorkflow,
  deleteWorkflow,
  activeWorkspaceId,
  t,
}: {
  workflows: any[]
  activeWorkflowId: string | null
  setActiveWorkflow: (id: string) => void
  createWorkflow: (name: string, workspaceId: string) => void
  deleteWorkflow: (id: string) => Promise<void>
  activeWorkspaceId: string | null
  t: (key: string) => string
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null)

  const workflowOrder = useAppStore(state => state.workflowOrder)
  const setWorkflowOrder = useAppStore(state => state.setWorkflowOrder)

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

  const handleReorder = (items: typeof workflows) => {
    setWorkflowOrder(items.map(w => w.id))
  }

  const handleDeleteClick = (id: string, name: string) => {
    setItemToDelete({ id, name })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteWorkflow(itemToDelete.id)
      setItemToDelete(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-border">
        <button
          onClick={() => createWorkflow(t('新工作流'), activeWorkspaceId || 'default-workspace')}
          className="flex w-full items-center gap-2 px-3 h-10 text-sm text-muted-foreground transition-all duration-400 ease-out hover:bg-hover hover:text-foreground rounded-xl"
        >
          <Plus className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span>{t('新建工作流')}</span>
        </button>
      </div>
      <div className="flex-1 overflow-auto px-2 pt-2 pb-2">
        {sortedWorkflows.length > 0 ? (
          <SortableList
            items={sortedWorkflows}
            getId={w => w.id}
            onReorder={handleReorder}
            className="flex flex-col gap-0.5"
          >
            {(w) => (
              <ContextItem
                title={w.name}
                icon="workflow"
                active={activeWorkflowId === w.id}
                deletable={true}
                onClick={() => setActiveWorkflow(w.id)}
                onDelete={() => handleDeleteClick(w.id, w.name)}
                t={t}
              />
            )}
          </SortableList>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-foreground/[0.08] p-6 text-center text-xs text-muted-foreground">
            {t('暂无工作流，点击 + 创建。')}
          </div>
        )}
      </div>
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
