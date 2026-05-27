import { useEffect } from 'react'
import { GlobalSidebar } from "./GlobalSidebar"
import { ContextSidebar, ContextSidebarHeader } from "./ContextSidebar"
import { DebugBadge } from "@/components/debug/DebugBadge"
import { DebugOverlay } from "@/components/debug/DebugOverlay"
import { useAppStore } from '@/stores'

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
  const debugMode = useAppStore(state => state.debugMode)
  const toggleDebugMode = useAppStore(state => state.toggleDebugMode)

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

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      <GlobalSidebar currentView={currentView} setCurrentView={setCurrentView} />
      <div className="relative flex flex-col flex-1 overflow-hidden rounded-l-2xl border-l border-border bg-background m-1">
        <DebugBadge id="AppShell" position="bottom-right" />
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
      {debugMode && <DebugOverlay />}
    </div>
  )
}
