import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Bot, Workflow, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Agent {
  id: string
  name: string
  avatar: string
  systemPrompt?: string
  description?: string
  category?: string
  industry?: string
}

interface Workflow {
  id: string
  name: string
}

interface NewSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agents: Agent[]
  agentCategories: any[]
  workflows: Workflow[]
  activeWorkspaceId: string | null
  onCreateSingleSession: (title: string, workspaceId: string, agentId: string) => void
  onCreateWorkflowSession: (title: string, workspaceId: string, workflowId: string) => void
  defaultMode?: 'single' | 'workflow'
  t: (key: string) => string
}

export function NewSessionDialog({
  open,
  onOpenChange,
  agents,
  agentCategories,
  workflows,
  activeWorkspaceId,
  onCreateSingleSession,
  onCreateWorkflowSession,
  defaultMode = 'single',
  t,
}: NewSessionDialogProps) {
  const [mode, setMode] = useState<'single' | 'workflow'>(defaultMode)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const workspaceId = activeWorkspaceId || 'default-workspace'

  // ── Categories: merge store categories + agent-derived categories ──
  const categoriesFromAgents = agents.reduce((acc: Record<string, number>, agent: Agent) => {
    const category = agent.category || agent.industry || 'General'
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const mergedCounts: Record<string, number> = { ...categoriesFromAgents }
  agentCategories.forEach((cat: any) => {
    if (!mergedCounts[cat.name]) mergedCounts[cat.name] = 0
  })

  let allCategoryNames = Object.keys(mergedCounts).sort((a, b) => {
    const aInStore = agentCategories.some((c: any) => c.name === a)
    const bInStore = agentCategories.some((c: any) => c.name === b)
    if (aInStore && !bInStore) return -1
    if (!aInStore && bInStore) return 1
    return a.localeCompare(b)
  })

  const filteredAgents = agents.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || (a.category || a.industry || 'General') === selectedCategory
    return matchesSearch && matchesCategory
  })

  const filteredWorkflows = workflows.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreate = () => {
    if (mode === 'single' && selectedAgentId) {
      const agent = agents.find(a => a.id === selectedAgentId)
      const title = agent?.name || t('新会话')
      onCreateSingleSession(title, workspaceId, selectedAgentId)
      resetAndClose()
    } else if (mode === 'workflow' && selectedWorkflowId) {
      const workflow = workflows.find(w => w.id === selectedWorkflowId)
      const title = workflow?.name || t('新会话')
      onCreateWorkflowSession(title, workspaceId, selectedWorkflowId)
      resetAndClose()
    }
  }

  const resetAndClose = () => {
    setMode(defaultMode)
    setSearchQuery('')
    setSelectedAgentId('')
    setSelectedWorkflowId('')
    setSelectedCategory(null)
    onOpenChange(false)
  }

  const hasWorkflowMode = workflows.length > 0

  const canCreate =
    mode === 'single' ? !!selectedAgentId : !!selectedWorkflowId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[70vw] w-[70vw] h-[80vh] p-0 gap-0 rounded-xl overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-2 shrink-0">
          <DialogTitle>{t('新建会话')}</DialogTitle>
        </DialogHeader>

        {/* Mode switch */}
        {hasWorkflowMode && (
          <div className="px-6 flex gap-2 shrink-0">
            <Button
              type="button"
              variant={mode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setMode('single')
                setSelectedWorkflowId('')
                setSearchQuery('')
                setSelectedCategory(null)
              }}
              className="flex-1 gap-2"
            >
              <Bot className="h-4 w-4" />
              {t('单个智能体对话')}
            </Button>
            <Button
              type="button"
              variant={mode === 'workflow' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setMode('workflow')
                setSelectedAgentId('')
                setSearchQuery('')
                setSelectedCategory(null)
              }}
              className="flex-1 gap-2"
            >
              <Workflow className="h-4 w-4" />
              {t('工作流对话')}
            </Button>
          </div>
        )}

        {/* Search */}
        <div className="px-6 py-2 relative shrink-0">
          <Search className="absolute left-8 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={mode === 'single' ? t('搜索智能体...') : t('搜索工作流...')}
            className="pl-9 h-9"
          />
        </div>

        {/* Agent list with categories */}
        {mode === 'single' && (
          <div className="flex flex-1 min-h-0 px-6 pb-4 gap-4">
            {/* Category sidebar — styled like AgentsSidebar */}
            <div className="w-[160px] flex-shrink-0 flex flex-col gap-0.5 overflow-auto border-r border-border pr-3">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "flex w-full items-center justify-between px-3 h-10 text-sm transition-all duration-200 rounded-xl border",
                  selectedCategory === null
                    ? "bg-primary/8 text-foreground border-primary/10 font-medium"
                    : "text-foreground border-transparent hover:bg-hover hover:border-foreground/[0.06]"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border",
                    selectedCategory === null ? "border-primary/20" : "border-foreground/[0.08]"
                  )}>
                    <Bot className="h-3 w-3" strokeWidth={1.5} />
                  </div>
                  <span>{t('全部')}</span>
                </div>
                <span className="text-xs text-muted-foreground/60">{agents.length}</span>
              </button>

              {allCategoryNames.map((cat) => {
                const count = mergedCounts[cat]
                const isSelected = selectedCategory === cat
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(isSelected ? null : cat)}
                    className={cn(
                      "flex w-full items-center justify-between px-3 h-10 text-sm transition-all duration-200 rounded-xl border",
                      isSelected
                        ? "bg-primary/8 text-foreground border-primary/10 font-medium"
                        : "text-foreground border-transparent hover:bg-hover hover:border-foreground/[0.06]"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border",
                        isSelected ? "border-primary/20" : "border-foreground/[0.08]"
                      )}>
                        <Bot className="h-3 w-3" strokeWidth={1.5} />
                      </div>
                      <span className="truncate">{cat}</span>
                    </div>
                    <span className="text-xs text-muted-foreground/60 shrink-0 ml-1">{count}</span>
                  </button>
                )
              })}
            </div>

            {/* Agent grid — styled like AgentsView AgentCard */}
            <div className="flex-1 overflow-auto min-w-0">
              {filteredAgents.length === 0 && (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  {t('暂无智能体')}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={cn(
                      "text-left rounded-xl border p-4 flex flex-col transition-all duration-200 bg-card",
                      selectedAgentId === agent.id
                        ? "border-primary ring-1 ring-primary/20 shadow-sm"
                        : "hover:border-primary/40 shadow-sm hover:shadow-md"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <TooltipProvider delayDuration={800}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className="h-10 w-10 rounded-full border shadow-sm cursor-help shrink-0">
                              <AvatarImage src={agent.avatar} />
                              <AvatarFallback className="rounded-full bg-primary/10 text-primary">
                                <Bot className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[280px]">
                            <p className="text-xs leading-relaxed">
                              {agent.systemPrompt?.slice(0, 120) || t('无系统提示词')}
                              {(agent.systemPrompt?.length || 0) > 120 ? '...' : ''}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold truncate">{agent.name}</h4>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          ID: {agent.id}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {agent.description || agent.systemPrompt || t('无描述')}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Workflow list */}
        {mode === 'workflow' && (
          <div className="flex-1 min-h-0 px-6 pb-4 grid gap-1 overflow-auto content-start">
            {filteredWorkflows.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-4">
                {t('暂无工作流')}
              </div>
            )}
            {filteredWorkflows.map((workflow) => (
              <button
                key={workflow.id}
                onClick={() => setSelectedWorkflowId(workflow.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                  selectedWorkflowId === workflow.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted border border-transparent'
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border">
                  <Workflow className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{workflow.name}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="px-6 py-4 border-t border-border flex justify-end gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={resetAndClose}>
            {t('取消')}
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={!canCreate}>
            {t('创建')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
