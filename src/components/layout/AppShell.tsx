import { GlobalSidebar } from "./GlobalSidebar"
import { ContextSidebar } from "./ContextSidebar"

export function AppShell({
  children,
  currentView,
  setCurrentView
}: {
  children: React.ReactNode,
  currentView: string,
  setCurrentView: (v: string) => void
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      <GlobalSidebar currentView={currentView} setCurrentView={setCurrentView} />
      {currentView !== 'prompts' && <ContextSidebar currentView={currentView} />}
      <main className="flex-1 overflow-hidden bg-background flex flex-col relative">
        {children}
      </main>
    </div>
  )
}