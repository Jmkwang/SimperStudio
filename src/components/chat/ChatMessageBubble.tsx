import { ChatMessage, AgentResponse } from "@/types/models";
import { useTranslation } from "@/hooks/useTranslation";
import { AlertTriangle, ChevronDown, Copy, Check, RefreshCw, LayoutList, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AgentInfo {
  id?: string;
  name?: string;
  avatar?: string;
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
  agent?: AgentInfo;
  agents?: AgentInfo[];
  agentId?: string;
  nodeId?: string;
  emptyText?: string;
  onCopy?: () => void;
  onRetry?: (agentId: string, messageId: string) => void;
  layoutMode?: 'A' | 'B';
  onLayoutChange?: (mode: 'A' | 'B') => void;
}

function UserBubble({ message, emptyText, showLayoutSwitch, layoutMode, onLayoutChange }: {
  message: ChatMessage;
  emptyText?: string;
  showLayoutSwitch?: boolean;
  layoutMode?: 'A' | 'B';
  onLayoutChange?: (mode: 'A' | 'B') => void;
}) {
  const { t } = useTranslation();
  const attachments = message.content?.attachments;
  const text = message.content.text || emptyText || "";
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const isLong = text.length > 300 || text.split('\n').length > 6;

  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex justify-end gap-2 group">
      <div className="max-w-[75%] flex flex-col items-end">
        <div className="relative">
          <div className={cn(
            "rounded-[20px] rounded-tr-sm px-4 py-2.5 text-sm text-primary-foreground whitespace-pre-wrap break-word leading-relaxed",
            "bubble-user",
            isLong && !expanded && "max-h-[180px] overflow-hidden"
          )}>
            {text}
            {isLong && !expanded && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-primary/80 to-transparent rounded-b-[20px]" />
            )}
          </div>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="absolute bottom-1.5 right-2 text-[11px] text-primary-foreground/80 hover:text-primary-foreground bg-black/20 hover:bg-black/30 px-2 py-0.5 rounded-full transition-all"
            >
              {expanded ? t("Collapse") : t("Expand")}
            </button>
          )}
        </div>
        {attachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {attachments.map((att: any) => (
              <div key={att.id} className="flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1 text-[11px] text-muted-foreground max-w-[160px] border border-border/50">
                <span className="truncate">{att.name}</span>
                <span className="shrink-0 text-muted-foreground/50">{(att.size / 1024).toFixed(0)}KB</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1.5 mt-1 mr-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* Layout switch buttons */}
          {showLayoutSwitch && (
            <div className="flex items-center gap-0.5 border-r border-muted-foreground/15 pr-1.5 mr-0.5">
              <button
                onClick={() => onLayoutChange?.('A')}
                className={cn(
                  "h-5 w-5 flex items-center justify-center rounded-md transition-all cursor-pointer",
                  layoutMode === 'A' ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/50"
                )}
                title={t("Stacked layout")}
              >
                <LayoutList className="h-3 w-3" />
              </button>
              <button
                onClick={() => onLayoutChange?.('B')}
                className={cn(
                  "h-5 w-5 flex items-center justify-center rounded-md transition-all cursor-pointer",
                  layoutMode === 'B' ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/50"
                )}
                title={t("List layout")}
              >
                <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="12" height="3" rx="1" />
                  <rect x="2" y="7" width="12" height="3" rx="1" />
                  <rect x="2" y="12" width="12" height="3" rx="1" />
                </svg>
              </button>
            </div>
          )}
          <button
            onClick={handleCopy}
            className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground/60 hover:text-foreground transition-all relative cursor-pointer"
            aria-label={t("Copy")}
          >
            <Copy className={cn("h-3 w-3 transition-opacity duration-300", copied ? 'opacity-0' : 'opacity-100')} />
            <Check className={cn("h-3 w-3 absolute text-green-500 transition-opacity duration-300", copied ? 'opacity-100' : 'opacity-0')} />
          </button>
          <span className="text-[11px] text-muted-foreground/50">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </div>
  );
}

function ThinkingBlock({ thinking, isStreaming }: { thinking: string; isStreaming: boolean }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!thinking) return null;

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 hover:text-muted-foreground transition-colors cursor-pointer group/thinking"
      >
        <Brain className={cn("h-3 w-3", isStreaming && "animate-pulse text-primary")} />
        <span className="font-medium">{t("Thinking...")}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div
          ref={scrollRef}
          className="mt-1.5 max-h-48 overflow-y-auto rounded-lg bg-muted/30 border border-border/40 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap"
        >
          {thinking}
        </div>
      )}
      {!expanded && (
        <div className="mt-0.5 text-[11px] text-muted-foreground/50 truncate max-w-full">
          {thinking.split('\n')[0].slice(0, 100)}
        </div>
      )}
    </div>
  );
}

const AssistantBubble = memo(function AssistantBubble({
  response,
  message,
  agent,
  onCopy,
  onRetry,
  layout = 'single',
}: {
  response: AgentResponse;
  message: ChatMessage;
  agent?: AgentInfo;
  onCopy?: () => void;
  onRetry?: (agentId: string, messageId: string) => void;
  layout?: 'single' | 'multi';
}) {
  const { t } = useTranslation();
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  const [copied, setCopied] = useState(false);
  const isError = response.status === 'error';
  const isStreaming = response.status === 'streaming';

  const handleCopy = () => {
    if (onCopy) {
      onCopy();
    } else {
      navigator.clipboard.writeText(response.content.text).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      "flex gap-3 group",
      layout === 'single' ? "max-w-[85%]" : "w-full"
    )}>
      {/* Avatar column */}
      <div className="relative shrink-0">
        {agent?.avatar ? (
          <div className="h-9 w-9 rounded-full overflow-hidden bg-muted ring-2 ring-background shadow-sm">
            {agent.avatar.startsWith('http') || agent.avatar.startsWith('/') ? (
              <img src={agent.avatar} alt={agent.name} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm">{agent.avatar}</span>
            )}
          </div>
        ) : (
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center text-sm font-semibold ring-2 ring-background shadow-sm">
            {agent?.name?.slice(0, 2)?.toUpperCase() || 'AI'}
          </div>
        )}
        {/* Streaming indicator */}
        {isStreaming && (
          <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background animate-pulse-ring" />
        )}
      </div>
      
      {/* Content column */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Name + model info */}
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-foreground">{agent?.name || 'Agent'}</span>
          {(response.providerName || response.modelName) && (
            <span className="text-[11px] text-muted-foreground/60 font-medium">
              {response.providerName}/{response.modelName || response.modelId}
            </span>
          )}
        </div>
        
        {/* Content */}
        <div className={cn(
          "rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed",
          isError 
            ? "border border-destructive/20 bg-destructive/5" 
            : "bubble-assistant"
        )}>
          {/* Thinking */}
          {response.content.thinking && (
            <ThinkingBlock thinking={response.content.thinking} isStreaming={isStreaming} />
          )}
          {isError ? (
            <div className="space-y-1.5">
              <button
                className="flex items-center gap-2 text-destructive cursor-pointer text-sm"
                onClick={() => setShowErrorDetail(!showErrorDetail)}
                aria-expanded={showErrorDetail}
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{response.errorSummary || t('模型调用失败')}</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", showErrorDetail && "rotate-180")} />
              </button>
              {showErrorDetail && response.errorDetail && (
                <pre className="text-xs text-destructive/70 bg-destructive/5 p-2.5 rounded-lg overflow-auto max-h-40 border border-destructive/10">
                  {response.errorDetail}
                </pre>
              )}
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none break-words whitespace-pre-wrap [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <Markdown remarkPlugins={[remarkGfm]}>{response.content.text}</Markdown>
            </div>
          )}
        </div>
        
        {/* Actions row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {(response.tokenUsage || response.duration) && (
              <span className="text-[10px] text-muted-foreground/50 shrink-0 font-medium">
                {[
                  response.tokenUsage ? `↑${response.tokenUsage.promptTokens} ↓${response.tokenUsage.completionTokens}` : '',
                  response.duration ? `${(response.duration / 1000).toFixed(1)}s` : '',
                ].filter(Boolean).join(' · ')}
              </span>
            )}
            {!isStreaming && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={handleCopy}
                  className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground/50 hover:text-foreground transition-colors relative cursor-pointer"
                  aria-label={t("Copy")}
                >
                  <Copy className={cn("h-3 w-3 transition-opacity duration-300", copied ? 'opacity-0' : 'opacity-100')} />
                  <Check className={cn("h-3 w-3 absolute text-green-500 transition-opacity duration-300", copied ? 'opacity-100' : 'opacity-0')} />
                </button>
                {onRetry && (
                  <button
                    onClick={() => onRetry(response.agentId || agent?.id || '', message.id)}
                    className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer"
                    aria-label={t("Retry")}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground/40 shrink-0">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return prev.response.content.text === next.response.content.text &&
    prev.response.content.thinking === next.response.content.thinking &&
    prev.response.status === next.response.status &&
    prev.response.agentId === next.response.agentId &&
    prev.response.nodeId === next.response.nodeId &&
    prev.agent?.id === next.agent?.id &&
    prev.agent?.avatar === next.agent?.avatar &&
    prev.layout === next.layout;
});

export const ChatMessageBubble = memo(function ChatMessageBubble({
  message,
  agent,
  agents,
  agentId,
  nodeId,
  emptyText,
  onCopy,
  onRetry,
  layoutMode = 'A',
  onLayoutChange,
}: ChatMessageBubbleProps) {
  const resolveAgent = (response: AgentResponse): AgentInfo | undefined => {
    if (response._dynamicAgentMeta) {
      const meta = response._dynamicAgentMeta;
      let avatar = meta.avatar;
      if (!avatar && agents && response.agentId) {
        const found = agents.find(a => a.id === response.agentId);
        if (found?.avatar) avatar = found.avatar;
      }
      return {
        id: response.agentId,
        name: meta.name,
        avatar,
      };
    }
    if (agents && response.agentId) {
      const found = agents.find(a => a.id === response.agentId);
      if (found) return found;
    }
    return agent;
  };

  if (message.role === "user") {
    return (
      <UserBubble
        message={message}
        emptyText={emptyText}
        showLayoutSwitch={!!onLayoutChange}
        layoutMode={layoutMode}
        onLayoutChange={onLayoutChange}
      />
    );
  }

  if (message.role === "assistant") {
    const responses = message.agentResponses || [{
      agentId: agent?.id || '',
      content: message.content,
      status: 'complete' as const,
    }];
    const filtered = agentResponsesFiltered(responses, agentId, nodeId);
    const isMulti = filtered.length > 1;

    if (isMulti && layoutMode === 'B') {
      return (
        <div className="flex flex-col gap-3">
          {filtered.map((response, idx) => (
            <AssistantBubble
              key={`${message.id}-${idx}`}
              response={response}
              message={message}
              agent={resolveAgent(response)}
              layout="single"
              onCopy={onCopy}
              onRetry={onRetry}
            />
          ))}
        </div>
      );
    }

    if (isMulti) {
      return (
        <div className="flex gap-3">
          {filtered.map((response, idx) => (
            <AssistantBubble
              key={`${message.id}-${idx}`}
              response={response}
              message={message}
              agent={resolveAgent(response)}
              layout="multi"
              onCopy={onCopy}
              onRetry={onRetry}
            />
          ))}
        </div>
      );
    }

    return (
      <>
        {filtered.map((response, idx) => (
          <AssistantBubble
            key={`${message.id}-${idx}`}
            response={response}
            message={message}
            agent={resolveAgent(response)}
            layout="single"
            onCopy={onCopy}
            onRetry={onRetry}
          />
        ))}
      </>
    );
  }

  return null;
});

function agentResponsesFiltered(
  responses: AgentResponse[],
  agentId?: string,
  nodeId?: string,
): AgentResponse[] {
  return responses.filter(r => {
    if (agentId && r.agentId !== agentId) return false;
    if (nodeId && r.nodeId !== undefined && r.nodeId !== nodeId) return false;
    return true;
  });
}
