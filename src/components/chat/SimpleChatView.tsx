import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ChatSession, ModelProvider, ProviderModel } from "@/types/models";
import { useAppStore } from '@/stores';
import { useTranslation } from "@/hooks/useTranslation";
import { Textarea } from "@/components/ui/textarea";
import { Send, ArrowUp, ArrowDown, AlertTriangle, Square, Paperclip, X, Brain } from "lucide-react";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { DebugBadge } from "@/components/debug/DebugBadge";
import { useDebugTrack } from "@/hooks/useDebugTrack";
import { cn } from "@/lib/utils";

type LayoutMode = 'A' | 'B';

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
  const setActiveProvider = useAppStore(state => state.setActiveProvider);
  const [input, setInput] = useState("");
  const [_selectedAgentId, _setSelectedAgentId] = useState<string>(agents[0]?.id || '');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [thinkingLevel, setThinkingLevel] = useState<'default' | 'off'>('default');
  const [visibleCount, setVisibleCount] = useState(100);
  const [thinkingPickerOpen, setThinkingPickerOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    try { return (localStorage.getItem('ss_chat_layout') as LayoutMode) || 'A'; } catch { return 'A'; }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { trackClick } = useDebugTrack('SimpleChatView');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const activeAgent = useMemo(() => {
    if (_selectedAgentId) return agents.find(a => a.id === _selectedAgentId);
    return agents[0] || null;
  }, [agents, _selectedAgentId]);

  const activeAgentModelInfo = useMemo(() =>
    resolveAgentDisplayModel(activeAgent, settings?.providers || [], settings?.activeProviderId || null, t('Default')),
    [activeAgent, settings]
  );

  const handleLayoutChange = useCallback((mode: LayoutMode) => {
    setLayoutMode(mode);
    try { localStorage.setItem('ss_chat_layout', mode); } catch {}
  }, []);

  const { totalTokens, promptTokens, completionTokens } = useMemo(() => {
    let total = 0, prompt = 0, completion = 0;
    for (const msg of session.messages) {
      for (const r of msg.agentResponses ?? []) {
        total += r.tokenUsage?.totalTokens ?? 0;
        prompt += r.tokenUsage?.promptTokens ?? 0;
        completion += r.tokenUsage?.completionTokens ?? 0;
      }
    }
    return { totalTokens: total, promptTokens: prompt, completionTokens: completion };
  }, [session.messages]);

  const visibleMessages = session.messages.slice(-visibleCount);

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
  }, [session.messages.length]);

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
    await sendToAgent(session.id, activeAgent.id, text, { attachments: attachmentList, thinkingLevel });
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
      {/* Breadcrumb Bar — simple title + timestamp */}
      <div className="border-b px-6 py-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="font-medium">{session.title}</span>
          </div>
          <div className="text-xs text-muted-foreground/80">
            {new Date(session.updatedAt).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {totalTokens > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground ml-6">
          <span>{t("Total")}: {totalTokens}</span>
          <ArrowUp className="h-3 w-3" />
          <span>{promptTokens}</span>
          <ArrowDown className="h-3 w-3" />
          <span>{completionTokens}</span>
        </div>
      )}

      {/* Main chat area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto p-6 space-y-4" role="log" aria-live="polite">
        {session.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <div className="text-4xl opacity-30 select-none">💬</div>
                <p className="text-sm">{t("Start a conversation")}</p>
              </div>
            )}
            {visibleCount < session.messages.length && (
              <div className="flex justify-center py-2">
                <button
                  onClick={() => setVisibleCount(prev => Math.min(prev + 100, session.messages.length))}
                  className="text-xs text-muted-foreground hover:text-foreground px-3 py-1 rounded-md hover:bg-muted transition-colors"
                >
                  {t("Load more")} ({session.messages.length - visibleCount} {t("remaining")})
                </button>
              </div>
            )}
            {visibleMessages.map(message => (
              <ChatMessageBubble
                key={message.id}
                message={message}
                agent={activeAgent ? { id: activeAgent.id, name: activeAgent.name, avatar: activeAgent.avatar } : undefined}
                agents={agents.map(a => ({ id: a.id, name: a.name, avatar: a.avatar }))}
                onRetry={handleRetry}
                layoutMode={layoutMode}
                onLayoutChange={handleLayoutChange}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 shrink-0">
            <div className="flex flex-col gap-2 max-w-4xl mx-auto">
              {!activeAgentModelInfo && activeAgent && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="flex-1">
                    {t("当前 Agent 未配置模型服务商。请前往「设置 > 模型」配置 API Key 并启用至少一个服务商。")}
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <div className="relative rounded-2xl border bg-card shadow-sm">
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
                    className="min-h-[80px] text-sm border-0 focus-visible:ring-0 resize-none pb-12"
                  />
                  {/* Bottom bar inside input */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileSelect} />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
                        aria-label={t('Attach file')}
                        disabled={isStreaming}
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                      </button>
                      {/* Thinking level control */}
                      <div className="relative">
                        <button
                          onClick={() => setThinkingPickerOpen(!thinkingPickerOpen)}
                          className={cn(
                            "h-7 w-7 flex items-center justify-center rounded transition-colors",
                            thinkingLevel === 'default'
                              ? "text-primary/60 hover:text-primary hover:bg-primary/10"
                              : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/60"
                          )}
                          aria-label={t('Thinking level')}
                          disabled={isStreaming}
                        >
                          <Brain className="h-3.5 w-3.5" />
                        </button>
                        {thinkingPickerOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setThinkingPickerOpen(false)} />
                            <div className="absolute bottom-full left-0 mb-1 z-50 min-w-[160px] rounded-lg border bg-popover p-1 shadow-md">
                              {[
                                { value: 'default' as const, label: t('Default (Auto)'), desc: t('Model decides') },
                                { value: 'off' as const, label: t('Off'), desc: t('No thinking') },
                              ].map(option => (
                                <button
                                  key={option.value}
                                  onClick={() => { setThinkingLevel(option.value); setThinkingPickerOpen(false); }}
                                  className={cn(
                                    "w-full text-left px-3 py-1.5 text-xs rounded-md flex items-center gap-2",
                                    thinkingLevel === option.value
                                      ? 'bg-primary/10 text-primary font-medium'
                                      : 'text-foreground/80 hover:bg-muted'
                                  )}
                                >
                                  <span className={cn("w-1.5 h-1.5 rounded-full", thinkingLevel === option.value ? 'bg-primary' : 'bg-transparent')} />
                                  <div>
                                    <div>{option.label}</div>
                                    <div className="text-muted-foreground/60 text-[10px]">{option.desc}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      {activeAgentModelInfo && (
                        <div className="relative">
                          <button
                            onClick={() => setModelPickerOpen(!modelPickerOpen)}
                            className="text-xs text-muted-foreground/70 hover:text-foreground/60 leading-none transition-colors"
                            aria-label={t('Switch model')}
                          >
                            {activeAgentModelInfo.providerName}/{activeAgentModelInfo.modelName}
                          </button>
                          {modelPickerOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setModelPickerOpen(false)} />
                              <div className="absolute bottom-full left-0 mb-1 z-50 min-w-[180px] rounded-lg border bg-popover p-1 shadow-md">
                                {settings.providers?.filter((p: any) => p.isEnabled).map((provider: any) => (
                                  <div key={provider.id}>
                                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">{provider.name}</div>
                                    {(provider.models || []).map((model: any) => {
                                      const isActive = (provider.id === settings.activeProviderId) &&
                                        (model.modelId === (activeAgentModelInfo?.modelName || ''));
                                      return (
                                        <button
                                          key={model.id || model.modelId}
                                          onClick={() => { setActiveProvider(provider.id); setModelPickerOpen(false) }}
                                          className={`w-full text-left px-3 py-1.5 text-xs rounded-md flex items-center gap-2 ${
                                            isActive ? 'bg-primary/10 text-primary font-medium' : 'text-foreground/80 hover:bg-muted'
                                          }`}
                                        >
                                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-primary' : 'bg-transparent'}`} />
                                          <span className="truncate">{model.name || model.modelId}</span>
                                        </button>
                                      )
                                    })}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {isStreaming ? (
                      <button
                        onClick={handleStop}
                        className="h-7 w-7 flex items-center justify-center rounded text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label={t('Stop')}
                      >
                        <Square className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={trackClick(handleSend, 'chat:send')}
                        disabled={!input.trim() || !activeAgent}
                        className="h-7 w-7 flex items-center justify-center rounded text-primary hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:text-muted-foreground"
                        aria-label={t("Send")}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Model label below input, right-aligned */}
                {!activeAgentModelInfo && activeAgent && (
                  <div className="text-xs text-muted-foreground/70 text-right pr-1">
                    {t("未配置")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
