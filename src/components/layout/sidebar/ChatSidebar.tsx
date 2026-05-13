import { useState } from "react"
import { cn } from "@/lib/utils"
import { Plus } from "lucide-react"
import { ContextItem } from "./ContextItem"

export function ChatSidebar({
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
