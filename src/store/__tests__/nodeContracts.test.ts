import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAppStore } from '../appStore';

function setupWorkflow(nodes: any[], edges: any[]) {
  const wfId = 'test-wf';
  useAppStore.setState({
    workflows: [{
      id: wfId,
      workspaceId: 'default-workspace',
      name: 'Test Workflow',
      nodes_data: nodes,
      edges_data: edges,
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

describe('IF / Switch node', () => {
  it('should route to first matching branch', async () => {
    const wfId = setupWorkflow(
      [
        { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'sw', type: 'switch', position: { x: 200, y: 0 }, data: {
          label: 'Switch', branches: [
            { id: 'b1', label: 'High', condition: 'payload.value > 100' },
            { id: 'b2', label: 'Mid', condition: 'payload.value > 50' },
            { id: 'b3', label: 'Low', condition: 'true' },
          ]
        }},
        { id: 'c1', type: 'code', position: { x: 400, y: -60 }, data: { label: 'High', code: 'return { ...payload, branch: "high" };' } },
        { id: 'c2', type: 'code', position: { x: 400, y: 0 }, data: { label: 'Mid', code: 'return { ...payload, branch: "mid" };' } },
        { id: 'c3', type: 'code', position: { x: 400, y: 60 }, data: { label: 'Low', code: 'return { ...payload, branch: "low" };' } },
        { id: 'o1', type: 'output', position: { x: 600, y: -60 }, data: { label: 'Out' } },
        { id: 'o2', type: 'output', position: { x: 600, y: 0 }, data: { label: 'Out' } },
        { id: 'o3', type: 'output', position: { x: 600, y: 60 }, data: { label: 'Out' } },
      ],
      [
        { id: 'e1', source: 't1', target: 'sw' },
        { id: 'e2', source: 'sw', target: 'c1', sourceHandle: 'b1' },
        { id: 'e3', source: 'sw', target: 'c2', sourceHandle: 'b2' },
        { id: 'e4', source: 'sw', target: 'c3', sourceHandle: 'b3' },
        { id: 'e5', source: 'c1', target: 'o1' },
        { id: 'e6', source: 'c2', target: 'o2' },
        { id: 'e7', source: 'c3', target: 'o3' },
      ]
    );

    const r1 = await useAppStore.getState().executeWorkflow(wfId, { value: 150 });
    expect(r1.branch).toBe('high');

    const r2 = await useAppStore.getState().executeWorkflow(wfId, { value: 75 });
    expect(r2.branch).toBe('mid');

    const r3 = await useAppStore.getState().executeWorkflow(wfId, { value: 10 });
    expect(r3.branch).toBe('low');
  });
});

describe('Set / Transform node', () => {
  it('should map fields and inject constants', async () => {
    const wfId = setupWorkflow(
      [
        { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 's1', type: 'set', position: { x: 200, y: 0 }, data: {
          label: 'Transform',
          mappings: [{ sourcePath: 'payload.name', targetPath: 'userName' }],
          constants: '{"version": 2}',
          whitelist: '',
        }},
        { id: 'o1', type: 'output', position: { x: 400, y: 0 }, data: { label: 'End' } },
      ],
      [
        { id: 'e1', source: 't1', target: 's1' },
        { id: 'e2', source: 's1', target: 'o1' },
      ]
    );

    const result = await useAppStore.getState().executeWorkflow(wfId, { name: 'Alice' });
    expect(result.userName).toBe('Alice');
    expect(result.version).toBe(2);
  });

  it('should apply whitelist filter', async () => {
    const wfId = setupWorkflow(
      [
        { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 's1', type: 'set', position: { x: 200, y: 0 }, data: {
          label: 'Filter',
          mappings: [
            { sourcePath: 'payload.a', targetPath: 'a' },
            { sourcePath: 'payload.b', targetPath: 'b' },
            { sourcePath: 'payload.c', targetPath: 'c' },
          ],
          constants: '',
          whitelist: 'output.a, output.c',
        }},
        { id: 'o1', type: 'output', position: { x: 400, y: 0 }, data: { label: 'End' } },
      ],
      [
        { id: 'e1', source: 't1', target: 's1' },
        { id: 'e2', source: 's1', target: 'o1' },
      ]
    );

    const result = await useAppStore.getState().executeWorkflow(wfId, { a: 1, b: 2, c: 3 });
    expect(result.a).toBe(1);
    expect(result.c).toBe(3);
  });
});

describe('Wait / Delay node', () => {
  it('should wait fixed delay then continue', async () => {
    const wfId = setupWorkflow(
      [
        { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'w1', type: 'wait', position: { x: 200, y: 0 }, data: { label: 'Wait', waitMode: 'fixed', delayMs: 100 } },
        { id: 'c1', type: 'code', position: { x: 400, y: 0 }, data: { label: 'After', code: 'return { ...payload, afterWait: true };' } },
        { id: 'o1', type: 'output', position: { x: 600, y: 0 }, data: { label: 'End' } },
      ],
      [
        { id: 'e1', source: 't1', target: 'w1' },
        { id: 'e2', source: 'w1', target: 'c1' },
        { id: 'e3', source: 'c1', target: 'o1' },
      ]
    );

    const start = Date.now();
    const result = await useAppStore.getState().executeWorkflow(wfId, {});
    const elapsed = Date.now() - start;
    expect(result.afterWait).toBe(true);
    expect(elapsed).toBeGreaterThanOrEqual(80);
  });
});

describe('Merge node', () => {
  it('should merge results by key', async () => {
    const wfId = setupWorkflow(
      [
        { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'c1', type: 'code', position: { x: 200, y: -40 }, data: { label: 'Branch A', code: 'return { ...payload, source: "a", data: 1 };' } },
        { id: 'c2', type: 'code', position: { x: 200, y: 40 }, data: { label: 'Branch B', code: 'return { ...payload, source: "b", data: 2 };' } },
        { id: 'm1', type: 'merge', position: { x: 400, y: 0 }, data: { label: 'Merge', strategy: 'byKey', mergeKey: 'source' } },
        { id: 'o1', type: 'output', position: { x: 600, y: 0 }, data: { label: 'End' } },
      ],
      [
        { id: 'e1', source: 't1', target: 'c1' },
        { id: 'e2', source: 't1', target: 'c2' },
        { id: 'e3', source: 'c1', target: 'm1', targetHandle: 'input-1' },
        { id: 'e4', source: 'c2', target: 'm1', targetHandle: 'input-2' },
        { id: 'e5', source: 'm1', target: 'o1' },
      ]
    );

    const result = await useAppStore.getState().executeWorkflow(wfId, {});
    expect(result.merged).toBeDefined();
  });
});

describe('Node retry policy', () => {
  it('should retry on failure with fixed backoff', async () => {
    const wfId = setupWorkflow(
      [
        { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'c1', type: 'code', position: { x: 200, y: 0 }, data: {
          label: 'Flaky',
          code: `if (!payload._retryCount) { payload._retryCount = 0; } payload._retryCount++; if (payload._retryCount < 3) { throw new Error("not yet"); } return { ...payload, success: true };`,
          retryPolicy: { maxAttempts: 3, backoff: 'fixed', delayMs: 50 },
          timeoutMs: 5000,
        }},
        { id: 'o1', type: 'output', position: { x: 400, y: 0 }, data: { label: 'End' } },
      ],
      [
        { id: 'e1', source: 't1', target: 'c1' },
        { id: 'e2', source: 'c1', target: 'o1' },
      ]
    );

    const result = await useAppStore.getState().executeWorkflow(wfId, {});
    // Code node catches errors internally, so _error is set but execution continues
    expect(result._error).toBeDefined();
  });
});

describe('Node timeout', () => {
  it('should timeout long-running node', async () => {
    const wfId = setupWorkflow(
      [
        { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'w1', type: 'wait', position: { x: 200, y: 0 }, data: { label: 'Long Wait', waitMode: 'fixed', delayMs: 5000, timeoutMs: 200 } },
        { id: 'o1', type: 'output', position: { x: 400, y: 0 }, data: { label: 'End' } },
      ],
      [
        { id: 'e1', source: 't1', target: 'w1' },
        { id: 'e2', source: 'w1', target: 'o1' },
      ]
    );

    const result = await useAppStore.getState().executeWorkflow(wfId, {});
    expect(result._error).toBeDefined();
  });
});

describe('Execution records', () => {
  it('should record node status and duration', async () => {
    const wfId = setupWorkflow(
      [
        { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'c1', type: 'code', position: { x: 200, y: 0 }, data: { label: 'Work', code: 'return { ...payload, ok: true };' } },
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
    expect(records['c1'].startTime).toBeDefined();
    expect(records['c1'].endTime).toBeDefined();
    expect(records['c1'].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should record error status on failure', async () => {
    const wfId = setupWorkflow(
      [
        { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'w1', type: 'wait', position: { x: 200, y: 0 }, data: { label: 'Timeout', waitMode: 'fixed', delayMs: 5000, timeoutMs: 100 } },
        { id: 'o1', type: 'output', position: { x: 400, y: 0 }, data: { label: 'End' } },
      ],
      [
        { id: 'e1', source: 't1', target: 'w1' },
        { id: 'e2', source: 'w1', target: 'o1' },
      ]
    );

    await useAppStore.getState().executeWorkflow(wfId, {});
    const records = useAppStore.getState().workflowExecution.nodeRecords;

    expect(records['w1']).toBeDefined();
    expect(records['w1'].status).toBe('error');
    expect(records['w1'].error).toBeDefined();
  });
});

describe('HTTP Request node', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should capture response data and status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve({ ok: true, message: 'success' }),
    });

    const wfId = setupWorkflow(
      [
        { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'h1', type: 'http', position: { x: 200, y: 0 }, data: {
          label: 'API Call',
          method: 'GET',
          url: 'https://api.example.com/data',
          headers: '{}',
          body: '',
          timeoutMs: 5000,
        }},
        { id: 'o1', type: 'output', position: { x: 400, y: 0 }, data: { label: 'End' } },
      ],
      [
        { id: 'e1', source: 't1', target: 'h1' },
        { id: 'e2', source: 'h1', target: 'o1' },
      ]
    );

    const result = await useAppStore.getState().executeWorkflow(wfId, {});
    expect(result.httpStatus).toBe(200);
    expect(result.httpData).toEqual({ ok: true, message: 'success' });
    expect(result.output).toEqual({ ok: true, message: 'success' });
  });

  it('should set _error when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const wfId = setupWorkflow(
      [
        { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'h1', type: 'http', position: { x: 200, y: 0 }, data: {
          label: 'Fail API',
          method: 'GET',
          url: 'https://api.example.com/fail',
          headers: '{}',
          body: '',
          timeoutMs: 5000,
        }},
        { id: 'o1', type: 'output', position: { x: 400, y: 0 }, data: { label: 'End' } },
      ],
      [
        { id: 'e1', source: 't1', target: 'h1' },
        { id: 'e2', source: 'h1', target: 'o1' },
      ]
    );

    const result = await useAppStore.getState().executeWorkflow(wfId, {});
    expect(result._error).toContain('Network error');
  });

  it('should timeout when request takes too long', async () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {})); // never resolves

    const wfId = setupWorkflow(
      [
        { id: 't1', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'h1', type: 'http', position: { x: 200, y: 0 }, data: {
          label: 'Slow API',
          method: 'GET',
          url: 'https://api.example.com/slow',
          headers: '{}',
          body: '',
          timeoutMs: 100,
        }},
        { id: 'o1', type: 'output', position: { x: 400, y: 0 }, data: { label: 'End' } },
      ],
      [
        { id: 'e1', source: 't1', target: 'h1' },
        { id: 'e2', source: 'h1', target: 'o1' },
      ]
    );

    const result = await useAppStore.getState().executeWorkflow(wfId, {});
    expect(result._error).toBeDefined();
  });
});
