import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../../stores';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/agentProviderRouter', () => ({
  resolveAgentModelConfig: vi.fn(() => ({
    provider: { id: 'provider-1', name: 'Provider 1', isEnabled: true },
    model: { id: 'model-1', modelId: 'model-1', name: 'Model 1' },
  })),
  shortError: vi.fn((msg: string) => msg),
}));

vi.mock('@/lib/api', () => ({
  fetchFromResolvedConfig: vi.fn().mockImplementation(() => ({
    textStream: (async function* () {
      yield 'Dynamic reply';
    })(),
    reasoningTextStream: undefined,
    usage: Promise.resolve({ inputTokens: 1, outputTokens: 2 }),
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useAppStore.setState({
    sessions: [],
    workflows: [],
    agents: [],
    settings: {
      providers: [{
        id: 'provider-1',
        name: 'Provider 1',
        type: 'openai',
        apiKey: 'test-key',
        isEnabled: true,
        models: [{ id: 'model-1', modelId: 'model-1', name: 'Model 1', isDefault: true }],
      }],
      activeProviderId: 'provider-1',
    } as any,
    workflowChatUI: {
      sidebarCollapsedBySession: {},
      multiAgentModeBySession: {},
      windows: [],
      agentChatWindows: [],
      activeWindowId: null,
      zIndexCounter: 0,
    },
  });
});

describe('openWorkflowAgentWindow', () => {
  it('should create a new window', () => {
    useAppStore.getState().openWorkflowAgentWindow('sess-1', 'wf-1', 'node-1', 'agent-1');

    const { windows, activeWindowId } = useAppStore.getState().workflowChatUI;
    expect(windows).toHaveLength(1);
    expect(windows[0].sessionId).toBe('sess-1');
    expect(windows[0].workflowId).toBe('wf-1');
    expect(windows[0].nodeId).toBe('node-1');
    expect(windows[0].agentId).toBe('agent-1');
    expect(windows[0].minimized).toBe(false);
    expect(activeWindowId).toBe(windows[0].id);
  });

  it('should focus existing window instead of creating duplicate', () => {
    useAppStore.getState().openWorkflowAgentWindow('sess-1', 'wf-1', 'node-1', 'agent-1');
    const firstWindow = useAppStore.getState().workflowChatUI.windows[0];

    useAppStore.getState().openWorkflowAgentWindow('sess-1', 'wf-1', 'node-1', 'agent-1');

    const { windows } = useAppStore.getState().workflowChatUI;
    expect(windows).toHaveLength(1);
    expect(windows[0].id).toBe(firstWindow.id);
    expect(windows[0].zIndex).toBeGreaterThan(firstWindow.zIndex);
  });

  it('should create multiple windows for different nodes', () => {
    useAppStore.getState().openWorkflowAgentWindow('sess-1', 'wf-1', 'node-1', 'agent-1');
    useAppStore.getState().openWorkflowAgentWindow('sess-1', 'wf-1', 'node-2', 'agent-2');

    const { windows } = useAppStore.getState().workflowChatUI;
    expect(windows).toHaveLength(2);
    expect(windows[0].nodeId).toBe('node-1');
    expect(windows[1].nodeId).toBe('node-2');
  });

  it('should un-minimize existing window on re-open', () => {
    useAppStore.getState().openWorkflowAgentWindow('sess-1', 'wf-1', 'node-1', 'agent-1');
    const windowId = useAppStore.getState().workflowChatUI.windows[0].id;

    useAppStore.getState().toggleWorkflowAgentWindowMinimized(windowId);
    expect(useAppStore.getState().workflowChatUI.windows[0].minimized).toBe(true);

    useAppStore.getState().openWorkflowAgentWindow('sess-1', 'wf-1', 'node-1', 'agent-1');
    expect(useAppStore.getState().workflowChatUI.windows[0].minimized).toBe(false);
  });
});

describe('focusWorkflowAgentWindow', () => {
  it('should update zIndex and activeWindowId', () => {
    useAppStore.getState().openWorkflowAgentWindow('sess-1', 'wf-1', 'node-1', 'agent-1');
    useAppStore.getState().openWorkflowAgentWindow('sess-1', 'wf-1', 'node-2', 'agent-2');

    const window1Id = useAppStore.getState().workflowChatUI.windows[0].id;
    const zIndexBefore = useAppStore.getState().workflowChatUI.windows[0].zIndex;

    useAppStore.getState().focusWorkflowAgentWindow(window1Id);

    const { windows, activeWindowId } = useAppStore.getState().workflowChatUI;
    expect(activeWindowId).toBe(window1Id);
    expect(windows[0].zIndex).toBeGreaterThan(zIndexBefore);
  });
});

describe('closeWorkflowAgentWindow', () => {
  it('should remove window from list', () => {
    useAppStore.getState().openWorkflowAgentWindow('sess-1', 'wf-1', 'node-1', 'agent-1');
    const windowId = useAppStore.getState().workflowChatUI.windows[0].id;

    useAppStore.getState().closeWorkflowAgentWindow(windowId);

    expect(useAppStore.getState().workflowChatUI.windows).toHaveLength(0);
  });

  it('should clear activeWindowId when closing active window', () => {
    useAppStore.getState().openWorkflowAgentWindow('sess-1', 'wf-1', 'node-1', 'agent-1');
    const windowId = useAppStore.getState().workflowChatUI.windows[0].id;

    useAppStore.getState().closeWorkflowAgentWindow(windowId);

    expect(useAppStore.getState().workflowChatUI.activeWindowId).toBeNull();
  });

  it('should keep activeWindowId when closing non-active window', () => {
    useAppStore.getState().openWorkflowAgentWindow('sess-1', 'wf-1', 'node-1', 'agent-1');
    useAppStore.getState().openWorkflowAgentWindow('sess-1', 'wf-1', 'node-2', 'agent-2');

    const window1Id = useAppStore.getState().workflowChatUI.windows[0].id;
    const window2Id = useAppStore.getState().workflowChatUI.windows[1].id;

    expect(useAppStore.getState().workflowChatUI.activeWindowId).toBe(window2Id);

    useAppStore.getState().closeWorkflowAgentWindow(window1Id);

    expect(useAppStore.getState().workflowChatUI.activeWindowId).toBe(window2Id);
    expect(useAppStore.getState().workflowChatUI.windows).toHaveLength(1);
  });
});

describe('toggleWorkflowAgentWindowMinimized', () => {
  it('should toggle minimized state', () => {
    useAppStore.getState().openWorkflowAgentWindow('sess-1', 'wf-1', 'node-1', 'agent-1');
    const windowId = useAppStore.getState().workflowChatUI.windows[0].id;

    expect(useAppStore.getState().workflowChatUI.windows[0].minimized).toBe(false);

    useAppStore.getState().toggleWorkflowAgentWindowMinimized(windowId);
    expect(useAppStore.getState().workflowChatUI.windows[0].minimized).toBe(true);

    useAppStore.getState().toggleWorkflowAgentWindowMinimized(windowId);
    expect(useAppStore.getState().workflowChatUI.windows[0].minimized).toBe(false);
  });
});

describe('forwardAgentReplyToNext', () => {
  it('should forward reply to next agent node in workflow', async () => {
    useAppStore.setState({
      agents: [
        { id: 'agent-1', name: 'Agent 1', avatar: '', systemPrompt: '', providerId: 'provider-1', modelId: 'model-1' } as any,
        { id: 'agent-2', name: 'Agent 2', avatar: '', systemPrompt: '', providerId: 'provider-1', modelId: 'model-1' } as any,
      ],
      workflows: [{
        id: 'wf-1',
        workspaceId: 'default-workspace',
        name: 'Test WF',
        nodesData: [
          { id: 'n1', type: 'agent', position: { x: 0, y: 0 }, data: { label: 'A1', agentId: 'agent-1' } },
          { id: 'n2', type: 'agent', position: { x: 200, y: 0 }, data: { label: 'A2', agentId: 'agent-2' } },
        ],
        edgesData: [
          { id: 'e1', source: 'n1', target: 'n2' },
        ],
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }],
      sessions: [{
        id: 'sess-1',
        workspaceId: 'default-workspace',
        mode: 'workflow' as const,
        workflowId: 'wf-1',
        title: 'WF Session',
        messages: [{
          id: 'msg-1',
          sessionId: 'sess-1',
          role: 'assistant' as const,
          content: { text: '' },
          agentResponses: [
            { agentId: 'agent-1', nodeId: 'n1', content: { text: 'Hello from A1' }, status: 'complete' as const, timestamp: Date.now() },
          ],
          timestamp: Date.now(),
        }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }],
    });

    await useAppStore.getState().forwardAgentReplyToNext('sess-1', 'n1', 'msg-1', 'agent-1');

    const session = useAppStore.getState().sessions.find((s) => s.id === 'sess-1')!;
    expect(session.messages.some((m) =>
      m.agentResponses?.some((r) => r.nodeId === 'n2' && r.agentId === 'agent-2')
    )).toBe(true);
  });

  it('should forward an agent reply to the next dynamic-agent node', async () => {
    useAppStore.setState({
      agents: [
        { id: 'agent-1', name: 'Agent 1', avatar: '', systemPrompt: '', providerId: 'provider-1', modelId: 'model-1' } as any,
        { id: 'fallback-agent', name: 'Fallback', avatar: '🐺', systemPrompt: 'fallback only', providerId: 'provider-1', modelId: 'model-1' } as any,
      ],
      workflows: [{
        id: 'wf-1',
        workspaceId: 'default-workspace',
        name: 'Test WF',
        nodesData: [
          { id: 'n1', type: 'agent', position: { x: 0, y: 0 }, data: { label: 'A1', agentId: 'agent-1' } },
          { id: 'da2', type: 'dynamic-agent', position: { x: 200, y: 0 }, data: {
            label: 'Dynamic A2',
            configSource: 'inline',
            inlineConfig: {
              nameTemplate: 'Dynamic {{payload.prompt}}',
              systemPromptTemplate: 'Handle {{payload.prompt}}',
              roleTemplate: 'receiver',
            },
            fallbackAgentId: 'fallback-agent',
          } },
        ],
        edgesData: [{ id: 'e1', source: 'n1', target: 'da2' }],
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }],
      sessions: [{
        id: 'sess-1',
        workspaceId: 'default-workspace',
        mode: 'workflow' as const,
        workflowId: 'wf-1',
        title: 'WF Session',
        messages: [{
          id: 'msg-1',
          sessionId: 'sess-1',
          role: 'assistant' as const,
          content: { text: '' },
          agentResponses: [{ agentId: 'agent-1', nodeId: 'n1', content: { text: 'Hello from A1' }, status: 'complete' as const, timestamp: Date.now() }],
          timestamp: Date.now(),
        }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }],
    });

    await useAppStore.getState().forwardAgentReplyToNext('sess-1', 'n1', 'msg-1', 'agent-1');

    const session = useAppStore.getState().sessions.find((s) => s.id === 'sess-1')!;
    const forwarded = session.messages.find((m) =>
      m.agentResponses?.some((r) => r.nodeId === 'da2' && r.agentId === 'dynamic-da2')
    );
    expect(forwarded).toBeTruthy();
    const response = forwarded!.agentResponses!.find((r) => r.nodeId === 'da2')!;
    expect(response.content.text).toContain('Dynamic reply');
    expect((response as any)._dynamicAgentMeta).toMatchObject({
      nodeId: 'da2',
      name: 'Dynamic Hello from A1',
      role: 'receiver',
      avatar: '🐺',
      systemPrompt: 'Handle Hello from A1',
    });
  });

  it('should forward a dynamic-agent reply to the next agent node', async () => {
    useAppStore.setState({
      agents: [
        { id: 'agent-2', name: 'Agent 2', avatar: '', systemPrompt: '', providerId: 'provider-1', modelId: 'model-1' } as any,
      ],
      workflows: [{
        id: 'wf-1',
        workspaceId: 'default-workspace',
        name: 'Test WF',
        nodesData: [
          { id: 'da1', type: 'dynamic-agent', position: { x: 0, y: 0 }, data: { label: 'DA1', configSource: 'inline', inlineConfig: { systemPromptTemplate: 'Dynamic' } } },
          { id: 'n2', type: 'agent', position: { x: 200, y: 0 }, data: { label: 'A2', agentId: 'agent-2' } },
        ],
        edgesData: [{ id: 'e1', source: 'da1', target: 'n2' }],
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }],
      sessions: [{
        id: 'sess-1',
        workspaceId: 'default-workspace',
        mode: 'workflow' as const,
        workflowId: 'wf-1',
        title: 'WF Session',
        messages: [{
          id: 'msg-1',
          sessionId: 'sess-1',
          role: 'assistant' as const,
          content: { text: '' },
          agentResponses: [{ agentId: 'dynamic-da1', nodeId: 'da1', content: { text: 'Dynamic says go' }, status: 'complete' as const, timestamp: Date.now() }],
          timestamp: Date.now(),
        }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }],
    });

    await useAppStore.getState().forwardAgentReplyToNext('sess-1', 'da1', 'msg-1', 'dynamic-da1');

    const session = useAppStore.getState().sessions.find((s) => s.id === 'sess-1')!;
    expect(session.messages.some((m) =>
      m.agentResponses?.some((r) => r.nodeId === 'n2' && r.agentId === 'agent-2')
    )).toBe(true);
  });

  it('should rerun a dynamic-agent reply and forward it to the next node', async () => {
    useAppStore.setState({
      agents: [
        { id: 'fallback-agent', name: 'Fallback', avatar: '', systemPrompt: 'fallback', providerId: 'provider-1', modelId: 'model-1' } as any,
        { id: 'agent-2', name: 'Agent 2', avatar: '', systemPrompt: '', providerId: 'provider-1', modelId: 'model-1' } as any,
      ],
      workflows: [{
        id: 'wf-1',
        workspaceId: 'default-workspace',
        name: 'Test WF',
        nodesData: [
          { id: 'da1', type: 'dynamic-agent', position: { x: 0, y: 0 }, data: {
            label: 'DA1',
            configSource: 'inline',
            inlineConfig: { nameTemplate: 'DA', systemPromptTemplate: 'Dynamic {{payload.prompt}}' },
            fallbackAgentId: 'fallback-agent',
          } },
          { id: 'n2', type: 'agent', position: { x: 200, y: 0 }, data: { label: 'A2', agentId: 'agent-2' } },
        ],
        edgesData: [{ id: 'e1', source: 'da1', target: 'n2' }],
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }],
      sessions: [{
        id: 'sess-1',
        workspaceId: 'default-workspace',
        mode: 'workflow' as const,
        workflowId: 'wf-1',
        title: 'WF Session',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }],
    });

    await useAppStore.getState().rerunAndForwardAgentReply('sess-1', 'da1', 'Initial prompt');

    const session = useAppStore.getState().sessions.find((s) => s.id === 'sess-1')!;
    expect(session.messages.some((m) =>
      m.agentResponses?.some((r) => r.nodeId === 'da1' && r.agentId === 'dynamic-da1')
    )).toBe(true);
    expect(session.messages.some((m) =>
      m.agentResponses?.some((r) => r.nodeId === 'n2' && r.agentId === 'agent-2')
    )).toBe(true);
  });

  it('should do nothing when no next agent node exists', async () => {
    useAppStore.setState({
      agents: [
        { id: 'agent-1', name: 'Agent 1', avatar: '', systemPrompt: '', providerId: 'provider-1', modelId: 'model-1' } as any,
      ],
      workflows: [{
        id: 'wf-1',
        workspaceId: 'default-workspace',
        name: 'Test WF',
        nodesData: [
          { id: 'n1', type: 'agent', position: { x: 0, y: 0 }, data: { label: 'A1', agentId: 'agent-1' } },
          { id: 'n2', type: 'output', position: { x: 200, y: 0 }, data: { label: 'End' } },
        ],
        edgesData: [
          { id: 'e1', source: 'n1', target: 'n2' },
        ],
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }],
      sessions: [{
        id: 'sess-1',
        workspaceId: 'default-workspace',
        mode: 'workflow' as const,
        workflowId: 'wf-1',
        title: 'WF Session',
        messages: [{
          id: 'msg-1',
          sessionId: 'sess-1',
          role: 'assistant' as const,
          content: { text: '' },
          agentResponses: [
            { agentId: 'agent-1', nodeId: 'n1', content: { text: 'Hello' }, status: 'complete' as const, timestamp: Date.now() },
          ],
          timestamp: Date.now(),
        }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }],
    });

    await useAppStore.getState().forwardAgentReplyToNext('sess-1', 'n1', 'msg-1', 'agent-1');
  });
});
