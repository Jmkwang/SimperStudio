import { WorkflowNode, WorkflowEdge } from '../../types/models';

export type NodeStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'error';

export interface NodeRecord {
  status: string;
  startTime?: number;
  endTime?: number;
  durationMs?: number;
  attempts: number;
  error?: string;
}

export interface WorkflowExecutionState {
  status: ExecutionStatus;
  currentNodeId: string | null;
  results: Record<string, any>;
  nodeRecords: Record<string, NodeRecord>;
}

export interface ExecutionOptions {
  startNodeId?: string;
  concurrency?: number;
  signal?: AbortSignal;
}

export interface ExecutionContext {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  results: Record<string, any>;
  nodeRecords: Record<string, NodeRecord>;
  stepCounter: number;
}

export interface NodeExecutorResult {
  payload: any;
}

export type NodeExecutorFn = (
  node: WorkflowNode,
  payload: any,
  helpers: ExecutionHelpers
) => Promise<any>;

export interface ExecutionHelpers {
  getByPath: (obj: any, path: string) => any;
  setByPath: (obj: any, path: string, value: any) => void;
  evaluateExpression: (expression: string, payload: any, timeoutMs: number) => Promise<boolean>;
  evaluateExpressionSync: (expression: string, payload: any) => any;
  withTimeout: <T>(promise: Promise<T>, ms: number, error: string) => Promise<T>;
  sleep: (ms: number) => Promise<void>;
  validateSchema: (data: any, schemaStr: string | undefined, label: string) => string | null;
  AsyncFunction: any;
  fetchNode: (nodeId: string) => WorkflowNode | undefined;
}

export type NodeRouterFn = (
  node: WorkflowNode,
  payload: any,
  edges: WorkflowEdge[],
  results: Record<string, any>,
  helpers: ExecutionHelpers
) => Promise<{ nextFrames: Array<{ nodeId: string; payload: any }>; skipDefault: boolean }>;

export interface NodeExecutor {
  label: string;
  execute: NodeExecutorFn;
  route?: NodeRouterFn;
}
