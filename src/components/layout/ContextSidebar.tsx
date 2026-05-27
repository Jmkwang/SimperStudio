import { useState, useRef, useCallback, useEffect } from "react"
import { ChevronLeft } from "lucide-react"
import { useAppStore } from '@/stores'
import { useTranslation } from "@/hooks/useTranslation"
import { ChatSidebar, WorkflowSidebar, WorkflowChatSidebar, AgentsSidebar } from "./sidebar"
import { DebugBadge } from "@/components/debug/DebugBadge"

export function ContextSidebarHeader() {
  return (
    <div className="h-px bg-foreground/[0.04] flex-shrink-0" />
  )
}

// Constants extracted from magic numbers
const SIDEBAR_OFFSET_X = 76
const SIDEBAR_COLLAPSE_THRESHOLD = 180
const SIDEBAR_MIN_WIDTH = 180
const SIDEBAR_MAX_WIDTH = 600
const SIDEBAR_DEFAULT_WIDTH = 256

export function ContextSidebar({
  currentView,
  defaultCollapsed = false,
}: {
  currentView: string
  defaultCollapsed?: boolean
}) {
  const [sidebarWidth, setSidebarWidth] = useState(defaultCollapsed ? 0 : SIDEBAR_DEFAULT_WIDTH)
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const isResizing = useRef(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const setActiveSession = useAppStore(state => state.setActiveSession)
  const deleteSession = useAppStore(state => state.deleteSession)
  const deleteWorkflow = useAppStore(state => state.deleteWorkflow)
  const setActiveWorkflow = useAppStore(state => state.setActiveWorkflow)
  const openWorkflowSession = useAppStore(state => state.openWorkflowSession)
  const createWorkflow = useAppStore(state => state.createWorkflow)
  const createSession = useAppStore(state => state.createSession)
  const activeWorkspaceId = useAppStore(state => state.activeWorkspaceId)
  const sessions = useAppStore(state => state.sessions)
  const workflows = useAppStore(state => state.workflows)
  const agents = useAppStore(state => state.agents)
  const agentCategories = useAppStore(state => state.agentCategories)
  const addAgentCategory = useAppStore(state => state.addAgentCategory)
  const activeSessionId = useAppStore(state => state.activeSessionId)
  const activeWorkflowId = useAppStore(state => state.activeWorkflowId)
  const selectedAgentCategory = useAppStore(state => state.selectedAgentCategory)
  const setSelectedAgentCategory = useAppStore(state => state.setSelectedAgentCategory)
  const { t } = useTranslation()

  const effectiveWidth = sidebarWidth

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const newWidth = e.clientX - SIDEBAR_OFFSET_X
      if (newWidth < SIDEBAR_COLLAPSE_THRESHOLD) {
        setCollapsed(true)
        setSidebarWidth(0)
      } else {
        setCollapsed(false)
        setSidebarWidth(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, newWidth)))
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
    } else {
      setCollapsed(false)
      setSidebarWidth(SIDEBAR_DEFAULT_WIDTH)
    }
  }, [defaultCollapsed])

  const toggleCollapse = () => {
    if (collapsed) {
      setCollapsed(false)
      setSidebarWidth(SIDEBAR_DEFAULT_WIDTH)
    } else {
      setCollapsed(true)
      setSidebarWidth(0)
    }
  }

  if (collapsed) {
    return (
      <div className="relative flex-shrink-0 bg-background rounded-l-xl my-1.5">
        <button
          onClick={toggleCollapse}
          className="h-full w-5 flex items-center justify-center hover:bg-hover text-muted-foreground hover:text-foreground transition-all duration-400 ease-out rounded-l-xl"
          aria-label={t("Expand sidebar")}
          aria-expanded={false}
          title={t("Expand sidebar")}
        >
          <ChevronLeft className="h-3 w-3 rotate-180" strokeWidth={1.5} />
        </button>
      </div>
    )
  }

  const renderSidebarContent = () => {
    switch (currentView) {
      case 'chat':
        return <ChatSidebar
          sessions={sessions}
          agents={agents}
          activeSessionId={activeSessionId}
          setActiveSession={setActiveSession}
          createSession={createSession}
          deleteSession={deleteSession}
          activeWorkspaceId={activeWorkspaceId}
          t={t}
        />
      case 'workflowChat':
        return <WorkflowChatSidebar
          workflows={workflows}
          sessions={sessions}
          activeSessionId={activeSessionId}
          setActiveSession={setActiveSession}
          openWorkflowSession={openWorkflowSession}
          deleteSession={deleteSession}
          deleteWorkflow={deleteWorkflow}
          t={t}
        />
      case 'workflow':
        return <WorkflowSidebar
          workflows={workflows}
          activeWorkflowId={activeWorkflowId}
          setActiveWorkflow={setActiveWorkflow}
          createWorkflow={createWorkflow}
          deleteWorkflow={deleteWorkflow}
          activeWorkspaceId={activeWorkspaceId}
          t={t}
        />
      case 'agents':
        return <AgentsSidebar
          agents={agents}
          agentCategories={agentCategories}
          addAgentCategory={addAgentCategory}
          selectedCategory={selectedAgentCategory}
          onSelectCategory={setSelectedAgentCategory}
          t={t}
        />
      default:
        return (
          <div className="flex h-full items-center justify-center p-6 text-xs text-muted-foreground">
            {t('此视图暂无侧边栏内容。')}
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col bg-background relative rounded-l-xl my-1.5 border-r border-border"
      ref={sidebarRef}
      style={{ width: effectiveWidth, minWidth: effectiveWidth, maxWidth: effectiveWidth }}
    >
      <DebugBadge id="ContextSidebar" position="top-left" />
      <div className="flex-1 overflow-hidden">
        {renderSidebarContent()}
      </div>
      <div
        className="absolute right-0 top-0 bottom-0 w-px cursor-col-resize hover:bg-lunar-300/20 transition-colors duration-400 z-10"
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}
