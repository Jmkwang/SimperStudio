import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Bug,
  X,
  Trash2,
  Download,
  ChevronDown,
  MousePointerClick,
  ArrowLeftRight,
  Globe,
  AlertTriangle,
  Workflow,
  Type,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores'
import {
  debugLogger,
  type DebugLogEntry,
  type DebugEventType,
  type DebugFilters,
} from '@/lib/debugLogger'

// ─── Hover Highlight ───────────────────────────────────────────────

interface HoverInfo {
  rect: DOMRect
  source: string
  action: string
}

const INTERACTIVE_SELECTOR =
  'button, a, [role="button"], [role="tab"], [role="menuitem"], input, select, textarea, [data-debug-source]'

function findInteractive(el: EventTarget | null): Element | null {
  if (!(el instanceof Element)) return null
  return el.closest(INTERACTIVE_SELECTOR)
}

function extractDebugInfo(el: Element): HoverInfo {
  const source = el.getAttribute('data-debug-source') ?? el.closest('[data-debug-source]')?.getAttribute('data-debug-source') ?? el.tagName.toLowerCase()
  const action = el.getAttribute('data-debug-action') ?? el.closest('[data-debug-action]')?.getAttribute('data-debug-action') ?? el.textContent?.trim().slice(0, 30) ?? '(unnamed)'
  return { rect: el.getBoundingClientRect(), source, action }
}

function HoverHighlight({ info }: { info: HoverInfo }) {
  const { rect, source, action } = info
  return (
    <div
      className="pointer-events-none fixed z-[9999]"
      style={{
        left: rect.left - 2,
        top: rect.top - 2,
        width: rect.width + 4,
        height: rect.height + 4,
      }}
    >
      <div className="absolute inset-0 border-2 border-dashed border-orange-400/70 rounded-md" />
      <div
        className="absolute -top-7 left-0 whitespace-nowrap bg-orange-500/90 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow-sm"
      >
        {source} → {action}
      </div>
    </div>
  )
}

// ─── Type Icon ─────────────────────────────────────────────────────

function TypeIcon({ type }: { type: DebugEventType }) {
  const cls = 'w-3 h-3 shrink-0'
  switch (type) {
    case 'click':
      return <MousePointerClick className={cls} />
    case 'state_change':
      return <ArrowLeftRight className={cls} />
    case 'api_call':
    case 'api_response':
      return <Globe className={cls} />
    case 'error':
      return <AlertTriangle className={cls} />
    case 'navigation':
      return <ChevronDown className={cls} />
    case 'workflow_exec':
      return <Workflow className={cls} />
    default:
      return <Type className={cls} />
  }
}

// ─── Level Badge ───────────────────────────────────────────────────

function LevelBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    info: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    warn: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    error: 'bg-red-500/15 text-red-600 dark:text-red-400',
  }
  return (
    <span className={cn('text-[9px] font-mono px-1 rounded', colors[level] ?? colors.info)}>
      {level.toUpperCase()}
    </span>
  )
}

// ─── Format helpers ────────────────────────────────────────────────

function formatTime(ts: number): string {
  return new Date(ts).toISOString().slice(11, 23)
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str
}

// ─── Main Overlay ──────────────────────────────────────────────────

const FILTER_TABS: { key: DebugEventType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'click', label: 'Clicks' },
  { key: 'state_change', label: 'State' },
  { key: 'api_call', label: 'API' },
  { key: 'error', label: 'Errors' },
  { key: 'navigation', label: 'Nav' },
]

const MAX_DISPLAYED = 200

export function DebugOverlay() {
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
  const [entries, setEntries] = useState<DebugLogEntry[]>([])
  const [activeFilter, setActiveFilter] = useState<DebugEventType | 'all'>('all')
  const [searchText, setSearchText] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Subscribe to new log entries
  useEffect(() => {
    return debugLogger.subscribe((entry) => {
      setEntries((prev) => {
        const next = [...prev, entry]
        return next.length > MAX_DISPLAYED ? next.slice(-MAX_DISPLAYED) : next
      })
    })
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries.length])

  // Global hover listener
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = findInteractive(e.target)
      if (el) {
        setHoverInfo(extractDebugInfo(el))
      } else {
        setHoverInfo(null)
      }
    }
    document.addEventListener('mouseover', handler, { passive: true })
    return () => document.removeEventListener('mouseover', handler)
  }, [])

  // Keyboard shortcut: Escape to collapse
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !collapsed) {
        setCollapsed(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [collapsed])

  // Filtered entries
  const filtered = useMemo(() => {
    const filters: DebugFilters = {}
    if (activeFilter !== 'all') filters.type = activeFilter
    if (searchText) filters.search = searchText
    return debugLogger.getEntries(filters)
  }, [entries, activeFilter, searchText])

  // Stats from full log (not filtered)
  const stats = useMemo(() => debugLogger.getStats(), [entries])

  const handleExportJSON = useCallback(() => {
    const blob = new Blob([debugLogger.exportJSON()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug-log-${new Date().toISOString().slice(0, 19)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleExportText = useCallback(() => {
    const blob = new Blob([debugLogger.exportText()], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug-log-${new Date().toISOString().slice(0, 19)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleClear = useCallback(() => {
    debugLogger.clear()
    setEntries([])
    setExpanded(null)
  }, [])

  // Collapsed: just show a floating icon
  if (collapsed) {
    return (
      <>
        {hoverInfo && <HoverHighlight info={hoverInfo} />}
        <button
          onClick={() => setCollapsed(false)}
          className="fixed bottom-4 right-4 z-[9998] flex items-center gap-1.5 bg-orange-500/90 hover:bg-orange-500 text-white px-2.5 py-1.5 rounded-lg shadow-lg text-xs font-mono transition-all"
          aria-label="Open Debug Panel"
        >
          <Bug className="w-3.5 h-3.5" />
          Debug ({entries.length})
        </button>
      </>
    )
  }

  return (
    <>
      {/* Hover highlight layer */}
      {hoverInfo && <HoverHighlight info={hoverInfo} />}

      {/* Bottom log bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[9998] bg-card/95 backdrop-blur-sm border-t border-border shadow-2xl flex flex-col max-h-[40vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2">
            <Bug className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs font-semibold">Debug Console</span>
            <span className="text-[10px] text-muted-foreground font-mono">({filtered.length})</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleClear}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Clear logs"
              aria-label="Clear debug logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleExportJSON}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Export JSON"
              aria-label="Export debug logs as JSON"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleExportText}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors
                text-[10px] font-mono px-1.5"
              title="Export Text"
              aria-label="Export debug logs as text"
            >
              TXT
            </button>
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-1"
              title="Collapse (Esc)"
              aria-label="Collapse debug panel"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                useAppStore.getState().toggleDebugMode()
              }}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Close Debug Mode"
              aria-label="Close debug mode"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-1 px-3 py-1 border-b border-border/30">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full font-mono transition-colors',
                activeFilter === tab.key
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {tab.label}
              {tab.key !== 'all' && stats[tab.key] ? (
                <span className="ml-1 opacity-60">{stats[tab.key]}</span>
              ) : null}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <Search className="w-3 h-3 text-muted-foreground" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="filter..."
              className="bg-transparent text-[10px] font-mono w-28 outline-none placeholder:text-muted-foreground/50"
              aria-label="Filter debug logs"
            />
          </div>
          {/* Stats badges */}
          <div className="flex items-center gap-1 ml-3">
            {(['click', 'state_change', 'api_call', 'error'] as const).map((t) =>
              stats[t] ? (
                <span
                  key={t}
                  className={cn(
                    'text-[9px] font-mono px-1 rounded',
                    t === 'error'
                      ? 'bg-red-500/10 text-red-500'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {t === 'state_change' ? 'state' : t === 'api_call' ? 'api' : t}: {stats[t]}
                </span>
              ) : null,
            )}
          </div>
        </div>

        {/* Log entries */}
        <div ref={scrollRef} className="overflow-y-auto flex-1 min-h-0">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              No debug entries yet. Interact with the app to see logs.
            </div>
          ) : (
            filtered.map((entry) => (
              <div
                key={entry.id}
                onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                className={cn(
                  'relative flex items-center gap-2 px-3 py-1 text-[11px] font-mono border-b border-border/20 cursor-pointer hover:bg-muted/30 transition-colors',
                  entry.level === 'error' && 'bg-red-500/5',
                  entry.level === 'warn' && 'bg-amber-500/5',
                )}
              >
                <span className="text-muted-foreground/50 w-5 text-right shrink-0">
                  {entry.id}
                </span>
                <span className="text-muted-foreground/70 w-20 shrink-0">
                  {formatTime(entry.timestamp)}
                </span>
                <TypeIcon type={entry.type} />
                <span
                  className={cn(
                    'w-20 shrink-0',
                    entry.type === 'error'
                      ? 'text-red-500'
                      : entry.type === 'api_call'
                        ? 'text-blue-500'
                        : 'text-muted-foreground',
                  )}
                >
                  {entry.type === 'state_change' ? 'state' : entry.type === 'api_call' ? '→ api' : entry.type === 'api_response' ? '← api' : entry.type}
                </span>
                <span className="w-28 shrink-0 truncate text-foreground/80">{entry.source}</span>
                <span className="flex-1 truncate text-foreground">
                  {truncate(entry.action, 80)}
                </span>
                {entry.duration !== undefined && (
                  <span className="text-muted-foreground/50 shrink-0">
                    {Math.round(entry.duration)}ms
                  </span>
                )}
                <LevelBadge level={entry.level} />

                {/* Expanded detail */}
                {expanded === entry.id && entry.data !== undefined && (
                  <div className="absolute left-0 right-0 top-full bg-card border border-border rounded-b shadow-lg p-2 z-10 max-h-40 overflow-auto">
                    <pre className="text-[10px] font-mono whitespace-pre-wrap break-all text-muted-foreground">
                      {typeof entry.data === 'string'
                        ? entry.data
                        : JSON.stringify(entry.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

