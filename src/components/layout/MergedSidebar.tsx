import { useMemo, useState } from 'react'
import { useAppStore } from '@/stores'
import { useTheme } from '@/components/theme/ThemeProvider'
import { useTranslation } from '@/hooks/useTranslation'
import { DebugBadge } from '@/components/debug/DebugBadge'

type Mode = 'agent' | 'workflow'

/* ==================================================================
   Nav item config per mode — clicking a nav item:
   1) calls setCurrentView to switch the main content
   2) Recents below automatically shows content matching that nav
   ================================================================== */
interface NavItem {
  id: string
  icon: string
  labelKey: string
}
const AGENT_NAV: NavItem[] = [
  { id: 'chat', icon: '💬', labelKey: '新增会话' },
  { id: 'agents', icon: '🤖', labelKey: '智能体' },
  { id: 'prompts', icon: '🪄', labelKey: '提示词' },
]
const WORKFLOW_NAV: NavItem[] = [
  { id: 'workflowChat', icon: '🔀', labelKey: '工作流会话' },
  { id: 'workflow', icon: '⚡', labelKey: '工作流编辑器' },
  { id: 'prompts', icon: '🪄', labelKey: '提示词' },
]

/* ───── helper: view → recents label ───── */
function recentsLabelFor(navId: string): string {
  switch (navId) {
    case 'chat':           return '最近会话'
    case 'agents':         return '智能体'
    case 'workflowChat':   return '最近工作流会话'
    case 'workflow':       return '工作流'
    default:               return ''
  }
}

export function MergedSidebar() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  const setCurrentView = useAppStore(s => s.setCurrentView)
  const sessions = useAppStore(s => s.sessions)
  const workflows = useAppStore(s => s.workflows)
  const agents = useAppStore(s => s.agents)
  const renameSession = useAppStore(s => s.renameSession)
  const deleteSession = useAppStore(s => s.deleteSession)
  const deleteWorkflow = useAppStore(s => s.deleteWorkflow)
  const activeWorkflowId = useAppStore(s => s.activeWorkflowId)
  const activeSessionId = useAppStore(s => s.activeSessionId)
  const setActiveWorkflow = useAppStore(s => s.setActiveWorkflow)
  const setActiveSession = useAppStore(s => s.setActiveSession)

  /* ───── mode ───── */
  const [sidebarMode, setSidebarMode] = useState<Mode>('agent')
  const navItems = sidebarMode === 'agent' ? AGENT_NAV : WORKFLOW_NAV

  /* ───── active nav (defaults to first item of mode) ───── */
  const [activeNav, setActiveNav] = useState<string>('chat')

  /* ───── dialogs & interaction state ───── */
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null)
  const [menuItemId, setMenuItemId] = useState<string | null>(null)
  const [renameItemId, setRenameItemId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string } | null>(null)

  /* ───── dark / colours ───── */
  const isDark = useMemo(() => {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])
  const c = useMemo(() => ({
    bg: isDark ? '#111111' : '#f8f8f8',
    text: isDark ? '#d4d4d8' : '#1f2937',
    textMuted: isDark ? '#71717a' : '#6b7280',
    textDim: isDark ? '#525252' : '#9ca3af',
    hover: isDark ? '#262626' : '#e5e5e5',
    active: isDark ? '#262626' : '#e0e0e0',
    indicator: isDark ? '#60a5fa' : '#3b82f6',
    border: isDark ? '#3a3a3a' : '#b0b0b0',
    pillBg: isDark ? '#262626' : '#ebebeb',
    activeText: isDark ? '#ffffff' : '#111111',
    activeTextMuted: isDark ? '#ffffff' : '#111111',
    white: '#ffffff',
  }), [isDark])

  /* ───── recents content depends on (mode, activeNav) ───── */
  const recents = useMemo(() => {
    // agent mode
    if (sidebarMode === 'agent') {
      if (activeNav === 'chat') {
        return sessions
          .filter(s => s.mode === 'single' || !s.workflowId)
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, 10)
          .map(s => ({ id: s.id, title: s.title, time: formatTimeAgo(s.updatedAt) }))
      }
      if (activeNav === 'agents') {
        return agents.map(a => ({ id: a.id, title: a.name, time: '' }))
      }
      return []
    }

    // workflow mode
    if (activeNav === 'workflowChat') {
      return sessions
        .filter(s => s.mode === 'workflow' && s.workflowId)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 10)
        .map(s => ({ id: s.id, title: s.title, time: formatTimeAgo(s.updatedAt) }))
    }
    if (activeNav === 'workflow') {
      return workflows.map(w => ({ id: w.id, title: w.name, time: formatTimeAgo(w.updatedAt) }))
    }
    return []
  }, [sidebarMode, activeNav, sessions, workflows, agents])

  const rLabel = recentsLabelFor(activeNav)

  /* ───── nav click — navigates to new-chat / new-workflow views ───── */
  const handleNavClick = (item: NavItem) => {
    setActiveNav(item.id)
    if (item.id === 'chat') {
      setCurrentView('new-chat')
    } else if (item.id === 'workflowChat') {
      setCurrentView('new-workflow')
    } else {
      setCurrentView(item.id)
    }
  }

  /* ───── theme ───── */
  const cycleTheme = () => {
    const order: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']
    const idx = order.indexOf(theme)
    setTheme(order[(idx + 1) % order.length])
  }
  const themeIcon = theme === 'dark' ? '🌙' : theme === 'system' ? '💻' : '☀️'

  /* ───── render ───── */
  const showDelete = activeNav === 'workflow' && sidebarMode === 'workflow'

  return (
    <aside className="flex flex-col select-none flex-shrink-0 m-1 rounded-2xl" style={{ width: 260, background: c.bg, padding: '12px 16px', border: `1px solid ${c.border}` }}>
      <DebugBadge id="MergedSidebar" position="top-left" />

      {/* ══════ Mode Switcher ══════ */}
      <div style={{ display: 'flex', background: c.pillBg, borderRadius: 8, height: 36, flexShrink: 0, padding: 3 }}>
        <button
          onClick={() => { setSidebarMode('agent'); setActiveNav('chat'); setCurrentView('chat'); }}
          style={{
            flex: 1, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: '0.875rem', fontWeight: 500,
            color: sidebarMode === 'agent' ? c.activeText : c.textMuted,
            background: sidebarMode === 'agent' ? c.bg : 'transparent',
            borderRadius: sidebarMode === 'agent' ? '6px' : '0',
            transition: 'all 150ms ease-out',
          }}
          aria-pressed={sidebarMode === 'agent'}
        >
          <span>🤖</span> 智能体
        </button>
        <button
          onClick={() => { setSidebarMode('workflow'); setActiveNav('workflowChat'); setCurrentView('workflowChat'); }}
          style={{
            flex: 1, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: '0.875rem', fontWeight: 500,
            color: sidebarMode === 'workflow' ? c.activeText : c.textMuted,
            background: sidebarMode === 'workflow' ? c.bg : 'transparent',
            borderRadius: sidebarMode === 'workflow' ? '6px' : '0',
            transition: 'all 150ms ease-out',
          }}
          aria-pressed={sidebarMode === 'workflow'}
        >
          <span>⚡</span> 工作流
        </button>
      </div>

      {/* ══════ Nav Items ══════ */}
      <nav style={{ marginTop: 16, flexShrink: 0 }}>
        {navItems.map(item => {
          const isActive = activeNav === item.id
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                height: 36, padding: '0 12px', borderRadius: 6,
                width: '100%', border: 'none',
                background: isActive ? c.active : 'transparent',
                color: isActive ? c.activeText : c.text,
                fontSize: '0.875rem', cursor: 'pointer',
                position: 'relative', textAlign: 'left',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = c.hover }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              {isActive && (
                <span style={{
                  position: 'absolute', left: -16, top: '50%', transform: 'translateY(-50%)',
                  width: 3, height: 18, borderRadius: '0 3px 3px 0',
                  background: c.indicator,
                }} />
              )}
              <span style={{
                fontSize: '1rem', width: 20, textAlign: 'center', flexShrink: 0,
                color: isActive ? c.indicator : c.textMuted,
              }}>{item.icon}</span>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t(item.labelKey)}
              </span>
            </button>
          )
        })}
      </nav>

      {/* ══════ Recents ══════ */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 20 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 8, padding: '0 4px', flexShrink: 0,
        }}>
          <span style={{ fontSize: '0.75rem', color: c.textMuted, fontWeight: 400 }}>{rLabel}</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {recents.length > 0 ? recents.map((item) => {
            const isSelected = showDelete
              ? activeWorkflowId === item.id
              : (activeNav === 'workflow' ? activeWorkflowId === item.id : activeSessionId === item.id)
            const isHovered = hoveredItemId === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (activeNav === 'workflow') {
                    setActiveWorkflow(item.id)
                    setCurrentView('workflow-editor')
                  } else if (activeNav === 'workflowChat') {
                    setActiveSession(item.id)
                    setCurrentView('workflowChat')
                  } else {
                    setActiveSession(item.id)
                    setCurrentView('chat')
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  height: 32, padding: '0 12px', borderRadius: 6,
                  width: '100%', border: 'none', position: 'relative',
                  background: isSelected ? c.active : 'transparent',
                  color: isSelected ? c.activeText : c.text,
                  fontSize: '0.875rem', cursor: 'pointer', textAlign: 'left',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={e => { setHoveredItemId(item.id); e.currentTarget.style.background = c.hover; e.currentTarget.style.color = c.text }}
                onMouseLeave={e => { setHoveredItemId(null); e.currentTarget.style.background = isSelected ? c.active : 'transparent'; e.currentTarget.style.color = isSelected ? c.activeText : c.text }}
              >
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: isSelected ? c.indicator : c.textDim,
                  flexShrink: 0,
                }} />
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </span>
                {!isHovered && item.time && (
                  <span style={{ fontSize: '0.75rem', color: c.textDim, flexShrink: 0 }}>{item.time}</span>
                )}
                {isHovered && !showDelete && (
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                      onClick={e => { e.stopPropagation(); setMenuItemId(menuItemId === item.id ? null : item.id) }}
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
                    {menuItemId === item.id && (
                      <div style={{
                        position: 'absolute', right: 0, top: '100%', zIndex: 50,
                        background: c.bg, border: `1px solid ${c.border}`,
                        borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        minWidth: 120, padding: 4,
                      }}>
                        <button onClick={e => { e.stopPropagation(); setRenameItemId(item.id); setRenameValue(item.title); setMenuItemId(null) }}
                          style={{ display: 'block', width: '100%', border: 'none', background: 'transparent', color: c.text, fontSize: '0.8rem', padding: '6px 10px', borderRadius: 4, cursor: 'pointer', textAlign: 'left' }}
                          onMouseEnter={e => e.currentTarget.style.background = c.hover}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >{t('重命名')}</button>
                        <button onClick={e => { e.stopPropagation(); setDeleteItem({ id: item.id, name: item.title }); setMenuItemId(null) }}
                          style={{ display: 'block', width: '100%', border: 'none', background: 'transparent', color: '#ef4444', fontSize: '0.8rem', padding: '6px 10px', borderRadius: 4, cursor: 'pointer', textAlign: 'left' }}
                          onMouseEnter={e => e.currentTarget.style.background = c.hover}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >{t('删除')}</button>
                      </div>
                    )}
                  </div>
                )}
                {showDelete && (
                  <button
                    onClick={e => { e.stopPropagation(); deleteWorkflow(item.id) }}
                    style={{
                      width: 18, height: 18, borderRadius: 4, border: 'none',
                      background: 'transparent', color: c.textDim, fontSize: '0.75rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 150ms ease',
                      padding: 0, lineHeight: 1,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ef4444' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0' }}
                    title={t('删除工作流')}
                  >✕</button>
                )}
              </button>
            )
          }) : (
            <div style={{ padding: '0 12px', fontSize: '0.75rem', color: c.textDim }}>
              {t('暂无')}
            </div>
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
          <button onClick={() => setCurrentView('settings')}
            style={{
              width: 32, height: 32, borderRadius: 6, border: 'none',
              background: 'transparent', color: c.textMuted, fontSize: '1rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = c.hover }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >⚙️</button>
        </div>
      </div>

      {/* ══════ Rename & Delete Dialogs ══════ */}
      {renameItemId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.3)',
        }} onClick={() => setRenameItemId(null)}>
          <div style={{
            background: c.bg, borderRadius: 8, padding: 16, minWidth: 280,
            border: `1px solid ${c.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 12, color: c.text }}>{t('重命名')}</div>
            <input
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { renameSession(renameItemId, renameValue); setRenameItemId(null); } }}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${c.border}`,
                background: c.hover, color: c.text, fontSize: '0.875rem', outline: 'none',
                boxSizing: 'border-box',
              }}
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
      {deleteItem && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.3)',
        }} onClick={() => setDeleteItem(null)}>
          <div style={{
            background: c.bg, borderRadius: 8, padding: 16, minWidth: 280,
            border: `1px solid ${c.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>
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
