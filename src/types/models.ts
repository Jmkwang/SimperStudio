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

export type WorkflowNodeType = 'trigger' | 'agent' | 'condition' | 'code' | 'loop' | 'output' | 'router' | 'http' | 'set' | 'switch' | 'wait' | 'merge' | 'webhook' | 'subworkflow';

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

export interface NodeRetryPolicy {
  maxAttempts?: number;
  backoff?: 'fixed' | 'exponential';
  delayMs?: number;
}

export interface WorkflowNodeDataBase {
  label?: string;
  description?: string;
  timeoutMs?: number;
  retryPolicy?: NodeRetryPolicy;
  onError?: 'stop' | 'continue' | 'route-to-error';
}

export interface WorkflowAgentNodeData extends WorkflowNodeDataBase {
  agentId?: string;
  prompt?: string;
  autoSendToNext?: boolean;
}

export type WorkflowNodeData = WorkflowNodeDataBase &
  Partial<WorkflowAgentNodeData> &
  Record<string, unknown>;

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: WorkflowNodePosition;
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  animated?: boolean;
  label?: string;
  data?: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  workspaceId: string;
  name: string;
  nodes_data: WorkflowNode[];
  edges_data: WorkflowEdge[];
  status: 'active' | 'inactive';
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  apiProvider: 'openai' | 'anthropic' | 'google' | 'gemini' | 'custom' | 'local';
  openaiKey?: string;
  openaiModelId?: string;
  anthropicKey?: string;
  anthropicModelId?: string;
  googleKey?: string;
  geminiKey?: string;
  geminiModelId?: string;
  customProtocol: string;
  customBaseUrl: string;
  customModelId: string;
  customApiKey?: string;
  customHeader?: string;
  allowRemoteAccess: boolean;
  remoteAccessPort: number;
  customXmlTemplate?: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: 'image' | 'file';
  dataUrl?: string;
}

export interface MessageMeta {
  workflowId?: string;
  workflowNodeId?: string;
  sourceAgentId?: string;
  targetAgentId?: string;
  forwardFromMessageId?: string;
  triggeredBy?: 'user' | 'auto' | 'manual' | 'reload';
}

export interface AgentResponse {
  agentId: string;
  nodeId?: string;
  content: {
    text: string;
    token?: number;
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
    attachments?: MessageAttachment[];
  };
  timestamp: number;
  meta?: MessageMeta;
  agentResponses?: AgentResponse[];
}

export interface ChatSession {
  id: string;
  workspaceId: string;
  title: string;
  mode?: 'single' | 'workflow';
  messages: ChatMessage[];
  workflowId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowConversationWindow {
  id: string;
  sessionId: string;
  workflowId: string;
  nodeId: string;
  agentId: string;
  position: {
    x: number;
    y: number;
  };
  size?: {
    width: number;
    height: number;
  };
  zIndex: number;
  minimized?: boolean;
}

export interface AgentChatWindowData {
  id: string;
  sessionId: string;
  agentId: string;
  position: {
    x: number;
    y: number;
  };
  size?: {
    width: number;
    height: number;
  };
  zIndex: number;
  minimized?: boolean;
}
