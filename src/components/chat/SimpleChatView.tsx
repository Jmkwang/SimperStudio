import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ChatSession, ModelProvider, ProviderModel } from "@/types/models";
import { useAppStore } from '@/stores';
import { useTranslation } from "@/hooks/useTranslation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Workflow, ArrowUp, ArrowDown, Users } from "lucide-react";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DebugBadge } from "@/components/debug/DebugBadge";

function resolveAgentDisplayModel(agent: { providerId?: string; modelId?: string } | undefined, providers: ModelProvider[], activeProviderId: string | null): { providerName: string; modelName: string } | null {
  if (!agent) return null;
  const providerId = agent.providerId || activeProviderId;
  if (!providerId) return null;
  const provider = providers.find(p => p.id === providerId);
  if (!provider) return null;
  const model: ProviderModel | undefined = provider.models.find(m => m.modelId === agent.modelId || m.id === agent.modelId)
    || provider.models.find(m => m.isDefault)
    || provider.models[0];
  return {
    providerName: provider.name,
    modelName: model?.name || agent.modelId || '默认',
  };
}

export function SimpleChatView({ session }: { session: ChatSession }) {
  const { t } = useTranslation();
  const agents = useAppStore(state => state.agents);
  const settings = useAppStore(state => state.settings);
  const sendToAgent = useAppStore(state => state.sendToAgent);
  const sendMessageToAgents = useAppStore(state => state.sendMessageToAgents);
  const retryAgentResponse = useAppStore(state => state.retryAgentResponse);
  const [input, setInput] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [multiAgentMode, setMultiAgentMode] = useState(false);
  const [showTopology, setShowTopology] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const activeAgent = useMemo(() => {
    if (selectedAgentId) return agents.find(a => a.id === selectedAgentId);
    return agents[0] || null;
  }, [agents, selectedAgentId]);

  const activeAgentModelInfo = useMemo(() =>
    resolveAgentDisplayModel(activeAgent, settings?.providers || [], settings?.activeProviderId || null),
    [activeAgent, settings]
  );

  const totalTokens = session.messages.reduce((sum, msg) => {
    return sum + (msg.agentResponses?.reduce((s, r) => s + (r.tokenUsage?.totalTokens || 0), 0) || 0);
  }, 0);

  const promptTokens = session.messages.reduce((sum, msg) => {
    return sum + (msg.agentResponses?.reduce((s, r) => s + (r.tokenUsage?.promptTokens || 0), 0) || 0);
  }, 0);

  const completionTokens = session.messages.reduce((sum, msg) => {
    return sum + (msg.agentResponses?.reduce((s, r) => s + (r.tokenUsage?.completionTokens || 0), 0) || 0);
  }, 0);

  // Detect user manual scroll — stop auto-scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const atBottom = scrollHeight - scrollTop - clientHeight < 50;
      autoScrollRef.current = atBottom;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll on new messages or streaming content
  useEffect(() => {
    if (!autoScrollRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.messages.length, session.messages]);

  // Re-enable auto-scroll when user sends a message
  const handleSend = async () => {
    if (!input.trim() || !activeAgent) return;
    autoScrollRef.current = true;
    if (multiAgentMode && agents.length > 1) {
      await sendMessageToAgents(session.id, input, agents);
    } else {
      await sendToAgent(session.id, activeAgent.id, input);
    }
    setInput("");
  };

  const handleRetry = useCallback((agentId: string, messageId: string) => {
    const lastUserMsg = [...session.messages].reverse().find(m => m.role === "user");
    if (lastUserMsg) {
      autoScrollRef.current = true;
      retryAgentResponse(session.id, messageId, agentId, lastUserMsg.content.text);
    }
  }, [session.messages, session.id, retryAgentResponse]);

  return (
    <div className="flex flex-col h-full relative">
      <DebugBadge id="SimpleChatView" position="bottom-left" />
      {/* Breadcrumb Bar */}
      <div className="border-b px-6 py-2 flex items-center justify-between shrink-0">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{session.title}</span>
            {activeAgent && (
              <>
                <span className="text-muted-foreground">›</span>
                <span>{activeAgent.name}</span>
              </>
            )}
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground">
              {activeAgentModelInfo
                ? `${activeAgentModelInfo.providerName} / ${activeAgentModelInfo.modelName}`
                : t("未配置")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTopology(!showTopology)}
              className="ml-2 h-8 w-8 p-0"
            >
              <Workflow className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{new Date(session.updatedAt).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        {totalTokens > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{t("Total")}: {totalTokens}</span>
            <ArrowUp className="h-3 w-3" />
            <span>{promptTokens}</span>
            <ArrowDown className="h-3 w-3" />
            <span>{completionTokens}</span>
          </div>
        )}
      </div>

      {agents.length > 1 && (
        <div className="border-b px-6 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs text-muted-foreground shrink-0">{t("Agent")}:</span>
            {agents.map(agent => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${
                  activeAgent?.id === agent.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/70 text-muted-foreground"
                }`}
              >
                <Avatar className="h-4 w-4 rounded-full shrink-0">
                  <AvatarImage src={agent.avatar} />
                  <AvatarFallback className="rounded-full bg-primary/10 text-primary text-[8px]">{agent.name?.slice(0, 1)}</AvatarFallback>
                </Avatar>
                {agent.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => setMultiAgentMode(!multiAgentMode)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${
              multiAgentMode
                ? "bg-emerald-500/20 text-emerald-500"
                : "bg-muted hover:bg-muted/70 text-muted-foreground"
            }`}
            title={multiAgentMode ? t("多Agent模式已开启") : t("点击开启多Agent模式")}
          >
            <Users className="h-3.5 w-3.5" />
            {multiAgentMode ? t("多Agent") : t("单Agent")}
          </button>
        </div>
      )}

      <div ref={scrollContainerRef} className="flex-1 overflow-auto p-6 space-y-4">
        {session.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <div className="text-4xl opacity-30">💬</div>
            <p className="text-sm">{t("Start a conversation")}</p>
          </div>
        )}

        {session.messages.map(message => (
          <ChatMessageBubble
            key={message.id}
            message={message}
            agent={activeAgent ? { id: activeAgent.id, name: activeAgent.name, avatar: activeAgent.avatar } : undefined}
            agents={agents.map(a => ({ id: a.id, name: a.name, avatar: a.avatar }))}
            onRetry={handleRetry}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4 shrink-0">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={activeAgent ? `${t("Send message")}...` : t("Select an agent")}
            disabled={!activeAgent}
            className="min-h-[64px] text-sm"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || !activeAgent}
            className="self-end h-11 w-11"
            aria-label={t("Send")}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
