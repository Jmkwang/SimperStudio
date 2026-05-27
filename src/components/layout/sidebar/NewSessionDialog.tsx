import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Bot, Workflow, Search } from 'lucide-react'

interface Agent {
  id: string
  name: string
  avatar: string
  systemPrompt?: string
}

interface Workflow {
  id: string
  name: string
}

interface NewSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agents: Agent[]
  workflows: Workflow[]
  activeWorkspaceId: string | null
  onCreateSingleSession: (title: string, workspaceId: string, agentId: string) => void
  onCreateWorkflowSession: (title: string, workspaceId: string, workflowId: string) => void
  t: (key: string) => string
}

export function NewSessionDialog({
  open,
  onOpenChange,
  agents,
  workflows,
  activeWorkspaceId,
  onCreateSingleSession,
  onCreateWorkflowSession,
  t,
}: NewSessionDialogProps) {
  const [mode, setMode] = useState<'single' | 'workflow'>('single')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('')
  const [sessionName, setSessionName] = useState('')

  const workspaceId = activeWorkspaceId || 'default-workspace'

  const filteredAgents = agents.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredWorkflows = workflows.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreate = () => {
    if (mode === 'single' && selectedAgentId) {
      const agent = agents.find(a => a.id === selectedAgentId)
      const title = sessionName.trim() || agent?.name || t('新会话')
      onCreateSingleSession(title, workspaceId, selectedAgentId)
      resetAndClose()
    } else if (mode === 'workflow' && selectedWorkflowId) {
      const workflow = workflows.find(w => w.id === selectedWorkflowId)
      const title = sessionName.trim() || workflow?.name || t('新会话')
      onCreateWorkflowSession(title, workspaceId, selectedWorkflowId)
      resetAndClose()
    }
  }

  const resetAndClose = () => {
    setMode('single')
    setSearchQuery('')
    setSelectedAgentId('')
    setSelectedWorkflowId('')
    setSessionName('')
    onOpenChange(false)
  }

  const hasWorkflowMode = workflows.length > 0

  const canCreate =
    mode === 'single' ? !!selectedAgentId : !!selectedWorkflowId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] rounded-xl">
        <DialogHeader>
          <DialogTitle>{t('新建会话')}</DialogTitle>
        </DialogHeader>

        {/* Mode switch — only show when workflows are available */}
        {hasWorkflowMode && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setMode('single')
                setSelectedWorkflowId('')
                setSearchQuery('')
              }}
              className="flex-1 gap-1.5"
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
              }}
              className="flex-1 gap-1.5"
            >
              <Workflow className="h-4 w-4" />
              {t('工作流对话')}
            </Button>
          </div>
        )}

        {/* Session name */}
        <div className="grid gap-2">
          <Label htmlFor="sessionName" className="text-xs text-muted-foreground">
            {t('会话名称（可选）')}
          </Label>
          <Input
            id="sessionName"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder={mode === 'single' ? t('默认使用智能体名称') : t('默认使用工作流名称')}
            className="h-9"
          />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={mode === 'single' ? t('搜索智能体...') : t('搜索工作流...')}
            className="pl-9 h-9"
          />
        </div>

        {/* Agent list */}
        {mode === 'single' && (
          <div className="grid gap-1 max-h-[360px] overflow-auto">
            {filteredAgents.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-4">
                {t('暂无智能体')}
              </div>
            )}
            {filteredAgents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  selectedAgentId === agent.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted border border-transparent'
                }`}
              >
                <Avatar className="h-8 w-8 rounded-lg border">
                  <AvatarImage src={agent.avatar} />
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{agent.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {agent.systemPrompt?.slice(0, 40) || t('无系统提示词')}...
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Workflow list */}
        {mode === 'workflow' && (
          <div className="grid gap-1 max-h-[360px] overflow-auto">
            {filteredWorkflows.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-4">
                {t('暂无工作流')}
              </div>
            )}
            {filteredWorkflows.map((workflow) => (
              <button
                key={workflow.id}
                onClick={() => setSelectedWorkflowId(workflow.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  selectedWorkflowId === workflow.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted border border-transparent'
                }`}
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

        <div className="flex justify-end gap-2">
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
