import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../stores';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

describe('saveWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      workflows: [{
        id: 'wf-1',
        workspaceId: 'default-workspace',
        name: 'Test Workflow',
        nodesData: [],
        edgesData: [],
        status: 'active',
        createdAt: 1,
        updatedAt: 1,
      }],
    });
  });

  it('preserves dynamic-agent specific data when saving workflow nodes', async () => {
    await useAppStore.getState().saveWorkflow('wf-1', [{
      id: 'da-1',
      type: 'dynamic-agent',
      position: { x: 10, y: 20 },
      data: {
        label: 'Runtime Wolf',
        description: 'Dynamic persona',
        schema: '{"decision":"string"}',
        autoSendToNext: true,
        configSource: 'inline',
        configPath: 'payload.dynamicAgentConfig',
        inlineConfig: {
          nameTemplate: 'Wolf {{payload.name}}',
          systemPromptTemplate: 'You are {{payload.role}}.',
          avatarTemplate: '{{payload.avatar}}',
          personalityTemplate: '{{payload.personality}}',
          roleTemplate: '{{payload.role}}',
        },
        promptTemplate: 'Act on {{payload.input}}',
        fallbackAgentId: 'agent-fallback',
        fallbackProviderId: 'provider-1',
        fallbackModelId: 'model-1',
        outputField: 'decision',
        enableChatWindow: true,
        deleteNode: () => undefined,
      },
    } as any], [{ id: 'e1', source: 'da-1', target: 'out-1', sourceHandle: 'ok', targetHandle: null } as any]);

    const savedNode = useAppStore.getState().workflows[0].nodesData[0];
    expect(savedNode.data).toMatchObject({
      label: 'Runtime Wolf',
      schema: '{"decision":"string"}',
      autoSendToNext: true,
      configSource: 'inline',
      configPath: 'payload.dynamicAgentConfig',
      inlineConfig: {
        nameTemplate: 'Wolf {{payload.name}}',
        systemPromptTemplate: 'You are {{payload.role}}.',
        avatarTemplate: '{{payload.avatar}}',
        personalityTemplate: '{{payload.personality}}',
        roleTemplate: '{{payload.role}}',
      },
      promptTemplate: 'Act on {{payload.input}}',
      fallbackAgentId: 'agent-fallback',
      fallbackProviderId: 'provider-1',
      fallbackModelId: 'model-1',
      outputField: 'decision',
      enableChatWindow: true,
    });
    expect((savedNode.data as any).deleteNode).toBeUndefined();
  });

  it('preserves agent model override fields when saving workflow nodes', async () => {
    await useAppStore.getState().saveWorkflow('wf-1', [{
      id: 'agent-node-1',
      type: 'agent',
      position: { x: 0, y: 0 },
      data: {
        label: 'Planner',
        agentId: 'agent-1',
        prompt: 'Plan {{payload.input}}',
        autoSendToNext: true,
        overrideProviderId: 'provider-override',
        overrideModelId: 'model-override',
        overrideSystemPrompt: 'Override system prompt',
        deleteNode: () => undefined,
      },
    } as any], []);

    const savedNode = useAppStore.getState().workflows[0].nodesData[0];
    expect(savedNode.data).toMatchObject({
      label: 'Planner',
      agentId: 'agent-1',
      prompt: 'Plan {{payload.input}}',
      autoSendToNext: true,
      overrideProviderId: 'provider-override',
      overrideModelId: 'model-override',
      overrideSystemPrompt: 'Override system prompt',
    });
    expect((savedNode.data as any).deleteNode).toBeUndefined();
  });
});
