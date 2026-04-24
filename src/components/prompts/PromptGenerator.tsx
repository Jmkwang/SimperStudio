import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { fetchFromModel } from "@/lib/api";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function PromptGenerator() {
  const [metaPrompt, setMetaPrompt] = useState(
    "You are an expert prompt engineer. The user will give you a brief description, and you must output a detailed, professional system prompt for an AI agent."
  );
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const settings = useAppStore(state => state.settings);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const providerToUse = settings.apiProvider === 'custom' ? 'custom' : 'openai';
      const modelToUse = settings.apiProvider === 'custom' ? settings.customModelId : '';
      
      const { textStream } = await fetchFromModel(providerToUse, modelToUse, userMessage, settings, metaPrompt);
      
      let fullText = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      
      for await (const chunk of textStream) {
        fullText = chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].content = fullText;
          return updated;
        });
      }
    } catch (error) {
      console.error('Failed to generate prompt:', error);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content += `

[Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}]`;
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };
const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Area: Meta Prompt Editor */}
      <div className="p-4 border-b shrink-0 bg-muted/20">
        <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="w-4 h-4 text-primary" />
          System / Meta Prompt
        </div>
        <Textarea
          value={metaPrompt}
          onChange={(e) => setMetaPrompt(e.target.value)}
          className="min-h-[80px] text-sm resize-y font-mono bg-background"
          placeholder="Enter the instructions for the prompt generator..."
        />
      </div>

      {/* Middle Area: Chat History */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="flex flex-col gap-4 max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground pt-20">
              <Sparkles className="w-12 h-12 mb-4 opacity-20" />
              <p>Describe what kind of prompt you need...</p>
              <p className="text-sm opacity-60">e.g., "A customer support agent that speaks like a pirate"</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                )}
                
                <Card className={`px-4 py-3 max-w-[80%] ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground ml-auto' 
                    : 'bg-muted/50 border-muted font-mono text-sm whitespace-pre-wrap'
                }`}>
                  {msg.content}
                </Card>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium">You</span>
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom Area: Input */}
      <div className="p-4 border-t bg-background shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the agent you want to create... (Press Enter to send)"
            className="min-h-[60px] max-h-[200px] pr-12 resize-none"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!input.trim() || isLoading}
            className="absolute right-3 bottom-3 h-8 w-8"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
