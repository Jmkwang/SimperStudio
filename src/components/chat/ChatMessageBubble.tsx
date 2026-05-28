import { ChatMessage, AgentResponse } from "@/types/models";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "@/hooks/useTranslation";
import { AlertTriangle, ChevronDown, Bot, Copy, Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, memo } from "react";

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
}

function UserBubble({ message, emptyText }: { message: ChatMessage; emptyText?: string }) {
  const attachments = message.content?.attachments;
  return (
    <div className="flex justify-end gap-2">
      <div className="max-w-[80%] flex flex-col items-end">
        <div className="rounded-2xl rounded-tr-md bg-foreground/10 px-3 py-2 text-sm whitespace-pre-wrap break-words">
          {message.content.text || emptyText || ""}
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
        <span className="text-xs text-muted-foreground mt-0.5 mr-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <Avatar className="h-7 w-7 rounded-full shrink-0 mt-1">
        <AvatarFallback className="rounded-full bg-muted text-muted-foreground text-xs">U</AvatarFallback>
      </Avatar>
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
  const gameStatus = response._dynamicAgentMeta?.status;

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
      "flex justify-start gap-2 group",
      layout === 'multi' && "flex-1"
    )}>
      <div className="relative shrink-0 mt-1">
        <Avatar className="h-7 w-7 rounded-full border shadow-sm">
          <AvatarImage src={agent?.avatar} />
          <AvatarFallback className="rounded-full bg-primary/10 text-primary">
            <Bot className="h-3.5 w-3.5" />
          </AvatarFallback>
        </Avatar>
        {gameStatus && (
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background',
              gameStatus === 'alive'
                ? 'bg-green-500'
                : gameStatus === 'dead'
                  ? 'bg-destructive'
                  : 'bg-muted-foreground'
            )}
            title={gameStatus === 'alive' ? t('Alive') : gameStatus === 'dead' ? t('Dead') : gameStatus}
          />
        )}
      </div>
      <div className={cn(
        "flex flex-col items-start",
        layout === 'single' ? "max-w-[80%]" : "w-full"
      )}>
        {agent?.name && (
          <span className="text-xs font-medium text-muted-foreground mb-0.5 ml-1">
            {agent.name}
            {(response.providerName || response.modelName) && (
              <span className="text-xs text-muted-foreground/70 ml-1.5">
                {response.providerName}/{response.modelName || response.modelId}
              </span>
            )}
          </span>
        )}
        <div className={cn(
          "py-1.5 text-sm whitespace-pre-wrap break-words w-full rounded-lg px-3",
          isError
            ? "border border-destructive/30 bg-destructive/5"
            : "bg-muted/30"
        )}>
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
            <div>{response.content.text}</div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 ml-1 flex-wrap">
          <span className="text-xs text-muted-foreground/70 shrink-0">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {(response.tokenUsage || response.duration) && (
            <span className="text-xs text-muted-foreground/70 shrink-0">
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
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground/70 hover:text-foreground transition-colors relative"
                aria-label={t("Copy")}
              >
                <Copy className={`h-3 w-3 transition-opacity duration-300 ${copied ? 'opacity-0' : 'opacity-100'}`} />
                <Check className={`h-3 w-3 absolute text-green-500 transition-opacity duration-300 ${copied ? 'opacity-100' : 'opacity-0'}`} />
              </button>
              {onRetry && (
                <button
                  onClick={() => onRetry(response.agentId || agent?.id || '', message.id)}
                  className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground/70 hover:text-foreground transition-colors"
                  aria-label={t("Retry")}
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return prev.response.content.text === next.response.content.text &&
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
    return <UserBubble message={message} emptyText={emptyText} />;
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

    if (isMulti) {
      return (
        <div className="flex gap-3">
          {filtered.map((response, idx) => (
            <div
              key={`${message.id}-${idx}`}
              className="flex-1 rounded-xl border border-border/50 bg-card/50 p-3"
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
