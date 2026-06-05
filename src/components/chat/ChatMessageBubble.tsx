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
      <div className="max-w-[80%] flex flex-col items-end">
        <div className="relative">
          <div className={cn(
            "rounded-2xl rounded-tr-md bg-primary px-3 py-2 text-sm text-primary-foreground whitespace-pre-wrap break-words",
            isLong && !expanded && "max-h-[180px] overflow-hidden"
          )}>
            {text}
            {isLong && !expanded && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-primary to-transparent rounded-b-2xl" />
            )}
          </div>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="absolute bottom-1 right-1 text-xs text-primary-foreground/70 hover:text-primary-foreground bg-primary/80 hover:bg-primary/90 px-2 py-0.5 rounded transition-colors"
            >
              {expanded ? t("Collapse") : t("Expand")}
            </button>
          )}
        </div>
        {attachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {attachments.map((att: any) => (
              <div key={att.id} className="flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground max-w-[140px] overflow-hidden">
                <span className="truncate">{att.name}</span>
                <span className="shrink-0">({(att.size / 1024).toFixed(0)}KB)</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1 mt-0.5 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Layout switch buttons */}
          <div className="flex items-center gap-0.5 border-r border-muted-foreground/20 pr-1 mr-1">
            <button
              onClick={() => onLayoutChange?.('A')}
              className={cn(
                "h-5 w-5 flex items-center justify-center rounded transition-colors cursor-pointer",
                layoutMode === 'A' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              )}
              title={t("Stacked layout")}
            >
              <LayoutList className="h-3 w-3" />
            </button>
            <button
              onClick={() => onLayoutChange?.('B')}
              className={cn(
                "h-5 w-5 flex items-center justify-center rounded transition-colors cursor-pointer",
                layoutMode === 'B' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
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
          <button
            onClick={handleCopy}
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-all relative cursor-pointer"
            aria-label={t("Copy")}
          >
            <Copy className={`h-3 w-3 transition-opacity duration-300 ${copied ? 'opacity-0' : 'opacity-100'}`} />
            <Check className={`h-3 w-3 absolute text-green-600 transition-opacity duration-300 ${copied ? 'opacity-100' : 'opacity-0'}`} />
          </button>
          <span className="text-xs text-muted-foreground">
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
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-muted-foreground transition-colors cursor-pointer"
      >
        <Brain className={cn("h-3 w-3", isStreaming && "animate-pulse")} />
        <span>{t("Thinking...")}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div
          ref={scrollRef}
          className="mt-1 max-h-48 overflow-y-auto rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap"
        >
          {thinking}
        </div>
      )}
      {!expanded && (
        <div className="mt-0.5 text-xs text-muted-foreground/80 truncate max-w-full">
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
      "grid gap-x-3 group",
      layout === 'single' ? "max-w-[80%]" : "w-full",
      "[grid-template-columns:auto_1fr]"
    )}>
      {/* Avatar — row 1 col 1 */}
      <div className="shrink-0 row-start-1 col-start-1">
        {agent?.avatar ? (
          <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center text-sm">
            {agent.avatar.startsWith('http') || agent.avatar.startsWith('/') ? (
              <img src={agent.avatar} alt={agent.name} className="h-full w-full object-cover" />
            ) : (
              <span>{agent.avatar}</span>
            )}
          </div>
        ) : (
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
            {agent?.name?.slice(0, 2)?.toUpperCase() || 'AI'}
          </div>
        )}
      </div>
      {/* Agent name + model — row 1 col 2 */}
      <div className="row-start-1 col-start-2 flex flex-col justify-center min-w-0">
        <span className="text-sm font-semibold text-foreground truncate">
          {agent?.name || 'Agent'}
        </span>
        {(response.providerName || response.modelName) && (
          <span className="text-[10px] text-muted-foreground truncate">
            {response.providerName}/{response.modelName || response.modelId}
          </span>
        )}
      </div>
      {/* Content — row 2, spans both columns */}
      <div className={cn(
        "col-span-2 min-w-0 mt-2",
        isError && "border border-destructive/30 bg-destructive/5 rounded-lg px-3 py-1.5"
      )}>
        {/* Thinking */}
        {response.content.thinking && (
          <ThinkingBlock thinking={response.content.thinking} isStreaming={isStreaming} />
        )}
        {isError ? (
          <div className="space-y-1.5">
            <button
              className="flex items-center gap-2 text-destructive cursor-pointer"
              onClick={() => setShowErrorDetail(!showErrorDetail)}
              aria-expanded={showErrorDetail}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>{response.errorSummary || t('模型调用失败')}</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform", showErrorDetail && "rotate-180")} />
            </button>
            {showErrorDetail && response.errorDetail && (
              <pre className="text-xs text-destructive/80 bg-destructive/10 p-2 rounded overflow-auto max-h-40">
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
      {/* Actions — row 3, spans both columns */}
      <div className="col-span-2 flex items-start justify-between gap-2 mt-1 w-full">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {(response.tokenUsage || response.duration) && (
            <span className="text-[10px] text-muted-foreground shrink-0">
              ({[
                response.tokenUsage ? `↑${response.tokenUsage.promptTokens} ↓${response.tokenUsage.completionTokens} ${t("tokens")}` : '',
                response.duration ? `${(response.duration / 1000).toFixed(1)}s` : '',
              ].filter(Boolean).join(' / ')})
            </span>
          )}
          {!isStreaming && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={handleCopy}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative"
                aria-label={t("Copy")}
              >
                <Copy className={`h-3 w-3 transition-opacity duration-300 ${copied ? 'opacity-0' : 'opacity-100'}`} />
                <Check className={`h-3 w-3 absolute text-green-500 transition-opacity duration-300 ${copied ? 'opacity-100' : 'opacity-0'}`} />
              </button>
              {onRetry && (
                <button
                  onClick={() => onRetry(response.agentId || agent?.id || '', message.id)}
                  className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t("Retry")}
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground/80 shrink-0">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
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
    // 1. Dynamic agent meta carries the runtime-generated name/personality
    if (response._dynamicAgentMeta) {
      const meta = response._dynamicAgentMeta;
      // If dynamic meta has no avatar, try to find one from the agents array
      // (e.g. a fallback agent with a configured avatar)
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
    // 2. Standard agent lookup
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
    // Fallback for old messages without agentResponses (e.g. loaded from Tauri backend)
    const responses = message.agentResponses || [{
      agentId: agent?.id || '',
      content: message.content,
      status: 'complete' as const,
    }];
    const filtered = agentResponsesFiltered(responses, agentId, nodeId);
    const isMulti = filtered.length > 1;

    // Layout B: vertical list (each agent in its own row)
    if (isMulti && layoutMode === 'B') {
      return (
        <div className="flex flex-col gap-2">
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

    // Layout A: default stacked cards
    if (isMulti) {
      return (
        <div className="flex gap-3">
          {filtered.map((response, idx) => (
            <div
              key={`${message.id}-${idx}`}
              className="flex-1 rounded-xl border border-border p-3"
            >
              <AssistantBubble
                response={response}
                message={message}
                agent={resolveAgent(response)}
                layout="multi"
                onCopy={onCopy}
                onRetry={onRetry}
              />
            </div>
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
