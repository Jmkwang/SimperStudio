import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage, MessageAttachment, MessageMeta, AgentResponse } from '@/types/models';

export function createUserMessage(
  sessionId: string,
  text: string,
  attachments: MessageAttachment[] = [],
  meta?: MessageMeta,
): ChatMessage {
  return {
    id: uuidv4(),
    sessionId,
    role: 'user',
    content: { text, attachments },
    timestamp: Date.now(),
    meta,
  };
}

export function createStreamMessage(
  sessionId: string,
  agentId: string,
  nodeId?: string,
  meta?: MessageMeta,
  messageId?: string,
): ChatMessage {
  return {
    id: messageId || uuidv4(),
    sessionId,
    role: 'assistant',
    content: { text: '' },
    timestamp: Date.now(),
    meta,
    agentResponses: [
      {
        agentId,
        nodeId,
        content: { text: '', thinking: '' },
        status: 'streaming',
        timestamp: Date.now(),
      },
    ],
  };
}

export function createAgentResponse(
  agentId: string,
  text: string,
  nodeId?: string,
  status: AgentResponse['status'] = 'complete',
): AgentResponse {
  return {
    agentId,
    nodeId,
    content: { text, thinking: '' },
    status,
    timestamp: Date.now(),
  };
}
