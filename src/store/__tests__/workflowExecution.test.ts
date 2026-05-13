import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../stores';

function setupWorkflow(nodes: any[], edges: any[]) {
  const wfId = 'test-wf';
  useAppStore.setState({
    workflows: [{
      id: wfId,
      workspaceId: 'default-workspace',
      name: 'Test Workflow',
      nodesData: nodes,
      edgesData: edges,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }],
  });
  return wfId;
}

beforeEach(() => {
  useAppStore.setState({ workflows: [], workflowExecution: { status: 'idle', currentNodeId: null, results: {}, nodeRecords: {} } });
});

describe('executeWorkflow - basic', () => {
  it('should execute trigger -> code -> output linear flow', async () => {
    const wfId = setupWorkflow(
      [
        { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'c1', type: 'code', position: { x: 200, y: 0 }, data: { label: 'Transform', code: 'return { ...payload, value: payload.value * 2 };' } },
        { id: 'o1', type: 'output', position: { x: 400, y: 0 }, data: { label: 'End' } },
      ],
      [
        { id: 'e1', source: 't1', target: 'c1' },
        { id: 'e2', source: 'c1', target: 'o1' },
      ]
    );

    const result = await useAppStore.getState().executeWorkflow(wfId, { value: 5 });
    expect(result.value).toBe(10);
  });

  it('should handle condition branching', async () => {
    const wfId = setupWorkflow(
      [
        { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'r1', type: 'condition', position: { x: 200, y: 0 }, data: { label: 'Check', routes: [
          { id: 'high', condition: 'payload.value > 10' },
          { id: 'low', condition: 'true' },
        ] } },
        { id: 'c1', type: 'code', position: { x: 400, y: -50 }, data: { label: 'High', code: 'return { ...payload, result: "high" };' } },
        { id: 'c2', type: 'code', position: { x: 400, y: 50 }, data: { label: 'Low', code: 'return { ...payload, result: "low" };' } },
        { id: 'o1', type: 'output', position: { x: 600, y: -50 }, data: { label: 'Out High' } },
        { id: 'o2', type: 'output', position: { x: 600, y: 50 }, data: { label: 'Out Low' } },
      ],
      [
        { id: 'e1', source: 't1', target: 'r1' },
        { id: 'e2', source: 'r1', target: 'c1', sourceHandle: 'high' },
        { id: 'e3', source: 'r1', target: 'c2', sourceHandle: 'low' },
        { id: 'e4', source: 'c1', target: 'o1' },
        { id: 'e5', source: 'c2', target: 'o2' },
      ]
    );

    const result = await useAppStore.getState().executeWorkflow(wfId, { value: 15 });
    expect(result.result).toBe('high');

    const result2 = await useAppStore.getState().executeWorkflow(wfId, { value: 5 });
    expect(result2.result).toBe('low');
  });
});

describe('executeWorkflow - error handling', () => {
  it('should propagate error in payload when code throws', async () => {
    const wfId = setupWorkflow(
      [
        { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'c1', type: 'code', position: { x: 200, y: 0 }, data: { label: 'Fail', code: 'throw new Error("boom");' } },
        { id: 'o1', type: 'output', position: { x: 400, y: 0 }, data: { label: 'End' } },
      ],
      [
        { id: 'e1', source: 't1', target: 'c1' },
        { id: 'e2', source: 'c1', target: 'o1' },
      ]
    );

    const result = await useAppStore.getState().executeWorkflow(wfId, {});
    expect(result._error).toContain('boom');
  });

  it('should continue when onError=continue', async () => {
    const wfId = setupWorkflow(
      [
        { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'c1', type: 'code', position: { x: 200, y: 0 }, data: { label: 'Fail', code: 'throw new Error("boom");', onError: 'continue' } },
        { id: 'c2', type: 'code', position: { x: 400, y: 0 }, data: { label: 'Recover', code: 'return { ...payload, recovered: true };' } },
        { id: 'o1', type: 'output', position: { x: 600, y: 0 }, data: { label: 'End' } },
      ],
      [
        { id: 'e1', source: 't1', target: 'c1' },
        { id: 'e2', source: 'c1', target: 'c2' },
        { id: 'e3', source: 'c2', target: 'o1' },
      ]
    );

    const result = await useAppStore.getState().executeWorkflow(wfId, {});
    expect(result.recovered).toBe(true);
  });
});

describe('executeWorkflow - resume from node', () => {
  it('should resume from a specific node', async () => {
    const wfId = setupWorkflow(
      [
        { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'c1', type: 'code', position: { x: 200, y: 0 }, data: { label: 'Skip', code: 'return { ...payload, skipped: true };' } },
        { id: 'c2', type: 'code', position: { x: 400, y: 0 }, data: { label: 'Resume', code: 'return { ...payload, resumed: true };' } },
        { id: 'o1', type: 'output', position: { x: 600, y: 0 }, data: { label: 'End' } },
      ],
      [
        { id: 'e1', source: 't1', target: 'c1' },
        { id: 'e2', source: 'c1', target: 'c2' },
        { id: 'e3', source: 'c2', target: 'o1' },
      ]
    );

    const result = await useAppStore.getState().executeWorkflow(wfId, { value: 42 }, { startNodeId: 'c2' });
    expect(result.resumed).toBe(true);
    expect(result.value).toBe(42);
    expect(result.skipped).toBeUndefined();
  });
});

describe('executeWorkflow - node records', () => {
  it('should track node execution records', async () => {
    const wfId = setupWorkflow(
      [
        { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'c1', type: 'code', position: { x: 200, y: 0 }, data: { label: 'Work', code: 'return { ...payload, done: true };' } },
        { id: 'o1', type: 'output', position: { x: 400, y: 0 }, data: { label: 'End' } },
      ],
      [
        { id: 'e1', source: 't1', target: 'c1' },
        { id: 'e2', source: 'c1', target: 'o1' },
      ]
    );

    await useAppStore.getState().executeWorkflow(wfId, {});
    const records = useAppStore.getState().workflowExecution.nodeRecords;
    expect(records['c1']).toBeDefined();
    expect(records['c1'].status).toBe('success');
    expect(records['c1'].durationMs).toBeGreaterThanOrEqual(0);
  });
});
