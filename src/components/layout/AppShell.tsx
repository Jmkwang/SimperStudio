import { GlobalSidebar } from "./GlobalSidebar"
import { ContextSidebar } from "./ContextSidebar"
import { useAppStore } from "@/store/appStore"

export function AppShell({
  children,
  currentView,
  setCurrentView
}: {
  children: React.ReactNode,
  currentView: string,
  setCurrentView: (v: string) => void
}) {
  const sessions = useAppStore(state => state.sessions)
  const activeSessionId = useAppStore(state => state.activeSessionId)
  const activeSession = sessions.find(s => s.id === activeSessionId)
  const isWorkflowSession = currentView === 'chat' && activeSession?.mode === 'workflow'

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      <GlobalSidebar currentView={currentView} setCurrentView={setCurrentView} />
      {currentView !== 'prompts' && <ContextSidebar currentView={currentView} defaultCollapsed={isWorkflowSession} />}
      <main className="flex-1 overflow-hidden bg-background flex flex-col relative">
        {children}
      </main>
    </div>
  )
}