export type DebugEventType =
  | 'click'
  | 'state_change'
  | 'api_call'
  | 'api_response'
  | 'error'
  | 'navigation'
  | 'workflow_exec'
  | 'custom'
  | 'stream_start'
  | 'stream_chunk'
  | 'stream_end'
  | 'stream_stall'
  | 'stream_error'
  | 'performance'

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

// ── Persistence ──
const STORAGE_KEY = 'ss_debug_logs'
const PERSIST_DEBOUNCE_MS = 2000
const MAX_PERSISTED_ENTRIES = 200

function loadPersistedEntries(): DebugLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(-MAX_PERSISTED_ENTRIES) : []
  } catch {
    return []
  }
}

function persistEntries(entries: DebugLogEntry[]): void {
  try {
    const toSave = entries.slice(-MAX_PERSISTED_ENTRIES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch {
    // Storage full or unavailable — silent fail
  }
}

// ── Stream Monitor ──
export interface StreamMonitorState {
  sessionId: string
  agentId: string
  startTime: number
  lastChunkTime: number
  chunkCount: number
  thinkingChunkCount: number
  totalChars: number
  totalThinkingChars: number
  stallThresholdMs: number
}

class StreamMonitor {
  private activeStreams = new Map<string, StreamMonitorState>()
  private stallTimers = new Map<string, ReturnType<typeof setTimeout>>()

  start(sessionId: string, agentId: string, stallThresholdMs = 15000): string {
    const key = `${sessionId}:${agentId}`
    const now = Date.now()
    this.activeStreams.set(key, {
      sessionId,
      agentId,
      startTime: now,
      lastChunkTime: now,
      chunkCount: 0,
      thinkingChunkCount: 0,
      totalChars: 0,
      totalThinkingChars: 0,
      stallThresholdMs,
    })
    this.resetStallTimer(key, stallThresholdMs)
    return key
  }

  recordChunk(key: string, textChunk: string): void {
    const stream = this.activeStreams.get(key)
    if (!stream) return
    const now = Date.now()
    stream.lastChunkTime = now
    stream.chunkCount++
    stream.totalChars += textChunk.length
    this.resetStallTimer(key, stream.stallThresholdMs)
  }

  recordThinkingChunk(key: string, thinkingChunk: string): void {
    const stream = this.activeStreams.get(key)
    if (!stream) return
    stream.lastChunkTime = Date.now()
    stream.thinkingChunkCount++
    stream.totalThinkingChars += thinkingChunk.length
    this.resetStallTimer(key, stream.stallThresholdMs)
  }

  end(key: string): StreamMonitorState | undefined {
    const stream = this.activeStreams.get(key)
    this.clearStallTimer(key)
    this.activeStreams.delete(key)
    return stream
  }

  getActive(key: string): StreamMonitorState | undefined {
    return this.activeStreams.get(key)
  }

  getActiveCount(): number {
    return this.activeStreams.size
  }

  private resetStallTimer(key: string, thresholdMs: number): void {
    this.clearStallTimer(key)
    const timer = setTimeout(() => {
      const stream = this.activeStreams.get(key)
      if (stream) {
        const stallDuration = Date.now() - stream.lastChunkTime
        debugLogger.log('stream_stall', 'StreamMonitor',
          `Stream stalled for ${Math.round(stallDuration / 1000)}s`, {
            sessionId: stream.sessionId,
            agentId: stream.agentId,
            stallDuration,
            chunkCount: stream.chunkCount,
          }, 'warn')
      }
    }, thresholdMs)
    this.stallTimers.set(key, timer)
  }

  private clearStallTimer(key: string): void {
    const timer = this.stallTimers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.stallTimers.delete(key)
    }
  }
}

class DebugLogger {
  private entries: DebugLogEntry[] = []
  private listeners: Set<Listener> = new Set()
  private nextId = 1
  private maxEntries = 500
  private enabled = true
  private persistTimer: ReturnType<typeof setTimeout> | null = null
  private dirty = false

  readonly streamMonitor = new StreamMonitor()

  constructor() {
    // Load persisted entries on init
    const persisted = loadPersistedEntries()
    if (persisted.length > 0) {
      this.entries = persisted
      this.nextId = persisted[persisted.length - 1].id + 1
    }
  }

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

    // Debounced persistence
    this.dirty = true
    this.schedulePersist()

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

  // ── Stream-specific logging ──

  streamStart(sessionId: string, agentId: string, modelId?: string): string {
    const key = this.streamMonitor.start(sessionId, agentId)
    this.log('stream_start', 'Stream', `Stream started for ${agentId}`, {
      sessionId, agentId, modelId, streamKey: key,
    })
    return key
  }

  streamChunk(key: string, _chunkLength: number, isThinking = false): void {
    const stream = this.streamMonitor.getActive(key)
    if (!stream) return
    if (isThinking) {
      this.streamMonitor.recordThinkingChunk(key, '')
    } else {
      this.streamMonitor.recordChunk(key, '')
    }
    // Log every 50th chunk to avoid noise
    const count = isThinking ? stream.thinkingChunkCount : stream.chunkCount
    if (count % 50 === 0) {
      this.log('stream_chunk', 'Stream', `${isThinking ? 'Thinking' : 'Text'} chunk #${count}`, {
        sessionId: stream.sessionId,
        agentId: stream.agentId,
        chunkCount: stream.chunkCount,
        thinkingChunkCount: stream.thinkingChunkCount,
        totalChars: stream.totalChars,
        totalThinkingChars: stream.totalThinkingChars,
      }, 'info')
    }
  }

  streamEnd(key: string, tokenUsage?: { promptTokens: number; completionTokens: number }): void {
    const stream = this.streamMonitor.end(key)
    if (!stream) return
    const duration = Date.now() - stream.startTime
    const charsPerSec = stream.totalChars / (duration / 1000)
    this.log('stream_end', 'Stream', `Stream completed for ${stream.agentId}`, {
      sessionId: stream.sessionId,
      agentId: stream.agentId,
      duration,
      chunkCount: stream.chunkCount,
      thinkingChunkCount: stream.thinkingChunkCount,
      totalChars: stream.totalChars,
      totalThinkingChars: stream.totalThinkingChars,
      charsPerSec: Math.round(charsPerSec),
      tokenUsage,
    }, 'info', duration)
  }

  streamError(key: string, error: Error): void {
    const stream = this.streamMonitor.end(key)
    const duration = stream ? Date.now() - stream.startTime : undefined
    this.log('stream_error', 'Stream', `Stream error: ${error.message}`, {
      sessionId: stream?.sessionId,
      agentId: stream?.agentId,
      duration,
      chunkCount: stream?.chunkCount,
      error: error.message,
    }, 'error', duration)
  }

  // ── Performance logging ──

  performance(label: string, durationMs: number, data?: Record<string, unknown>): void {
    this.log('performance', 'Perf', label, { ...data, durationMs }, 'info', durationMs)
  }

  // ── Existing methods ──

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
    stats.activeStreams = this.streamMonitor.getActiveCount()
    return stats
  }

  clear(): void {
    this.entries = []
    this.nextId = 1
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
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

  private schedulePersist(): void {
    if (this.persistTimer) return
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null
      if (this.dirty) {
        persistEntries(this.entries)
        this.dirty = false
      }
    }, PERSIST_DEBOUNCE_MS)
  }
}

export const debugLogger = new DebugLogger()
