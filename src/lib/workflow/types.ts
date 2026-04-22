export interface NodeContext {
    output: any;
    status: 'pending' | 'running' | 'success' | 'failed';
    error?: string;
}

export interface ExecutionContext {
    [nodeId: string]: NodeContext;
}

export type EdgeMap = Record<string, string[]>; // sourceId -> targetId[]
export type InDegreeMap = Record<string, number>; // nodeId -> inDegree count
