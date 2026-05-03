import { useState, useRef, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store/appStore"
import { useTranslation } from "@/hooks/useTranslation"
import { ChevronLeft, Trash2, MoreHorizontal, Plus, Workflow, Pencil } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export function ContextSidebarHeader() {
  return (
    <div className="p-4 border-b h-[40px] flex items-center justify-end bg-[#1e1e1e] border-white/10" />
  )
}

export function ContextSidebar({
  currentView,
  defaultCollapsed = false,
}: {
  currentView: string
  defaultCollapsed?: boolean
}) {
  const [sidebarWidth, setSidebarWidth] = useState(defaultCollapsed ? 0 : 256)
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const isResizing = useRef(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const setActiveSession = useAppStore(state => state.setActiveSession)
  const deleteSession = useAppStore(state => state.deleteSession)
  const deleteWorkflow = useAppStore(state => state.deleteWorkflow)
  const setActiveWorkflow = useAppStore(state => state.setActiveWorkflow)
  const createWorkflow = useAppStore(state => state.createWorkflow)
  const createSession = useAppStore(state => state.createSession)
  const activeWorkspaceId = useAppStore(state => state.activeWorkspaceId)
  const sessions = useAppStore(state => state.sessions)
  const workflows = useAppStore(state => state.workflows)
  const agents = useAppStore(state => state.agents)
  const activeSessionId = useAppStore(state => state.activeSessionId)
  const activeWorkflowId = useAppStore(state => state.activeWorkflowId)
  const activeAgentId = useAppStore(state => state.activeAgentId)
  const setActiveAgent = useAppStore(state => state.setActiveAgent)
  const selectedChatWorkflowId = useAppStore(state => state.selectedChatWorkflowId)
  const setSelectedChatWorkflowId = useAppStore(state => state.setSelectedChatWorkflowId)

  const { t } = useTranslation()

  const effectiveWidth = sidebarWidth

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
        setSidebarWidth(Math.min(600, Math.max(180, newWidth)))
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

  const renderSidebarContent = () => {
    switch (currentView) {
      case 'chat':
        return <ChatSidebarContent
          workflows={workflows}
          sessions={sessions}
          agents={agents}
          activeSessionId={activeSessionId}
          selectedChatWorkflowId={selectedChatWorkflowId}
          setSelectedChatWorkflowId={setSelectedChatWorkflowId}
          setActiveSession={setActiveSession}
          setActiveWorkflow={setActiveWorkflow}
          createSession={createSession}
          deleteSession={deleteSession}
          activeWorkspaceId={activeWorkspaceId}
          t={t}
        />
      case 'workflow':
        return <WorkflowSidebarContent
          workflows={workflows}
          activeWorkflowId={activeWorkflowId}
          setActiveWorkflow={setActiveWorkflow}
          createWorkflow={createWorkflow}
          deleteWorkflow={deleteWorkflow}
          activeWorkspaceId={activeWorkspaceId}
          t={t}
        />
      case 'agents':
        return <AgentsSidebarContent
          agents={agents}
          activeAgentId={activeAgentId}
          setActiveAgent={setActiveAgent}
          t={t}
        />
      default:
        return (
          <div className="flex h-full items-center justify-center p-4 text-xs text-muted-foreground">
            {t('此视图暂无侧边栏内容。')}
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col border-r bg-background/50 relative"
      ref={sidebarRef}
      style={{ width: effectiveWidth, minWidth: effectiveWidth, maxWidth: effectiveWidth }}
    >
      <div className="flex-1 overflow-hidden">
        {renderSidebarContent()}
      </div>
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 transition-colors z-10"
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}

function ChatSidebarContent({
  workflows,
  sessions,
  agents,
  activeSessionId,
  selectedChatWorkflowId,
  setSelectedChatWorkflowId,
  setActiveSession,
  setActiveWorkflow,
  createSession,
  deleteSession,
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
  setActiveWorkflow: (id: string) => void
  createSession: (title: string, workspaceId: string, workflowId?: string, mode?: 'single' | 'workflow') => void
  deleteSession: (id: string) => Promise<void>
  activeWorkspaceId: string | null
  t: (key: string) => string
}) {
  const [chatTab, setChatTab] = useState<'workflows' | 'sessions'>('workflows')

  const workflowSessions = selectedChatWorkflowId
    ? sessions.filter(s => s.workflowId === selectedChatWorkflowId)
    : []

  const handleWorkflowSelect = (workflowId: string) => {
    setSelectedChatWorkflowId(workflowId)
    setActiveWorkflow(workflowId)
    setChatTab('sessions')
  }

  const handleSessionSelect = (sessionId: string) => {
    setActiveSession(sessionId)
  }

  const handleNewSession = () => {
    if (selectedChatWorkflowId) {
      const workflow = workflows.find(w => w.id === selectedChatWorkflowId)
      createSession(
        workflow?.name || t('新会话'),
        activeWorkspaceId || 'default-workspace',
        selectedChatWorkflowId,
        'workflow'
      )
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-center gap-0 p-2">
        <button
          onClick={() => setChatTab('workflows')}
          className={cn(
            "relative inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors text-xs h-8 px-6",
            chatTab === 'workflows'
              ? "text-white"
              : "text-gray-400 hover:text-white"
          )}
        >
          {t('工作流')}
          {chatTab === 'workflows' && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-emerald-500" />
          )}
        </button>
        <button
          onClick={() => setChatTab('sessions')}
          className={cn(
            "relative inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors text-xs h-8 px-6",
            chatTab === 'sessions'
              ? "text-white"
              : "text-gray-400 hover:text-white"
          )}
        >
          {t('会话')}
          {chatTab === 'sessions' && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-emerald-500" />
          )}
        </button>
      </div>
      <div className="flex-1 overflow-auto px-2 pb-2">
        {chatTab === 'workflows' ? (
          workflows.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {workflows.map(w => (
                <ContextItem
                  key={w.id}
                  title={w.name}
                  icon="workflow"
                  active={selectedChatWorkflowId === w.id}
                  deletable={false}
                  onClick={() => handleWorkflowSelect(w.id)}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              {t('暂无工作流')}
            </div>
          )
        ) : (
          <>
            {selectedChatWorkflowId && (
              <button
                onClick={handleNewSession}
                className="flex w-full items-center gap-2 rounded-lg px-3 h-9 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground mb-1"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>{t('新建会话')}</span>
              </button>
            )}
            {selectedChatWorkflowId ? (
              workflowSessions.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {workflowSessions.map(s => {
                    const sessionAgent = s.mode === 'workflow'
                      ? undefined
                      : agents.find(a => a.id === (s as any).activeAgentId) || agents[0]
                    return (
                      <ContextItem
                        key={s.id}
                        title={s.title}
                        icon="agent"
                        avatar={sessionAgent?.avatar}
                        fallbackName={sessionAgent?.name}
                        active={activeSessionId === s.id}
                        deletable={true}
                        onClick={() => handleSessionSelect(s.id)}
                        onDelete={() => deleteSession(s.id)}
                        t={t}
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  {t('暂无会话，点击 + 新建')}
                </div>
              )
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                {t('请先选择一个工作流')}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function WorkflowSidebarContent({
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
      <div className="p-2">
        <button
          onClick={() => createWorkflow(t('新工作流'), activeWorkspaceId || 'default-workspace')}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground mb-1"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>{t('新建工作流')}</span>
        </button>
      </div>
      <div className="flex-1 overflow-auto px-2 pt-[15px] pb-[15px]">
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
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            {t('暂无工作流，点击 + 创建。')}
          </div>
        )}
      </div>
    </div>
  )
}

function AgentsSidebarContent({
  agents,
  activeAgentId,
  setActiveAgent,
  t,
}: {
  agents: any[]
  activeAgentId: string | null
  setActiveAgent: (id: string) => void
  t: (key: string) => string
}) {
  return (
    <div className="flex flex-col h-full overflow-auto p-2">
      {agents.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          {agents.map(agent => (
            <ContextItem
              key={agent.id}
              title={agent.name}
              icon="agent"
              avatar={agent.avatar}
              fallbackName={agent.name}
              active={activeAgentId === agent.id}
              deletable={false}
              onClick={() => setActiveAgent(agent.id)}
              t={t}
            />
          ))}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
          {t('暂无智能体，请先创建一个智能体。')}
        </div>
      )}
    </div>
  )
}

function ContextItem({
  title,
  icon,
  avatar,
  fallbackName,
  active = false,
  deletable = false,
  onClick,
  onDelete,
  t,
}: {
  title: string,
  icon?: 'workflow' | 'agent',
  avatar?: string,
  fallbackName?: string,
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
        className="min-w-0 flex-1 flex items-center gap-2 px-3 h-9 text-left active:scale-[0.98]"
      >
        {icon === 'workflow' && (
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Workflow className="h-3.5 w-3.5 text-primary" />
          </div>
        )}
        {icon === 'agent' && (
          <Avatar className="h-6 w-6 rounded-md shrink-0">
            <AvatarImage src={avatar} className="rounded-md" />
            <AvatarFallback className="rounded-md bg-primary/10 text-primary text-[10px]">
              {fallbackName?.slice(0, 1) || "A"}
            </AvatarFallback>
          </Avatar>
        )}
        <span className="block truncate">{title}</span>
      </button>
      {deletable && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(event) => event.stopPropagation()}
              className="mr-1 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
              title={t('更多')}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(event) => {
              event.stopPropagation();
            }}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              {t('编辑')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                onDelete?.();
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              {t('删除')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
