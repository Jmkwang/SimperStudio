import { useState, useRef, useEffect, useMemo } from "react";
import { ChatSession } from "@/types/models";
import { useAppStore } from "@/store/appStore";
import { useTranslation } from "@/hooks/useTranslation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function SimpleChatView({ session }: { session: ChatSession }) {
  const { t } = useTranslation();
  const agents = useAppStore(state => state.agents);
  const sendToAgent = useAppStore(state => state.sendToAgent);
  const [input, setInput] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeAgent = useMemo(() => {
    if (selectedAgentId) return agents.find(a => a.id === selectedAgentId);
    return agents[0] || null;
  }, [agents, selectedAgentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.messages.length]);

  const handleSend = async () => {
    if (!input.trim() || !activeAgent) return;
    await sendToAgent(session.id, activeAgent.id, input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      {agents.length > 1 && (
        <div className="border-b px-6 py-2 flex items-center gap-2 shrink-0 overflow-x-auto">
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
              <Avatar className="h-4 w-4 rounded-sm shrink-0">
                <AvatarImage src={agent.avatar} />
                <AvatarFallback className="rounded-sm text-[8px]">{agent.name?.slice(0, 1)}</AvatarFallback>
              </Avatar>
              {agent.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto p-6 space-y-4">
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
            agent={activeAgent ? { name: activeAgent.name, avatar: activeAgent.avatar } : undefined}
            agentId={message.role === "assistant" ? undefined : undefined}
            actions={message.role === "assistant" ? {
              canCopy: true,
              canRerun: true,
              onRerun: () => {
                if (!activeAgent) return;
                const lastUserMsg = [...session.messages].reverse().find(m => m.role === "user");
                if (lastUserMsg) sendToAgent(session.id, activeAgent.id, lastUserMsg.content.text);
              },
            } : undefined}
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
