export type DebugEventType =
  | 'click'
  | 'state_change'
  | 'api_call'
  | 'api_response'
  | 'error'
  | 'navigation'
  | 'workflow_exec'
  | 'custom'

export type DebugLogLevel = 'info' | 'warn' | 'error'

export interface DebugLogEntry {
  id: number
  timestamp: number
  type: DebugEventType
  source: string
  action: string
  data?: unknown
  duration?: number
  level: DebugLogLevel
}

export interface DebugFilters {
  type?: DebugEventType | 'all'
  level?: DebugLogLevel
  source?: string
  search?: string
  since?: number
}

type Listener = (entry: DebugLogEntry) => void

class DebugLogger {
  private entries: DebugLogEntry[] = []
  private listeners: Set<Listener> = new Set()
  private nextId = 1
  private maxEntries = 500
  private enabled = true

  log(
    type: DebugEventType,
    source: string,
    action: string,
    data?: unknown,
    level: DebugLogLevel = 'info',
    duration?: number,
  ): void {
    if (!this.enabled) return

    const entry: DebugLogEntry = {
      id: this.nextId++,
      timestamp: Date.now(),
      type,
      source,
      action,
      data,
      level,
      duration,
    }

    this.entries.push(entry)
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries)
    }

    for (const listener of this.listeners) {
      try {
        listener(entry)
      } catch {
        // listener errors must not break the logger
      }
    }
  }

  info(source: string, action: string, data?: unknown): void {
    this.log('custom', source, action, data, 'info')
  }

  warn(source: string, action: string, data?: unknown): void {
    this.log('custom', source, action, data, 'warn')
  }

  error(source: string, action: string, data?: unknown): void {
    this.log('error', source, action, data, 'error')
  }

  getEntries(filters?: DebugFilters): DebugLogEntry[] {
    if (!filters) return [...this.entries]

    return this.entries.filter((e) => {
      if (filters.type && filters.type !== 'all' && e.type !== filters.type) return false
      if (filters.level && e.level !== filters.level) return false
      if (filters.source && !e.source.toLowerCase().includes(filters.source.toLowerCase())) return false
      if (filters.since && e.timestamp < filters.since) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const hay = `${e.source} ${e.action} ${JSON.stringify(e.data ?? '')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }

  getStats(): Record<string, number> {
    const stats: Record<string, number> = {}
    for (const e of this.entries) {
      stats[e.type] = (stats[e.type] ?? 0) + 1
    }
    stats.total = this.entries.length
    return stats
  }

  clear(): void {
    this.entries = []
    this.nextId = 1
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  isEnabled(): boolean {
    return this.enabled
  }

  setMaxEntries(max: number): void {
    this.maxEntries = Math.max(50, max)
  }

  exportJSON(): string {
    return JSON.stringify(this.entries, null, 2)
  }

  exportText(): string {
    return this.entries
      .map((e) => {
        const time = new Date(e.timestamp).toISOString().slice(11, 23)
        const data = e.data !== undefined ? ` | ${JSON.stringify(e.data).slice(0, 200)}` : ''
        const dur = e.duration !== undefined ? ` (${Math.round(e.duration)}ms)` : ''
        return `[${time}] [${e.level.toUpperCase().padEnd(5)}] [${e.type.padEnd(14)}] ${e.source} → ${e.action}${dur}${data}`
      })
      .join('\n')
  }
}

export const debugLogger = new DebugLogger()
