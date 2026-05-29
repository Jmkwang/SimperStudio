import { useEffect } from 'react'
import { MergedSidebar } from "./MergedSidebar"
import { DebugBadge } from "@/components/debug/DebugBadge"
import { DebugOverlay } from "@/components/debug/DebugOverlay"
import { useAppStore } from '@/stores'

const VIEWS_WITHOUT_SIDEBAR = new Set(['profile'])

export function AppShell({
  children,
  currentView,
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
      {showSidebar && <MergedSidebar />}
      <div className="relative flex flex-col flex-1 overflow-hidden bg-background">
        <DebugBadge id="AppShell" position="bottom-right" />
        <main className="flex-1 overflow-hidden bg-background flex flex-col">
          {children}
        </main>
      </div>
      {debugMode && <DebugOverlay />}
    </div>
  )
}
