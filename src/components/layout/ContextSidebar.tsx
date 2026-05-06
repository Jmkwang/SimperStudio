import { useState, useRef, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store/appStore"
import { useTranslation } from "@/hooks/useTranslation"
import { ChevronLeft, Trash2, MoreHorizontal, Plus, Workflow, Pencil, Bot } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

export function ContextSidebarHeader() {
  return (
    <div className="h-px bg-foreground/[0.04] flex-shrink-0" />
  )
}

export function ContextSidebar({
  currentView,
  defaultCollapsed = false,
}: {
  currentView: string
  defaultCollapsed?: boolean
}) {
  const [sidebarWidth, setSidebarWidth] = useState(defaultCollapsed ? 0 : 256)
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const isResizing = useRef(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const setActiveSession = useAppStore(state => state.setActiveSession)
  const deleteSession = useAppStore(state => state.deleteSession)
  const deleteWorkflow = useAppStore(state => state.deleteWorkflow)
  const setActiveWorkflow = useAppStore(state => state.setActiveWorkflow)
  const openWorkflowSession = useAppStore(state => state.openWorkflowSession)
  const createWorkflow = useAppStore(state => state.createWorkflow)
  const createSession = useAppStore(state => state.createSession)
  const activeWorkspaceId = useAppStore(state => state.activeWorkspaceId)
  const sessions = useAppStore(state => state.sessions)
  const workflows = useAppStore(state => state.workflows)
  const agents = useAppStore(state => state.agents)
  const activeSessionId = useAppStore(state => state.activeSessionId)
  const activeWorkflowId = useAppStore(state => state.activeWorkflowId)
  const activeAgentId = useAppStore(state => state.activeAgentId)
  const setActiveAgent = useAppStore(state => state.setActiveAgent)
  const selectedChatWorkflowId = useAppStore(state => state.selectedChatWorkflowId)
  const setSelectedChatWorkflowId = useAppStore(state => state.setSelectedChatWorkflowId)

  const { t } = useTranslation()

  const effectiveWidth = sidebarWidth

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const newWidth = e.clientX - 76
      if (newWidth < 120) {
        setCollapsed(true)
        setSidebarWidth(0)
      } else {
        setCollapsed(false)
        setSidebarWidth(Math.min(600, Math.max(180, newWidth)))
      }
    }

    const handleMouseUp = () => {
      isResizing.current = false
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  useEffect(() => {
    if (defaultCollapsed) {
      setCollapsed(true)
      setSidebarWidth(0)
    } else {
      setCollapsed(false)
      setSidebarWidth(256)
    }
  }, [defaultCollapsed])

  const toggleCollapse = () => {
    if (collapsed) {
      setCollapsed(false)
      setSidebarWidth(256)
    } else {
      setCollapsed(true)
      setSidebarWidth(0)
    }
  }

  if (collapsed) {
    return (
      <div className="relative flex-shrink-0 bg-background rounded-l-xl my-1.5">
        <button
          onClick={toggleCollapse}
          className="h-full w-5 flex items-center justify-center hover:bg-hover text-muted-foreground hover:text-foreground transition-all duration-400 ease-out rounded-l-xl"
          title="Expand sidebar"
        >
          <ChevronLeft className="h-3 w-3 rotate-180" strokeWidth={1.5} />
        </button>
      </div>
    )
  }

  const renderSidebarContent = () => {
    switch (currentView) {
      case 'chat':
        return <ChatSidebarContent
          workflows={workflows}
          sessions={sessions}
          agents={agents}
          activeSessionId={activeSessionId}
          selectedChatWorkflowId={selectedChatWorkflowId}
          setSelectedChatWorkflowId={setSelectedChatWorkflowId}
          setActiveSession={setActiveSession}
          openWorkflowSession={openWorkflowSession}
          createSession={createSession}
          deleteSession={deleteSession}
          activeWorkspaceId={activeWorkspaceId}
          t={t}
        />
      case 'workflow':
        return <WorkflowSidebarContent
          workflows={workflows}
          activeWorkflowId={activeWorkflowId}
          setActiveWorkflow={setActiveWorkflow}
          createWorkflow={createWorkflow}
          deleteWorkflow={deleteWorkflow}
          activeWorkspaceId={activeWorkspaceId}
          t={t}
        />
      case 'agents':
        return <AgentsSidebarContent
          agents={agents}
          activeAgentId={activeAgentId}
          setActiveAgent={setActiveAgent}
          t={t}
        />
      default:
        return (
          <div className="flex h-full items-center justify-center p-6 text-xs text-muted-foreground">
            {t('此视图暂无侧边栏内容。')}
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col bg-background relative rounded-l-xl my-1.5 border-r border-border"
      ref={sidebarRef}
      style={{ width: effectiveWidth, minWidth: effectiveWidth, maxWidth: effectiveWidth }}
    >
      <div className="flex-1 overflow-hidden">
        {renderSidebarContent()}
      </div>
      <div
        className="absolute right-0 top-0 bottom-0 w-px cursor-col-resize hover:bg-lunar-300/20 transition-colors duration-400 z-10"
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}

function ChatSidebarContent({
  workflows,
  sessions,
  agents,
  activeSessionId,
  selectedChatWorkflowId,
  setSelectedChatWorkflowId,
  setActiveSession,
  openWorkflowSession,
  createSession,
  deleteSession,
  activeWorkspaceId,
  t,
}: {
  workflows: any[]
  sessions: any[]
  agents: any[]
  activeSessionId: string | null
  selectedChatWorkflowId: string | null
  setSelectedChatWorkflowId: (id: string | null) => void
  setActiveSession: (id: string) => void
  openWorkflowSession: (id: string) => Promise<void>
  createSession: (title: string, workspaceId: string, workflowId?: string, mode?: 'single' | 'workflow') => void
  deleteSession: (id: string) => Promise<void>
  activeWorkspaceId: string | null
  t: (key: string) => string
}) {
  const [chatTab, setChatTab] = useState<'workflows' | 'sessions'>('workflows')

  const workflowSessions = selectedChatWorkflowId
    ? sessions.filter(s => s.workflowId === selectedChatWorkflowId)
    : []

  const handleWorkflowSelect = (workflowId: string) => {
    setSelectedChatWorkflowId(workflowId)
    openWorkflowSession(workflowId)
    setChatTab('sessions')
  }

  const handleSessionSelect = (sessionId: string) => {
    setActiveSession(sessionId)
  }

  const handleNewSession = () => {
    if (selectedChatWorkflowId) {
      const workflow = workflows.find(w => w.id === selectedChatWorkflowId)
      createSession(
        workflow?.name || t('新会话'),
        activeWorkspaceId || 'default-workspace',
        selectedChatWorkflowId,
        'workflow'
      )
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b border-border px-1">
        <button
          onClick={() => setChatTab('workflows')}
          className={cn(
            "flex-1 inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-400 ease-out text-xs h-10 border-b-2",
            chatTab === 'workflows'
              ? "border-lunar-300/30 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t('工作流')}
        </button>
        <button
          onClick={() => setChatTab('sessions')}
          className={cn(
            "flex-1 inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-400 ease-out text-xs h-10 border-b-2",
            chatTab === 'sessions'
              ? "border-lunar-300/30 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t('会话')}
        </button>
      </div>
      <div className="flex-1 overflow-auto px-2 py-2">
        {chatTab === 'workflows' ? (
          workflows.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {workflows.map(w => (
                <ContextItem
                  key={w.id}
                  title={w.name}
                  icon="workflow"
                  active={selectedChatWorkflowId === w.id}
                  deletable={false}
                  onClick={() => handleWorkflowSelect(w.id)}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-foreground/[0.08] p-6 text-center text-xs text-muted-foreground">
              {t('暂无工作流')}
            </div>
          )
        ) : (
          <>
            {selectedChatWorkflowId && (
              <button
                onClick={handleNewSession}
                className="flex w-full items-center gap-2.5 px-3 h-10 text-sm text-muted-foreground transition-all duration-400 ease-out hover:bg-hover hover:text-foreground mb-1 rounded-xl"
              >
                <Plus className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>{t('新建会话')}</span>
              </button>
            )}
            {selectedChatWorkflowId ? (
              workflowSessions.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {workflowSessions.map(s => {
                    const sessionAgent = s.mode === 'workflow'
                      ? undefined
                      : agents.find(a => a.id === (s as any).activeAgentId) || agents[0]
                    return (
                      <ContextItem
                        key={s.id}
                        title={s.title}
                        icon="agent"
                        avatar={sessionAgent?.avatar}
                        fallbackName={sessionAgent?.name}
                        active={activeSessionId === s.id}
                        deletable={true}
                        onClick={() => handleSessionSelect(s.id)}
                        onDelete={() => deleteSession(s.id)}
                        t={t}
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-foreground/[0.08] p-6 text-center text-xs text-muted-foreground">
                  {t('暂无会话，点击 + 新建')}
                </div>
              )
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-foreground/[0.08] p-6 text-center text-xs text-muted-foreground">
                {t('请先选择一个工作流')}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function WorkflowSidebarContent({
  workflows,
  activeWorkflowId,
  setActiveWorkflow,
  createWorkflow,
  deleteWorkflow,
  activeWorkspaceId,
  t,
}: {
  workflows: any[]
  activeWorkflowId: string | null
  setActiveWorkflow: (id: string) => void
  createWorkflow: (name: string, workspaceId: string) => void
  deleteWorkflow: (id: string) => Promise<void>
  activeWorkspaceId: string | null
  t: (key: string) => string
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-border">
        <button
          onClick={() => createWorkflow(t('新工作流'), activeWorkspaceId || 'default-workspace')}
          className="flex w-full items-center gap-2.5 px-3 h-10 text-sm text-muted-foreground transition-all duration-400 ease-out hover:bg-hover hover:text-foreground rounded-xl"
        >
          <Plus className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span>{t('新建工作流')}</span>
        </button>
      </div>
      <div className="flex-1 overflow-auto px-2 pt-2 pb-2">
        {workflows.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {workflows.map(w => (
              <ContextItem
                key={w.id}
                title={w.name}
                icon="workflow"
                active={activeWorkflowId === w.id}
                deletable={true}
                onClick={() => setActiveWorkflow(w.id)}
                onDelete={() => deleteWorkflow(w.id)}
                t={t}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-foreground/[0.08] p-6 text-center text-xs text-muted-foreground">
            {t('暂无工作流，点击 + 创建。')}
          </div>
        )}
      </div>
    </div>
  )
}

function AgentDetailPopover({ agent, children, onSave }: { agent: Record<string, any>; children: React.ReactNode; onSave?: (updates: Record<string, any>) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [editData, setEditData] = useState<Record<string, any>>({})
  const { t } = useTranslation()

  useEffect(() => {
    if (isOpen) {
      setEditData({
        name: agent.name || '',
        description: agent.description || '',
        systemPrompt: agent.systemPrompt || '',
        modelProvider: agent.modelProvider || 'local',
        modelId: agent.modelId || 'default',
        temperature: agent.temperature ?? 0.7,
        maxTokens: agent.maxTokens || '',
        apiKey: agent.apiKey || '',
        baseUrl: agent.baseUrl || '',
      })
    }
  }, [isOpen, agent])

  const handleSave = () => {
    onSave?.(editData)
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" side="right" sideOffset={8} className="w-96 p-0 rounded-2xl overflow-hidden">
        <div className="flex flex-col max-h-[80vh] overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-3">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10 rounded-xl border border-border shrink-0">
                <AvatarImage src={agent.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary rounded-xl">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h4 className="font-semibold text-sm">{agent.name}</h4>
                <p className="text-[10px] text-muted-foreground">{agent.modelProvider} · {agent.modelId}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Editable Fields */}
          <div className="p-4 space-y-3">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('名称')}</label>
              <input
                type="text"
                value={editData.name || ''}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-muted/50 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('描述')}</label>
              <input
                type="text"
                value={editData.description || ''}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-muted/50 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder={t('简短描述该助手的用途')}
              />
            </div>

            {/* System Prompt */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('系统提示词')}</label>
              <textarea
                value={editData.systemPrompt || ''}
                onChange={(e) => setEditData({ ...editData, systemPrompt: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 text-xs bg-muted/50 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>

            <Separator />

            {/* Model Config */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('模型配置')}</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">Provider</span>
                  <select
                    value={editData.modelProvider || 'local'}
                    onChange={(e) => setEditData({ ...editData, modelProvider: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs bg-muted/50 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="local">Local</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">Model ID</span>
                  <input
                    type="text"
                    value={editData.modelId || ''}
                    onChange={(e) => setEditData({ ...editData, modelId: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs bg-muted/50 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            </div>

            {/* Parameters */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('参数')}</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">Temperature</span>
                  <input
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={editData.temperature ?? 0.7}
                    onChange={(e) => setEditData({ ...editData, temperature: parseFloat(e.target.value) })}
                    className="w-full px-2 py-1.5 text-xs bg-muted/50 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">Max Tokens</span>
                  <input
                    type="number"
                    value={editData.maxTokens || ''}
                    onChange={(e) => setEditData({ ...editData, maxTokens: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Default"
                    className="w-full px-2 py-1.5 text-xs bg-muted/50 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            </div>

            {/* API Settings (conditional) */}
            {editData.modelProvider !== 'local' && (
              <>
                <Separator />
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('API 设置')}</label>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">API Key</span>
                      <input
                        type="password"
                        value={editData.apiKey || ''}
                        onChange={(e) => setEditData({ ...editData, apiKey: e.target.value })}
                        placeholder="sk-..."
                        className="w-full px-2 py-1.5 text-xs bg-muted/50 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">Base URL</span>
                      <input
                        type="text"
                        value={editData.baseUrl || ''}
                        onChange={(e) => setEditData({ ...editData, baseUrl: e.target.value })}
                        placeholder="https://api..."
                        className="w-full px-2 py-1.5 text-xs bg-muted/50 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 pt-2 border-t border-border flex justify-end gap-2">
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-hover"
            >
              {t('取消')}
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:brightness-105 transition-all"
            >
              {t('保存')}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function AgentsSidebarContent({
  agents,
  activeAgentId,
  setActiveAgent,
  t,
}: {
  agents: any[]
  activeAgentId: string | null
  setActiveAgent: (id: string) => void
  t: (key: string) => string
}) {
  const [view, setView] = useState<'categories' | 'agents'>('categories')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const updateAgent = useAppStore(state => state.updateAgent)

  // Group agents by category (fallback to industry, then 'Uncategorized')
  const grouped = agents.reduce((acc: Record<string, any[]>, agent: any) => {
    const category = agent.category || agent.industry || 'Uncategorized'
    if (!acc[category]) acc[category] = []
    acc[category].push(agent)
    return acc
  }, {} as Record<string, any[]>)

  const categories = Object.keys(grouped)

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category)
    setView('agents')
  }

  const handleBackToCategories = () => {
    setView('categories')
    setSelectedCategory(null)
  }

  const handleAgentSave = (agentId: string, updates: Record<string, any>) => {
    updateAgent(agentId, updates)
  }

  // Category List View
  if (view === 'categories') {
    return (
      <div className="flex flex-col h-full overflow-auto py-2">
        <div className="flex flex-col gap-0.5 px-2">
          {/* Add New Agent */}
          <button
            onClick={() => setActiveAgent('__create_new__')}
            className="flex w-full items-center gap-2.5 px-3 h-10 text-sm text-muted-foreground transition-all duration-400 ease-out hover:bg-hover hover:text-foreground rounded-xl mb-1"
          >
            <Plus className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{t('添加新助手')}</span>
          </button>

          {/* Category List */}
          {categories.map(category => {
            const catAgents = grouped[category]
            return (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className="flex w-full items-center justify-between px-3 h-10 text-sm text-foreground transition-all duration-400 ease-out hover:bg-hover rounded-xl border border-transparent hover:border-foreground/[0.06]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border border-foreground/[0.08]">
                    <Bot className="h-3 w-3" strokeWidth={1.5} />
                  </div>
                  <span>{category}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground/60">{catAgents.length}</span>
                  <ChevronLeft className="h-3 w-3 rotate-180 text-muted-foreground/40" strokeWidth={1.5} />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Agent List View (for selected category)
  const catAgents = selectedCategory ? grouped[selectedCategory] || [] : []

  return (
    <div className="flex flex-col h-full overflow-auto py-2">
      <div className="flex flex-col gap-0.5 px-2">
        {/* Back Button */}
        <button
          onClick={handleBackToCategories}
          className="flex w-full items-center gap-2 px-3 h-9 text-xs text-muted-foreground transition-all duration-400 ease-out hover:text-foreground rounded-lg mb-1"
        >
          <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
          <span>{t('返回分类')}</span>
        </button>

        {/* Category Title */}
        <div className="px-3 py-2">
          <h3 className="text-xs font-semibold text-foreground">{selectedCategory}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">{catAgents.length} {t('个助手')}</p>
        </div>

        {/* Agent List */}
        <div className="flex flex-col gap-0.5">
          {catAgents.map(agent => (
            <AgentDetailPopover
              key={agent.id}
              agent={agent}
              onSave={(updates) => handleAgentSave(agent.id, updates)}
            >
              <div
                className={cn(
                  "group flex w-full items-center text-sm rounded-xl transition-all duration-400 ease-out cursor-pointer",
                  activeAgentId === agent.id
                    ? "bg-lunar-300/8 text-foreground border border-lunar-300/10 glow-sm"
                    : "border border-transparent text-foreground hover:bg-hover hover:border-foreground/[0.06]"
                )}
              >
                <div className="min-w-0 flex-1 flex items-center gap-2.5 px-3 h-10">
                  <Avatar className="h-5 w-5 shrink-0 rounded-lg border border-foreground/[0.08]">
                    <AvatarImage src={agent.avatar} />
                    <AvatarFallback className="bg-transparent text-current text-[8px]">
                      {agent.name?.slice(0, 1) || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="block truncate">{agent.name}</span>
                </div>
              </div>
            </AgentDetailPopover>
          ))}
        </div>
      </div>
    </div>
  )
}

function ContextItem({
  title,
  icon,
  avatar,
  fallbackName,
  active = false,
  deletable = false,
  onClick,
  onDelete,
  t,
}: {
  title: string,
  icon?: 'workflow' | 'agent',
  avatar?: string,
  fallbackName?: string,
  active?: boolean,
  deletable?: boolean,
  onClick?: () => void,
  onDelete?: () => void,
  t: (key: string) => string,
}) {
  return (
    <div
      className={cn(
        "group flex w-full items-center text-sm rounded-xl transition-all duration-400 ease-out",
        active
            ? "bg-lunar-300/8 text-foreground border border-lunar-300/10 glow-sm"
            : "border border-transparent text-foreground hover:bg-hover hover:border-foreground/[0.06]"
      )}
    >
      <button
        onClick={onClick}
        className="min-w-0 flex-1 flex items-center gap-2.5 px-3 h-10 text-left active:scale-[0.98] transition-transform duration-200"
      >
        {icon === 'workflow' && (
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border border-foreground/[0.08]">
            <Workflow className="h-3 w-3" strokeWidth={1.5} />
          </div>
        )}
        {icon === 'agent' && (
          <Avatar className="h-5 w-5 shrink-0 rounded-lg border border-foreground/[0.08]">
            <AvatarImage src={avatar} />
            <AvatarFallback className="bg-transparent text-current text-[8px]">
              {fallbackName?.slice(0, 1) || "A"}
            </AvatarFallback>
          </Avatar>
        )}
        <span className="block truncate">{title}</span>
      </button>
      {deletable && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(event) => event.stopPropagation()}
              className="mr-1 p-1.5 text-muted-foreground opacity-0 transition-all duration-400 ease-out hover:bg-hover rounded-lg group-hover:opacity-100"
              title={t('更多')}
            >
              <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl">
            <DropdownMenuItem onClick={(event) => {
              event.stopPropagation();
            }}>
              <Pencil className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
              {t('编辑')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                onDelete?.();
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
              {t('删除')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
