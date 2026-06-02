import { useMemo, useState } from 'react'
import { useAppStore } from '@/stores'
import { useTheme } from '@/components/theme/ThemeProvider'
import { useTranslation } from '@/hooks/useTranslation'
import { DebugBadge } from '@/components/debug/DebugBadge'

type Mode = 'agent' | 'workflow'
type WorkflowViewMode = 'grouped' | 'flat'

const WF_VIEW_KEY = 'ss_wf_view_mode'

function loadWfViewMode(): WorkflowViewMode {
  try { return (localStorage.getItem(WF_VIEW_KEY) as WorkflowViewMode) || 'grouped' } catch { return 'grouped' }
}
function saveWfViewMode(m: WorkflowViewMode) {
  try { localStorage.setItem(WF_VIEW_KEY, m) } catch {}
}

interface NavItem { id: string; labelKey: string }
const AGENT_NAV: NavItem[] = [
  { id: 'chat', labelKey: '新增会话' },
  { id: 'agents', labelKey: '智能体管理' },
  { id: 'prompts', labelKey: '提示词' },
]
const WORKFLOW_NAV: NavItem[] = [
  { id: 'workflowChat', labelKey: '工作流会话' },
  { id: 'agents', labelKey: '智能体管理' },
  { id: 'workflow', labelKey: '工作流编辑器' },
  { id: 'prompts', labelKey: '提示词' },
]

export function MergedSidebar() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  const setCurrentView = useAppStore(s => s.setCurrentView)
  const sessions = useAppStore(s => s.sessions)
  const workflows = useAppStore(s => s.workflows)
  const renameSession = useAppStore(s => s.renameSession)
  const deleteSession = useAppStore(s => s.deleteSession)
  const activeSessionId = useAppStore(s => s.activeSessionId)
  const setActiveSession = useAppStore(s => s.setActiveSession)
  const updateSettings = useAppStore(s => s.updateSettings)

  const [sidebarMode, setSidebarMode] = useState<Mode>('workflow')
  const navItems = sidebarMode === 'agent' ? AGENT_NAV : WORKFLOW_NAV

  // workflow view mode: grouped or flat, persisted
  const [wfViewMode, setWfViewMode] = useState<WorkflowViewMode>(loadWfViewMode)
  const toggleWfViewMode = () => {
    const next: WorkflowViewMode = wfViewMode === 'grouped' ? 'flat' : 'grouped'
    setWfViewMode(next)
    saveWfViewMode(next)
  }

  // grouped: which workflow groups are expanded (default all collapsed — user expands on demand)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set())
  const toggleGroup = (wfId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(wfId)) next.delete(wfId); else next.add(wfId)
      return next
    })
  }

  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null)
  const [menuItemId, setMenuItemId] = useState<string | null>(null)
  const [renameItemId, setRenameItemId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string } | null>(null)

  // Settings menu
  const [settingsOpen, setSettingsOpen] = useState(false)
  const setSettingsActiveTab = useAppStore(s => s.setSettingsActiveTab)

  const isDark = useMemo(() => {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])
  const c = useMemo(() => ({
    bg: isDark ? '#262626' : '#f8f8f8',
    text: isDark ? '#d4d4d8' : '#1f2937',
    textMuted: isDark ? '#71717a' : '#6b7280',
    textDim: isDark ? '#525252' : '#9ca3af',
    hover: isDark ? '#3a3b3d' : '#e5e5e5',
    active: isDark ? '#3a3b3d' : '#e0e0e0',
    indicator: isDark ? '#60a5fa' : '#3b82f6',
    border: isDark ? '#333333' : '#EAEAE9',
    pillBg: isDark ? '#3a3b3d' : '#ebebeb',
    activeText: isDark ? '#ffffff' : '#111111',
    white: '#ffffff',
  }), [isDark])

  // agent mode: flat list of single sessions
  const agentRecents = useMemo(() =>
    sessions
      .filter(s => s.mode === 'single' || !s.workflowId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 20)
  , [sessions])

  // workflow mode: all workflow sessions
  const wfSessions = useMemo(() =>
    sessions
      .filter(s => s.mode === 'workflow' && s.workflowId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  , [sessions])

  // grouped: { wfId, wfName, sessions[] }[], sorted by most-recent session
  const wfGroups = useMemo(() => {
    const map = new Map<string, { wfId: string; wfName: string; sessions: typeof wfSessions }>()
    for (const s of wfSessions) {
      const wfId = s.workflowId!
      if (!map.has(wfId)) {
        const wf = workflows.find(w => w.id === wfId)
        map.set(wfId, { wfId, wfName: wf?.name || wfId, sessions: [] })
      }
      map.get(wfId)!.sessions.push(s)
    }
    return Array.from(map.values())
  }, [wfSessions, workflows])

  const rLabel = sidebarMode === 'agent' ? '最近会话' : '最近工作流会话'

  const handleNavClick = (item: NavItem) => {
    if (item.id === 'chat') setCurrentView('new-chat')
    else if (item.id === 'workflowChat') setCurrentView('new-workflow')
    else setCurrentView(item.id)
  }

  const cycleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    updateSettings({ theme: next })
  }
  const themeIcon = theme === 'dark' ? '🌙' : '☀️'

  // Export a session as JSON
  const handleExportSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    if (!session) return
    const data = {
      id: session.id,
      title: session.title,
      mode: session.mode,
      workflowId: session.workflowId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messages: session.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        meta: m.meta,
        agentResponses: m.agentResponses?.map(r => ({
          agentId: r.agentId,
          nodeId: r.nodeId,
          content: r.content,
          status: r.status,
          tokenUsage: r.tokenUsage,
          duration: r.duration,
        })),
      })),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${session.title.replace(/[/\\?%*:|"<>]/g, '-') || 'session'}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMenuItemId(null)
  }

  // Shared session row renderer
  const renderSessionRow = (session: { id: string; title: string; updatedAt: number }, indent = false) => {
    const isSelected = activeSessionId === session.id
    const isHovered = hoveredItemId === session.id
    return (
      <div
        key={session.id}
        role="button"
        tabIndex={0}
        onClick={() => {
          setActiveSession(session.id)
          setCurrentView(sidebarMode === 'workflow' ? 'workflowChat' : 'chat')
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setActiveSession(session.id)
            setCurrentView(sidebarMode === 'workflow' ? 'workflowChat' : 'chat')
          }
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 30, paddingLeft: indent ? 24 : 12, paddingRight: 12,
          borderRadius: 6, width: '100%', border: 'none', position: 'relative',
          background: isSelected ? c.active : 'transparent',
          color: isSelected ? c.activeText : c.text,
          fontSize: '0.8125rem', cursor: 'pointer', textAlign: 'left',
          transition: 'background 150ms ease',
        }}
        onMouseEnter={e => { setHoveredItemId(session.id); e.currentTarget.style.background = c.hover }}
        onMouseLeave={e => { setHoveredItemId(null); e.currentTarget.style.background = isSelected ? c.active : 'transparent' }}
      >
        {isSelected && (
          <span style={{
            position: 'absolute', left: indent ? 12 : -4, top: '50%', transform: 'translateY(-50%)',
            width: 3, height: 16, borderRadius: '0 3px 3px 0', background: c.indicator, flexShrink: 0,
          }} />
        )}
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? c.indicator : c.textDim, flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {session.title}
        </span>
        {!isHovered && (
          <span style={{ fontSize: '0.7rem', color: c.textDim, flexShrink: 0 }}>{formatTimeAgo(session.updatedAt)}</span>
        )}
        {isHovered && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={e => { e.stopPropagation(); setMenuItemId(menuItemId === session.id ? null : session.id) }}
              style={{
                width: 18, height: 18, borderRadius: 4, border: 'none',
                background: 'transparent', color: c.textMuted, fontSize: '0.75rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0, lineHeight: 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = c.text }}
              onMouseLeave={e => { e.currentTarget.style.color = c.textMuted }}
              title={t('更多')}
            >⋮</button>
            {menuItemId === session.id && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', zIndex: 50,
                background: c.bg, border: `1px solid ${c.border}`,
                borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: 120, padding: 4,
              }}>
                {[
                  { label: t('重命名'), color: c.text, onClick: () => { setRenameItemId(session.id); setRenameValue(session.title); setMenuItemId(null) } },
                  { label: t('导出'), color: c.text, onClick: () => handleExportSession(session.id) },
                  { label: t('删除'), color: '#ef4444', onClick: () => { setDeleteItem({ id: session.id, name: session.title }); setMenuItemId(null) } },
                ].map(item => (
                  <button key={item.label} onClick={e => { e.stopPropagation(); item.onClick() }}
                    style={{ display: 'block', width: '100%', border: 'none', background: 'transparent', color: item.color, fontSize: '0.8rem', padding: '6px 10px', borderRadius: 4, cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = c.hover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >{item.label}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className="flex flex-col select-none flex-shrink-0 rounded-2xl" style={{ width: 260, background: c.bg, padding: '12px 16px 8px', border: `2px solid ${c.border}`, margin: '4px 4px 8px 8px', boxShadow: `0 0 0 1px ${isDark ? 'rgba(51,51,51,0.35)' : 'rgba(234,234,233,0.5)'}` }}>
      <DebugBadge id="MergedSidebar" position="top-left" />

      {/* ══════ Mode Switcher ══════ */}
      <div style={{ display: 'flex', background: c.pillBg, borderRadius: 8, height: 36, flexShrink: 0, padding: 3 }}>
        {(['agent', 'workflow'] as const).map(mode => (
          <button key={mode}
            onClick={() => { setSidebarMode(mode); setCurrentView(mode === 'agent' ? 'chat' : 'workflowChat') }}
            style={{
              flex: 1, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.875rem', fontWeight: 500,
              color: sidebarMode === mode ? c.activeText : c.textMuted,
              background: sidebarMode === mode ? c.bg : 'transparent',
              borderRadius: sidebarMode === mode ? '6px' : '0',
              transition: 'all 150ms ease-out',
            }}
            aria-pressed={sidebarMode === mode}
          >{mode === 'agent' ? '会话' : '工作流'}</button>
        ))}
      </div>

      {/* ══════ Nav Items ══════ */}
      <nav style={{ marginTop: 16, flexShrink: 0 }}>
        {navItems.map(item => {
          return (
            <button key={item.id} onClick={() => handleNavClick(item)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                height: 36, padding: '0 12px', borderRadius: 6,
                width: '100%', border: 'none',
                background: 'transparent',
                color: c.text,
                fontSize: '0.875rem', cursor: 'pointer',
                position: 'relative', textAlign: 'left',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = c.hover }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t(item.labelKey)}
              </span>
            </button>
          )
        })}
      </nav>

      {/* ══════ Recents ══════ */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 4px', flexShrink: 0 }}>
          <span style={{ fontSize: '0.75rem', color: c.textMuted, fontWeight: 400 }}>{rLabel}</span>
          {sidebarMode === 'workflow' && (
            <button
              onClick={toggleWfViewMode}
              title={wfViewMode === 'grouped' ? '切换为平铺视图' : '切换为分组视图'}
              style={{
                width: 20, height: 20, border: 'none', background: 'transparent',
                color: c.textMuted, cursor: 'pointer', borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', padding: 0,
                transition: 'background 150ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = c.hover; e.currentTarget.style.color = c.text }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.textMuted }}
              aria-label={wfViewMode === 'grouped' ? '切换为平铺视图' : '切换为分组视图'}
            >
              {wfViewMode === 'grouped' ? '≡' : '⊞'}
            </button>
          )}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sidebarMode === 'agent' ? (
            agentRecents.length > 0
              ? agentRecents.map(s => renderSessionRow(s))
              : <div style={{ padding: '0 12px', fontSize: '0.75rem', color: c.textDim }}>{t('暂无')}</div>
          ) : wfViewMode === 'flat' ? (
            wfSessions.length > 0
              ? wfSessions.map(s => renderSessionRow(s))
              : <div style={{ padding: '0 12px', fontSize: '0.75rem', color: c.textDim }}>{t('暂无')}</div>
          ) : (
            // grouped view
            wfGroups.length > 0 ? wfGroups.map(group => {
              const isExpanded = expandedGroups.has(group.wfId) // default collapsed
              return (
                <div key={group.wfId} style={{ marginBottom: 4 }}>
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(group.wfId)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      width: '100%', border: 'none', background: 'transparent',
                      padding: '0 8px', height: 28, borderRadius: 5,
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'background 150ms ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = c.hover }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{
                      fontSize: '0.6rem', color: c.textMuted, flexShrink: 0,
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 150ms ease', display: 'inline-block',
                    }}>▶</span>
                    <span style={{
                      flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontSize: '0.8rem', fontWeight: 500, color: c.textMuted,
                    }}>{group.wfName}</span>
                    <span style={{ fontSize: '0.7rem', color: c.textDim, flexShrink: 0 }}>
                      {group.sessions.length}
                    </span>
                  </button>
                  {/* Sessions under this group */}
                  {isExpanded && group.sessions.map(s => renderSessionRow(s, true))}
                </div>
              )
            }) : <div style={{ padding: '0 12px', fontSize: '0.75rem', color: c.textDim }}>{t('暂无')}</div>
          )}
        </div>
      </div>

      {/* ══════ Gateway ══════ */}
      <div style={{
        marginTop: 'auto', paddingTop: 8, flexShrink: 0,
        borderTop: `1px solid ${c.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 44,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 18, height: 18, borderRadius: 4,
            background: c.indicator, color: c.white,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.625rem', fontWeight: 700,
          }}>S</div>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: c.text }}>SimperStudio</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={cycleTheme}
            style={{
              width: 32, height: 32, borderRadius: 6, border: 'none',
              background: 'transparent', color: c.textMuted, fontSize: '1rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = c.hover }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >{themeIcon}</button>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setSettingsOpen(v => !v)}
              style={{
                width: 32, height: 32, borderRadius: 6, border: 'none',
                background: settingsOpen ? c.hover : 'transparent', color: c.textMuted, fontSize: '1rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = c.hover }}
              onMouseLeave={e => { e.currentTarget.style.background = settingsOpen ? c.hover : 'transparent' }}
            >⚙️</button>
            {settingsOpen && (
              <>
                <div onClick={() => setSettingsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
                <div style={{
                  position: 'absolute', bottom: '100%', right: 0, zIndex: 95,
                  marginBottom: 6, minWidth: 160,
                  background: c.bg, border: `1px solid ${c.border}`,
                  borderRadius: 8, padding: 4,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                }}>
                  {[
                    { id: 'general' as const, label: t('General') },
                    { id: 'appearance' as const, label: t('Appearance') },
                    { id: 'models' as const, label: t('Models') },
                    { id: 'cli' as const, label: t('CLI Tools') },
                  ].map(tab => (
                    <button key={tab.id}
                      onClick={() => { setSettingsActiveTab(tab.id); setCurrentView('settings'); setSettingsOpen(false) }}
                      style={{
                        display: 'block', width: '100%', border: 'none', background: 'transparent',
                        color: c.text, fontSize: '0.8125rem', padding: '7px 12px', borderRadius: 5,
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'background 150ms ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = c.hover }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >{tab.label}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══════ Rename Dialog ══════ */}
      {renameItemId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setRenameItemId(null)}>
          <div style={{ background: c.bg, borderRadius: 8, padding: 16, minWidth: 280, border: `1px solid ${c.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 12, color: c.text }}>{t('重命名')}</div>
            <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { renameSession(renameItemId, renameValue); setRenameItemId(null) } }}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${c.border}`, background: c.hover, color: c.text, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button onClick={() => setRenameItemId(null)}
                style={{ padding: '6px 16px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: c.text, cursor: 'pointer', fontSize: '0.8rem' }}
              >{t('取消')}</button>
              <button onClick={() => { renameSession(renameItemId, renameValue); setRenameItemId(null) }}
                style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: c.indicator, color: c.white, cursor: 'pointer', fontSize: '0.8rem' }}
              >{t('确定')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Delete Dialog ══════ */}
      {deleteItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setDeleteItem(null)}>
          <div style={{ background: c.bg, borderRadius: 8, padding: 16, minWidth: 280, border: `1px solid ${c.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 8, color: c.text }}>{t('删除')}</div>
            <div style={{ fontSize: '0.8rem', color: c.textMuted, marginBottom: 12 }}>{t('确定删除')} "{deleteItem.name}"?</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setDeleteItem(null)}
                style={{ padding: '6px 16px', borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: c.text, cursor: 'pointer', fontSize: '0.8rem' }}
              >{t('取消')}</button>
              <button onClick={() => { deleteSession(deleteItem.id); setDeleteItem(null) }}
                style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}
              >{t('确定')}</button>
            </div>
          </div>
        </div>
      )}

    </aside>
  )
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
}
