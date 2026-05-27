export interface Agent {
  id: string;
  name: string;
  description?: string;
  role?: string;
  avatar: string;
  systemPrompt: string;
  industry?: string;
  category?: string;

  // New multi-provider routing fields
  providerId?: string;      // Reference to ModelProvider.id
  modelId?: string;         // Reference to ProviderModel.modelId

  isActive?: boolean;
  type?: 'general' | 'coder' | 'reviewer' | 'planner';
  temperature?: number;
  maxTokens?: number;
  parameters?: any;

  // Legacy fields — kept for backward compatibility, no longer used in UI
  /** @deprecated Use providerId instead */
  modelProvider?: 'local' | 'openai' | 'anthropic' | 'google' | 'siliconflow' | 'custom';
  /** @deprecated Use modelId instead */
  apiKey?: string;
  /** @deprecated Provider-level API config no longer needed */
  baseUrl?: string;

  createdAt?: number;
}

export interface AgentCategory {
  id: string;
  name: string;
  description?: string;
  createdAt?: number;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export type WorkflowNodeType = 'trigger' | 'agent' | 'dynamic-agent' | 'condition' | 'code' | 'loop' | 'output' | 'router' | 'http' | 'set' | 'switch' | 'wait' | 'merge' | 'webhook' | 'subworkflow';

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
  inputSchema?: string;
  outputSchema?: string;
}

export interface WorkflowAgentNodeData extends WorkflowNodeDataBase {
  agentId?: string;
  prompt?: string;
  autoSendToNext?: boolean;

  // Node-level overrides (local to this workflow node, do not mutate the global Agent config)
  overrideProviderId?: string;
  overrideModelId?: string;
  overrideSystemPrompt?: string;
}

/**
 * Dynamic Agent config object — can be read from payload or generated from inline templates.
 */
export interface DynamicAgentConfig {
  name?: string;
  avatar?: string;
  systemPrompt: string;
  role?: string;
  personality?: string;
  providerId?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Dynamic Agent node data — runtime-configurable agent persona.
 */
export interface WorkflowDynamicAgentNodeData extends WorkflowNodeDataBase {
  configSource: 'payload' | 'inline';

  // payload mode
  configPath?: string;

  // inline mode
  inlineConfig?: {
    nameTemplate?: string;
    systemPromptTemplate: string;
    avatarTemplate?: string;
    personalityTemplate?: string;
    roleTemplate?: string;
  };

  promptTemplate?: string;

  // model fallback chain
  fallbackAgentId?: string;
  fallbackProviderId?: string;
  fallbackModelId?: string;

  outputField?: string;
  autoSendToNext?: boolean;
  enableChatWindow?: boolean;
}

export interface WorkflowCodeNodeData extends WorkflowNodeDataBase {
  code?: string;
}

export interface WorkflowConditionNodeData extends WorkflowNodeDataBase {
  expression?: string;
  routes?: Array<{ id: string; condition: string; label?: string }>;
  branches?: Array<{ id: string; condition: string; label?: string }>;
}

export interface WorkflowLoopNodeData extends WorkflowNodeDataBase {
  itemsPath?: string;
  itemAlias?: string;
  indexAlias?: string;
  maxIterations?: number;
  breakCondition?: string;
}

export interface WorkflowOutputNodeData extends WorkflowNodeDataBase {
  outputField?: string;
}

export interface WorkflowRouterNodeData extends WorkflowNodeDataBase {
  routes?: Array<{ id: string; condition: string; label?: string }>;
}

export interface WorkflowSwitchNodeData extends WorkflowNodeDataBase {
  switchValue?: string;
  cases?: Array<{ value: string; label: string }>;
}

export interface WorkflowHttpNodeData extends WorkflowNodeDataBase {
  method?: string;
  url?: string;
  headers?: string;
  body?: string;
}

export interface WorkflowSetNodeData extends WorkflowNodeDataBase {
  mappings?: Array<{ sourcePath: string; targetPath: string }>;
  constants?: string;
  whitelist?: string;
}

export interface WorkflowWaitNodeData extends WorkflowNodeDataBase {
  waitMode?: 'fixed' | 'until';
  delayMs?: number;
  untilExpression?: string;
}

export interface WorkflowMergeNodeData extends WorkflowNodeDataBase {
  strategy?: 'append' | 'byKey' | 'object-assign';
  mergeKey?: string;
}

export interface WorkflowSubWorkflowNodeData extends WorkflowNodeDataBase {
  workflowId?: string;
  inputs?: Record<string, string>;
}

export interface WorkflowWebhookNodeData extends WorkflowNodeDataBase {
  endpoint?: string;
  httpMethod?: string;
  authType?: string;
  payloadTemplate?: string;
}

export type WorkflowNodeData =
  | WorkflowAgentNodeData
  | WorkflowDynamicAgentNodeData
  | WorkflowCodeNodeData
  | WorkflowConditionNodeData
  | WorkflowLoopNodeData
  | WorkflowOutputNodeData
  | WorkflowRouterNodeData
  | WorkflowSwitchNodeData
  | WorkflowHttpNodeData
  | WorkflowSetNodeData
  | WorkflowWaitNodeData
  | WorkflowMergeNodeData
  | WorkflowSubWorkflowNodeData
  | WorkflowWebhookNodeData
  | WorkflowNodeDataBase;

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
  nodesData: WorkflowNode[];
  edgesData: WorkflowEdge[];
  status: 'active' | 'inactive';
  createdAt: number;
  updatedAt: number;
}

export interface ProviderModel {
  id: string;
  name: string;
  modelId: string;
  isDefault?: boolean;
  group?: string;
}

export interface ModelProvider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'gemini' | 'siliconflow' | 'deepseek' | 'custom';
  apiKey: string;
  baseUrl: string;
  isEnabled: boolean;
  customHeader?: string;
  apiFormat?: 'openai-responses' | 'openai-chat' | 'anthropic-messages';
  models: ProviderModel[];
}

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  providers: ModelProvider[];
  activeProviderId: string | null;
  allowRemoteAccess: boolean;
  remoteAccessPort: number;
  fontSize?: number; // percentage, e.g. 100 = default, 115 = 115%
  // Legacy fields for backward compatibility
  apiProvider?: 'openai' | 'anthropic' | 'google' | 'gemini' | 'custom' | 'local';
  openaiKey?: string;
  openaiModelId?: string;
  anthropicKey?: string;
  anthropicModelId?: string;
  googleKey?: string;
  geminiKey?: string;
  geminiModelId?: string;
  customProtocol?: string;
  customBaseUrl?: string;
  customModelId?: string;
  customApiKey?: string;
  customHeader?: string;
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

  // Response metadata (used during streaming to backfill AgentResponse fields)
  providerId?: string;
  providerName?: string;
  modelId?: string;
  modelName?: string;
  status?: 'streaming' | 'complete' | 'error';
  errorSummary?: string;
  errorDetail?: string;
  tokenUsage?: TokenUsage;

  // Dynamic Agent metadata (populated when the node is a dynamic-agent)
  _dynamicAgentMeta?: {
    nodeId: string;
    name?: string;
    role?: string;
    personality?: string;
    avatar?: string;
    systemPrompt?: string;
    status?: 'alive' | 'dead' | string;
  };
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AgentResponse {
  agentId: string;
  nodeId?: string;

  // Actual model info used for this response (populated after successful call)
  providerId?: string;
  providerName?: string;
  modelId?: string;
  modelName?: string;
  /** @deprecated Use providerId/modelId instead */
  modelProvider?: string;

  content: {
    text: string;
    token?: number;
  };
  tokenUsage?: TokenUsage;
  status: 'streaming' | 'complete' | 'error';
  timestamp?: number;   // when streaming started
  duration?: number;    // ms elapsed from start to complete

  // Error handling — one-line summary + clickable detail
  errorSummary?: string;
  errorDetail?: string;

  // Dynamic Agent metadata (carried from message meta for UI display)
  _dynamicAgentMeta?: MessageMeta['_dynamicAgentMeta'];
}

export interface MultiModelComparison {
  models: string[];
  responses: Record<string, AgentResponse>;
  selectedResponseId?: string;
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
  multiModelComparison?: MultiModelComparison;
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

export type NodeExecutionStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped' | 'retrying';

export interface NodeExecutionRecord {
  nodeId: string;
  status: NodeExecutionStatus;
  startTime?: number;
  endTime?: number;
  durationMs?: number;
  attempts: number;
  error?: string;
  input?: unknown;
  output?: unknown;
}

export interface WorkflowExecutionRecord {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'error' | 'cancelled';
  startTime: number;
  endTime?: number;
  durationMs?: number;
  nodeRecords: Record<string, NodeExecutionRecord>;
  results: Record<string, unknown>;
}
