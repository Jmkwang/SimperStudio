import { ChatMessage, AgentResponse } from "@/types/models";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageHoverActions, MessageHoverActionsProps } from "./MessageHoverActions";

interface AgentInfo {
  name?: string;
  avatar?: string;
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
  agent?: AgentInfo;
  agentId?: string;
  nodeId?: string;
  emptyText?: string;
  actions?: MessageHoverActionsProps;
}

function UserBubble({ message, emptyText }: { message: ChatMessage; emptyText?: string }) {
  return (
    <div className="flex justify-end gap-2">
      <div className="max-w-[80%] flex flex-col items-end">
        <div className="rounded-2xl rounded-tr-md bg-primary text-primary-foreground px-3 py-2 text-sm whitespace-pre-wrap break-words">
          {message.content.text || emptyText || ""}
        </div>
        <span className="text-[10px] text-muted-foreground mt-0.5 mr-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <Avatar className="h-7 w-7 rounded-full shrink-0 mt-1">
        <AvatarFallback className="rounded-full bg-muted text-muted-foreground text-xs">U</AvatarFallback>
      </Avatar>
    </div>
  );
}

function AssistantBubble({
  response,
  message,
  agent,
  actions,
}: {
  response: AgentResponse;
  message: ChatMessage;
  agent?: AgentInfo;
  actions?: MessageHoverActionsProps;
}) {
  return (
    <div className="flex justify-start gap-2 group">
      <Avatar className="h-7 w-7 rounded-full shrink-0 mt-1">
        <AvatarImage src={agent?.avatar} />
        <AvatarFallback className="rounded-full bg-primary/10 text-primary text-xs">
          {agent?.name?.slice(0, 2) || "A"}
        </AvatarFallback>
      </Avatar>
      <div className="max-w-[80%] flex flex-col items-start">
        <div className="rounded-2xl rounded-tl-md border px-3 py-2 text-sm whitespace-pre-wrap break-words">
          <div>{response.content.text}</div>
          {actions && <MessageHoverActions {...actions} />}
        </div>
        <div className="flex items-center justify-between mt-0.5 ml-1 gap-2">
          <span className="text-[10px] text-muted-foreground">
            {response.content.token !== undefined ? `${response.content.token} tokens` : ""}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ChatMessageBubble({
  message,
  agent,
  agentId,
  nodeId,
  emptyText,
  actions,
}: ChatMessageBubbleProps) {
  if (message.role === "user") {
    return <UserBubble message={message} emptyText={emptyText} />;
  }

  if (message.role === "assistant" && message.agentResponses) {
    const filtered = agentResponsesFiltered(message.agentResponses, agentId, nodeId);
    return (
      <>
        {filtered.map((response, idx) => (
          <AssistantBubble
            key={`${message.id}-${idx}`}
            response={response}
            message={message}
            agent={agent}
            actions={actions ? {
              ...actions,
              onCopy: actions.onCopy
                ? () => actions.onCopy!()
                : () => navigator.clipboard.writeText(response.content.text).catch(() => {}),
              onRerun: actions.onRerun ? () => actions.onRerun!() : undefined,
              onForward: actions.onForward ? () => actions.onForward!() : undefined,
              onRerunAndForward: actions.onRerunAndForward ? () => actions.onRerunAndForward!() : undefined,
            } : undefined}
          />
        ))}
      </>
    );
  }

  return null;
}

function agentResponsesFiltered(
  responses: AgentResponse[],
  agentId?: string,
  nodeId?: string,
): AgentResponse[] {
  return responses.filter(r => {
    if (agentId && r.agentId !== agentId) return false;
    if (nodeId && r.nodeId !== nodeId) return false;
    return true;
  });
}
