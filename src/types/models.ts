export interface Agent {
  id: string;
  name: string;
  description?: string;
  role?: string;
  avatar: string;
  systemPrompt: string;
  industry?: string;
  modelProvider: 'local' | 'openai' | 'anthropic' | 'google' | 'custom';
  modelId: string;
  isActive?: boolean;
  type?: 'general' | 'coder' | 'reviewer' | 'planner';
  temperature?: number;
  maxTokens?: number;
  parameters?: any;
  apiKey?: string;
  baseUrl?: string;
  createdAt?: number;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
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

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  apiProvider: 'openai' | 'anthropic' | 'google' | 'custom' | 'local';
  openaiKey?: string;
  anthropicKey?: string;
  googleKey?: string;
  customProtocol: 'http' | 'https';
  customBaseUrl: string;
  customModelId: string;
  customApiKey?: string;
}

export interface AgentResponse {
  agentId: string;
  content: {
    text: string;
  };
  status: 'streaming' | 'complete' | 'error';
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: {
    text: string;
  };
  timestamp: number;
  agentResponses?: AgentResponse[];
}

export interface ChatSession {
  id: string;
  workspaceId: string;
  title: string;
  messages: ChatMessage[];
  workflowId?: string;
  createdAt: number;
  updatedAt: number;
}
