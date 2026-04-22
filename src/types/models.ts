export interface Workspace {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  systemPrompt: string;
  industry?: string;
  modelProvider: 'local' | 'openai' | 'anthropic' | 'custom';
  modelId: string;
  temperature: number;
  maxTokens?: number;
  apiKey?: string;
  baseUrl?: string;
  parameters: Record<string, any>;
  createdAt: number;
}

export interface MessageContent {
  text: string;
  // Could hold tools/blocks later
}

// Represents a sub-response from a specific agent within a message block
export interface AgentResponse {
  agentId: string;
  content: MessageContent;
  status: 'streaming' | 'complete' | 'error';
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  // For user messages, content is a simple string block.
  // For assistant messages, it can hold multiple agent responses.
  content: MessageContent;
  agentResponses?: AgentResponse[];
  timestamp: number;
}

export interface ChatSession {
  id: string;
  workspaceId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface Workflow {
  id: string;
  workspaceId: string;
  name: string;
  nodes_data: any[];
  edges_data: any[];
  status: 'active' | 'inactive';
  createdAt: number;
  updatedAt: number;
}