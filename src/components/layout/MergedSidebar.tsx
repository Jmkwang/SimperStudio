import { useMemo, useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/stores'
import { useTheme } from '@/components/theme/ThemeProvider'
import { useTranslation } from '@/hooks/useTranslation'
import { DebugBadge } from '@/components/debug/DebugBadge'
import { Moon, Settings, Sun, Zap, Plus, Bot, FileText, MessageSquare, Workflow, Wrench, User } from 'lucide-react'
import { cn } from '@/lib/utils'

type Mode = 'agent' | 'workflow'
type WorkflowViewMode = 'grouped' | 'flat'

const WF_VIEW_KEY = 'ss_wf_view_mode'

function loadWfViewMode(): WorkflowViewMode {
  try { return (localStorage.getItem(WF_VIEW_KEY) as WorkflowViewMode) || 'grouped' } catch { return 'grouped' }
}
function saveWfViewMode(m: WorkflowViewMode) {
  try { localStorage.setItem(WF_VIEW_KEY, m) } catch {}
}

interface NavItem { id: string; labelKey: string; icon: React.ReactNode }
const AGENT_NAV: NavItem[] = [
  { id: 'chat', labelKey: '新增会话', icon: <Plus className="h-4 w-4" /> },
  { id: 'agents', labelKey: '智能体管理', icon: <Bot className="h-4 w-4" /> },
  { id: 'prompts', labelKey: '提示词', icon: <FileText className="h-4 w-4" /> },
]
const WORKFLOW_NAV: NavItem[] = [
  { id: 'workflowChat', labelKey: '工作流会话', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'agents', labelKey: '智能体管理', icon: <Bot className="h-4 w-4" /> },
  { id: 'workflow', labelKey: '工作流编辑器', icon: <Workflow className="h-4 w-4" /> },
  { id: 'prompts', labelKey: '提示词', icon: <FileText className="h-4 w-4" /> },
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
  const agents = useAppStore(s => s.agents)
  const createSession = useAppStore(s => s.createSession)
  const activeWorkspaceId = useAppStore(s => s.activeWorkspaceId)
  const settings = useAppStore(s => s.settings)

  const [sidebarMode, setSidebarMode] = useState<Mode>(() => {
    try { return (localStorage.getItem('ss_sidebar_mode') as Mode) || 'workflow' } catch { return 'workflow' }
  })

  // Auto-sync sidebarMode when only one mode is visible
  useEffect(() => {
    const showAgent = settings.showSidebarAgentMode !== false
    const showWorkflow = settings.showSidebarWorkflowMode !== false
    if (showAgent && !showWorkflow && sidebarMode !== 'agent') {
      setSidebarMode('agent')
      try { localStorage.setItem('ss_sidebar_mode', 'agent') } catch {}
    } else if (!showAgent && showWorkflow && sidebarMode !== 'workflow') {
      setSidebarMode('workflow')
      try { localStorage.setItem('ss_sidebar_mode', 'workflow') } catch {}
    }
  }, [settings.showSidebarAgentMode, settings.showSidebarWorkflowMode, sidebarMode])

  const showAgent = settings.showSidebarAgentMode !== false
  const showWorkflow = settings.showSidebarWorkflowMode !== false
  const visibleModes = (['agent', 'workflow'] as const).filter(m =>
    m === 'agent' ? showAgent : showWorkflow
  )
  const isSingleMode = visibleModes.length <= 1

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

  const avatarInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      updateSettings({ userAvatar: reader.result as string })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Settings menu
  const [settingsOpen, setSettingsOpen] = useState(false)
  const setSettingsActiveTab = useAppStore(s => s.setSettingsActiveTab)

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

  const rLabel = isSingleMode ? t('Recents') : (sidebarMode === 'agent' ? t('最近会话') : t('最近工作流会话'))

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
  const ThemeIcon = theme === 'dark' ? Moon : Sun

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

  // Helper: get first agent's avatar for a session
  const getSessionAvatar = (session: { messages?: { role: string; agentResponses?: { agentId?: string }[] }[] }) => {
    for (const msg of session.messages ?? []) {
      if (msg.agentResponses?.length) {
        const agentId = msg.agentResponses[0].agentId
        if (agentId) {
          const agent = agents.find(a => a.id === agentId)
          if (agent?.avatar) return agent.avatar
        }
        break
      }
    }
    return null
  }

  // Shared session row renderer
  const renderSessionRow = (session: { id: string; title: string; updatedAt: number; mode?: string; workflowId?: string; messages?: { role: string; agentResponses?: { agentId?: string }[] }[] }, indent = false) => {
    const isSelected = activeSessionId === session.id
    const isHovered = hoveredItemId === session.id
    const isWorkflowSession = session.mode === 'workflow' || !!session.workflowId
    return (
      <div
        key={session.id}
        role="button"
        tabIndex={0}
        onClick={() => {
          setActiveSession(session.id)
          setCurrentView(isWorkflowSession ? 'workflowChat' : 'chat')
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setActiveSession(session.id)
            setCurrentView(isWorkflowSession ? 'workflowChat' : 'chat')
          }
        }}
        className={cn(
          "flex items-center gap-2 h-[30px] rounded-md text-[13px] cursor-pointer text-left relative select-none",
          "transition-colors duration-150",
          indent ? "pl-6 pr-3" : "pl-3 pr-3",
          isSelected && "bg-muted text-foreground font-medium",
          !isSelected && "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        )}
        onMouseEnter={() => setHoveredItemId(session.id)}
        onMouseLeave={() => setHoveredItemId(null)}
      >
        {/* 选中态指示条 */}
        <span className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary transition-transform duration-200 ease-out",
          isSelected ? "scale-y-100" : "scale-y-0"
        )} />
        
        {!isWorkflowSession ? (
          (() => {
            const avatar = getSessionAvatar(session)
            return avatar
              ? <img src={avatar} alt="" className="w-4 h-4 rounded-[3px] shrink-0 object-cover" />
              : <span className={cn(
                  "w-1 h-1 rounded-full shrink-0",
                  isSelected ? "bg-primary" : "bg-muted-foreground/30"
                )} />
          })()
        ) : (
          <Zap size={14} className="shrink-0 text-muted-foreground/50" />
        )}
        <span className="flex-1 min-w-0 truncate">
          {session.title}
        </span>
        {!isHovered && (
          <span className="text-[10px] text-muted-foreground/40 shrink-0">{formatTimeAgo(session.updatedAt)}</span>
        )}
        {isHovered && (
          <div className="relative shrink-0">
            <button
              onClick={e => { e.stopPropagation(); setMenuItemId(menuItemId === session.id ? null : session.id) }}
              className="w-[18px] h-[18px] rounded flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
              title={t('更多')}
            >⋮</button>
            {menuItemId === session.id && (
              <div className="absolute right-0 top-full z-50 bg-popover border rounded-md shadow-lg min-w-[120px] p-1">
                {[
                  { label: t('重命名'), onClick: () => { setRenameItemId(session.id); setRenameValue(session.title); setMenuItemId(null) } },
                  { label: t('导出'), onClick: () => handleExportSession(session.id) },
                  { label: t('删除'), destructive: true, onClick: () => { setDeleteItem({ id: session.id, name: session.title }); setMenuItemId(null) } },
                ].map(item => (
                  <button key={item.label} onClick={e => { e.stopPropagation(); item.onClick() }}
                    className={cn(
                      "block w-full text-left text-xs px-3 py-1.5 rounded-sm cursor-pointer transition-colors",
                      item.destructive
                        ? "text-destructive hover:bg-destructive/10"
                        : "text-foreground hover:bg-muted"
                    )}
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
    <aside className="flex flex-col select-none flex-shrink-0 w-[260px] h-full bg-card p-3 pb-2 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.04)] overflow-hidden">
      <DebugBadge id="MergedSidebar" position="top-left" />

      {/* ══════ Mode Switcher ══════ */}
      {visibleModes.length > 0 && (
        <div className="flex bg-secondary rounded-[10px] h-9 flex-shrink-0 p-[3px]">
          {visibleModes.map(mode => (
            <button key={mode}
              onClick={() => { setSidebarMode(mode); try { localStorage.setItem('ss_sidebar_mode', mode) } catch {}; setCurrentView(mode === 'agent' ? 'chat' : 'workflowChat') }}
              className={cn(
                "flex-1 border-none cursor-pointer flex items-center justify-center text-sm font-medium rounded-lg transition-all duration-200",
                sidebarMode === mode
                  ? "bg-muted text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={sidebarMode === mode}
              disabled={visibleModes.length <= 1}
            >{mode === 'agent' ? t('会话') : t('Workflows')}</button>
          ))}
        </div>
      )}

      {/* ══════ Nav Items ══════ */}
      <nav className="mt-3 flex-shrink-0 space-y-0.5">
        {navItems.map(item => {
          return (
            <button key={item.id} onClick={() => handleNavClick(item)}
              className={cn(
                "w-full flex items-center gap-2.5 h-9 px-3 rounded-lg text-sm text-left relative",
                "transition-colors duration-150 cursor-pointer",
                "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <span className="text-muted-foreground/50">{item.icon}</span>
              <span className="flex-1 min-w-0 truncate">
                {t(item.labelKey)}
              </span>
            </button>
          )
        })}
      </nav>

      {/* ══════ Recents ══════ */}
      <div className="flex-1 min-h-0 flex flex-col mt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 px-1 flex-shrink-0">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{rLabel}</span>
          {sidebarMode === 'workflow' && (
            <button
              onClick={toggleWfViewMode}
              title={wfViewMode === 'grouped' ? t('切换为平铺视图') : t('切换为分组视图')}
              className="w-5 h-5 border-none bg-transparent text-muted-foreground hover:text-foreground rounded cursor-pointer flex items-center justify-center text-[10px] transition-colors"
              aria-label={wfViewMode === 'grouped' ? t('切换为平铺视图') : t('切换为分组视图')}
            >
              {wfViewMode === 'grouped' ? '≡' : '⊞'}
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto -mx-1 space-y-0.5">
          {isSingleMode ? (
            <>
              {/* Single chat sessions */}
              {agentRecents.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 h-6 flex items-center text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t('会话')}</div>
                  <div className="space-y-0.5">{agentRecents.map(s => renderSessionRow(s))}</div>
                </div>
              )}
              {/* Workflow sessions - grouped */}
              {wfGroups.length > 0 && (
                <div>
                  <div className="px-2 h-6 flex items-center text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t('工作流')}</div>
                  {wfGroups.map(group => {
                    const isExpanded = expandedGroups.has(group.wfId)
                    return (
                      <div key={group.wfId} className="mb-1">
                        <button
                          onClick={() => toggleGroup(group.wfId)}
                          onDoubleClick={async () => {
                            const title = `${group.wfName} · ${group.sessions.length + 1}`
                            await createSession(title, activeWorkspaceId || 'default-workspace', group.wfId, 'workflow')
                            setExpandedGroups(prev => {
                              const next = new Set(prev)
                              next.add(group.wfId)
                              return next
                            })
                          }}
                          className="w-full flex items-center gap-1.5 border-none bg-transparent px-2 h-7 rounded-md cursor-pointer text-left transition-colors hover:bg-muted/60"
                        >
                          <span className={cn(
                            "text-[10px] text-muted-foreground/60 shrink-0 inline-block transition-transform duration-200",
                            isExpanded && "rotate-90"
                          )}>▶</span>
                          <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-muted-foreground">
                            {group.wfName}
                          </span>
                          <span className="text-[10px] text-muted-foreground/40 shrink-0">
                            {group.sessions.length}
                          </span>
                        </button>
                        {isExpanded && group.sessions.map(s => renderSessionRow(s, true))}
                      </div>
                    )
                  })}
                </div>
              )}
              {agentRecents.length === 0 && wfGroups.length === 0 && (
                <div className="px-3 text-xs text-muted-foreground/50">{t('暂无')}</div>
              )}
            </>
          ) : sidebarMode === 'agent' ? (
            agentRecents.length > 0
              ? agentRecents.map(s => renderSessionRow(s))
              : <div className="px-3 text-xs text-muted-foreground/50">{t('暂无')}</div>
          ) : wfViewMode === 'flat' ? (
            wfSessions.length > 0
              ? wfSessions.map(s => renderSessionRow(s))
              : <div className="px-3 text-xs text-muted-foreground/50">{t('暂无')}</div>
          ) : (
            // grouped view
            wfGroups.length > 0 ? wfGroups.map(group => {
              const isExpanded = expandedGroups.has(group.wfId)
              return (
                <div key={group.wfId} className="mb-1">
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(group.wfId)}
                    onDoubleClick={async () => {
                      const title = `${group.wfName} · ${group.sessions.length + 1}`
                      await createSession(title, activeWorkspaceId || 'default-workspace', group.wfId, 'workflow')
                      setExpandedGroups(prev => {
                        const next = new Set(prev)
                        next.add(group.wfId)
                        return next
                      })
                    }}
                    className="w-full flex items-center gap-1.5 border-none bg-transparent px-2 h-7 rounded-md cursor-pointer text-left transition-colors hover:bg-muted/60"
                  >
                    <span className={cn(
                      "text-[10px] text-muted-foreground/60 shrink-0 inline-block transition-transform duration-200",
                      isExpanded && "rotate-90"
                    )}>▶</span>
                    <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-muted-foreground">
                      {group.wfName}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40 shrink-0">
                      {group.sessions.length}
                    </span>
                  </button>
                  {/* Sessions under this group */}
                  {isExpanded && group.sessions.map(s => renderSessionRow(s, true))}
                </div>
              )
            }) : <div className="px-3 text-xs text-muted-foreground/50">{t('暂无')}</div>
          )}
        </div>
      </div>

      {/* ══════ Gateway ══════ */}
      <div className="mt-auto pt-2 flex-shrink-0 border-t border-border flex items-center justify-between h-11">
        <div className="flex items-center gap-2">
          <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="h-7 w-7 rounded-full border border-border/50 overflow-hidden flex items-center justify-center bg-muted shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
            title={t('Change avatar')}
            aria-label={t('Change avatar')}
          >
            {settings.userAvatar ? (
              <img src={settings.userAvatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <span className="text-xs font-medium text-muted-foreground">{settings.userName || 'User'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={cycleTheme}
            className="h-8 w-8 flex items-center justify-center rounded-lg border-none bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          ><ThemeIcon size={18} /></button>
          <div className="relative">
            <button onClick={() => setSettingsOpen(v => !v)}
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded-lg border-none text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
                settingsOpen ? "bg-muted/60" : "bg-transparent hover:bg-muted/60"
              )}
            ><Settings size={18} /></button>
            {settingsOpen && (
              <>
                <div onClick={() => setSettingsOpen(false)} className="fixed inset-0 z-[90]" />
                <div className="absolute bottom-full right-0 z-[95] mb-1.5 min-w-[160px] bg-popover border rounded-lg p-1 shadow-lg">
                  {[
                    { id: 'general' as const, label: t('General') },
                    { id: 'appearance' as const, label: t('Appearance') },
                    { id: 'models' as const, label: t('Models') },
                    { id: 'cli' as const, label: t('CLI Tools') },
                  ].map(tab => (
                    <button key={tab.id}
                      onClick={() => { setSettingsActiveTab(tab.id); setCurrentView('settings'); setSettingsOpen(false) }}
                      className="block w-full text-left border-none bg-transparent text-sm px-3 py-1.5 rounded-md cursor-pointer text-foreground hover:bg-muted transition-colors"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30"
          onClick={() => setRenameItemId(null)}>
          <div className="bg-popover rounded-lg p-4 min-w-[280px] border shadow-xl"
            onClick={e => e.stopPropagation()}>
            <div className="text-sm font-semibold mb-3 text-foreground">{t('重命名')}</div>
            <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { renameSession(renameItemId, renameValue); setRenameItemId(null) } }}
              className="w-full px-3 py-2 rounded-md border bg-muted text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setRenameItemId(null)}
                className="px-4 py-1.5 rounded-md border text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
              >{t('取消')}</button>
              <button onClick={() => { renameSession(renameItemId, renameValue); setRenameItemId(null) }}
                className="px-4 py-1.5 rounded-md border-none bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors cursor-pointer"
              >{t('确定')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Delete Dialog ══════ */}
      {deleteItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30"
          onClick={() => setDeleteItem(null)}>
          <div className="bg-popover rounded-lg p-4 min-w-[280px] border shadow-xl"
            onClick={e => e.stopPropagation()}>
            <div className="text-sm font-semibold mb-2 text-foreground">{t('删除')}</div>
            <div className="text-sm text-muted-foreground mb-4">{t('确定删除')} "{deleteItem.name}"?</div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteItem(null)}
                className="px-4 py-1.5 rounded-md border text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
              >{t('取消')}</button>
              <button onClick={() => { deleteSession(deleteItem.id); setDeleteItem(null) }}
                className="px-4 py-1.5 rounded-md border-none bg-destructive text-destructive-foreground text-sm hover:bg-destructive/90 transition-colors cursor-pointer"
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
  if (mins < 1) return '1m'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
}
