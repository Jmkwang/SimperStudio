import { useEffect, useState } from 'react'
import { MergedSidebar } from "./MergedSidebar"
import { TitleBar } from "./TitleBar"
import { DebugBadge } from "@/components/debug/DebugBadge"
import { DebugOverlay } from "@/components/debug/DebugOverlay"
import { useAppStore } from '@/stores'
import { cn } from "@/lib/utils"
import { useTranslation } from "@/hooks/useTranslation"
import { Bot, GitBranch, MessageSquare } from "lucide-react"

const VIEWS_WITHOUT_SIDEBAR = new Set(['profile'])

export function AppShell({
  children,
  currentView,
}: {
  children: React.ReactNode,
  currentView: string,
}) {
  const { t } = useTranslation()
  const showSidebar = !VIEWS_WITHOUT_SIDEBAR.has(currentView)
  const debugMode = useAppStore(state => state.debugMode)
  const toggleDebugMode = useAppStore(state => state.toggleDebugMode)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Workflow-specific state
  const workflowChatUI = useAppStore(s => s.workflowChatUI)
  const setWorkflowSidebarCollapsed = useAppStore(s => s.setWorkflowSidebarCollapsed)
  const setMultiAgentMode = useAppStore(s => s.setMultiAgentMode)

  // Close mobile sidebar when view changes
  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [currentView])

  // Keyboard shortcut: Ctrl+Shift+D to toggle debug mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        toggleDebugMode()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleDebugMode])

  const sessions = useAppStore(s => s.sessions)
  const activeSessionId = useAppStore(s => s.activeSessionId)
  const activeSession = sessions.find(s => s.id === activeSessionId)

  const { totalTokens, promptTokens, completionTokens } = (() => {
    if (!activeSession) return { totalTokens: 0, promptTokens: 0, completionTokens: 0 }
    let totalTokens = 0, promptTokens = 0, completionTokens = 0
    for (const msg of activeSession.messages) {
      for (const r of msg.agentResponses ?? []) {
        totalTokens += r.tokenUsage?.totalTokens ?? 0
        promptTokens += r.tokenUsage?.promptTokens ?? 0
        completionTokens += r.tokenUsage?.completionTokens ?? 0
      }
    }
    return { totalTokens, promptTokens, completionTokens }
  })()

  // Workflow view helpers
  const isWorkflowView = currentView === 'workflowChat' || currentView === 'new-workflow'
  const isWorkflowSidebarCollapsed = isWorkflowView && activeSession
    ? (workflowChatUI.sidebarCollapsedBySession[activeSession.id] ?? true)
    : false
  const multiAgentMode = isWorkflowView && activeSession
    ? (workflowChatUI.multiAgentModeBySession[activeSession.id] ?? true)
    : true

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      <TitleBar onToggleSidebar={() => setMobileSidebarOpen(prev => !prev)} />
      <div className="flex flex-1 overflow-hidden relative gap-3 p-3">
        {/* Mobile backdrop overlay */}
        {showSidebar && mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        {/* Sidebar: hidden on mobile by default, shown as overlay when open */}
        {showSidebar && (
          <div
            className={cn(`
              hidden md:flex overflow-hidden rounded-2xl flex-shrink-0
              ${mobileSidebarOpen ? '!flex fixed inset-y-0 left-0 z-50 top-9 m-3' : ''}
            `)}
          >
            <MergedSidebar />
          </div>
        )}
        <div className="relative flex flex-col flex-1 overflow-hidden bg-card rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.04)]">
          {/* Top bar: session info + view switcher */}
          <div className="flex items-center justify-between gap-1 px-4 py-2 border-b border-border">
            {/* Left: Session info */}
            <div className="flex items-center gap-3 min-w-0">
              {activeSession && (
                <>
                  <span className="text-sm font-semibold truncate">{activeSession.title}</span>
                  {totalTokens > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>↑{promptTokens}</span>
                      <span>↓{completionTokens}</span>
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground/60">
                    {new Date(activeSession.updatedAt).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </>
              )}
            </div>
            {/* Right: Workflow controls (workflow view only) */}
            <div className="flex items-center gap-1 shrink-0">
              {isWorkflowView && activeSession && (
                <>
                  {isWorkflowSidebarCollapsed && (
                    <button
                      onClick={() => setWorkflowSidebarCollapsed(activeSession.id, false)}
                      className="btn-press h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted/70 transition-all"
                      title={t('Show workflow panel')}
                    >
                      <Bot className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setMultiAgentMode(activeSession.id, !multiAgentMode)}
                    className={cn(
                      "btn-press h-7 w-7 flex items-center justify-center rounded-full transition-all",
                      multiAgentMode
                        ? "text-primary/70 hover:text-primary hover:bg-primary/10"
                        : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/70"
                    )}
                    title={multiAgentMode ? t('拓扑') : t('聊天')}
                  >
                    {multiAgentMode ? <GitBranch className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                  </button>
                </>
              )}
            </div>
          </div>
          <DebugBadge id="AppShell" position="bottom-right" />
          <main className="flex-1 overflow-hidden flex flex-col">
            {children}
          </main>
        </div>
      </div>
      {debugMode && <DebugOverlay />}
    </div>
  )
}
