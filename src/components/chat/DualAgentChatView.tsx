import { useState } from 'react';
import { useAppStore } from '@/stores';
import { AgentResultCard } from './AgentResultCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { Agent, Workflow } from '@/types/models';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from '@/hooks/useTranslation';

interface DualAgentChatViewProps {
  workflow: Workflow;
}

export function DualAgentChatView({ workflow }: DualAgentChatViewProps) {
  const { t } = useTranslation();
  const agents = useAppStore((state) => state.agents);
  const sessions = useAppStore((state) => state.sessions);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const addUserMessage = useAppStore((state) => state.addUserMessage);
  const addAgentResponseStream = useAppStore((state) => state.addAgentResponseStream);
  const completeAgentResponse = useAppStore((state) => state.completeAgentResponse);

  const [mainInput, setMainInput] = useState('');

  const agentNodes = workflow.nodesData?.filter(node => node.type === 'agent') || [];
  const linkedAgents = agentNodes
    .map(node => agents.find(a => a.id === (node.data as Record<string, unknown>).agentId))
    .filter(Boolean) as Agent[];

  const session = sessions.find(s => s.id === activeSessionId);

  const handleMainSend = async () => {
    if (!mainInput.trim() || !session) return;

    addUserMessage(session.id, mainInput);

    const userMessage = mainInput;
    setMainInput('');

    linkedAgents.forEach(async (agent) => {
      const streamingMessageId = uuidv4();
      
      for (let i = 0; i < userMessage.length; i += 5) {
        const chunk = userMessage.slice(i, i + 5);
        addAgentResponseStream(session.id, streamingMessageId, agent.id, chunk);
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      
      completeAgentResponse(session.id, streamingMessageId, agent.id);
    });
  };

  const handleMainKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleMainSend();
    }
  };

  const handleAgentMessage = (agentId: string, message: string) => {
    if (!session) return;
    
    addUserMessage(session.id, message);
    
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    const streamingMessageId = uuidv4();
    for (let i = 0; i < message.length; i += 5) {
      const chunk = message.slice(i, i + 5);
      addAgentResponseStream(session.id, streamingMessageId, agentId, chunk);
    }
    completeAgentResponse(session.id, streamingMessageId, agentId);
  };

  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 min-h-0">
        {linkedAgents.map((agent) => (
          <AgentResultCard
            key={agent.id}
            agent={agent}
            messages={session?.messages || []}
            onSendMessage={handleAgentMessage}
          />
        ))}
      </div>

      {session && (
        <div className="border-t border-border/50 bg-background p-4">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <Input
              value={mainInput}
              onChange={(e) => setMainInput(e.target.value)}
              onKeyPress={handleMainKeyPress}
              placeholder={t('Enter message both agents')}
              className="flex-1 bg-background border-border/50 focus:border-primary"
            />
            <Button 
              onClick={handleMainSend}
              disabled={!mainInput.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              <Send className="h-4 w-4 mr-2" />
              {t('Send')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
