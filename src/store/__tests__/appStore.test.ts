import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../stores';

beforeEach(() => {
  useAppStore.setState({
    sessions: [
      {
        id: 'test-session',
        workspaceId: 'default-workspace',
        title: 'Test Session',
        mode: 'single',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    activeSessionId: 'test-session',
  });
});

describe('addAgentResponseStream', () => {
  it('should create assistant message on first chunk', () => {
    const { addAgentResponseStream } = useAppStore.getState();
    addAgentResponseStream('test-session', 'msg-1', 'agent-1', 'Hello');

    const updated = useAppStore.getState().sessions.find(s => s.id === 'test-session')!;
    expect(updated.messages).toHaveLength(1);
    expect(updated.messages[0].role).toBe('assistant');
    expect(updated.messages[0].agentResponses).toHaveLength(1);
    expect(updated.messages[0].agentResponses![0].content.text).toBe('Hello');
    expect(updated.messages[0].agentResponses![0].status).toBe('streaming');
  });

  it('should append chunks without duplicating', async () => {
    const { addAgentResponseStream } = useAppStore.getState();
    addAgentResponseStream('test-session', 'msg-1', 'agent-1', 'Hello');
    addAgentResponseStream('test-session', 'msg-1', 'agent-1', ' World');
    await new Promise(r => setTimeout(r, 100));

    const updated = useAppStore.getState().sessions.find(s => s.id === 'test-session')!;
    expect(updated.messages).toHaveLength(1);
    expect(updated.messages[0].agentResponses![0].content.text).toBe('Hello World');
  });

  it('should aggregate multiple agents on same message', () => {
    const { addAgentResponseStream } = useAppStore.getState();
    addAgentResponseStream('test-session', 'msg-1', 'agent-1', 'Agent 1 reply');
    addAgentResponseStream('test-session', 'msg-1', 'agent-2', 'Agent 2 reply');

    const updated = useAppStore.getState().sessions.find(s => s.id === 'test-session')!;
    expect(updated.messages).toHaveLength(1);
    expect(updated.messages[0].agentResponses).toHaveLength(2);
    expect(updated.messages[0].agentResponses![0].agentId).toBe('agent-1');
    expect(updated.messages[0].agentResponses![1].agentId).toBe('agent-2');
  });
});

describe('completeAgentResponse', () => {
  it('should mark agent response as complete', () => {
    const { addAgentResponseStream, completeAgentResponse } = useAppStore.getState();
    addAgentResponseStream('test-session', 'msg-1', 'agent-1', 'Hello');
    completeAgentResponse('test-session', 'msg-1', 'agent-1');

    const updated = useAppStore.getState().sessions.find(s => s.id === 'test-session')!;
    expect(updated.messages[0].agentResponses![0].status).toBe('complete');
  });

  it('should not affect other agents when one completes', () => {
    const { addAgentResponseStream, completeAgentResponse } = useAppStore.getState();
    addAgentResponseStream('test-session', 'msg-1', 'agent-1', 'A1');
    addAgentResponseStream('test-session', 'msg-1', 'agent-2', 'A2');
    completeAgentResponse('test-session', 'msg-1', 'agent-1');

    const updated = useAppStore.getState().sessions.find(s => s.id === 'test-session')!;
    expect(updated.messages[0].agentResponses![0].status).toBe('complete');
    expect(updated.messages[0].agentResponses![1].status).toBe('streaming');
  });
});
