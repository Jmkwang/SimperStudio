import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dynamicAgentExecute } from '../dynamicAgentExecutor';
import { WorkflowNode } from '@/types/models';
import { getByPath, replaceTemplateVars } from '@/lib/workflow/helpers';

// Mock external dependencies
vi.mock('@/lib/agentProviderRouter', () => ({
  resolveAgentModelConfig: vi.fn(() => ({
    provider: { id: 'test-provider', name: 'Test' },
    model: { modelId: 'test-model' },
  })),
  shortError: vi.fn((msg: string) => msg),
}));

vi.mock('@/lib/api', () => ({
  fetchFromResolvedConfig: vi.fn(),
}));

import { resolveAgentModelConfig } from '@/lib/agentProviderRouter';
import { fetchFromResolvedConfig } from '@/lib/api';

function createHelpers(overrides: any = {}) {
  return {
    getByPath,
    setByPath: vi.fn(),
    evaluateExpression: vi.fn(),
    evaluateExpressionSync: vi.fn(),
    withTimeout: vi.fn((p: Promise<any>) => p),
    sleep: vi.fn(),
    validateSchema: vi.fn(() => null),
    replaceTemplateVars,
    fetchNode: vi.fn(),
    getGlobalState: vi.fn((key: string) => {
      if (key === 'settings') return { providers: [], activeProviderId: null };
      if (key === 'agents') return overrides.agents || [];
      return undefined;
    }),
  };
}

function mockStream(chunks: string[]) {
  return {
    textStream: (async function* () {
      for (const chunk of chunks) yield chunk;
    })(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('dynamicAgentExecute', () => {
  it('should execute with payload mode config', async () => {
    (fetchFromResolvedConfig as any).mockResolvedValue(mockStream(['Hello']));

    const node: WorkflowNode = {
      id: 'da1',
      type: 'dynamic-agent',
      position: { x: 0, y: 0 },
      data: {
        configSource: 'payload',
        configPath: 'payload.agentConfig',
      },
    };

    const payload = {
      agentConfig: {
        name: 'TestBot',
        systemPrompt: 'You are a test bot.',
        role: 'tester',
      },
    };

    const helpers = createHelpers();
    const result = await dynamicAgentExecute(node, payload, helpers as any);

    expect(result.llmResult).toBe('Hello');
    expect(result._dynamicAgentMeta).toEqual({
      nodeId: 'da1',
      name: 'TestBot',
      role: 'tester',
      personality: undefined,
      avatar: undefined,
      systemPrompt: 'You are a test bot.',
    });
    expect(fetchFromResolvedConfig).toHaveBeenCalled();
  });

  it('should execute with inline mode config and template replacement', async () => {
    (fetchFromResolvedConfig as any).mockResolvedValue(mockStream(['Result']));

    const node: WorkflowNode = {
      id: 'da2',
      type: 'dynamic-agent',
      position: { x: 0, y: 0 },
      data: {
        configSource: 'inline',
        inlineConfig: {
          nameTemplate: 'Bot {{payload.index}}',
          systemPromptTemplate: 'You are {{payload.roleName}}.',
          personalityTemplate: '{{payload.personality}}',
        },
      },
    };

    const payload = {
      index: 3,
      roleName: 'Werewolf',
      personality: 'aggressive',
    };

    const helpers = createHelpers();
    const result = await dynamicAgentExecute(node, payload, helpers as any);

    expect(result.llmResult).toBe('Result');
    expect(result._dynamicAgentMeta.name).toBe('Bot 3');
    expect(result._dynamicAgentMeta.role).toBeUndefined();
    expect(result._dynamicAgentMeta.personality).toBe('aggressive');
    expect(result._dynamicAgentMeta.systemPrompt).toBe('You are Werewolf.');

    // Verify the virtual agent passed to resolveAgentModelConfig
    const virtualAgent = (resolveAgentModelConfig as any).mock.calls[0][0];
    expect(virtualAgent.name).toBe('Bot 3');
    expect(virtualAgent.systemPrompt).toBe('You are Werewolf.');
  });

  it('should return _error when no valid config found', async () => {
    const node: WorkflowNode = {
      id: 'da3',
      type: 'dynamic-agent',
      position: { x: 0, y: 0 },
      data: {
        configSource: 'payload',
        configPath: 'payload.missing',
      },
    };

    const payload = { someData: true };
    const helpers = createHelpers();
    const result = await dynamicAgentExecute(node, payload, helpers as any);

    expect(result._error).toContain('Dynamic Agent: no valid configuration found');
    expect(fetchFromResolvedConfig).not.toHaveBeenCalled();
  });

  it('should use fallbackAgentId for model config', async () => {
    (fetchFromResolvedConfig as any).mockResolvedValue(mockStream(['OK']));

    const node: WorkflowNode = {
      id: 'da4',
      type: 'dynamic-agent',
      position: { x: 0, y: 0 },
      data: {
        configSource: 'inline',
        inlineConfig: {
          systemPromptTemplate: 'Test.',
        },
        fallbackAgentId: 'fallback-agent-1',
      },
    };

    const payload = {};
    const helpers = createHelpers({
      agents: [
        {
          id: 'fallback-agent-1',
          name: 'Fallback',
          avatar: '',
          systemPrompt: '',
          providerId: 'provider-a',
          modelId: 'model-x',
        },
      ],
    });

    await dynamicAgentExecute(node, payload, helpers as any);

    const virtualAgent = (resolveAgentModelConfig as any).mock.calls[0][0];
    expect(virtualAgent.providerId).toBe('provider-a');
    expect(virtualAgent.modelId).toBe('model-x');
  });

  it('should fallback to fallbackProviderId when no fallbackAgent', async () => {
    (fetchFromResolvedConfig as any).mockResolvedValue(mockStream(['OK']));

    const node: WorkflowNode = {
      id: 'da5',
      type: 'dynamic-agent',
      position: { x: 0, y: 0 },
      data: {
        configSource: 'inline',
        inlineConfig: {
          systemPromptTemplate: 'Test.',
        },
        fallbackProviderId: 'provider-b',
        fallbackModelId: 'model-y',
      },
    };

    const payload = {};
    const helpers = createHelpers();
    await dynamicAgentExecute(node, payload, helpers as any);

    const virtualAgent = (resolveAgentModelConfig as any).mock.calls[0][0];
    expect(virtualAgent.providerId).toBe('provider-b');
    expect(virtualAgent.modelId).toBe('model-y');
  });

  it('should use custom outputField', async () => {
    (fetchFromResolvedConfig as any).mockResolvedValue(mockStream(['Custom']));

    const node: WorkflowNode = {
      id: 'da6',
      type: 'dynamic-agent',
      position: { x: 0, y: 0 },
      data: {
        configSource: 'inline',
        inlineConfig: {
          systemPromptTemplate: 'Test.',
        },
        outputField: 'myResult',
      },
    };

    const payload = {};
    const helpers = createHelpers();
    const result = await dynamicAgentExecute(node, payload, helpers as any);

    expect(result.myResult).toBe('Custom');
    expect(result.llmResult).toBeUndefined();
  });

  it('should use promptTemplate when provided', async () => {
    (fetchFromResolvedConfig as any).mockResolvedValue(mockStream(['Reply']));

    const node: WorkflowNode = {
      id: 'da7',
      type: 'dynamic-agent',
      position: { x: 0, y: 0 },
      data: {
        configSource: 'inline',
        inlineConfig: {
          systemPromptTemplate: 'Test.',
        },
        promptTemplate: 'Task: {{payload.task}}',
      },
    };

    const payload = { task: 'analyze this' };
    const helpers = createHelpers();
    await dynamicAgentExecute(node, payload, helpers as any);

    expect(fetchFromResolvedConfig).toHaveBeenCalledWith(
      expect.anything(),
      'Task: analyze this',
      'Test.',
    );
  });

  it('should return _error when LLM call fails', async () => {
    (fetchFromResolvedConfig as any).mockRejectedValue(new Error('API Error'));

    const node: WorkflowNode = {
      id: 'da8',
      type: 'dynamic-agent',
      position: { x: 0, y: 0 },
      data: {
        configSource: 'inline',
        inlineConfig: {
          systemPromptTemplate: 'Test.',
        },
      },
    };

    const payload = {};
    const helpers = createHelpers();
    const result = await dynamicAgentExecute(node, payload, helpers as any);

    expect(result._error).toContain('API Error');
  });
});
