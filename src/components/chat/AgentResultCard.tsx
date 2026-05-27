import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Agent, ChatMessage } from '@/types/models';
import { Send, Bot } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface AgentResultCardProps {
  agent: Agent;
  messages: ChatMessage[];
  onSendMessage: (agentId: string, message: string) => void;
}

export function AgentResultCard({ agent, messages, onSendMessage }: AgentResultCardProps) {
  const [inputValue, setInputValue] = useState('');
  const { t } = useTranslation();

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(agent.id, inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getAgentMessages = () => {
    return messages.filter(
      msg => msg.role === 'user' || 
             (msg.agentResponses && msg.agentResponses.some(ar => ar.agentId === agent.id))
    );
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border/50 overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-border/50 bg-muted/30">
        <Avatar className="h-10 w-10 rounded-full border shadow-sm">
          <AvatarImage src={agent.avatar} alt={agent.name} />
          <AvatarFallback className="rounded-full bg-primary/10 text-primary">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{agent.name}</h3>
          <p className="text-xs text-muted-foreground">{agent.systemPrompt.slice(0, 50)}...</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {getAgentMessages().map((msg) => (
          <div key={msg.id} className="space-y-2">
            {msg.role === 'user' && (
              <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground px-4 py-2 rounded-2xl rounded-br-md max-w-[80%]">
                  <p className="text-sm">{msg.content.text}</p>
                </div>
              </div>
            )}
            {msg.agentResponses?.filter(ar => ar.agentId === agent.id).map((ar, idx) => (
              <div key={idx} className="flex justify-start">
                <div className="bg-muted px-4 py-2 rounded-2xl rounded-bl-md max-w-[80%]">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{ar.content.text}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-border/50 bg-background/50">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('Ask') + ' ' + agent.name + '...'}
            className="flex-1 bg-background border-border/50 focus:border-primary"
          />
          <Button 
            onClick={handleSend}
            disabled={!inputValue.trim()}
            size="icon"
            className="bg-primary hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
