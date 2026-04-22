import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, Agent } from '@/types/models';
import { cn } from '@/lib/utils';
import { fetchFromModel } from '@/lib/api';

export function ChatInterface() {
  const activeSession = useAppStore(state => state.getActiveSession());
  const agents = useAppStore(state => state.agents);
  const addUserMessage = useAppStore(state => state.addUserMessage);
  const addAgentResponseStream = useAppStore(state => state.addAgentResponseStream);
  const completeAgentResponse = useAppStore(state => state.completeAgentResponse);

  const [input, setInput] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSession?.messages]);

  const handleSend = async () => {
    if (!input.trim() || !activeSession) return;

    const userText = input;
    addUserMessage(activeSession.id, userText);
    setInput('');

    // Detect mentions in the text (e.g. @agent-name)
    const mentionedAgents = agents.filter(a => userText.includes(`@${a.name}`));

    // If no explicit mention, default to activeAgentId or the first agent
    const { activeAgentId } = useAppStore.getState();
    const defaultAgent = agents.find(a => a.id === activeAgentId) || agents[0];
    const agentsToRespond = mentionedAgents.length > 0 ? mentionedAgents : [defaultAgent];

    const assistantMessageId = uuidv4();

    // Call the backend or mock service for each agent
    agentsToRespond.forEach(async (agent) => {
      // Create initial streaming block
      addAgentResponseStream(activeSession.id, assistantMessageId, agent.id, '');

      try {
        const { settings } = useAppStore.getState();
        const providerToUse: string = settings.apiProvider === 'custom' ? 'custom' : agent.modelProvider;
        const modelToUse = settings.apiProvider === 'custom' ? settings.customModelId : agent.modelId;

        // Skip actual API call if mock mode or no API key is provided and not using a custom provider that might not need one
        const hasKey = (providerToUse === 'openai' && settings.openaiKey) ||
                       (providerToUse === 'anthropic' && settings.anthropicKey) ||
                       (providerToUse === 'google' && settings.googleKey) ||
                       providerToUse === 'custom';

        if (!hasKey) {
            console.log(`Simulating API call for ${agent.name} because no API key is configured for ${providerToUse}.`);
            simulateAgentStream(activeSession.id, assistantMessageId, agent, userText, providerToUse === 'custom');
            return;
        }

        console.log(`Calling API for ${agent.name} using ${providerToUse} and model ${modelToUse}`);

        const { textStream } = await fetchFromModel(providerToUse, modelToUse, userText, settings, agent.systemPrompt);

        let fullText = '';
        for await (const textPart of textStream) {
            fullText += textPart;
            addAgentResponseStream(activeSession.id, assistantMessageId, agent.id, fullText);
        }
        completeAgentResponse(activeSession.id, assistantMessageId, agent.id);

      } catch (e: any) {
        console.error("API error", e);
        addAgentResponseStream(activeSession.id, assistantMessageId, agent.id, `\n\nError: Failed to fetch from API. ${e.message || e}`);
        completeAgentResponse(activeSession.id, assistantMessageId, agent.id);
      }
    });
  };

  const simulateAgentStream = (sessionId: string, messageId: string, agent: Agent, prompt: string, isCustom: boolean) => {
    const { settings } = useAppStore.getState();
    const modelContext = isCustom ? `using ${settings.customModelId} via ${settings.customBaseUrl}` : `using ${agent.modelProvider}`;
    let chunks = `Hello! I am ${agent.name}. I am responding ${modelContext}. You said: "${prompt}". My system prompt is: "${agent.systemPrompt}".`.split(' ');
    let currentWord = 0;

    const interval = setInterval(() => {
      if (currentWord < chunks.length) {
        addAgentResponseStream(sessionId, messageId, agent.id, chunks[currentWord] + ' ');
        currentWord++;
      } else {
        clearInterval(interval);
        completeAgentResponse(sessionId, messageId, agent.id);
      }
    }, 50); // 50ms per word
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Basic mention trigger logic could go here
    if (e.key === '@') {
      setShowMentions(true);
    }
  };

  const insertMention = (agentName: string) => {
    setInput(prev => prev + `@${agentName} `);
    setShowMentions(false);
  };

  if (!activeSession) return <div className="flex-1 flex items-center justify-center">No active session</div>;

  return (
    <div className="flex flex-col h-full relative">
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-4">
          {activeSession.messages.map(msg => (
            <MessageBlock key={msg.id} message={msg} agents={agents} />
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background shrink-0 relative">
        <div className="max-w-3xl mx-auto relative flex gap-2">
          {/* Mock Mention Popover */}
          {showMentions && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-popover border rounded-xl shadow-lg p-2 flex flex-col gap-1 z-50">
              <div className="text-xs font-semibold px-2 py-1 text-muted-foreground">Mention Agent</div>
              {agents.map(a => (
                <button
                  key={a.id}
                  onClick={() => insertMention(a.name)}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded-lg text-sm text-left"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={a.avatar} />
                    <AvatarFallback>{a.name[0]}</AvatarFallback>
                  </Avatar>
                  {a.name}
                </button>
              ))}
            </div>
          )}

          <Input
            value={input}
            onChange={(e) => {
               setInput(e.target.value);
               if (!e.target.value.includes('@')) setShowMentions(false);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... use @ to mention agents"
            className="flex-1 rounded-xl shadow-sm border-input bg-card focus-visible:ring-primary"
          />
          <Button onClick={handleSend} className="rounded-xl shadow-sm px-6">Send</Button>
        </div>
      </div>
    </div>
  );
}

function MessageBlock({ message, agents }: { message: ChatMessage, agents: Agent[] }) {
  if (message.role === 'system') {
    return (
      <div className="flex justify-center my-4">
        <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
          {message.content.text}
        </span>
      </div>
    );
  }

  if (message.role === 'user') {
    return (
      <div className="flex gap-4 flex-row-reverse">
        <div className="flex-1 flex flex-col items-end">
          <div className="flex items-center gap-2 flex-row-reverse">
            <span className="font-semibold text-sm">You</span>
            <span className="text-xs text-muted-foreground">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="mt-1 text-sm bg-primary text-primary-foreground p-3 rounded-2xl rounded-tr-sm w-fit max-w-[85%] text-left shadow-sm">
            {message.content.text}
          </div>
        </div>
      </div>
    );
  }

  if (message.role === 'assistant' && message.agentResponses) {
    // Stack multiple agent responses vertically within the assistant block
    return (
      <div className="flex flex-col gap-4">
        {message.agentResponses.map(resp => {
          const agent = agents.find(a => a.id === resp.agentId);
          return (
            <div key={resp.agentId} className="flex gap-4">
              <Avatar className="h-8 w-8 mt-1 border shadow-sm">
                <AvatarImage src={agent?.avatar} />
                <AvatarFallback>{agent?.name?.[0] || 'A'}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{agent?.name || 'Unknown Agent'}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(resp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {resp.status === 'streaming' && (
                    <span className="flex space-x-1 items-center ml-2">
                       <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce"></span>
                       <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce delay-75" style={{ animationDelay: '75ms' }}></span>
                       <span className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce delay-150" style={{ animationDelay: '150ms' }}></span>
                    </span>
                  )}
                </div>
                <div className={cn(
                  "mt-1 text-sm p-3 rounded-2xl rounded-tl-sm w-fit max-w-[85%] shadow-sm",
                  resp.status === 'error' ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-card border"
                )}>
                  {resp.content.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}