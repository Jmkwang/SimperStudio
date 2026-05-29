import { useAppStore } from '@/stores';
import { useTranslation } from '@/hooks/useTranslation';
import { Bot, MessageSquare, ArrowRight, Sparkles } from 'lucide-react';
import { DebugBadge } from '@/components/debug/DebugBadge';

export function SimpleChatPlaceholder() {
  const { t } = useTranslation();
  const agents = useAppStore(state => state.agents);
  const activeWorkspaceId = useAppStore(state => state.activeWorkspaceId);
  const createSession = useAppStore(state => state.createSession);

  const recentAgents = agents.slice(0, 4);

  const handleAgentClick = (agentName: string) => {
    createSession(agentName, activeWorkspaceId || 'default-workspace', undefined, 'single');
  };

  return (
    <div className="relative flex-1 flex flex-col h-full">
      <DebugBadge id="SimpleChatPlaceholder" position="bottom-left" />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center max-w-lg w-full gap-8">
          {/* Icon area */}
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
              <MessageSquare className="h-10 w-10 text-primary/60" strokeWidth={1.5} />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/15">
              <Sparkles className="h-4 w-4 text-amber-500/70" strokeWidth={1.5} />
            </div>
          </div>

          {/* Text */}
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              {t('智能对话')}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              {t('与 AI 智能体一对一交流，获取精准回答和创意灵感。')}
            </p>
          </div>

          {/* Quick start cards */}
          {recentAgents.length > 0 ? (
            <div className="w-full space-y-3">
              <p className="text-xs text-muted-foreground text-center">
                {t('快速开始')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {recentAgents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => handleAgentClick(agent.name)}
                    className="group flex items-center gap-3 rounded-lg border border-border bg-card/50 p-2.5 text-left transition-all duration-200 hover:bg-muted/50 hover:border-primary/20 hover:shadow-sm"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 border border-border/50 group-hover:bg-primary/10 group-hover:border-primary/15 transition-colors">
                      <Bot className="h-4 w-4 text-muted-foreground group-hover:text-primary/70 transition-colors" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{agent.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {agent.description || t('AI 智能体')}
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all -translate-x-1 group-hover:translate-x-0" strokeWidth={1.5} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-lg border border-dashed border-foreground/[0.08] bg-muted/20 px-6 py-4 text-center">
                <p className="text-xs text-muted-foreground">
                  {t('暂无智能体，请先在「智能体」中创建智能体。')}
                </p>
              </div>
            </div>
          )}

          {/* Help text */}
          <p className="text-xs text-muted-foreground/60 text-center">
            {t('或从左侧面板选择已有会话继续对话')}
          </p>
        </div>
      </div>
    </div>
  );
}
