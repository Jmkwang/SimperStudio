import { useState, useRef, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store/appStore"
import { useTranslation } from "@/hooks/useTranslation"
import { ChevronLeft, Plus, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function ContextSidebar({
  currentView,
  defaultCollapsed = false,
}: {
  currentView: string
  defaultCollapsed?: boolean
}) {
  const [showCreateSessionDialog, setShowCreateSessionDialog] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(defaultCollapsed ? 0 : 256)
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const isResizing = useRef(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const setActiveSession = useAppStore(state => state.setActiveSession)
  const openWorkflowSession = useAppStore(state => state.openWorkflowSession)
  const createSession = useAppStore(state => state.createSession)
  const deleteSession = useAppStore(state => state.deleteSession)
  const createWorkflow = useAppStore(state => state.createWorkflow)
  const deleteWorkflow = useAppStore(state => state.deleteWorkflow)
  const activeWorkspaceId = useAppStore(state => state.activeWorkspaceId)
  const setActiveWorkflow = useAppStore(state => state.setActiveWorkflow)
  const setActiveAgent = useAppStore(state => state.setActiveAgent)
  const sessions = useAppStore(state => state.sessions)
  const workflows = useAppStore(state => state.workflows)
  const agents = useAppStore(state => state.agents)

  const activeSessionId = useAppStore(state => state.activeSessionId)
  const activeWorkflowId = useAppStore(state => state.activeWorkflowId)
  const activeAgentId = useAppStore(state => state.activeAgentId)
  const { t } = useTranslation()

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const newWidth = e.clientX
      if (newWidth < 120) {
        setCollapsed(true)
        setSidebarWidth(0)
      } else {
        setCollapsed(false)
        setSidebarWidth(Math.min(500, Math.max(180, newWidth)))
      }
    }

    const handleMouseUp = () => {
      isResizing.current = false
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  useEffect(() => {
    if (defaultCollapsed) {
      setCollapsed(true)
      setSidebarWidth(0)
    }
  }, [defaultCollapsed])

  const toggleCollapse = () => {
    if (collapsed) {
      setCollapsed(false)
      setSidebarWidth(256)
    } else {
      setCollapsed(true)
      setSidebarWidth(0)
    }
  }

  const getSidebarContent = () => {
    switch (currentView) {
      case 'workflow':
        return {
          title: t('Workflows'),
          items: workflows.map(w => ({
            id: w.id,
            title: w.name,
            active: activeWorkflowId === w.id,
            deletable: true,
          }))
        };
      case 'agents':
        return {
          title: t('Agents'),
          items: agents.map(a => ({
            id: a.id,
            title: a.name,
            active: activeAgentId === a.id,
            deletable: false,
          }))
        };
      case 'settings':
        return {
          title: t('Settings'),
          items: []
        };
      case 'profile':
        return {
          title: t('Profile'),
          items: [
            { id: 'p1', title: t('My Account'), active: true, deletable: false },
            { id: 'p2', title: t('Billing'), active: false, deletable: false },
          ]
        };
      case 'prompts':
        return {
          title: t('Prompts'),
          items: [
            { id: 'pr1', title: t('System Prompts'), active: true, deletable: false },
            { id: 'pr2', title: t('Saved Templates'), active: false, deletable: false },
          ]
        };
      case 'chat':
      default:
        return {
          title: t('Chat History'),
          items: sessions.map(s => ({
            id: s.id,
            title: s.title,
            active: activeSessionId === s.id,
            deletable: true,
          }))
        };
    }
  };

  const content = getSidebarContent();
  const emptyText = getEmptyText(currentView, t);

  const handleItemClick = (id: string) => {
    switch (currentView) {
      case 'chat':
      case undefined:
        setActiveSession(id);
        break;
      case 'workflow':
        setActiveWorkflow(id);
        break;
      case 'agents':
        setActiveAgent(id);
        break;
      case 'settings':
        console.log(`Switching to settings tab ${id}`);
        break;
      case 'profile':
        console.log(`Switching to profile tab ${id}`);
        break;
      default:
        console.log(`Clicked ${id} in ${currentView}`);
    }
  }

  const handleCreateClick = () => {
    if (currentView === 'workflow') {
      createWorkflow(t('New Workflow'), activeWorkspaceId || 'default-workspace');
      return;
    }

    setShowCreateSessionDialog(true);
  }

  const handleOpenWorkflowSession = async (workflowId: string) => {
    await openWorkflowSession(workflowId);
    setShowCreateSessionDialog(false);
  }

  const handleCreateSingleSession = (agentId: string) => {
    const agent = agents.find(item => item.id === agentId);
    if (!agent) return;
    createSession(`${agent.name} Chat`, activeWorkspaceId || 'default-workspace', undefined, 'single');
    setActiveAgent(agent.id);
    setShowCreateSessionDialog(false);
  }

  const handleDelete = async (id: string) => {
    if (currentView === 'workflow') {
      await deleteWorkflow(id);
      return;
    }

    await deleteSession(id);
  }

  if (collapsed) {
    return (
      <div className="relative flex-shrink-0 border-r bg-background/50">
        <button
          onClick={toggleCollapse}
          className="h-full w-5 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Expand sidebar"
        >
          <ChevronLeft className="h-4 w-4 rotate-180" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col border-r bg-background/50 relative"
      ref={sidebarRef}
      style={{ width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth }}
    >
      <div className="p-4 border-b h-14 flex items-center justify-between">
        <h2 className="font-semibold text-sm">{content.title}</h2>
        <div className="flex items-center gap-1">
          {(currentView === 'chat' || !currentView || currentView === 'workflow') && (
            <button
              onClick={handleCreateClick}
              className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
              title={currentView === 'workflow' ? t("New Workflow") : t('Add Session')}
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={toggleCollapse}
            className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
            title={t('Collapse sidebar')}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Dialog open={showCreateSessionDialog} onOpenChange={setShowCreateSessionDialog}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>{t('新建会话')}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="mb-2 text-sm font-medium">{t('单个智能体对话')}</div>
              <div className="max-h-72 space-y-1 overflow-auto">
                {agents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => handleCreateSingleSession(agent.id)}
                    className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/70"
                  >
                    <span className="w-full truncate font-medium">{agent.name}</span>
                    <span className="text-[11px] text-muted-foreground">{t('创建 single 会话并设为当前智能体')}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="mb-2 text-sm font-medium">{t('工作流对话')}</div>
              <div className="max-h-72 space-y-1 overflow-auto">
                {workflows.map(workflow => {
                  const existingSession = sessions.find(session => session.workflowId === workflow.id);
                  return (
                    <button
                      key={workflow.id}
                      onClick={() => handleOpenWorkflowSession(workflow.id)}
                      className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/70"
                    >
                      <span className="w-full truncate font-medium">{workflow.name}</span>
                      <span className="text-[11px] text-muted-foreground">{existingSession ? t('打开已有 workflow 会话') : t('创建 workflow 会话')}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-auto p-2">
        {content.items.length > 0 ? (
          <div className="flex flex-col gap-1">
            {content.items.map(item => (
              <ContextItem
                key={item.id}
                title={item.title}
                active={item.active}
                deletable={item.deletable}
                onClick={() => handleItemClick(item.id)}
                onDelete={() => handleDelete(item.id)}
                t={t}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            {emptyText}
          </div>
        )}
      </div>
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 transition-colors z-10"
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}

function getEmptyText(currentView: string, t: (key: string) => string) {
  switch (currentView) {
    case 'workflow':
      return t('暂无工作流，点击右上角 + 创建。');
    case 'agents':
      return t('暂无智能体，请先创建一个智能体。');
    case 'settings':
      return t('设置项在主区域中配置。');
    case 'profile':
      return t('暂无个人资料项目。');
    case 'prompts':
      return t('暂无提示词项目。');
    case 'chat':
    default:
      return t('暂无会话，点击右上角 + 新建。');
  }
}

function ContextItem({
  title,
  active = false,
  deletable = false,
  onClick,
  onDelete,
  t,
}: {
  title: string,
  active?: boolean,
  deletable?: boolean,
  onClick?: () => void,
  onDelete?: () => void,
  t: (key: string) => string,
}) {
  return (
    <div
      className={cn(
        "group flex w-full items-center rounded-lg text-sm transition-colors hover:bg-muted/50",
        active ? "bg-muted font-medium text-primary" : "text-foreground"
      )}
    >
      <button
        onClick={onClick}
        className="min-w-0 flex-1 px-3 py-2 text-left active:scale-[0.98]"
      >
        <span className="block truncate">{title}</span>
      </button>
      {deletable && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDelete?.();
          }}
          className="mr-1 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          title={t('删除')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
