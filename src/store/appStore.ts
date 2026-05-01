import { create } from 'zustand';
import { Workspace, Agent, ChatSession, ChatMessage, Workflow, Settings, MessageAttachment, MessageMeta, WorkflowConversationWindow, AgentChatWindowData, WorkflowNode, WorkflowEdge } from '../types/models';
import { fetchFromModel } from '@/lib/api';
import { v4 as uuidv4 } from 'uuid';
import { createUserMessage, createStreamMessage, createAgentResponse } from '@/lib/messageService';
import { invoke } from '@tauri-apps/api/core';

type WorkflowChatUIState = {
  sidebarCollapsedBySession: Record<string, boolean>;
  windows: WorkflowConversationWindow[];
  agentChatWindows: AgentChatWindowData[];
  activeWindowId: string | null;
  zIndexCounter: number;
};

function normalizeSession(session: ChatSession): ChatSession {
  return {
    ...session,
    mode: session.mode || (session.workflowId ? 'workflow' : 'single'),
    messages: session.messages || [],
  };
}

function getAgentNode(workflow: Workflow | undefined, nodeId: string): WorkflowNode | undefined {
  return workflow?.nodes_data.find((node) => node.id === nodeId && node.type === 'agent');
}

function findNextAgentNode(workflow: Workflow | undefined, nodeId: string): WorkflowNode | undefined {
  if (!workflow) return undefined;

  const visited = new Set<string>();
  const queue = workflow.edges_data
    .filter((edge) => edge.source === nodeId)
    .map((edge) => edge.target);

  while (queue.length > 0) {
    const nextNodeId = queue.shift();
    if (!nextNodeId || visited.has(nextNodeId)) continue;
    visited.add(nextNodeId);

    const node = workflow.nodes_data.find((item) => item.id === nextNodeId);
    if (node?.type === 'agent' && node.data?.agentId) return node;

    workflow.edges_data
      .filter((edge) => edge.source === nextNodeId)
      .forEach((edge) => queue.push(edge.target));
  }

  return undefined;
}

async function runAgentResponse({
  sessionId,
  messageId,
  agent,
  prompt,
  nodeId,
  addAgentResponseStream,
  completeAgentResponse,
  getSettings,
}: {
  sessionId: string;
  messageId: string;
  agent: Agent;
  prompt: string;
  nodeId?: string;
  addAgentResponseStream: AppState['addAgentResponseStream'];
  completeAgentResponse: AppState['completeAgentResponse'];
  getSettings: () => Settings;
}) {
  addAgentResponseStream(sessionId, messageId, agent.id, '', nodeId);

  try {
    const settings = getSettings();
    const providerToUse: string = settings.apiProvider === 'custom' ? 'custom' : agent.modelProvider;
    const modelToUse = settings.apiProvider === 'custom' ? settings.customModelId : agent.modelId;
    const hasKey = (providerToUse === 'openai' && settings.openaiKey) ||
      (providerToUse === 'anthropic' && settings.anthropicKey) ||
      (providerToUse === 'google' && settings.googleKey) ||
      providerToUse === 'custom';

    if (!hasKey) {
      await simulateAgentStream({ sessionId, messageId, agent, prompt, nodeId, addAgentResponseStream, completeAgentResponse, settings, isCustom: providerToUse === 'custom' });
      return;
    }

    const { textStream } = await fetchFromModel(providerToUse, modelToUse, prompt, settings, agent.systemPrompt);
    for await (const textPart of textStream) {
      addAgentResponseStream(sessionId, messageId, agent.id, textPart, nodeId);
    }
    completeAgentResponse(sessionId, messageId, agent.id, nodeId);
  } catch (e: any) {
    addAgentResponseStream(sessionId, messageId, agent.id, `\n\n错误：模型请求失败。${e.message || e}`, nodeId);
    completeAgentResponse(sessionId, messageId, agent.id, nodeId);
  }
}

function simulateAgentStream({
  sessionId,
  messageId,
  agent,
  prompt,
  nodeId,
  addAgentResponseStream,
  completeAgentResponse,
  settings,
  isCustom,
}: {
  sessionId: string;
  messageId: string;
  agent: Agent;
  prompt: string;
  nodeId?: string;
  addAgentResponseStream: AppState['addAgentResponseStream'];
  completeAgentResponse: AppState['completeAgentResponse'];
  settings: Settings;
  isCustom: boolean;
}) {
  return new Promise<void>((resolve) => {
    const modelContext = isCustom ? `通过 ${settings.customBaseUrl} 使用 ${settings.customModelId}` : `使用 ${agent.modelProvider}/${agent.modelId}`;
    const chunks = `你好，我是${agent.name}。我正在${modelContext}响应。你说：“${prompt}”。`.split('');
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < chunks.length) {
        addAgentResponseStream(sessionId, messageId, agent.id, chunks[currentIndex], nodeId);
        currentIndex++;
      } else {
        clearInterval(interval);
        completeAgentResponse(sessionId, messageId, agent.id, nodeId);
        resolve();
      }
    }, 30);
  });
}


async function readConfig<T>(name: string): Promise<T | null> {
  try {
    const raw = await invoke<string>('read_json_config', { name });
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

async function writeConfig(name: string, value: unknown) {
  try {
    await invoke('write_json_config', { name, value: JSON.stringify(value) });
  } catch (error) {
    console.error(`Failed to write ${name}:`, error);
  }
}

interface AppState {
  workspaces: Workspace[];
  agents: Agent[];
  sessions: ChatSession[];
  workflows: Workflow[];
  activeWorkspaceId: string | null;
  activeSessionId: string | null;
  activeWorkflowId: string | null;
  activeAgentId: string | null;
  workflowChatMode: boolean;
  workflowChatUI: WorkflowChatUIState;

  // Actions
  fetchInitialData: () => Promise<void>;
  addWorkspace: (name: string, description?: string) => void;
  setActiveWorkspace: (id: string) => void;

  addAgent: (agent: Omit<Agent, 'id' | 'createdAt'>) => Promise<void>;
  updateAgent: (id: string, updates: Partial<Agent>) => void;

  createSession: (title: string, workspaceId: string, workflowId?: string, mode?: 'single' | 'workflow') => void;
  createWorkflowBackedSession: (title: string, workspaceId: string) => Promise<void>;
  openWorkflowSession: (workflowId: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  setActiveSession: (id: string) => void;

  addUserMessage: (sessionId: string, text: string, attachments?: MessageAttachment[], meta?: MessageMeta) => void;
  addAgentResponseStream: (sessionId: string, messageId: string, agentId: string, textChunk: string, nodeId?: string, meta?: MessageMeta) => void;
  completeAgentResponse: (sessionId: string, messageId: string, agentId: string, nodeId?: string) => void;
  sendMessageToAgents: (sessionId: string, prompt: string, agents: Agent[], options?: { attachments?: MessageAttachment[]; nodeId?: string; meta?: MessageMeta; addUserMessage?: boolean }) => Promise<string | undefined>;
  sendToWorkflowAgent: (sessionId: string, nodeId: string, prompt: string, options?: { addUserMessage?: boolean; triggeredBy?: MessageMeta['triggeredBy']; forwardFromMessageId?: string }) => Promise<string | undefined>;
  forwardAgentReplyToNext: (sessionId: string, fromNodeId: string, messageId: string, agentId: string, triggeredBy?: MessageMeta['triggeredBy']) => Promise<void>;
  rerunAgentReply: (sessionId: string, nodeId: string, prompt: string) => Promise<string | undefined>;
  rerunAndForwardAgentReply: (sessionId: string, nodeId: string, prompt: string) => Promise<void>;

  // Workflow Actions
  createWorkflow: (name: string, workspaceId: string) => void;
  saveWorkflow: (id: string, nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
  deleteWorkflow: (id: string) => Promise<void>;
  setActiveWorkflow: (id: string | null) => void;
  setActiveAgent: (id: string | null) => void;

  // Workflow Chat Mode
  toggleWorkflowChatMode: (enabled: boolean) => void;
  linkWorkflowToSession: (sessionId: string, workflowId: string) => void;
  getWorkflowForSession: (sessionId: string) => Workflow | undefined;
  setWorkflowSidebarCollapsed: (sessionId: string, collapsed: boolean) => void;
  openWorkflowAgentWindow: (sessionId: string, workflowId: string, nodeId: string, agentId: string) => void;
  focusWorkflowAgentWindow: (windowId: string) => void;
  closeWorkflowAgentWindow: (windowId: string) => void;
  toggleWorkflowAgentWindowMinimized: (windowId: string) => void;

  // Agent Chat Windows (single sessions)
  openAgentChatWindow: (sessionId: string, agentId: string) => void;
  focusAgentChatWindow: (windowId: string) => void;
  closeAgentChatWindow: (windowId: string) => void;
  toggleAgentChatWindowMinimized: (windowId: string) => void;
  sendToAgent: (sessionId: string, agentId: string, prompt: string, options?: { addUserMessage?: boolean }) => Promise<string | undefined>;

  // Workflow Execution State
  workflowExecution: {
     status: 'idle' | 'running' | 'completed' | 'error';
     currentNodeId: string | null;
     results: Record<string, any>;
     nodeRecords: Record<string, { status: string; startTime?: number; endTime?: number; durationMs?: number; attempts: number; error?: string }>;
  };
  setWorkflowExecutionState: (state: Partial<AppState['workflowExecution']>) => void;
  executeWorkflow: (workflowId: string, initialPayload: Record<string, any>, options?: { startNodeId?: string; concurrency?: number }) => Promise<Record<string, any>>;


  // Settings Actions
  settings: Settings;
  updateSettings: (updates: Partial<AppState['settings']>) => void;

  // Helpers
  getActiveSession: () => ChatSession | undefined;
  getActiveWorkflow: () => Workflow | undefined;
}

export const useAppStore = create<AppState>()(
    (set, get) => ({
      workspaces: [
        {
          id: 'default-workspace',
          name: 'Personal Workspace',
          description: 'Default personal workspace',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ],
      agents: [
        {
          id: 'agent-organize',
          name: '整理助手',
          avatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=organize',
          systemPrompt: '你是一个文本整理助手，负责整理和组织用户输入的内容，使其结构清晰、层次分明。',
          modelProvider: 'local',
          modelId: 'default',
          temperature: 0.7,
          parameters: {},
          createdAt: Date.now(),
          industry: 'General'
        },
        {
          id: 'agent-summary',
          name: '总结助手',
          avatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=summary',
          systemPrompt: '你是一个文本总结助手，负责对用户输入的内容进行总结，提取关键信息和要点。',
          modelProvider: 'local',
          modelId: 'default',
          temperature: 0.7,
          parameters: {},
          createdAt: Date.now(),
          industry: 'General'
        },
        {
          id: 'agent-1',
          name: 'System Architect',
          avatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=architect',
          systemPrompt: 'You are a system architect.',
          modelProvider: 'local',
          modelId: 'default',
          temperature: 0.7,
          parameters: {},
          createdAt: Date.now(),
          industry: 'Technology'
        },
        {
          id: 'agent-2',
          name: 'Code Reviewer',
          avatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=reviewer',
          systemPrompt: 'You are a strict code reviewer.',
          modelProvider: 'local',
          modelId: 'default',
          temperature: 0.7,
          parameters: {},
          createdAt: Date.now(),
          industry: 'Technology'
        },
        {
          id: 'ww-host',
          name: '法官·铁面',
          avatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=host-judge',
          systemPrompt: '你是狼人杀法官，性格铁面无私、语言简洁有力。你负责维持游戏阶段、解释规则、汇总夜晚行动、发布白天信息，并且不能泄露玩家隐藏身份。输出要清晰、简短、可执行。遇到违规行为直接警告。',
          modelProvider: 'local',
          modelId: 'default',
          temperature: 0.4,
          parameters: {},
          createdAt: Date.now(),
          industry: 'Game'
        },
        {
          id: 'ww-wolf-shadow',
          name: '狼人·暗影',
          avatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=shadow-wolf',
          systemPrompt: '你是狼人阵营的"暗影"，性格阴险狡诈、善于伪装。你擅长在白天发言中装作无辜平民，喜欢嫁祸给可疑的玩家。夜晚袭击时你倾向于选择最有威胁的好人角色。输出结构化决策，包含 targetId 和详细 reason。',
          modelProvider: 'local',
          modelId: 'default',
          temperature: 0.85,
          parameters: {},
          createdAt: Date.now(),
          industry: 'Game'
        },
        {
          id: 'ww-wolf-fury',
          name: '狼人·狂怒',
          avatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=fury-wolf',
          systemPrompt: '你是狼人阵营的"狂怒"，性格冲动好斗、喜欢激进策略。你不怕暴露身份，倾向于直接攻击发言最多的玩家。你的投票风格激进，喜欢带节奏。输出结构化决策，包含 targetId 和 reason。',
          modelProvider: 'local',
          modelId: 'default',
          temperature: 0.95,
          parameters: {},
          createdAt: Date.now(),
          industry: 'Game'
        },
        {
          id: 'ww-seer',
          name: '预言家·星眸',
          avatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=star-seer',
          systemPrompt: '你是狼人杀预言家"星眸"，性格冷静理性、逻辑严密。你注重数据和推理，选择查验目标时关注高嫌疑或关键发言玩家。你的发言风格条理清晰，喜欢列举证据。只输出查验目标和理由，不泄露系统外信息。',
          modelProvider: 'local',
          modelId: 'default',
          temperature: 0.6,
          parameters: {},
          createdAt: Date.now(),
          industry: 'Game'
        },
        {
          id: 'ww-witch',
          name: '女巫·毒心',
          avatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=poison-witch',
          systemPrompt: '你是狼人杀女巫"毒心"，性格精于算计、善于观察。你用药果断但不浪费，解药只在关键时刻使用，毒药留给高度确定的狼人。你善于从夜晚死亡信息推断狼人身份。输出 useHeal、poisonTargetId 和 reason。',
          modelProvider: 'local',
          modelId: 'default',
          temperature: 0.7,
          parameters: {},
          createdAt: Date.now(),
          industry: 'Game'
        },
        {
          id: 'ww-guard',
          name: '守卫·铁壁',
          avatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=iron-guard',
          systemPrompt: '你是狼人杀守卫"铁壁"，性格忠诚守护、直觉敏锐。你倾向于保护关键角色（如预言家），连续两晚不守同一人。你善于从投票和发言中判断谁是狼人的目标。输出 protectTargetId 和 reason。',
          modelProvider: 'local',
          modelId: 'default',
          temperature: 0.65,
          parameters: {},
          createdAt: Date.now(),
          industry: 'Game'
        },
        {
          id: 'ww-hunter',
          name: '猎人·烈焰',
          avatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=flame-hunter',
          systemPrompt: '你是狼人杀猎人"烈焰"，性格勇猛果断、不惧牺牲。你投票时直觉优先，喜欢投给看起来最可疑的人。如果你被杀，你会选择带走你认为最可疑的玩家。输出 voteTargetId 和 reason。',
          modelProvider: 'local',
          modelId: 'default',
          temperature: 0.8,
          parameters: {},
          createdAt: Date.now(),
          industry: 'Game'
        },
        {
          id: 'ww-villager',
          name: '平民·智者',
          avatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=sage-villager',
          systemPrompt: '你是狼人杀平民"智者"，性格善于观察、逻辑清晰。你擅长从其他玩家的发言中找破绽和矛盾，喜欢用推理说服他人。你的投票基于发言分析，不轻易跟风。输出 voteTargetId 和详细的推理 reason。',
          modelProvider: 'local',
          modelId: 'default',
          temperature: 0.75,
          parameters: {},
          createdAt: Date.now(),
          industry: 'Game'
        }
      ],
      sessions: [
        {
          id: 'default-session',
          workspaceId: 'default-workspace',
          title: 'My First Workflow',
          mode: 'workflow',
          workflowId: 'default-workflow',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [
            {
              id: uuidv4(),
              sessionId: 'default-session',
              role: 'system',
              content: { text: 'Session initialized.' },
              timestamp: Date.now()
            }
          ]
        },
        {
          id: 'session-ui-design',
          workspaceId: 'default-workspace',
          title: 'UI Component Design',
          mode: 'workflow',
          workflowId: 'workflow-pipeline',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: []
        },
        {
          id: 'session-general',
          workspaceId: 'default-workspace',
          title: 'General Inquiry',
          mode: 'workflow',
          workflowId: 'workflow-report',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: []
        },
        {
          id: 'session-werewolf',
          workspaceId: 'default-workspace',
          title: '狼人杀·标准局',
          mode: 'workflow',
          workflowId: 'werewolf-standard',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: []
        }
      ],
      workflows: [
        {
          id: 'default-workflow',
          workspaceId: 'default-workspace',
          name: 'My First Workflow',
          nodes_data: [
             { id: 'trigger-1', type: 'trigger', position: { x: 100, y: 250 }, data: { label: 'User Input' } },
             { id: 'agent-organize', type: 'agent', position: { x: 400, y: 100 }, data: { label: '整理', agentId: 'agent-organize', prompt: '整理并组织用户输入的内容，使其结构清晰。' } },
             { id: 'agent-summary', type: 'agent', position: { x: 400, y: 400 }, data: { label: '总结', agentId: 'agent-summary', prompt: '对用户输入的内容进行总结，提取关键信息。' } },
             { id: 'output-1', type: 'output', position: { x: 750, y: 100 }, data: { label: '整理结果' } },
             { id: 'output-2', type: 'output', position: { x: 750, y: 400 }, data: { label: '总结结果' } }
          ],
          edges_data: [
             { id: 'e-trigger-organize', source: 'trigger-1', target: 'agent-organize', animated: true },
             { id: 'e-trigger-summary', source: 'trigger-1', target: 'agent-summary', animated: true },
             { id: 'e-organize-output1', source: 'agent-organize', target: 'output-1', animated: true },
             { id: 'e-summary-output2', source: 'agent-summary', target: 'output-2', animated: true }
          ],
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'workflow-pipeline',
          workspaceId: 'default-workspace',
          name: 'Data Processing Pipeline',
          nodes_data: [
             { id: 't1', type: 'trigger', position: { x: 50, y: 150 }, data: { label: 'Data Input' } },
             { id: 'a1', type: 'agent', position: { x: 300, y: 150 }, data: { label: 'Data Cleaner', agentId: 'agent-1', prompt: 'Clean this data' } },
             { id: 'o1', type: 'output', position: { x: 550, y: 150 }, data: { label: 'Cleaned Data' } }
          ],
          edges_data: [
             { id: 'e1', source: 't1', target: 'a1', animated: true },
             { id: 'e2', source: 'a1', target: 'o1', animated: true }
          ],
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'workflow-report',
          workspaceId: 'default-workspace',
          name: 'Weekly Report Generator',
          nodes_data: [
             { id: 't2', type: 'trigger', position: { x: 100, y: 100 }, data: { label: 'Start Report' } },
             { id: 'a2', type: 'agent', position: { x: 350, y: 100 }, data: { label: 'Report Writer', agentId: 'agent-summary', prompt: 'Generate report' } },
             { id: 'o2', type: 'output', position: { x: 600, y: 100 }, data: { label: 'Final Report' } }
          ],
          edges_data: [
             { id: 'e3', source: 't2', target: 'a2', animated: true },
             { id: 'e4', source: 'a2', target: 'o2', animated: true }
          ],
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'werewolf-standard',
          workspaceId: 'default-workspace',
          name: '狼人杀·标准局',
          nodes_data: [
            { id: 'ww-trigger', type: 'trigger', position: { x: 50, y: 450 }, data: { label: '开始游戏' } },
            { id: 'ww-init', type: 'code', position: { x: 380, y: 450 }, data: {
                label: '初始化局势',
                code: 'payload.players = Array.isArray(payload.players) && payload.players.length ? payload.players : [{id:"p1",name:"1号·暗影",role:"werewolf",status:"alive",personality:"shadow"},{id:"p2",name:"2号·狂怒",role:"werewolf",status:"alive",personality:"fury"},{id:"p3",name:"3号·星眸",role:"seer",status:"alive"},{id:"p4",name:"4号·毒心",role:"witch",status:"alive",potions:{heal:true,poison:true}},{id:"p5",name:"5号·铁壁",role:"guard",status:"alive",lastProtected:null},{id:"p6",name:"6号·烈焰",role:"hunter",status:"alive"},{id:"p7",name:"7号·智者",role:"villager",status:"alive"},{id:"p8",name:"8号·勇者",role:"villager",status:"alive"}]; payload.phase = payload.phase || "night"; payload.round = payload.round || 1; payload.gameStatus = payload.gameStatus || "playing"; payload.publicLog = payload.publicLog || []; payload.privateLog = payload.privateLog || []; payload.daySpeeches = payload.daySpeeches || []; payload.alivePlayers = payload.players.filter(p => p.status === "alive"); return payload;'
            }},
            { id: 'ww-controller', type: 'code', position: { x: 710, y: 450 }, data: {
                label: '阶段控制器',
                code: 'payload.alivePlayers = payload.players.filter(p => p.status === "alive"); const wolves = payload.players.filter(p => p.role === "werewolf" && p.status === "alive").length; const goods = payload.players.filter(p => p.role !== "werewolf" && p.status === "alive").length; if (wolves === 0) payload.gameStatus = "good_wins"; else if (wolves >= goods) payload.gameStatus = "wolves_win"; return payload;'
            }},
            { id: 'ww-router', type: 'condition', position: { x: 1040, y: 450 }, data: { label: '阶段路由', routes: [
                { id: 'route-night', condition: 'payload.gameStatus === "playing" && payload.phase === "night"' },
                { id: 'route-speech', condition: 'payload.gameStatus === "playing" && payload.phase === "day_speech"' },
                { id: 'route-vote', condition: 'payload.gameStatus === "playing" && payload.phase === "day_vote"' },
                { id: 'route-end', condition: 'payload.gameStatus !== "playing"' }
              ]
            }},
            { id: 'ww-wolf-shadow', type: 'agent', position: { x: 1420, y: 50 }, data: {
                label: '暗影·夜袭决策',
                agentId: 'ww-wolf-shadow',
                prompt: '你是狼人"暗影"。当前局势：{{JSON.stringify(payload.alivePlayers)}}\n历史记录：{{JSON.stringify(payload.publicLog)}}\n\n请选择今晚袭击目标，要选最有威胁的好人。输出 targetId 和 reason。',
                schema: '{"targetId":"string","reason":"string"}'
            }},
            { id: 'ww-wolf-fury', type: 'agent', position: { x: 1420, y: 250 }, data: {
                label: '狂怒·夜袭投票',
                agentId: 'ww-wolf-fury',
                prompt: '你是狼人"狂怒"。当前局势：{{JSON.stringify(payload.alivePlayers)}}\n历史记录：{{JSON.stringify(payload.publicLog)}}\n\n你倾向今晚袭击谁？输出 targetId 和 reason。',
                schema: '{"targetId":"string","reason":"string"}'
            }},
            { id: 'ww-resolve-wolf', type: 'code', position: { x: 1780, y: 150 }, data: {
                label: '结算狼人袭击',
                code: 'payload.nightState = payload.nightState || {}; const shadowTarget = payload.llmResult?.targetId; const aliveNonWolves = payload.alivePlayers.filter(p => p.role !== "werewolf"); payload.nightState.wolfTarget = shadowTarget || aliveNonWolves[0]?.id; payload.privateLog.push({round:payload.round,phase:"night",actor:"wolves",action:"kill",targetId:payload.nightState.wolfTarget}); return payload;'
            }},
            { id: 'ww-seer', type: 'agent', position: { x: 2140, y: 50 }, data: {
                label: '星眸·查验',
                agentId: 'ww-seer',
                prompt: '你是预言家"星眸"。当前存活玩家：{{JSON.stringify(payload.alivePlayers)}}\n历史记录：{{JSON.stringify(payload.privateLog)}}\n\n请选择一个玩家查验身份。输出 targetId 和 reason。',
                schema: '{"targetId":"string","reason":"string"}'
            }},
            { id: 'ww-witch', type: 'agent', position: { x: 2140, y: 250 }, data: {
                label: '毒心·用药',
                agentId: 'ww-witch',
                prompt: '你是女巫"毒心"。当前局势：{{JSON.stringify(payload.alivePlayers)}}\n今晚被袭击的是 {{payload.nightState?.wolfTarget}}\n你的药水状态：{{JSON.stringify(payload.players.find(p=>p.role==="witch")?.potions)}}\n\n是否使用解药或毒药？输出 useHeal、poisonTargetId 和 reason。',
                schema: '{"useHeal":"boolean","poisonTargetId":"string|null","reason":"string"}'
            }},
            { id: 'ww-guard', type: 'agent', position: { x: 2500, y: 150 }, data: {
                label: '铁壁·守护',
                agentId: 'ww-guard',
                prompt: '你是守卫"铁壁"。当前存活玩家：{{JSON.stringify(payload.alivePlayers)}}\n你上次守护的是 {{payload.players.find(p=>p.role==="guard")?.lastProtected || "无"}}\n\n请选择今晚守护的玩家（不能连续守同一人）。输出 protectTargetId 和 reason。',
                schema: '{"protectTargetId":"string","reason":"string"}'
            }},
            { id: 'ww-resolve-night', type: 'code', position: { x: 2860, y: 150 }, data: {
                label: '结算夜晚',
                code: 'const s = payload.nightState || {}; const deaths = new Set(); if (s.wolfTarget && !s.witchHeal && s.wolfTarget !== s.protectTarget) deaths.add(s.wolfTarget); if (s.witchPoison) deaths.add(s.witchPoison); deaths.forEach(id => { const p = payload.players.find(pl => pl.id === id); if (p) p.status = "dead"; }); payload.lastNightDeaths = Array.from(deaths); payload.publicLog.push({round:payload.round,phase:"night_result",deaths:payload.lastNightDeaths}); const witch = payload.players.find(p => p.role === "witch"); if (witch && s.witchHeal) witch.potions = {...witch.potions,heal:false}; if (witch && s.witchPoison) witch.potions = {...witch.potions,poison:false}; const guard = payload.players.find(p => p.role === "guard"); if (guard) guard.lastProtected = s.protectTarget; const wolves = payload.players.filter(p => p.role === "werewolf" && p.status === "alive").length; const goods = payload.players.filter(p => p.role !== "werewolf" && p.status === "alive").length; if (wolves === 0) payload.gameStatus = "good_wins"; else if (wolves >= goods) payload.gameStatus = "wolves_win"; else payload.phase = "day_speech"; payload.alivePlayers = payload.players.filter(p => p.status === "alive"); return payload;'
            }},
            { id: 'ww-night-output', type: 'output', position: { x: 3220, y: 150 }, data: { label: '夜晚结果' } },
            { id: 'ww-prepare-speech', type: 'code', position: { x: 1420, y: 480 }, data: {
                label: '准备发言',
                code: 'payload.alivePlayers = payload.players.filter(p => p.status === "alive"); payload.daySpeeches = []; payload.publicLog.push({round:payload.round,phase:"day_speech_start",alive:payload.alivePlayers.map(p=>p.id),lastNightDeaths:payload.lastNightDeaths||[]}); return payload;'
            }},
            { id: 'ww-speech-loop', type: 'loop', position: { x: 1780, y: 480 }, data: {
                label: '逐人发言循环',
                itemsPath: 'payload.alivePlayers',
                itemAlias: 'currentSpeaker',
                indexAlias: 'speakerIndex',
                maxIterations: 10,
                breakCondition: 'payload.gameStatus !== "playing"'
            }},
            { id: 'ww-villager', type: 'agent', position: { x: 2140, y: 480 }, data: {
                label: '智者·白天发言',
                agentId: 'ww-villager',
                prompt: '你是平民"智者"，当前发言玩家：{{JSON.stringify(payload.currentSpeaker)}}\n公开信息：{{JSON.stringify(payload.publicLog)}}\n白天已发言：{{JSON.stringify(payload.daySpeeches)}}\n存活玩家：{{JSON.stringify(payload.alivePlayers)}}\n\n请生成该玩家的白天发言。输出 speech 和 suspicion。',
                schema: '{"speech":"string","suspicion":"string"}'
            }},
            { id: 'ww-collect-speech', type: 'code', position: { x: 2500, y: 480 }, data: {
                label: '记录发言',
                code: 'payload.daySpeeches = payload.daySpeeches || []; payload.daySpeeches.push({playerId:payload.currentSpeaker?.id,playerName:payload.currentSpeaker?.name,speech:payload.llmResult?.speech||"发言略",suspicion:payload.llmResult?.suspicion||""}); payload.publicLog.push({round:payload.round,phase:"day_speech",playerId:payload.currentSpeaker?.id,speech:payload.llmResult?.speech||"发言略"}); payload.phase = "day_vote"; return payload;'
            }},
            { id: 'ww-speech-output', type: 'output', position: { x: 2860, y: 480 }, data: { label: '发言记录' } },
            { id: 'ww-hunter', type: 'agent', position: { x: 1420, y: 730 }, data: {
                label: '烈焰·投票',
                agentId: 'ww-hunter',
                prompt: '你是猎人"烈焰"。白天发言：{{JSON.stringify(payload.daySpeeches)}}\n存活玩家：{{JSON.stringify(payload.alivePlayers)}}\n\n请根据发言分析投票放逐目标。输出 voteTargetId 和 reason。',
                schema: '{"voteTargetId":"string","reason":"string"}'
            }},
            { id: 'ww-resolve-vote', type: 'code', position: { x: 1780, y: 730 }, data: {
                label: '结算投票',
                code: 'const targetId = payload.llmResult?.voteTargetId || payload.alivePlayers.find(p => p.role === "werewolf")?.id || payload.alivePlayers[0]?.id; const target = payload.players.find(p => p.id === targetId); if (target) target.status = "dead"; payload.publicLog.push({round:payload.round,phase:"vote_result",exiled:targetId,reason:payload.llmResult?.reason||""}); const hunter = payload.players.find(p => p.role === "hunter" && p.id === targetId); if (hunter) { const wolfTarget = payload.alivePlayers.find(p => p.role === "werewolf"); if (wolfTarget) { wolfTarget.status = "dead"; payload.publicLog.push({round:payload.round,phase:"hunter_shoot",killed:wolfTarget.id}); } } const wolves = payload.players.filter(p => p.role === "werewolf" && p.status === "alive").length; const goods = payload.players.filter(p => p.role !== "werewolf" && p.status === "alive").length; if (wolves === 0) payload.gameStatus = "good_wins"; else if (wolves >= goods) payload.gameStatus = "wolves_win"; else { payload.phase = "night"; payload.round = (payload.round || 1) + 1; } payload.alivePlayers = payload.players.filter(p => p.status === "alive"); return payload;'
            }},
            { id: 'ww-vote-output', type: 'output', position: { x: 2140, y: 730 }, data: { label: '投票结果' } },
            { id: 'ww-host', type: 'agent', position: { x: 1420, y: 950 }, data: {
                label: '铁面·终局播报',
                agentId: 'ww-host',
                prompt: '游戏结束。最终局势：{{JSON.stringify(payload)}}\n\n请作为法官生成终局播报，说明获胜阵营、关键转折点、各角色表现和最终存活玩家。',
                schema: '{"summary":"string"}'
            }},
            { id: 'ww-end-output', type: 'output', position: { x: 1780, y: 950 }, data: { label: '游戏结束' } }
          ],
          edges_data: [
            { id: 'ww-e1', source: 'ww-trigger', target: 'ww-init', animated: true },
            { id: 'ww-e2', source: 'ww-init', target: 'ww-controller', animated: true },
            { id: 'ww-e3', source: 'ww-controller', target: 'ww-router', animated: true },
            { id: 'ww-e4', source: 'ww-router', sourceHandle: 'route-night', target: 'ww-wolf-shadow', animated: true },
            { id: 'ww-e5', source: 'ww-router', sourceHandle: 'route-night', target: 'ww-wolf-fury', animated: true },
            { id: 'ww-e6', source: 'ww-wolf-shadow', target: 'ww-resolve-wolf', animated: true },
            { id: 'ww-e7', source: 'ww-wolf-fury', target: 'ww-resolve-wolf', animated: true },
            { id: 'ww-e8', source: 'ww-resolve-wolf', target: 'ww-seer', animated: true },
            { id: 'ww-e9', source: 'ww-resolve-wolf', target: 'ww-witch', animated: true },
            { id: 'ww-e10', source: 'ww-seer', target: 'ww-guard', animated: true },
            { id: 'ww-e11', source: 'ww-witch', target: 'ww-guard', animated: true },
            { id: 'ww-e12', source: 'ww-guard', target: 'ww-resolve-night', animated: true },
            { id: 'ww-e13', source: 'ww-resolve-night', target: 'ww-night-output', animated: true },
            { id: 'ww-e14', source: 'ww-router', sourceHandle: 'route-speech', target: 'ww-prepare-speech', animated: true },
            { id: 'ww-e15', source: 'ww-prepare-speech', target: 'ww-speech-loop', animated: true },
            { id: 'ww-e16', source: 'ww-speech-loop', target: 'ww-villager', animated: true },
            { id: 'ww-e17', source: 'ww-villager', target: 'ww-collect-speech', animated: true },
            { id: 'ww-e18', source: 'ww-collect-speech', target: 'ww-speech-output', animated: true },
            { id: 'ww-e19', source: 'ww-router', sourceHandle: 'route-vote', target: 'ww-hunter', animated: true },
            { id: 'ww-e20', source: 'ww-hunter', target: 'ww-resolve-vote', animated: true },
            { id: 'ww-e21', source: 'ww-resolve-vote', target: 'ww-vote-output', animated: true },
            { id: 'ww-e22', source: 'ww-router', sourceHandle: 'route-end', target: 'ww-host', animated: true },
            { id: 'ww-e23', source: 'ww-host', target: 'ww-end-output', animated: true }
          ],
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ],
      activeWorkspaceId: 'default-workspace',
      activeSessionId: 'default-session',
      activeWorkflowId: 'default-workflow',
      activeAgentId: 'agent-1',
      workflowChatMode: false,
      workflowChatUI: {
        sidebarCollapsedBySession: {},
        windows: [],
        agentChatWindows: [],
        activeWindowId: null,
        zIndexCounter: 20,
      },
      workflowExecution: {
        status: 'idle',
        currentNodeId: null,
        results: {},
        nodeRecords: {}
      },


      settings: {
        theme: 'system',
        language: 'zh',
        apiProvider: 'openai',
        openaiKey: '',
        openaiModelId: '',
        anthropicKey: '',
        anthropicModelId: '',
        googleKey: '',
        customProtocol: 'openai-compatible',
        customBaseUrl: '',
        customModelId: '',
        customApiKey: '',
        customHeader: '',
        geminiKey: '',
        geminiModelId: '',
        allowRemoteAccess: true,
        remoteAccessPort: 1420,
      },

      fetchInitialData: async () => {
        try {
          const modelConfig = await readConfig<Settings>('model.json');
          const agentsConfig = await readConfig<Agent[]>('agents.json');
          const workflowsConfig = await readConfig<Workflow[]>('workflow.json');

          if (modelConfig) {
            set((state) => ({ settings: { ...state.settings, ...modelConfig } }));
          }
          if (agentsConfig?.length) {
            set({ agents: agentsConfig });
          } else {
            const agents = await invoke<Agent[]>('get_agents');
            if (agents.length) {
              const parsedAgents = agents.map(a => ({...a, parameters: typeof a.parameters === 'string' ? JSON.parse(a.parameters) : a.parameters}));
              set({ agents: parsedAgents });
            }
          }

          const workspaces = await invoke<Workspace[]>('get_workspaces');
          if (workspaces.length === 0) {
            const defaultWorkspaceId = uuidv4();
            const defaultWorkspace = {
              id: defaultWorkspaceId,
              name: 'Default Workspace',
              description: 'Your default workspace',
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            await invoke('add_workspace', { workspace: defaultWorkspace });
            workspaces.push(defaultWorkspace);
          }
          if (workspaces.length > 0) {
            set({ workspaces });
            const defaultWorkspaceId = workspaces[0].id;
            set({ activeWorkspaceId: defaultWorkspaceId });

            const sessions = await invoke<ChatSession[]>('get_chat_sessions', { workspaceId: defaultWorkspaceId });

            for (let i = 0; i < sessions.length; i++) {
                const messages = await invoke<ChatMessage[]>('get_chat_messages', { sessionId: sessions[i].id });
                sessions[i].messages = messages.map(m => ({...m, content: JSON.parse(m.content as unknown as string)}));
            }
            set({ sessions: sessions.map(normalizeSession) });

            const workflows = await invoke<Workflow[]>('get_workflows', { workspaceId: defaultWorkspaceId });
            if (workflowsConfig?.length) {
              set({ workflows: workflowsConfig });
            } else if (workflows.length) {
              const parsedWorkflows = workflows.map(w => ({...w, nodes_data: JSON.parse(w.nodes_data as unknown as string), edges_data: JSON.parse(w.edges_data as unknown as string)}));
              set({ workflows: parsedWorkflows });
            }
          }
        } catch (error) {
          console.log('Running in browser mode without Tauri backend - using default data');
        }
      },

      addWorkspace: async (name, description = '') => {
        const newWorkspace: Workspace = {
          id: uuidv4(),
          name,
          description,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        try {
          await invoke('add_workspace', { workspace: newWorkspace });
          set((state) => ({ workspaces: [...state.workspaces, newWorkspace] }));
        } catch (error) {
          console.error('Failed to add workspace', error);
        }
      },

      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

      addAgent: async (agentData) => {
        const newAgent: Agent = {
          ...agentData,
          id: uuidv4(),
          createdAt: Date.now()
        };

        try {
          // Call Tauri backend to add the agent
          const agentToSave = {...newAgent, parameters: JSON.stringify(newAgent.parameters || {})};
          await invoke('add_agent', { agent: agentToSave });
          const nextAgents = [...get().agents, newAgent];
          set({ agents: nextAgents });
          await writeConfig('agents.json', nextAgents);
        } catch (error) {
          console.error('Failed to add agent:', error);
          throw error;
        }
      },

      updateAgent: (id, updates) => set((state) => {
        const nextAgents = state.agents.map(agent =>
          agent.id === id ? { ...agent, ...updates } : agent
        );
        void writeConfig('agents.json', nextAgents);
        return { agents: nextAgents };
      }),

      createSession: async (title, workspaceId, workflowId, mode) => {
        const newSession: ChatSession = {
          id: uuidv4(),
          workspaceId,
          title,
          mode: mode || (workflowId ? 'workflow' : 'single'),
          workflowId,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        try {
          await invoke('add_chat_session', { session: newSession });
          set((state) => ({ sessions: [...state.sessions, newSession], activeSessionId: newSession.id }));
        } catch (error) {
          console.error('Failed to create session:', error);
        }
      },

      createWorkflowBackedSession: async (title, workspaceId) => {
        const now = Date.now();
        const workflowId = uuidv4();
        const sessionId = uuidv4();
        const newWorkflow: Workflow = {
          id: workflowId,
          workspaceId,
          name: title,
          nodes_data: [],
          edges_data: [],
          status: 'active',
          createdAt: now,
          updatedAt: now
        };
        const newSession: ChatSession = {
          id: sessionId,
          workspaceId,
          title,
          mode: 'workflow',
          workflowId,
          messages: [],
          createdAt: now,
          updatedAt: now
        };

        try {
          const wfToSave = { ...newWorkflow, nodes_data: '[]', edges_data: '[]' };
          await invoke('add_workflow', { workflow: wfToSave });
          await invoke('add_chat_session', { session: newSession });
        } catch (error) {
          console.error('Failed to create workflow-backed session:', error);
        }

        set((state) => {
          const nextWorkflows = [...state.workflows, newWorkflow];
          void writeConfig('workflow.json', nextWorkflows);
          return {
            workflows: nextWorkflows,
            sessions: [...state.sessions, newSession],
            activeWorkflowId: workflowId,
            activeSessionId: sessionId,
          };
        });
      },

      openWorkflowSession: async (workflowId) => {
        const { workflows, sessions } = get();
        const workflow = workflows.find(w => w.id === workflowId);
        if (!workflow) return;

        const existingSession = sessions.find(session => session.workflowId === workflowId);
        if (existingSession) {
          set((state) => ({
            activeWorkflowId: workflowId,
            activeSessionId: existingSession.id,
            sessions: state.sessions.map(session => session.id === existingSession.id ? normalizeSession(session) : session),
          }));
          return;
        }

        const now = Date.now();
        const newSession: ChatSession = {
          id: uuidv4(),
          workspaceId: workflow.workspaceId,
          title: workflow.name,
          mode: 'workflow',
          workflowId,
          messages: [],
          createdAt: now,
          updatedAt: now,
        };

        try {
          await invoke('add_chat_session', { session: newSession });
        } catch (error) {
          console.error('Failed to create workflow session:', error);
        }

        set((state) => ({
          sessions: [...state.sessions, newSession],
          activeWorkflowId: workflowId,
          activeSessionId: newSession.id,
        }));
      },

      deleteSession: async (id) => {
        try {
          await invoke('delete_chat_session', { id });
        } catch (error) {
          console.error('Failed to delete session:', error);
        }

        set((state) => {
          const sessions = state.sessions.filter(session => session.id !== id);
          const activeSessionId = state.activeSessionId === id ? sessions[0]?.id || null : state.activeSessionId;
          const activeSession = sessions.find(session => session.id === activeSessionId);
          return {
            sessions,
            activeSessionId,
            activeWorkflowId: activeSession?.workflowId || state.activeWorkflowId,
          };
        });
      },

      setActiveSession: (id) => set((state) => {
        const session = state.sessions.find(s => s.id === id);
        return {
          activeSessionId: id,
          activeWorkflowId: session?.workflowId || state.activeWorkflowId,
        };
      }),

      addUserMessage: async (sessionId, text, attachments = [], meta) => {
        const newMessage = createUserMessage(sessionId, text, attachments, meta);

        set((state) => {
            const sessions = state.sessions.map(s => {
              if (s.id === sessionId) {
                return { ...s, messages: [...s.messages, newMessage], updatedAt: Date.now() };
              }
              return s;
            });
            return { sessions };
        });

        try {
            const msgToSave = {...newMessage, content: JSON.stringify(newMessage.content)};
            await invoke('add_chat_message', { message: msgToSave });
        } catch (error) {
            console.error('Failed to sync user message to backend:', error);
        }
      },

      addAgentResponseStream: async (sessionId, messageId, agentId, textChunk, nodeId, meta) => {
        let assistantMsgIndex = -1;
        let newAssistantMsg: ChatMessage | null = null;
        
        set((state) => {
            const sessions = state.sessions.map(s => {
              if (s.id === sessionId) {
                const messages = [...s.messages];

                // Find existing assistant message block for this interaction round, or create one
                assistantMsgIndex = messages.findIndex(m => m.id === messageId);

                if (assistantMsgIndex === -1) {
                   newAssistantMsg = createStreamMessage(sessionId, agentId, nodeId, meta, messageId);
                   newAssistantMsg.agentResponses![0].content.text = textChunk;
                   messages.push(newAssistantMsg);
                } else {
                  // Update existing assistant message block
                  const msg = { ...messages[assistantMsgIndex] };
                  msg.agentResponses = [...(msg.agentResponses || [])];

                  const agentRespIndex = msg.agentResponses.findIndex(ar => ar.agentId === agentId && ar.nodeId === nodeId);
                  if (agentRespIndex === -1) {
                    msg.agentResponses.push(createAgentResponse(agentId, textChunk, nodeId, 'streaming'));
                  } else {
                    const resp = { ...msg.agentResponses[agentRespIndex] };
                    resp.content = { text: resp.content.text + textChunk };
                    msg.agentResponses[agentRespIndex] = resp;
                  }
                  messages[assistantMsgIndex] = msg;
                  newAssistantMsg = messages[assistantMsgIndex];
                }

                return { ...s, messages, updatedAt: Date.now() };
              }
              return s;
            });
            return { sessions };
        });

        // Try to sync with backend
        if (newAssistantMsg) {
            try {
                const msg: ChatMessage = newAssistantMsg;
                const msgToSave = {...msg, content: JSON.stringify(msg.content)};
                if (assistantMsgIndex === -1) {
                    await invoke('add_chat_message', { message: msgToSave });
                } else {
                    await invoke('update_chat_message', { message: msgToSave });
                }
            } catch (error) {
                console.error("Failed to sync agent response", error);
            }
        }
      },

      completeAgentResponse: (sessionId, messageId, agentId, nodeId) => set((state) => {
        const sessions = state.sessions.map(s => {
           if (s.id === sessionId) {
             const messages = [...s.messages];
             const msgIndex = messages.findIndex(m => m.id === messageId);
             if (msgIndex !== -1) {
               const msg = { ...messages[msgIndex] };
               if (msg.agentResponses) {
                 msg.agentResponses = msg.agentResponses.map(ar =>
                   ar.agentId === agentId && ar.nodeId === nodeId ? { ...ar, status: 'complete' } : ar
                 );
               }
               messages[msgIndex] = msg;
             }
             return { ...s, messages };
           }
           return s;
        });
        return { sessions };
      }),

      sendMessageToAgents: async (sessionId, prompt, agents, options = {}) => {
        const session = get().sessions.find(item => item.id === sessionId);
        if (!session || agents.length === 0) return undefined;

        const messageId = uuidv4();
        const promptWithAttachments = options.attachments?.length
          ? `${prompt}\n\n附件：${options.attachments.map(file => `${file.name} (${file.mimeType})`).join('、')}`
          : prompt;

        if (options.addUserMessage !== false) {
          get().addUserMessage(sessionId, prompt, options.attachments || [], options.meta);
        }

        await Promise.all(agents.map(agent => runAgentResponse({
          sessionId,
          messageId,
          agent,
          prompt: promptWithAttachments,
          nodeId: options.nodeId,
          addAgentResponseStream: get().addAgentResponseStream,
          completeAgentResponse: get().completeAgentResponse,
          getSettings: () => get().settings,
        })));

        return messageId;
      },

      sendToWorkflowAgent: async (sessionId, nodeId, prompt, options = {}) => {
        const { workflows, agents, sessions } = get();
        const session = sessions.find(item => item.id === sessionId);
        const workflow = session?.workflowId ? workflows.find(item => item.id === session.workflowId) : undefined;
        const node = getAgentNode(workflow, nodeId);
        const agent = agents.find(item => item.id === node?.data?.agentId);
        if (!session || !workflow || !node || !agent) return undefined;

        const nodePrompt = node.data?.prompt ? `${node.data.prompt}\n\n${prompt}` : prompt;
        const messageId = await get().sendMessageToAgents(sessionId, nodePrompt, [agent], {
          nodeId,
          addUserMessage: options.addUserMessage !== false,
          meta: {
            workflowId: workflow.id,
            workflowNodeId: nodeId,
            targetAgentId: agent.id,
            forwardFromMessageId: options.forwardFromMessageId,
            triggeredBy: options.triggeredBy || 'user',
          },
        });

        if (node.data?.autoSendToNext && messageId) {
          await get().forwardAgentReplyToNext(sessionId, nodeId, messageId, agent.id, 'auto');
        }

        return messageId;
      },

      forwardAgentReplyToNext: async (sessionId, fromNodeId, messageId, agentId, triggeredBy = 'manual') => {
        const { sessions, workflows } = get();
        const session = sessions.find(item => item.id === sessionId);
        const workflow = session?.workflowId ? workflows.find(item => item.id === session.workflowId) : undefined;
        const currentMessage = session?.messages.find(message => message.id === messageId);
        const currentResponse = currentMessage?.agentResponses?.find(response => response.agentId === agentId && response.nodeId === fromNodeId);
        const nextNode = findNextAgentNode(workflow, fromNodeId);
        if (!session || !workflow || !currentResponse || !nextNode?.data?.agentId) return;

        await get().sendToWorkflowAgent(sessionId, nextNode.id, currentResponse.content.text, {
          addUserMessage: true,
          triggeredBy,
          forwardFromMessageId: messageId,
        });
      },

      rerunAgentReply: async (sessionId, nodeId, prompt) => {
        return get().sendToWorkflowAgent(sessionId, nodeId, prompt, { addUserMessage: false, triggeredBy: 'reload' });
      },

      rerunAndForwardAgentReply: async (sessionId, nodeId, prompt) => {
        const { sessions, workflows, agents } = get();
        const session = sessions.find(item => item.id === sessionId);
        const workflow = session?.workflowId ? workflows.find(item => item.id === session.workflowId) : undefined;
        const node = getAgentNode(workflow, nodeId);
        const agent = agents.find(item => item.id === node?.data?.agentId);
        if (!agent) return;

        const messageId = await get().rerunAgentReply(sessionId, nodeId, prompt);
        if (messageId) {
          await get().forwardAgentReplyToNext(sessionId, nodeId, messageId, agent.id, 'reload');
        }
      },

      getActiveSession: () => {
        const { sessions, activeSessionId } = get();
        return sessions.find(s => s.id === activeSessionId);
      },

      createWorkflow: async (name, workspaceId) => {
        const newWorkflow: Workflow = {
           id: uuidv4(),
           workspaceId,
           name,
           nodes_data: [],
           edges_data: [],
           status: 'active',
           createdAt: Date.now(),
           updatedAt: Date.now()
        };
        try {
            const wfToSave = {...newWorkflow, nodes_data: "[]", edges_data: "[]"};
            await invoke('add_workflow', { workflow: wfToSave });
            const nextWorkflows = [...get().workflows, newWorkflow];
            set({ workflows: nextWorkflows, activeWorkflowId: newWorkflow.id });
            await writeConfig('workflow.json', nextWorkflows);
        } catch (error) {
            console.error("Failed to create workflow:", error);
        }
      },

      saveWorkflow: async (id, nodes, edges) => {
         try {
             const { workflows } = get();
             const wf = workflows.find(w => w.id === id);
             if (wf) {
                 const cleanNodes: WorkflowNode[] = nodes.map((n) => ({
                   id: n.id,
                   type: n.type,
                   position: n.position,
                   data: {
                     label: n.data?.label,
                     description: n.data?.description,
                     timeoutMs: n.data?.timeoutMs,
                     retryPolicy: n.data?.retryPolicy,
                     onError: n.data?.onError,
                     inputSchema: n.data?.inputSchema,
                     outputSchema: n.data?.outputSchema,
                     // agent
                     agentId: n.data?.agentId,
                     prompt: n.data?.prompt,
                     schema: n.data?.schema,
                     autoSendToNext: n.data?.autoSendToNext,
                     // condition/router
                     routes: n.data?.routes,
                     // code
                     code: n.data?.code,
                     // loop
                     itemsPath: n.data?.itemsPath,
                     itemAlias: n.data?.itemAlias,
                     indexAlias: n.data?.indexAlias,
                     maxIterations: n.data?.maxIterations,
                     breakCondition: n.data?.breakCondition,
                     aggregationStrategy: n.data?.aggregationStrategy,
                     // http
                     method: n.data?.method,
                     url: n.data?.url,
                     headers: n.data?.headers,
                     body: n.data?.body,
                     // set/transform
                     mappings: n.data?.mappings,
                     constants: n.data?.constants,
                     whitelist: n.data?.whitelist,
                     // switch
                     branches: n.data?.branches,
                     // wait
                     waitMode: n.data?.waitMode,
                     delayMs: n.data?.delayMs,
                     untilExpression: n.data?.untilExpression,
                     // merge
                     strategy: n.data?.strategy,
                     mergeKey: n.data?.mergeKey,
                     // webhook
                     webhookMethod: n.data?.webhookMethod,
                     webhookPath: n.data?.webhookPath,
                     authToken: n.data?.authToken,
                     // subworkflow
                     subWorkflowId: n.data?.subWorkflowId,
                     inputMapping: n.data?.inputMapping,
                   }
                 }));
                 const cleanEdges: WorkflowEdge[] = edges.map((e) => ({
                   id: e.id,
                   source: e.source,
                   sourceHandle: e.sourceHandle,
                   target: e.target,
                   targetHandle: e.targetHandle,
                   animated: e.animated
                 }));
                 const wfToSave = {...wf, nodes_data: JSON.stringify(cleanNodes), edges_data: JSON.stringify(cleanEdges), updatedAt: Date.now()};
                 await invoke('update_workflow', { workflow: wfToSave });

                 set((state) => {
                    const wfs = state.workflows.map(w => {
                        if (w.id === id) {
                            return { ...w, nodes_data: cleanNodes, edges_data: cleanEdges, updatedAt: Date.now() };
                        }
                        return w;
                    });
                    void writeConfig('workflow.json', wfs);
                    return { workflows: wfs };
                 });
             }
         } catch (error) {
             console.error("Failed to save workflow:", error);
         }
      },

      deleteWorkflow: async (id) => {
        try {
          await invoke('delete_workflow', { id });
          const linkedSessions = get().sessions.filter(session => session.workflowId === id);
          await Promise.all(linkedSessions.map(session => invoke('delete_chat_session', { id: session.id })));
        } catch (error) {
          console.error('Failed to delete workflow:', error);
        }

        set((state) => {
          const workflows = state.workflows.filter(workflow => workflow.id !== id);
          const sessions = state.sessions.filter(session => session.workflowId !== id);
          const activeWorkflowId = state.activeWorkflowId === id ? workflows[0]?.id || null : state.activeWorkflowId;
          const activeSessionId = state.sessions.find(session => session.id === state.activeSessionId)?.workflowId === id
            ? sessions[0]?.id || null
            : state.activeSessionId;
          void writeConfig('workflow.json', workflows);
          return {
            workflows,
            sessions,
            activeWorkflowId,
            activeSessionId,
          };
        });
      },

      setActiveWorkflow: (id) => set({ activeWorkflowId: id }),
      setActiveAgent: (id) => set({ activeAgentId: id }),

      toggleWorkflowChatMode: (enabled) => set({ workflowChatMode: enabled }),

      setWorkflowSidebarCollapsed: (sessionId, collapsed) => set((state) => ({
        workflowChatUI: {
          ...state.workflowChatUI,
          sidebarCollapsedBySession: {
            ...state.workflowChatUI.sidebarCollapsedBySession,
            [sessionId]: collapsed,
          },
        },
      })),

      openWorkflowAgentWindow: (sessionId, workflowId, nodeId, agentId) => set((state) => {
        const existingWindow = state.workflowChatUI.windows.find(window => window.sessionId === sessionId && window.nodeId === nodeId);
        const nextZIndex = state.workflowChatUI.zIndexCounter + 1;

        if (existingWindow) {
          return {
            workflowChatUI: {
              ...state.workflowChatUI,
              windows: state.workflowChatUI.windows.map(window => window.id === existingWindow.id ? { ...window, zIndex: nextZIndex, minimized: false } : window),
              activeWindowId: existingWindow.id,
              zIndexCounter: nextZIndex,
            },
          };
        }

        const sessionWindows = state.workflowChatUI.windows.filter(window => window.sessionId === sessionId);
        const newWindow: WorkflowConversationWindow = {
          id: uuidv4(),
          sessionId,
          workflowId,
          nodeId,
          agentId,
          position: {
            x: 48 + (sessionWindows.length % 4) * 36,
            y: 48 + (sessionWindows.length % 4) * 28,
          },
          zIndex: nextZIndex,
          minimized: false,
        };

        return {
          workflowChatUI: {
            ...state.workflowChatUI,
            windows: [...state.workflowChatUI.windows, newWindow],
            activeWindowId: newWindow.id,
            zIndexCounter: nextZIndex,
          },
        };
      }),

      focusWorkflowAgentWindow: (windowId) => set((state) => {
        const nextZIndex = state.workflowChatUI.zIndexCounter + 1;
        return {
          workflowChatUI: {
            ...state.workflowChatUI,
            windows: state.workflowChatUI.windows.map(window => window.id === windowId ? { ...window, zIndex: nextZIndex } : window),
            activeWindowId: windowId,
            zIndexCounter: nextZIndex,
          },
        };
      }),

      closeWorkflowAgentWindow: (windowId) => set((state) => ({
        workflowChatUI: {
          ...state.workflowChatUI,
          windows: state.workflowChatUI.windows.filter(window => window.id !== windowId),
          activeWindowId: state.workflowChatUI.activeWindowId === windowId ? null : state.workflowChatUI.activeWindowId,
        },
      })),

      toggleWorkflowAgentWindowMinimized: (windowId) => set((state) => ({
        workflowChatUI: {
          ...state.workflowChatUI,
          windows: state.workflowChatUI.windows.map(window => window.id === windowId ? { ...window, minimized: !window.minimized } : window),
        },
      })),

      // Agent Chat Windows (single sessions)
      openAgentChatWindow: (sessionId, agentId) => set((state) => {
        const existingWindow = state.workflowChatUI.agentChatWindows.find(
          window => window.sessionId === sessionId && window.agentId === agentId
        );
        const nextZIndex = state.workflowChatUI.zIndexCounter + 1;

        if (existingWindow) {
          return {
            workflowChatUI: {
              ...state.workflowChatUI,
              agentChatWindows: state.workflowChatUI.agentChatWindows.map(window =>
                window.id === existingWindow.id ? { ...window, zIndex: nextZIndex, minimized: false } : window
              ),
              activeWindowId: existingWindow.id,
              zIndexCounter: nextZIndex,
            },
          };
        }

        const sessionWindows = state.workflowChatUI.agentChatWindows.filter(
          window => window.sessionId === sessionId
        );
        const newWindow: AgentChatWindowData = {
          id: uuidv4(),
          sessionId,
          agentId,
          position: {
            x: 48 + (sessionWindows.length % 4) * 36,
            y: 48 + (sessionWindows.length % 4) * 28,
          },
          zIndex: nextZIndex,
          minimized: false,
        };

        return {
          workflowChatUI: {
            ...state.workflowChatUI,
            agentChatWindows: [...state.workflowChatUI.agentChatWindows, newWindow],
            activeWindowId: newWindow.id,
            zIndexCounter: nextZIndex,
          },
        };
      }),

      focusAgentChatWindow: (windowId) => set((state) => {
        const nextZIndex = state.workflowChatUI.zIndexCounter + 1;
        return {
          workflowChatUI: {
            ...state.workflowChatUI,
            agentChatWindows: state.workflowChatUI.agentChatWindows.map(window =>
              window.id === windowId ? { ...window, zIndex: nextZIndex } : window
            ),
            activeWindowId: windowId,
            zIndexCounter: nextZIndex,
          },
        };
      }),

      closeAgentChatWindow: (windowId) => set((state) => ({
        workflowChatUI: {
          ...state.workflowChatUI,
          agentChatWindows: state.workflowChatUI.agentChatWindows.filter(
            window => window.id !== windowId
          ),
          activeWindowId: state.workflowChatUI.activeWindowId === windowId
            ? null
            : state.workflowChatUI.activeWindowId,
        },
      })),

      toggleAgentChatWindowMinimized: (windowId) => set((state) => ({
        workflowChatUI: {
          ...state.workflowChatUI,
          agentChatWindows: state.workflowChatUI.agentChatWindows.map(window =>
            window.id === windowId ? { ...window, minimized: !window.minimized } : window
          ),
        },
      })),


      sendToAgent: async (sessionId, agentId, prompt, options = {}) => {
        const { agents } = get();
        const agent = agents.find(a => a.id === agentId);
        if (!agent) return undefined;

        if (options.addUserMessage !== false) {
          get().addUserMessage(sessionId, prompt, [], { targetAgentId: agentId });
        }

        const messageId = uuidv4();
        await runAgentResponse({
          sessionId,
          messageId,
          agent,
          prompt,
          addAgentResponseStream: get().addAgentResponseStream,
          completeAgentResponse: get().completeAgentResponse,
          getSettings: () => get().settings,
        });

        return messageId;
      },

      linkWorkflowToSession: (sessionId, workflowId) => set((state) => ({
        sessions: state.sessions.map(s =>
          s.id === sessionId ? { ...s, workflowId, mode: 'workflow' } : s
        )
      })),

      
      setWorkflowExecutionState: (updates) => set((state) => ({
        workflowExecution: { ...state.workflowExecution, ...updates }
      })),

      executeWorkflow: async (workflowId, initialPayload, options) => {
         const { workflows, setWorkflowExecutionState } = get();
         const workflow = workflows.find(w => w.id === workflowId);
         const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
         void (options?.concurrency ?? 1); // reserved for future concurrent execution
         const executedKeys = new Set<string>();

         if (!workflow) return initialPayload;

         setWorkflowExecutionState({ status: 'running', currentNodeId: null, results: {}, nodeRecords: {} });

         const startNodeId = options?.startNodeId;
         const startNode = startNodeId
            ? workflow.nodes_data.find((n: any) => n.id === startNodeId)
            : workflow.nodes_data.find((n: any) => n.type === 'trigger');

         if (!startNode) {
            setWorkflowExecutionState({ status: 'error' });
            return initialPayload;
         }

         type ExecutionFrame = {
            nodeId: string;
            payload: any;
         };

         let queue: ExecutionFrame[] = [
            { nodeId: startNode.id, payload: structuredClone(initialPayload) }
         ];

         let results: Record<string, any> = {
            [startNode.id]: structuredClone(initialPayload)
         };

         let finalPayload = structuredClone(initialPayload);

         const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

         const withTimeout = <T>(promise: Promise<T>, ms: number, fallbackError: string): Promise<T> => {
            let timeoutId: NodeJS.Timeout;
            const timeoutPromise = new Promise<T>((_, reject) => {
               timeoutId = setTimeout(() => reject(new Error(fallbackError)), ms);
            });
            return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
         };

         const getByPath = (obj: any, path: string) => {
            if (!path) return undefined;
            const normalizedPath = path.startsWith('payload.') ? path.slice('payload.'.length) : path;
            if (!normalizedPath) return obj;
            return normalizedPath.split('.').reduce((acc: any, key: string) => {
               if (acc === null || acc === undefined) return undefined;
               return acc[key];
            }, obj);
         };

         const evaluateExpression = async (expression: string, payload: any, timeoutMs: number) => {
            const expressionJs = `
               try {
                  with (payload) {
                     return ${expression};
                  }
               } catch(e) {
                  return false;
               }
            `;
            const evaluateFn = new AsyncFunction('payload', expressionJs);
            return withTimeout(
               evaluateFn(structuredClone(payload)),
               timeoutMs,
               'Expression evaluation timed out'
            );
         };

         const evaluateExpressionSync = (expression: string, payload: any) => {
            const fn = new Function('payload', `with(payload) { return ${expression}; }`);
            return fn(payload);
         };

         const setByPath = (obj: any, path: string, value: any) => {
            const keys = path.split('.');
            let cur = obj;
            for (let i = 0; i < keys.length - 1; i++) {
               if (cur[keys[i]] === undefined || cur[keys[i]] === null) cur[keys[i]] = {};
               cur = cur[keys[i]];
            }
            cur[keys[keys.length - 1]] = value;
         };

         const MAX_WORKFLOW_STEPS = 1000;
         let stepCounter = 0;

         const validateSchema = (data: any, schemaStr: string | undefined, label: string): string | null => {
            if (!schemaStr) return null;
            try {
               const schema = JSON.parse(schemaStr);
               for (const [key, type] of Object.entries(schema)) {
                  const val = data?.[key];
                  if (type === 'string' && typeof val !== 'string') return `${label}: "${key}" expected string, got ${typeof val}`;
                  if (type === 'number' && typeof val !== 'number') return `${label}: "${key}" expected number, got ${typeof val}`;
                  if (type === 'boolean' && typeof val !== 'boolean') return `${label}: "${key}" expected boolean, got ${typeof val}`;
                  if (type === 'object' && (typeof val !== 'object' || val === null)) return `${label}: "${key}" expected object, got ${typeof val}`;
                  if (type === 'array' && !Array.isArray(val)) return `${label}: "${key}" expected array, got ${typeof val}`;
               }
            } catch { /* ignore invalid schema */ }
            return null;
         };

         const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

         while (queue.length > 0) {
            const frame = queue.shift()!;
            const nodeId = frame.nodeId;
            const node = workflow.nodes_data.find((n: any) => n.id === nodeId);
            let currentPayload = structuredClone(frame.payload);

            const idempotentKey = `${executionId}:${nodeId}`;
            if (executedKeys.has(idempotentKey)) { continue; }
            executedKeys.add(idempotentKey);

            const nodeStartTime = Date.now();
            const updateNodeRecord = (status: string, extra?: Record<string, unknown>) => {
               set((state) => ({
                  workflowExecution: {
                     ...state.workflowExecution,
                     nodeRecords: {
                        ...state.workflowExecution.nodeRecords,
                        [nodeId]: { ...state.workflowExecution.nodeRecords[nodeId], status, ...extra }
                     }
                  }
               }));
            };
            updateNodeRecord('running', { startTime: nodeStartTime, attempts: 0 });

            stepCounter += 1;
            if (stepCounter > MAX_WORKFLOW_STEPS) {
               setWorkflowExecutionState({ status: 'error', currentNodeId: null, results });
               return finalPayload;
            }

            setWorkflowExecutionState({ currentNodeId: nodeId, results });

            const nodeEdges = workflow.edges_data.filter((e: any) => e.source === nodeId);
            const inputError = validateSchema(currentPayload, node?.data?.inputSchema, 'Input');
            if (inputError) {
               currentPayload = { ...currentPayload, _error: inputError };
               results[nodeId] = currentPayload;
               if (node?.data?.onError === 'continue') { continue; }
               if (node?.data?.onError === 'route-to-error') {
                  const errorEdge = nodeEdges.find((e: any) => e.sourceHandle === 'error');
                  if (errorEdge) { queue.push({ nodeId: errorEdge.target, payload: currentPayload }); }
                  continue;
               }
               setWorkflowExecutionState({ status: 'error', currentNodeId: nodeId, results });
               return currentPayload;
            }

            const nodeTimeoutMs = Number(node?.data?.timeoutMs) || 0;
            const retryPolicy = node?.data?.retryPolicy || {};
            const maxAttempts = Number(retryPolicy.maxAttempts) || 1;
            const backoffType = retryPolicy.backoff || 'fixed';
            const baseDelay = Number(retryPolicy.delayMs) || 1000;

            await new Promise(r => setTimeout(r, 400));

            if (node?.type === 'output') {
               finalPayload = currentPayload;
               results[nodeId] = currentPayload;
               continue;
            }

            let nodeExecError: string | null = null;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
               try {
                  const execPromise = (async () => {
                     if (node?.type === 'agent') {
                        console.log('Simulating Agent inference with prompt:', node.data?.prompt);
                        let parsedOutput = {};
                        if (node.data?.schema) {
                           const schemaStr = String(node.data.schema || '');
                           if (schemaStr.includes('targetId')) parsedOutput = { targetId: 'player_3', reason: 'simulated logic' };
                           else parsedOutput = { result: 'simulated' };
                           currentPayload = { ...currentPayload, llmResult: parsedOutput };
                        } else {
                           currentPayload = { ...currentPayload, output: `[Agent Output for ${node.data?.label || 'Agent'}]: processed input.` };
                        }
                     } else if (node?.type === 'code') {
                        const jsCode = `try { ${node.data?.code || 'return payload;'} } catch(e) { return { ...payload, _error: e.message }; }`;
                        const executeFn = new AsyncFunction('payload', jsCode);
                        const resultPayload = await withTimeout(executeFn(structuredClone(currentPayload)), 10000, 'Code execution timed out after 10s');
                        currentPayload = resultPayload || currentPayload;
                     } else if (node?.type === 'http') {
                        const method = String(node.data?.method || 'GET').toUpperCase();
                        const urlRaw = String(node.data?.url || '');
                        const url = urlRaw.replace(/\{\{(.*?)\}\}/g, (_: string, expr: string) => { try { return String(evaluateExpressionSync(expr.trim(), currentPayload)); } catch { return ''; } });
                        const headersRaw = String(node.data?.headers || '');
                        const headers = headersRaw ? JSON.parse(headersRaw.replace(/\{\{(.*?)\}\}/g, (_: string, expr: string) => { try { return JSON.stringify(evaluateExpressionSync(expr.trim(), currentPayload)); } catch { return '""'; } })) : {};
                        const bodyRaw = String(node.data?.body || '');
                        const body = bodyRaw ? bodyRaw.replace(/\{\{(.*?)\}\}/g, (_: string, expr: string) => { try { return JSON.stringify(evaluateExpressionSync(expr.trim(), currentPayload)); } catch { return '""'; } }) : undefined;
                        const httpTimeout = Number(node.data?.timeoutMs) || 30000;
                        const fetchOptions: RequestInit = { method, headers };
                        if (body && method !== 'GET') fetchOptions.body = body;
                        const response = await withTimeout(fetch(url, fetchOptions), httpTimeout, `HTTP ${method} timed out after ${httpTimeout}ms`);
                        const contentType = response.headers.get('content-type') || '';
                        let responseData: any;
                        if (contentType.includes('application/json')) responseData = await response.json();
                        else responseData = await response.text();
                        currentPayload = { ...currentPayload, httpStatus: response.status, httpData: responseData, output: responseData };
                     } else if (node?.type === 'set') {
                        const mappings = (node.data?.mappings || []) as { sourcePath: string; targetPath: string }[];
                        const constantsRaw = String(node.data?.constants || '');
                        const whitelistRaw = String(node.data?.whitelist || '');
                        let result: any = {};
                        for (const m of mappings) { const val = getByPath(currentPayload, m.sourcePath); setByPath(result, m.targetPath, val); }
                        if (constantsRaw) { try { result = { ...result, ...JSON.parse(constantsRaw) }; } catch {} }
                        if (whitelistRaw) { const paths = whitelistRaw.split(',').map((s: string) => s.trim()).filter(Boolean); const filtered: any = {}; for (const p of paths) { const v = getByPath(result, p); if (v !== undefined) setByPath(filtered, p, v); } result = filtered; }
                        currentPayload = { ...currentPayload, ...result, output: result };
                     } else if (node?.type === 'switch') {
                        // handled in edge routing below
                     } else if (node?.type === 'wait') {
                        const waitMode = node.data?.waitMode || 'fixed';
                        if (waitMode === 'fixed') { await sleep(Number(node.data?.delayMs) || 1000); }
                        else {
                           const untilExpr = String(node.data?.untilExpression || 'true');
                           const start = Date.now();
                           while (Date.now() - start < 60000) { if (await evaluateExpression(untilExpr, currentPayload, 2000)) break; await sleep(500); }
                        }
                     }
                  })();

                  if (nodeTimeoutMs > 0) { await withTimeout(execPromise, nodeTimeoutMs, `Node timed out after ${nodeTimeoutMs}ms`); }
                  else await execPromise;

                  nodeExecError = null;
                  break;
               } catch (e: any) {
                  nodeExecError = e.message;
                  console.error(`Node ${nodeId} attempt ${attempt}/${maxAttempts} failed:`, e.message);
                  if (attempt < maxAttempts) {
                     const delay = backoffType === 'exponential' ? baseDelay * Math.pow(2, attempt - 1) : baseDelay;
                     await sleep(delay);
                  }
               }
            }

            if (nodeExecError) {
               const nodeEndTime = Date.now();
               updateNodeRecord('error', { endTime: nodeEndTime, durationMs: nodeEndTime - nodeStartTime, error: nodeExecError, attempts: maxAttempts });
               currentPayload = { ...currentPayload, _error: nodeExecError };
               results[nodeId] = currentPayload;
               if (node?.data?.onError === 'continue') { continue; }
               if (node?.data?.onError === 'route-to-error') {
                  const errorEdge = workflow.edges_data.find((e: any) => e.source === nodeId && e.sourceHandle === 'error');
                  if (errorEdge) { queue.push({ nodeId: errorEdge.target, payload: currentPayload }); }
                  continue;
               }
               setWorkflowExecutionState({ status: 'error', currentNodeId: nodeId, results });
               return currentPayload;
            }

            const outputError = validateSchema(currentPayload, node?.data?.outputSchema, 'Output');
            if (outputError) {
               currentPayload = { ...currentPayload, _error: outputError };
            }

            const nodeEndTime = Date.now();
            updateNodeRecord('success', { endTime: nodeEndTime, durationMs: nodeEndTime - nodeStartTime, attempts: maxAttempts });

            results[nodeId] = currentPayload;
            const edges = workflow.edges_data.filter((e: any) => e.source === nodeId);

            if (node?.type === 'merge') {
               const strategy = node.data?.strategy || 'append';
               const mergeKey = node.data?.mergeKey || 'id';
               const incomingResults: any[] = [];
               for (const edge of edges) {
                  if (results[edge.target]) incomingResults.push(results[edge.target]);
               }
               if (strategy === 'append') {
                  currentPayload = { ...currentPayload, merged: incomingResults };
               } else if (strategy === 'byKey') {
                  const merged: Record<string, unknown> = {};
                  for (const r of incomingResults) {
                     const key = String(r[mergeKey as string] ?? '');
                     if (key) merged[key] = r;
                  }
                  currentPayload = { ...currentPayload, merged };
               } else {
                  currentPayload = { ...currentPayload, merged: Object.assign({}, ...incomingResults) as Record<string, unknown> };
               }
            }

            if (node?.type === 'condition' && node.data?.routes) {
               let matchedRouteId = null;

               for (const route of (node.data.routes as any[]) || []) {
                  try {
                     const isMatch = await evaluateExpression(route.condition || 'false', currentPayload, 2000);
                     if (isMatch) {
                        matchedRouteId = route.id;
                        break;
                     }
                  } catch (e) {
                     console.error('Route evaluation error:', e);
                  }
               }

               if (matchedRouteId) {
                  const matchingEdge = edges.find((e: any) => e.sourceHandle === matchedRouteId);
                  if (matchingEdge) {
                     const nextPayload = structuredClone(currentPayload);
                     results[matchingEdge.target] = nextPayload;
                     queue.push({ nodeId: matchingEdge.target, payload: nextPayload });
                  }
               }
            } else if (node?.type === 'switch' && node.data?.branches) {
               let matchedBranchId = null;

               for (const branch of (node.data.branches as any[]) || []) {
                  try {
                     const isMatch = await evaluateExpression(branch.condition || 'false', currentPayload, 2000);
                     if (isMatch) {
                        matchedBranchId = branch.id;
                        break;
                     }
                  } catch (e) {
                     console.error('Branch evaluation error:', e);
                  }
               }

               if (matchedBranchId) {
                  const matchingEdge = edges.find((e: any) => e.sourceHandle === matchedBranchId);
                  if (matchingEdge) {
                     const nextPayload = structuredClone(currentPayload);
                     results[matchingEdge.target] = nextPayload;
                     queue.push({ nodeId: matchingEdge.target, payload: nextPayload });
                  }
               }
            } else if (node?.type === 'loop') {
               const itemsPath = String(node.data?.itemsPath || 'payload.alivePlayers');
               const itemAlias = String(node.data?.itemAlias || 'item');
               const indexAlias = String(node.data?.indexAlias || 'index');
               const maxIterationsValue = Number(node.data?.maxIterations);
               const maxIterations = maxIterationsValue > 0 ? maxIterationsValue : 20;
               const breakCondition = String(node.data?.breakCondition || '').trim();

               const resolvedItems = getByPath(currentPayload, String(itemsPath));
               const items = Array.isArray(resolvedItems) ? resolvedItems : [];
               const total = items.length;
               const iterationCount = Math.min(total, maxIterations);

               if (!Array.isArray(resolvedItems)) {
                  currentPayload = {
                     ...currentPayload,
                     _error: `Loop itemsPath did not resolve to an array: ${itemsPath}`
                  };
                  results[nodeId] = currentPayload;
               }

               for (let i = 0; i < iterationCount; i++) {
                  const iterationPayload: any = structuredClone(currentPayload);
                  iterationPayload[itemAlias] = items[i];
                  iterationPayload[indexAlias] = i;
                  iterationPayload.loop = {
                     currentItem: items[i],
                     index: i,
                     total
                  };

                  if (breakCondition) {
                     try {
                        const shouldBreak = await evaluateExpression(breakCondition, iterationPayload, 2000);
                        if (shouldBreak) {
                           break;
                        }
                     } catch (e) {
                        console.error('Loop break condition evaluation error:', e);
                     }
                  }

                  for (const edge of edges) {
                     const nextPayload = structuredClone(iterationPayload);
                     results[edge.target] = nextPayload;
                     queue.push({ nodeId: edge.target, payload: nextPayload });
                  }
               }
            } else {
               for (const edge of edges) {
                  const nextPayload = structuredClone(currentPayload);
                  results[edge.target] = nextPayload;
                  queue.push({ nodeId: edge.target, payload: nextPayload });
               }
            }
         }

         setWorkflowExecutionState({ status: 'completed', currentNodeId: null, results });
         return finalPayload;
      },

      getWorkflowForSession: (sessionId) => {
        const { sessions, workflows } = get();
        const session = sessions.find(s => s.id === sessionId);
        if (session?.workflowId) {
          return workflows.find(w => w.id === session.workflowId);
        }
        return undefined;
      },

      getActiveWorkflow: () => {
         const { workflows, activeWorkflowId } = get();
         return workflows.find(w => w.id === activeWorkflowId);
      },

      updateSettings: (updates) => set((state) => {
        const settings = { ...state.settings, ...updates };
        void writeConfig('model.json', settings);
        return { settings };
      })
    })
);
