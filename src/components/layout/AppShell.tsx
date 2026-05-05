import { GlobalSidebar } from "./GlobalSidebar"
import { ContextSidebar, ContextSidebarHeader } from "./ContextSidebar"

const VIEWS_WITHOUT_SIDEBAR = new Set(['prompts', 'settings', 'profile'])

export function AppShell({
  children,
  currentView,
  setCurrentView,
}: {
  children: React.ReactNode,
  currentView: string,
  setCurrentView: (v: string) => void,
}) {
  const showSidebar = !VIEWS_WITHOUT_SIDEBAR.has(currentView)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      <GlobalSidebar currentView={currentView} setCurrentView={setCurrentView} />
      <div className="flex flex-col flex-1 overflow-hidden rounded-l-2xl border-l border-border bg-background m-1.5 ml-0">
        {showSidebar && (
          <ContextSidebarHeader />
        )}
        <div className="flex flex-1 overflow-hidden">
          {showSidebar && (
            <ContextSidebar
              currentView={currentView}
              defaultCollapsed={false}
            />
          )}
          <main className="flex-1 overflow-hidden bg-background flex flex-col relative rounded-r-2xl">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
