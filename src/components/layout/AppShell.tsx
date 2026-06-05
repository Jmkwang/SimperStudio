import { useEffect, useState } from 'react'
import { MergedSidebar } from "./MergedSidebar"
import { TitleBar } from "./TitleBar"
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

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

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      <TitleBar onToggleSidebar={() => setMobileSidebarOpen(prev => !prev)} />
      <div className="flex flex-1 overflow-hidden relative">
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
            className={`
              hidden md:flex
              ${mobileSidebarOpen ? '!flex fixed inset-y-0 left-0 z-50 top-9' : ''}
            `}
          >
            <MergedSidebar />
          </div>
        )}
        <div className="relative flex flex-col flex-1 overflow-hidden bg-background">
          <DebugBadge id="AppShell" position="bottom-right" />
          <main className="flex-1 overflow-hidden bg-background flex flex-col">
            {children}
          </main>
        </div>
      </div>
      {debugMode && <DebugOverlay />}
    </div>
  )
}
