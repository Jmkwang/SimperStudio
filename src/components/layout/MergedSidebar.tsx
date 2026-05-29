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
  { id: 'chat', icon: '💬', labelKey: '聊天' },
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
  const createSession = useAppStore(s => s.createSession)
  const createWorkflow = useAppStore(s => s.createWorkflow)
  const deleteWorkflow = useAppStore(s => s.deleteWorkflow)
  const activeWorkspaceId = useAppStore(s => s.activeWorkspaceId)
  const activeWorkflowId = useAppStore(s => s.activeWorkflowId)
  const activeSessionId = useAppStore(s => s.activeSessionId)
  const setActiveWorkflow = useAppStore(s => s.setActiveWorkflow)
  const setActiveSession = useAppStore(s => s.setActiveSession)

  /* ───── mode ───── */
  const [sidebarMode, setSidebarMode] = useState<Mode>('agent')
  const navItems = sidebarMode === 'agent' ? AGENT_NAV : WORKFLOW_NAV

  /* ───── active nav (defaults to first item of mode) ───── */
  const [activeNav, setActiveNav] = useState<string>('chat')

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
    border: isDark ? '#2a2a2a' : '#d1d5db',
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

  /* ───── primary action ───── */
  const primaryLabel = useMemo(() => {
    if (activeNav === 'chat')       return t('新建会话')
    if (activeNav === 'agents')     return t('新建智能体')
    if (activeNav === 'workflow')   return t('新建工作流')
    if (activeNav === 'workflowChat') return t('新建会话')
    return t('新建')
  }, [activeNav, t])

  const handlePrimary = () => {
    if (activeNav === 'chat')       createSession(t('新对话'), activeWorkspaceId || 'default-workspace', undefined, 'single')
    else if (activeNav === 'workflow') createWorkflow(t('新工作流'), activeWorkspaceId || 'default-workspace')
    else if (activeNav === 'workflowChat') createSession(t('新对话'), activeWorkspaceId || 'default-workspace', undefined, 'single')
    else if (activeNav === 'agents') {
      // open agents list view — user can create from there
      setCurrentView('agents')
    }
  }

  /* ───── nav click ───── */
  const handleNavClick = (item: NavItem) => {
    setActiveNav(item.id)
    setCurrentView(item.id)
    // auto-select first workflow when entering editor
    if (item.id === 'workflow' && !activeWorkflowId && workflows.length > 0) {
      setActiveWorkflow(workflows[0].id)
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
          onClick={() => { setSidebarMode('workflow'); setActiveNav('workflow'); setCurrentView('workflow'); }}
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

      {/* ══════ Primary Action ══════ */}
      <button
        onClick={handlePrimary}
        style={{
          width: '100%', height: 38, marginTop: 12,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 12px', borderRadius: 8,
          background: c.pillBg, color: c.activeText,
          fontSize: '0.875rem', fontWeight: 500,
          border: 'none', cursor: 'pointer',
          transition: 'background 150ms ease', flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = c.hover }}
        onMouseLeave={e => { e.currentTarget.style.background = c.pillBg }}
      >
        <span style={{ fontSize: '1.125rem', fontWeight: 300, lineHeight: 1 }}>+</span>
        <span>{primaryLabel}</span>
      </button>

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
          {showDelete && (
            <button
              onClick={handlePrimary}
              style={{
                width: 20, height: 20, borderRadius: 4, border: 'none',
                background: 'transparent', color: c.textMuted, fontSize: '1rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = c.text }}
              onMouseLeave={e => { e.currentTarget.style.color = c.textMuted }}
              title={t('新建工作流')}
            >+</button>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {recents.length > 0 ? recents.map((item) => {
            const isSelected = showDelete
              ? activeWorkflowId === item.id
              : (activeNav === 'workflow' ? activeWorkflowId === item.id : activeSessionId === item.id)
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (activeNav === 'workflow') {
                    setActiveWorkflow(item.id)
                    setCurrentView('workflow')
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
                  width: '100%', border: 'none',
                  background: isSelected ? c.active : 'transparent',
                  color: isSelected ? c.activeText : c.text,
                  fontSize: '0.875rem', cursor: 'pointer', textAlign: 'left',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = c.hover; e.currentTarget.style.color = c.text }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isSelected ? c.active : 'transparent'
                  e.currentTarget.style.color = isSelected ? c.activeText : c.text
                }}
              >
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: isSelected ? c.indicator : c.textDim,
                  flexShrink: 0,
                }} />
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </span>
                {item.time && (
                  <span style={{ fontSize: '0.75rem', color: c.textDim, flexShrink: 0 }}>{item.time}</span>
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
