import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ChatSession, ModelProvider, ProviderModel } from "@/types/models";
import { useAppStore } from '@/stores';
import { useTranslation } from "@/hooks/useTranslation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Workflow, ArrowUp, ArrowDown, AlertTriangle, ChevronDown, Square, Paperclip, X } from "lucide-react";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { AgentTopologyView } from "./AgentTopologyView";
import { DebugBadge } from "@/components/debug/DebugBadge";
import { useDebugTrack } from "@/hooks/useDebugTrack";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot } from "lucide-react";

function resolveAgentDisplayModel(agent: { providerId?: string; modelId?: string } | undefined, providers: ModelProvider[], activeProviderId: string | null, defaultLabel = 'Default'): { providerName: string; modelName: string } | null {
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
    modelName: model?.name || agent.modelId || defaultLabel,
  };
}

export function SimpleChatView({ session }: { session: ChatSession }) {
  const { t } = useTranslation();
  const rawAgents = useAppStore(state => state.agents);
  const agents = useMemo(() => rawAgents.filter((a, i, arr) => arr.findIndex(x => x.id === a.id) === i), [rawAgents]);
  const settings = useAppStore(state => state.settings);
  const sendToAgent = useAppStore(state => state.sendToAgent);
  const retryAgentResponse = useAppStore(state => state.retryAgentResponse);
  const cancelSessionStream = useAppStore(state => state.cancelSessionStream);
  const activeStreamingSessionIds = useAppStore(state => state.activeStreamingSessionIds);
  const [input, setInput] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || '');
  const [showTopology, setShowTopology] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { trackClick } = useDebugTrack('SimpleChatView');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const activeAgent = useMemo(() => {
    if (selectedAgentId) return agents.find(a => a.id === selectedAgentId);
    return agents[0] || null;
  }, [agents, selectedAgentId]);

  const activeAgentModelInfo = useMemo(() =>
    resolveAgentDisplayModel(activeAgent, settings?.providers || [], settings?.activeProviderId || null, t('Default')),
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
    const text = input.trim();
    const files = [...attachments];
    setInput("");
    setAttachments([]);
    autoScrollRef.current = true;
    const attachmentList = files.length > 0 ? files.map(f => ({
      id: f.name + Date.now(),
      name: f.name,
      mimeType: f.type,
      size: f.size,
      kind: (f.type.startsWith('image/') ? 'image' : 'file') as 'image' | 'file',
    })) : undefined;
    await sendToAgent(session.id, activeAgent.id, text, { attachments: attachmentList });
  };

  const isStreaming = activeStreamingSessionIds.includes(session.id);

  const handleStop = () => {
    cancelSessionStream(session.id);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    // Reset so selecting the same file again triggers onChange
    e.target.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
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
            {activeAgent && agents.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                    <Avatar className="h-5 w-5 rounded-full">
                      <AvatarImage src={activeAgent.avatar} />
                      <AvatarFallback className="rounded-full bg-primary/10 text-primary">
                        <Bot className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                    <span>{activeAgent.name}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {agents.map(agent => (
                    <DropdownMenuItem
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      className="flex items-center gap-2"
                    >
                      <Avatar className="h-5 w-5 rounded-full">
                        <AvatarImage src={agent.avatar} />
                        <AvatarFallback className="rounded-full bg-primary/10 text-primary">
                          <Bot className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span>{agent.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {activeAgent && agents.length === 1 && (
              <>
                <span className="text-muted-foreground">›</span>
                <span>{activeAgent.name}</span>
              </>
            )}
            {activeAgentModelInfo && (
              <>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">
                  {activeAgentModelInfo.providerName} / {activeAgentModelInfo.modelName}
                </span>
              </>
            )}
            {!activeAgentModelInfo && activeAgent && (
              <>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">{t("未配置")}</span>
              </>
            )}
            {agents.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={trackClick(() => setShowTopology(!showTopology), 'chat:toggleTopology')}
                className="ml-2 h-8 w-8 p-0"
                title={showTopology ? t('返回聊天') : t('拓扑视图')}
              >
                <Workflow className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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

      {showTopology && agents.length > 1 ? (
        <AgentTopologyView sessionId={session.id} />
      ) : (
        <>
          <div ref={scrollContainerRef} className="flex-1 overflow-auto p-6 space-y-4">
            {session.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <div className="text-4xl opacity-30 select-none">💬</div>
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
            <div className="flex flex-col gap-2 max-w-4xl mx-auto">
              {!activeAgentModelInfo && activeAgent && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="flex-1">
                    {t("当前 Agent 未配置模型服务商。请前往「设置 > 模型」配置 API Key 并启用至少一个服务商。")}
                  </span>
                </div>
              )}
              <div className="flex gap-2 relative">
                {attachments.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 flex flex-wrap gap-1.5 p-2 pb-0 max-w-full">
                    {attachments.map((file, i) => (
                      <div key={i} className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs max-w-[160px] overflow-hidden">
                        <span className="truncate">{file.name}</span>
                        <button onClick={() => handleRemoveAttachment(i)} className="shrink-0 hover:text-foreground text-muted-foreground" aria-label={t('Remove')}>
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey && !isStreaming) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={activeAgent ? `${t("Send message")}...` : t("Select an agent")}
                  disabled={!activeAgent}
                  className="min-h-[64px] text-sm"
                />
                {/* Attachment button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  onChange={handleFileSelect}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="self-end h-11 w-11 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label={t('Attach file')}
                  disabled={isStreaming}
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                {/* Send / Stop button */}
                {isStreaming ? (
                  <Button
                    onClick={trackClick(handleStop, 'chat:stop')}
                    variant="destructive"
                    className="self-end h-11 w-11"
                    aria-label={t('Stop')}
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={trackClick(handleSend, 'chat:send')}
                    disabled={!input.trim() || !activeAgent}
                    className="self-end h-11 w-11"
                    data-debug-source="SimpleChatView"
                    data-debug-action="chat:send"
                    aria-label={t("Send")}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
