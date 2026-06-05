/**
 * An AI agent persona with LLM configuration.
 * Agents can be used in chat sessions and as workflow node targets.
 * Fields like `modelProvider`, `apiKey`, and `baseUrl` are deprecated
 * and only kept for legacy data migration — use `providerId` / `modelId` instead.
 */
export interface Agent {
  id: string;
  /** Display name shown in the UI. */
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

  // Kept for legacy data migration (baseSlice.ts migration logic still reads these)
  /** @deprecated Use providerId instead — only used in migration */
  modelProvider?: 'local' | 'openai' | 'anthropic' | 'google' | 'siliconflow' | 'custom';
  /** @deprecated Use modelId instead — only used in migration */
  apiKey?: string;
  /** @deprecated Provider-level API config no longer needed — only used in migration */
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

export type WorkflowNodeType = 'trigger' | 'agent' | 'dynamic-agent' | 'condition' | 'code' | 'loop' | 'output' | 'router' | 'http' | 'set' | 'switch' | 'wait' | 'merge' | 'webhook' | 'subworkflow' | 'cli-agent';

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
  schema?: string;
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

export interface CliToolPreset {
  id: string;
  name: string;
  executable: string;
  defaultArgs: string[];
  description: string;
}

export interface WorkflowCliAgentNodeData extends WorkflowNodeDataBase {
  mode: 'preset' | 'custom';
  presetId?: string;
  executable?: string;
  args?: string;
  workingDir?: string;
  inputMode: 'payload' | 'prompt-template' | 'none';
  promptTemplate?: string;
  inputField?: string;
  outputField?: string;
  parseJson?: boolean;
  envVars?: string;
  requireConfirmation?: boolean;
  streamToChat?: boolean;
  captureStderr?: boolean;
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
  | WorkflowCliAgentNodeData
  | WorkflowNodeDataBase;

/**
 * A single node in a workflow graph.
 * Each node has a type that maps to an executor in the node registry,
 * a canvas position, and type-specific configuration in `data`.
 */
export interface WorkflowNode {
  id: string;
  /** Node type — determines which executor handles this node. */
  type: WorkflowNodeType;
  /** (x, y) position on the React Flow canvas. */
  position: WorkflowNodePosition;
  /** Type-specific configuration (agent prompt, code, condition routes, etc.). */
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

/**
 * A visual automation pipeline composed of nodes and edges.
 * Persisted as JSON; executed by the workflow engine in `src/lib/workflow/engine.ts`.
 */
export interface Workflow {
  id: string;
  /** The workspace this workflow belongs to. */
  workspaceId: string;
  /** Display name shown in the sidebar and canvas header. */
  name: string;
  /** All nodes in the workflow graph. */
  nodesData: WorkflowNode[];
  /** All edges (connections) between nodes. */
  edgesData: WorkflowEdge[];
  /** `active` workflows can be triggered; `inactive` ones are draft/disabled. */
  status: 'active' | 'inactive';
  /** Optional default payload used when running the workflow manually from the UI. */
  testPayload?: Record<string, any>;
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
  avatar?: string; // URL or emoji for provider icon
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
  executionFeedback?: boolean; // screen shake + toast on workflow complete
  workflowNotifications?: boolean; // browser Notification on workflow complete
  webhookUrl?: string; // optional webhook URL for workflow completion
  autoTitle?: {
    enabled: boolean;
    providerId?: string; // null/undefined = use active provider
    modelId?: string;
  };
  cliTools?: {
    defaultWorkingDir?: string;
    allowedExecutables?: string[];
    presets?: CliToolPreset[];
    confirmByDefault?: boolean;
    defaultTimeoutMs?: number;
  };
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

/**
 * Optional metadata attached to a {@link ChatMessage}.
 * Tracks workflow context, agent routing, streaming status,
 * and dynamic agent configuration.
 */
export interface MessageMeta {
  /** Workflow that produced this message (if any). */
  workflowId?: string;
  /** The specific workflow node that produced this message. */
  workflowNodeId?: string;
  /** Agent that generated the response. */
  sourceAgentId?: string;
  /** Agent that should receive a forwarded message. */
  targetAgentId?: string;
  /** ID of the original message when forwarding. */
  forwardFromMessageId?: string;
  /** How this message was initiated. */
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
    thinking?: string;
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

/**
 * A single message in a chat session.
 * Supports user, assistant, and system roles.
 * Assistant messages may carry multiple `agentResponses` for streaming
 * and `multiModelComparison` for side-by-side model outputs.
 */
export interface ChatMessage {
  id: string;
  /** The owning chat session. */
  sessionId: string;
  /** Message sender role. */
  role: 'user' | 'assistant' | 'system';
  /** Message body — `text` is the primary content; `attachments` hold inline images/files. */
  content: {
    text: string;
    attachments?: MessageAttachment[];
  };
  /** Unix epoch milliseconds when the message was created. */
  timestamp: number;
  /** Optional metadata: workflow context, model info, streaming status, dynamic agent info. */
  meta?: MessageMeta;
  /** Per-agent LLM responses (used in multi-agent or workflow chat). */
  agentResponses?: AgentResponse[];
  /** Side-by-side model comparison data. */
  multiModelComparison?: MultiModelComparison;
}

/**
 * A conversation thread containing one or more messages.
 * In `single` mode the user chats with one agent; in `workflow` mode
 * the session is tied to a running workflow and its agent nodes.
 */
export interface ChatSession {
  id: string;
  /** The workspace this session belongs to. */
  workspaceId: string;
  /** Display title (auto-generated or user-set). */
  title: string;
  /** `single` = direct agent chat; `workflow` = tied to a workflow execution. */
  mode?: 'single' | 'workflow';
  /** Ordered list of messages in this session. */
  messages: ChatMessage[];
  /** Reference to a Workflow when `mode === 'workflow'`. */
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
