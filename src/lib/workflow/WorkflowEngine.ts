import { Workflow } from '../../types/models';
import { ExecutionContext, EdgeMap, InDegreeMap } from './types';

export class WorkflowEngine {
    private executionContext: ExecutionContext = {};
    private edgeMap: EdgeMap = {};
    private inDegreeMap: InDegreeMap = {};

    constructor(private workflow: Workflow) {
        this.initializeGraph();
    }

    private initializeGraph() {
        // 1. Initialize data structures
        this.workflow.nodesData.forEach(node => {
            this.executionContext[node.id] = { output: null, status: 'pending' };
            this.edgeMap[node.id] = [];
            this.inDegreeMap[node.id] = 0;
        });

        // 2. Build adjacency list and in-degrees
        this.workflow.edgesData.forEach(edge => {
            if (this.edgeMap[edge.source]) {
                this.edgeMap[edge.source].push(edge.target);
            }
            if (this.inDegreeMap[edge.target] !== undefined) {
                this.inDegreeMap[edge.target]++;
            } else {
                this.inDegreeMap[edge.target] = 1;
            }
        });
    }

    public async execute(initialInput: string) {
        const queue: string[] = [];
        let processedCount = 0;

        // 1. Find trigger nodes (in-degree 0)
        this.workflow.nodesData.forEach(node => {
            if (this.inDegreeMap[node.id] === 0 && node.type === 'trigger') {
                queue.push(node.id);
                this.executionContext[node.id].output = initialInput; // Inject starting data
            }
        });

        // 2. Process Queue (Topological Sort execution)
        while (queue.length > 0) {
            // Support for parallel execution would process the entire queue length here
            const currentLevel = [...queue];
            queue.length = 0; // clear queue

            const executionPromises = currentLevel.map(async (nodeId) => {
                const nodeData = this.workflow.nodesData.find(n => n.id === nodeId);
                if (!nodeData) return;

                this.executionContext[nodeId].status = 'running';

                try {
                    // Gather inputs from parent nodes
                    const parentEdges = this.workflow.edgesData.filter(e => e.target === nodeId);
                    const parentOutputs = parentEdges.map(e => this.executionContext[e.source].output);

                    // Execute Node Strategy
                    const result = await this.executeNodeStrategy(nodeData, parentOutputs);

                    this.executionContext[nodeId].output = result;
                    this.executionContext[nodeId].status = 'success';
                    processedCount++;

                    // Resolve downstream dependencies
                    const targets = this.edgeMap[nodeId] || [];
                    targets.forEach(targetId => {
                        this.inDegreeMap[targetId]--;
                        if (this.inDegreeMap[targetId] === 0) {
                            queue.push(targetId);
                        }
                    });
                } catch (error) {
                    this.executionContext[nodeId].status = 'failed';
                    this.executionContext[nodeId].error = String(error);
                    throw new Error(`Node ${nodeId} failed: ${error}`);
                }
            });

            await Promise.all(executionPromises);
        }

        // 3. Cycle Detection Check
        if (processedCount < this.workflow.nodesData.length) {
            throw new Error("Workflow execution halted: Cycle detected in graph.");
        }

        return this.executionContext;
    }

    private async executeNodeStrategy(node: any, parentOutputs: any[]) {
        switch(node.type) {
            case 'trigger':
                // Trigger already has its output set during initialization
                return this.executionContext[node.id].output;
            case 'agent':
                return await this.executeAgentNode(node, parentOutputs);
            case 'output':
                return parentOutputs.join('\n'); // Simple merge for now
            default:
                console.warn(`Unknown node type: ${node.type}`);
                return null;
        }
    }

    private async executeAgentNode(node: any, parentOutputs: any[]) {
        const { agentId, prompt } = node.data || {};
        const mergedInput = parentOutputs.join('\n');

        // Replace {{input}} token with parent data
        const finalPrompt = (prompt || '').replace(/{{input}}/g, mergedInput);

        console.log(`Executing Agent ${agentId} with prompt:`, finalPrompt);

        // TODO: Integrate with actual LLM API call based on Agent configuration
        // return await callLLM(agentId, finalPrompt);

        // Mock implementation for structural testing
        return `[Agent ${agentId} processed]: ${finalPrompt}`;
    }
}
