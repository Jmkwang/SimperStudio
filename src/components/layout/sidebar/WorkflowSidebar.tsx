import { Plus } from "lucide-react"
import { ContextItem } from "./ContextItem"

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
  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-border">
        <button
          onClick={() => createWorkflow(t('新工作流'), activeWorkspaceId || 'default-workspace')}
          className="flex w-full items-center gap-2.5 px-3 h-10 text-sm text-muted-foreground transition-all duration-400 ease-out hover:bg-hover hover:text-foreground rounded-xl"
        >
          <Plus className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span>{t('新建工作流')}</span>
        </button>
      </div>
      <div className="flex-1 overflow-auto px-2 pt-2 pb-2">
        {workflows.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {workflows.map(w => (
              <ContextItem
                key={w.id}
                title={w.name}
                icon="workflow"
                active={activeWorkflowId === w.id}
                deletable={true}
                onClick={() => setActiveWorkflow(w.id)}
                onDelete={() => deleteWorkflow(w.id)}
                t={t}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-foreground/[0.08] p-6 text-center text-xs text-muted-foreground">
            {t('暂无工作流，点击 + 创建。')}
          </div>
        )}
      </div>
    </div>
  )
}
