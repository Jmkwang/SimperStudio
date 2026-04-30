import { create } from 'zustand';
import { Workspace, Agent, ChatSession, ChatMessage, Workflow, Settings, MessageAttachment, MessageMeta, WorkflowConversationWindow, AgentChatWindowData } from '../types/models';
import { fetchFromModel } from '@/lib/api';
import { v4 as uuidv4 } from 'uuid';
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

function getAgentNode(workflow: Workflow | undefined, nodeId: string) {
  return workflow?.nodes_data.find((node: any) => node.id === nodeId && node.type === 'agent');
}

function findNextAgentNode(workflow: Workflow | undefined, nodeId: string) {
  if (!workflow) return undefined;

  const visited = new Set<string>();
  const queue = workflow.edges_data
    .filter((edge: any) => edge.source === nodeId)
    .map((edge: any) => edge.target);

  while (queue.length > 0) {
    const nextNodeId = queue.shift();
    if (!nextNodeId || visited.has(nextNodeId)) continue;
    visited.add(nextNodeId);

    const node = workflow.nodes_data.find((item: any) => item.id === nextNodeId);
    if (node?.type === 'agent' && node.data?.agentId) return node;

    workflow.edges_data
      .filter((edge: any) => edge.source === nextNodeId)
      .forEach((edge: any) => queue.push(edge.target));
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
  saveWorkflow: (id: string, nodes: any[], edges: any[]) => void;
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
  };
  setWorkflowExecutionState: (state: Partial<AppState['workflowExecution']>) => void;
  executeWorkflow: (workflowId: string, initialPayload: Record<string, any>) => Promise<Record<string, any>>;


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
          id: 'agent-werewolf-host',
          name: '狼人杀法官',
          avatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=werewolf-host',
          systemPrompt: '你是狼人杀游戏法官。你负责维持游戏阶段、解释规则、汇总夜晚行动、发布白天信息，并且不能泄露玩家隐藏身份。输出要清晰、简短、可执行。',
          modelProvider: 'local',
          modelId: 'default',
          temperature: 0.6,
          parameters: {},
          createdAt: Date.now(),
          industry: 'Game'
        },
        {
          id: 'agent-werewolf-wolves',
          name: '狼人阵营',
          avatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=werewolves',
          systemPrompt: '你代表狼人阵营进行策略决策。根据公开信息、存活玩家和历史发言选择夜晚袭击目标，并给出简短理由。只输出适合工作流解析的结构化决策。',
          modelProvider: 'local',
          modelId: 'default',
          temperature: 0.8,
          parameters: {},
          createdAt: Date.now(),
          industry: 'Game'
        },
        {
          id: 'agent-werewolf-seer',
          name: '预言家',
          avatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=seer',
          systemPrompt: '你是狼人杀预言家。根据局势选择查验目标，关注高嫌疑或关键发言玩家。只输出查验目标和理由，不泄露系统外信息。',
          modelProvider: 'local',
          modelId: 'default',
          temperature: 0.7,
          parameters: {},
          createdAt: Date.now(),
          industry: 'Game'
        },
        {
          id: 'agent-werewolf-witch',
          name: '女巫',
          avatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=witch',
          systemPrompt: '你是狼人杀女巫。根据夜晚死亡目标、药水状态和局势判断是否使用解药或毒药。决策要克制，避免无谓用药。',
          modelProvider: 'local',
          modelId: 'default',
          temperature: 0.7,
          parameters: {},
          createdAt: Date.now(),
          industry: 'Game'
        },
        {
          id: 'agent-werewolf-speaker',
          name: '白天发言玩家',
          avatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=day-speaker',
          systemPrompt: '你模拟狼人杀白天发言玩家。根据当前玩家身份、公开信息和历史记录生成一段自然发言。不要主动暴露隐藏身份，除非局势强烈需要。',
          modelProvider: 'local',
          modelId: 'default',
          temperature: 0.9,
          parameters: {},
          createdAt: Date.now(),
          industry: 'Game'
        },
        {
          id: 'agent-werewolf-voter',
          name: '放逐投票分析员',
          avatar: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=voter',
          systemPrompt: '你是狼人杀白天投票分析员。根据所有发言、夜晚结果和存活玩家判断最应该被放逐的目标，并给出简短理由。',
          modelProvider: 'local',
          modelId: 'default',
          temperature: 0.7,
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
          id: '2',
          workspaceId: 'default-workspace',
          title: 'UI Component Design',
          mode: 'workflow',
          workflowId: 'w1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: []
        },
        {
          id: '3',
          workspaceId: 'default-workspace',
          title: 'General Inquiry',
          mode: 'workflow',
          workflowId: 'w2',
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
             {
               id: 'trigger-1',
               type: 'trigger',
               position: { x: 100, y: 250 },
               data: { label: 'User Input' },
             },
             {
               id: 'agent-organize',
               type: 'agent',
               position: { x: 400, y: 100 },
               data: { label: '整理', agentId: 'agent-organize', prompt: '整理并组织用户输入的内容，使其结构清晰。' },
             },
             {
               id: 'agent-summary',
               type: 'agent',
               position: { x: 400, y: 400 },
               data: { label: '总结', agentId: 'agent-summary', prompt: '对用户输入的内容进行总结，提取关键信息。' },
             },
             {
               id: 'output-1',
               type: 'output',
               position: { x: 750, y: 100 },
               data: { label: '整理结果' },
             },
             {
               id: 'output-2',
               type: 'output',
               position: { x: 750, y: 400 },
               data: { label: '总结结果' },
             },
          ],
          edges_data: [
             { id: 'e-trigger-organize', source: 'trigger-1', target: 'agent-organize', animated: true },
             { id: 'e-trigger-summary', source: 'trigger-1', target: 'agent-summary', animated: true },
             { id: 'e-organize-output1', source: 'agent-organize', target: 'output-1', animated: true },
             { id: 'e-summary-output2', source: 'agent-summary', target: 'output-2', animated: true },
          ],
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          
          id: 'w1',
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
          
          id: 'w2',
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
          id: 'w4',
          workspaceId: 'default-workspace',
          name: 'Advanced Logic Loop',
          nodes_data: [
             { id: 't1', type: 'trigger', position: { x: 50, y: 250 }, data: { label: 'Start Phase' } },
             { id: 'r1', type: 'condition', position: { x: 250, y: 250 }, data: { label: 'Value Router', routes: [
                 { id: 'route-high', condition: 'payload.value > 50' },
                 { id: 'route-low', condition: 'payload.value <= 50' }
               ]
             }},
             { id: 'llm-high', type: 'agent', position: { x: 550, y: 100 }, data: {
                 label: 'High Value Processor',
                 prompt: 'Current State: {{JSON.stringify(payload)}}\n\nProcess this high value data.',
                 schema: '{"status": "string", "reason": "string"}'
             }},
             { id: 'code-high', type: 'code', position: { x: 850, y: 100 }, data: {
                 label: 'Update High',
                 code: 'payload.processed = true; payload.path = "high"; return payload;'
             }},
             { id: 'llm-low', type: 'agent', position: { x: 550, y: 400 }, data: {
                 label: 'Low Value Processor',
                 prompt: 'Current State: {{JSON.stringify(payload)}}\n\nProcess this low value data.',
                 schema: '{"status": "string", "reason": "string"}'
             }},
             { id: 'code-low', type: 'code', position: { x: 850, y: 400 }, data: {
                 label: 'Update Low',
                 code: 'payload.processed = true; payload.path = "low"; return payload;'
             }},
             { id: 'out-high', type: 'output', position: { x: 1150, y: 100 }, data: { label: 'Result (High)' } },
             { id: 'out-low', type: 'output', position: { x: 1150, y: 400 }, data: { label: 'Result (Low)' } }
          ],
          edges_data: [
             { id: 'e1', source: 't1', target: 'r1', animated: true },
             { id: 'e2', source: 'r1', sourceHandle: 'route-high', target: 'llm-high', animated: true },
             { id: 'e3', source: 'r1', sourceHandle: 'route-low', target: 'llm-low', animated: true },
             { id: 'e4', source: 'llm-high', target: 'code-high', animated: true },
             { id: 'e5', source: 'code-high', target: 'out-high', animated: true },
             { id: 'e6', source: 'llm-low', target: 'code-low', animated: true },
             { id: 'e7', source: 'code-low', target: 'out-low', animated: true }
          ],
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'werewolf-standard-workflow',
          workspaceId: 'default-workspace',
          name: '狼人杀 · 标准局工作流',
          nodes_data: [
             { id: 'ww-trigger', type: 'trigger', position: { x: 50, y: 360 }, data: { label: '开始 / 输入局势' } },
             { id: 'ww-init', type: 'code', position: { x: 300, y: 360 }, data: {
                 label: '初始化局势',
                 code: 'payload.players = Array.isArray(payload.players) && payload.players.length ? payload.players : [{id:"p1", name:"1号", role:"werewolf", status:"alive"}, {id:"p2", name:"2号", role:"werewolf", status:"alive"}, {id:"p3", name:"3号", role:"seer", status:"alive"}, {id:"p4", name:"4号", role:"witch", status:"alive", potions:{heal:true, poison:true}}, {id:"p5", name:"5号", role:"villager", status:"alive"}, {id:"p6", name:"6号", role:"villager", status:"alive"}]; payload.phase = payload.phase || "night"; payload.round = payload.round || 1; payload.gameStatus = payload.gameStatus || "playing"; payload.publicLog = payload.publicLog || []; payload.privateLog = payload.privateLog || []; payload.daySpeeches = payload.daySpeeches || []; payload.alivePlayers = payload.players.filter(p => p.status === "alive"); return payload;'
             }},
             { id: 'ww-phase-router', type: 'condition', position: { x: 570, y: 360 }, data: { label: '阶段路由', routes: [
                 { id: 'route-night', condition: 'payload.gameStatus === "playing" && payload.phase === "night"' },
                 { id: 'route-day-speech', condition: 'payload.gameStatus === "playing" && payload.phase === "day_speech"' },
                 { id: 'route-day-vote', condition: 'payload.gameStatus === "playing" && payload.phase === "day_vote"' },
                 { id: 'route-end', condition: 'payload.gameStatus !== "playing"' }
               ]
             }},
             { id: 'ww-wolves', type: 'agent', position: { x: 900, y: 40 }, data: {
                 label: '狼人夜袭',
                 agentId: 'agent-werewolf-wolves',
                 prompt: '当前局势：{{JSON.stringify(payload)}}\n\n请狼人阵营从存活玩家中选择夜晚袭击目标。输出 targetId 和 reason。',
                 schema: '{"targetId":"string","reason":"string"}'
             }},
             { id: 'ww-save-wolves', type: 'code', position: { x: 1210, y: 40 }, data: {
                 label: '记录夜袭',
                 code: 'payload.nightState = payload.nightState || {}; payload.nightState.wolfTarget = payload.llmResult?.targetId || payload.alivePlayers.find(p => p.role !== "werewolf")?.id; payload.privateLog.push({round: payload.round, phase:"night", actor:"werewolves", action:"kill", targetId: payload.nightState.wolfTarget, reason: payload.llmResult?.reason || ""}); return payload;'
             }},
             { id: 'ww-seer', type: 'agent', position: { x: 1520, y: 40 }, data: {
                 label: '预言家查验',
                 agentId: 'agent-werewolf-seer',
                 prompt: '当前局势：{{JSON.stringify(payload)}}\n\n请预言家选择一个存活玩家查验身份。输出 targetId 和 reason。',
                 schema: '{"targetId":"string","reason":"string"}'
             }},
             { id: 'ww-save-seer', type: 'code', position: { x: 1830, y: 40 }, data: {
                 label: '记录查验',
                 code: 'payload.nightState = payload.nightState || {}; const targetId = payload.llmResult?.targetId || payload.alivePlayers.find(p => p.role !== "seer")?.id; const target = payload.players.find(p => p.id === targetId); payload.nightState.seerCheck = targetId; payload.privateLog.push({round: payload.round, phase:"night", actor:"seer", action:"check", targetId, result: target?.role === "werewolf" ? "werewolf" : "good", reason: payload.llmResult?.reason || ""}); return payload;'
             }},
             { id: 'ww-witch', type: 'agent', position: { x: 2140, y: 40 }, data: {
                 label: '女巫用药',
                 agentId: 'agent-werewolf-witch',
                 prompt: '当前局势：{{JSON.stringify(payload)}}\n\n狼人目标是 {{payload.nightState.wolfTarget}}。请女巫判断是否使用解药或毒药。输出 useHeal、poisonTargetId 和 reason。',
                 schema: '{"useHeal":"boolean","poisonTargetId":"string|null","reason":"string"}'
             }},
             { id: 'ww-save-witch', type: 'code', position: { x: 2450, y: 40 }, data: {
                 label: '记录女巫',
                 code: 'payload.nightState = payload.nightState || {}; const witch = payload.players.find(p => p.role === "witch"); const canHeal = witch?.potions?.heal !== false; const canPoison = witch?.potions?.poison !== false; payload.nightState.witchHeal = Boolean(payload.llmResult?.useHeal && canHeal); payload.nightState.witchPoison = canPoison ? payload.llmResult?.poisonTargetId : null; if (witch && payload.nightState.witchHeal) witch.potions = {...witch.potions, heal:false}; if (witch && payload.nightState.witchPoison) witch.potions = {...witch.potions, poison:false}; payload.privateLog.push({round: payload.round, phase:"night", actor:"witch", action:"potion", heal: payload.nightState.witchHeal, poisonTargetId: payload.nightState.witchPoison, reason: payload.llmResult?.reason || ""}); return payload;'
             }},
             { id: 'ww-resolve-night', type: 'code', position: { x: 2760, y: 40 }, data: {
                 label: '结算夜晚',
                 code: 'const s = payload.nightState || {}; const deaths = new Set(); if (s.wolfTarget && !s.witchHeal) deaths.add(s.wolfTarget); if (s.witchPoison) deaths.add(s.witchPoison); deaths.forEach(id => { const player = payload.players.find(p => p.id === id); if (player) player.status = "dead"; }); payload.lastNightDeaths = Array.from(deaths); payload.publicLog.push({round: payload.round, phase:"night_result", deaths: payload.lastNightDeaths}); const wolves = payload.players.filter(p => p.role === "werewolf" && p.status === "alive").length; const goods = payload.players.filter(p => p.role !== "werewolf" && p.status === "alive").length; if (wolves === 0) payload.gameStatus = "good_wins"; else if (wolves >= goods) payload.gameStatus = "wolves_win"; else payload.phase = "day_speech"; payload.alivePlayers = payload.players.filter(p => p.status === "alive"); return payload;'
             }},
             { id: 'ww-night-output', type: 'output', position: { x: 3070, y: 40 }, data: { label: '夜晚结果' } },
             { id: 'ww-prepare-speech', type: 'code', position: { x: 900, y: 350 }, data: {
                 label: '准备逐人发言',
                 code: 'payload.alivePlayers = payload.players.filter(p => p.status === "alive"); payload.daySpeeches = []; payload.publicLog.push({round: payload.round, phase:"day_speech_start", alivePlayers: payload.alivePlayers.map(p => p.id), lastNightDeaths: payload.lastNightDeaths || []}); return payload;'
             }},
             { id: 'ww-speech-loop', type: 'loop', position: { x: 1210, y: 350 }, data: {
                 label: '存活玩家逐人发言',
                 itemsPath: 'payload.alivePlayers',
                 itemAlias: 'currentPlayer',
                 indexAlias: 'speakerIndex',
                 maxIterations: 12,
                 breakCondition: 'payload.gameStatus !== "playing"'
             }},
             { id: 'ww-player-speech', type: 'agent', position: { x: 1520, y: 350 }, data: {
                 label: '生成玩家发言',
                 agentId: 'agent-werewolf-speaker',
                 prompt: '当前发言玩家：{{JSON.stringify(payload.currentPlayer)}}\n当前公开局势：{{JSON.stringify(payload.publicLog)}}\n存活玩家：{{JSON.stringify(payload.alivePlayers)}}\n\n请生成该玩家白天发言。输出 speech 和 suspicion。',
                 schema: '{"speech":"string","suspicion":"string"}'
             }},
             { id: 'ww-collect-speech', type: 'code', position: { x: 1830, y: 350 }, data: {
                 label: '记录发言',
                 code: 'payload.daySpeeches = payload.daySpeeches || []; payload.daySpeeches.push({playerId: payload.currentPlayer?.id, playerName: payload.currentPlayer?.name, speech: payload.llmResult?.speech || "发言略", suspicion: payload.llmResult?.suspicion || ""}); payload.publicLog.push({round: payload.round, phase:"day_speech", playerId: payload.currentPlayer?.id, speech: payload.llmResult?.speech || "发言略"}); payload.phase = "day_vote"; return payload;'
             }},
             { id: 'ww-speech-output', type: 'output', position: { x: 2140, y: 350 }, data: { label: '白天发言记录' } },
             { id: 'ww-voter', type: 'agent', position: { x: 900, y: 660 }, data: {
                 label: '放逐投票',
                 agentId: 'agent-werewolf-voter',
                 prompt: '当前局势：{{JSON.stringify(payload)}}\n\n请根据白天发言和公开信息，选择最应该被放逐的玩家。输出 targetId 和 reason。',
                 schema: '{"targetId":"string","reason":"string"}'
             }},
             { id: 'ww-resolve-vote', type: 'code', position: { x: 1210, y: 660 }, data: {
                 label: '结算放逐',
                 code: 'const targetId = payload.llmResult?.targetId || payload.alivePlayers.find(p => p.role === "werewolf")?.id || payload.alivePlayers[0]?.id; const target = payload.players.find(p => p.id === targetId); if (target) target.status = "dead"; payload.publicLog.push({round: payload.round, phase:"vote", exiled: targetId, reason: payload.llmResult?.reason || ""}); const wolves = payload.players.filter(p => p.role === "werewolf" && p.status === "alive").length; const goods = payload.players.filter(p => p.role !== "werewolf" && p.status === "alive").length; if (wolves === 0) payload.gameStatus = "good_wins"; else if (wolves >= goods) payload.gameStatus = "wolves_win"; else { payload.phase = "night"; payload.round = (payload.round || 1) + 1; } payload.alivePlayers = payload.players.filter(p => p.status === "alive"); return payload;'
             }},
             { id: 'ww-vote-output', type: 'output', position: { x: 1520, y: 660 }, data: { label: '投票结果 / 下一夜' } },
             { id: 'ww-host-summary', type: 'agent', position: { x: 900, y: 900 }, data: {
                 label: '法官终局播报',
                 agentId: 'agent-werewolf-host',
                 prompt: '当前局势：{{JSON.stringify(payload)}}\n\n游戏已经结束。请作为法官生成终局播报，说明获胜阵营、关键死亡和最终存活玩家。',
                 schema: '{"summary":"string"}'
             }},
             { id: 'ww-end-output', type: 'output', position: { x: 1210, y: 900 }, data: { label: '游戏结束' } }
          ],
          edges_data: [
             { id: 'ww-e-start-init', source: 'ww-trigger', target: 'ww-init', animated: true },
             { id: 'ww-e-init-router', source: 'ww-init', target: 'ww-phase-router', animated: true },
             { id: 'ww-e-router-night', source: 'ww-phase-router', sourceHandle: 'route-night', target: 'ww-wolves', animated: true },
             { id: 'ww-e-wolves-save', source: 'ww-wolves', target: 'ww-save-wolves', animated: true },
             { id: 'ww-e-save-seer', source: 'ww-save-wolves', target: 'ww-seer', animated: true },
             { id: 'ww-e-seer-save', source: 'ww-seer', target: 'ww-save-seer', animated: true },
             { id: 'ww-e-save-witch', source: 'ww-save-seer', target: 'ww-witch', animated: true },
             { id: 'ww-e-witch-save', source: 'ww-witch', target: 'ww-save-witch', animated: true },
             { id: 'ww-e-save-resolve-night', source: 'ww-save-witch', target: 'ww-resolve-night', animated: true },
             { id: 'ww-e-night-output', source: 'ww-resolve-night', target: 'ww-night-output', animated: true },
             { id: 'ww-e-router-speech', source: 'ww-phase-router', sourceHandle: 'route-day-speech', target: 'ww-prepare-speech', animated: true },
             { id: 'ww-e-prepare-loop', source: 'ww-prepare-speech', target: 'ww-speech-loop', animated: true },
             { id: 'ww-e-loop-speech', source: 'ww-speech-loop', target: 'ww-player-speech', animated: true },
             { id: 'ww-e-speech-collect', source: 'ww-player-speech', target: 'ww-collect-speech', animated: true },
             { id: 'ww-e-collect-output', source: 'ww-collect-speech', target: 'ww-speech-output', animated: true },
             { id: 'ww-e-router-vote', source: 'ww-phase-router', sourceHandle: 'route-day-vote', target: 'ww-voter', animated: true },
             { id: 'ww-e-voter-resolve', source: 'ww-voter', target: 'ww-resolve-vote', animated: true },
             { id: 'ww-e-vote-output', source: 'ww-resolve-vote', target: 'ww-vote-output', animated: true },
             { id: 'ww-e-router-end', source: 'ww-phase-router', sourceHandle: 'route-end', target: 'ww-host-summary', animated: true },
             { id: 'ww-e-end-output', source: 'ww-host-summary', target: 'ww-end-output', animated: true }
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
        results: {}
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
        const newMessage: ChatMessage = {
          id: uuidv4(),
          sessionId,
          role: 'user',
          content: { text, attachments },
          meta,
          timestamp: Date.now()
        };

        try {
            const msgToSave = {...newMessage, content: JSON.stringify(newMessage.content)};
            await invoke('add_chat_message', { message: msgToSave });
            
            set((state) => {
                const sessions = state.sessions.map(s => {
                  if (s.id === sessionId) {
                    return { ...s, messages: [...s.messages, newMessage], updatedAt: Date.now() };
                  }
                  return s;
                });
                return { sessions };
            });
        } catch (error) {
            console.error('Failed to add user message:', error);
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
                   // Create new assistant message block
                   newAssistantMsg = {
                     id: messageId,
                     sessionId,
                     role: 'assistant',
                     content: { text: '' },
                     meta,
                     agentResponses: [{
                       agentId,
                       nodeId,
                       content: { text: textChunk },
                       status: 'streaming',
                       timestamp: Date.now()
                     }],
                     timestamp: Date.now()
                   };
                   messages.push(newAssistantMsg);
                } else {
                  // Update existing assistant message block
                  const msg = { ...messages[assistantMsgIndex] };
                  msg.agentResponses = [...(msg.agentResponses || [])];

                  const agentRespIndex = msg.agentResponses.findIndex(ar => ar.agentId === agentId && ar.nodeId === nodeId);
                  if (agentRespIndex === -1) {
                    msg.agentResponses.push({
                       agentId,
                       nodeId,
                       content: { text: textChunk },
                       status: 'streaming',
                       timestamp: Date.now()
                    });
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
                 const cleanNodes = nodes.map((n: any) => ({
                   id: n.id,
                   type: n.type,
                   position: n.position,
                   data: {
                     label: n.data?.label,
                     agentId: n.data?.agentId,
                     prompt: n.data?.prompt,
                     routes: n.data?.routes,
                     code: n.data?.code,
                     itemsPath: n.data?.itemsPath,
                     itemAlias: n.data?.itemAlias,
                     indexAlias: n.data?.indexAlias,
                     maxIterations: n.data?.maxIterations,
                     breakCondition: n.data?.breakCondition,
                     autoSendToNext: n.data?.autoSendToNext
                   }
                 }));
                 const cleanEdges = edges.map((e: any) => ({
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

      executeWorkflow: async (workflowId, initialPayload) => {
         const { workflows, setWorkflowExecutionState } = get();
         const workflow = workflows.find(w => w.id === workflowId);

         if (!workflow) return initialPayload;

         setWorkflowExecutionState({ status: 'running', currentNodeId: null, results: {} });

         const triggerNode = workflow.nodes_data.find((n: any) => n.type === 'trigger');

         if (!triggerNode) {
            setWorkflowExecutionState({ status: 'error' });
            return initialPayload;
         }

         type ExecutionFrame = {
            nodeId: string;
            payload: any;
         };

         let queue: ExecutionFrame[] = [
            { nodeId: triggerNode.id, payload: structuredClone(initialPayload) }
         ];

         let results: Record<string, any> = {
            [triggerNode.id]: structuredClone(initialPayload)
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

         const MAX_WORKFLOW_STEPS = 1000;
         let stepCounter = 0;

         while (queue.length > 0) {
            const frame = queue.shift()!;
            const nodeId = frame.nodeId;
            const node = workflow.nodes_data.find((n: any) => n.id === nodeId);
            let currentPayload = structuredClone(frame.payload);

            stepCounter += 1;
            if (stepCounter > MAX_WORKFLOW_STEPS) {
               setWorkflowExecutionState({ status: 'error', currentNodeId: null, results });
               return finalPayload;
            }

            setWorkflowExecutionState({ currentNodeId: nodeId, results });

            await new Promise(r => setTimeout(r, 400));

            if (node?.type === 'output') {
               finalPayload = currentPayload;
               results[nodeId] = currentPayload;
               continue;
            }

            if (node?.type === 'agent') {
               console.log('Simulating Agent inference with prompt:', node.data?.prompt);
               let parsedOutput = {};
               try {
                  if (node.data?.schema) {
                     const schemaStr = node.data.schema;
                     if (schemaStr.includes('targetId')) parsedOutput = { targetId: 'player_3', reason: 'simulated logic' };
                     else parsedOutput = { result: 'simulated' };

                     currentPayload = {
                        ...currentPayload,
                        llmResult: parsedOutput
                     };
                  } else {
                     currentPayload = {
                        ...currentPayload,
                        output: `[Agent Output for ${node.data?.label || 'Agent'}]: processed input.`
                     };
                  }
               } catch (e) {
                  console.error('Agent execution error:', e);
               }
            } else if (node?.type === 'code') {
               try {
                  const jsCode = `
                     try {
                        ${node.data?.code || 'return payload;'}
                     } catch(e) {
                        console.error('Code node execution error:', e);
                        return { ...payload, _error: e.message };
                     }
                  `;
                  const executeFn = new AsyncFunction('payload', jsCode);
                  const safePayload = structuredClone(currentPayload);

                  const resultPayload = await withTimeout(
                     executeFn(safePayload),
                     10000,
                     'Code execution timed out after 10s'
                  );

                  currentPayload = resultPayload || currentPayload;
               } catch (e: any) {
                  console.error('Code compilation error:', e);
                  currentPayload = { ...currentPayload, _error: e.message };
               }
            }

            results[nodeId] = currentPayload;
            const edges = workflow.edges_data.filter((e: any) => e.source === nodeId);

            if (node?.type === 'condition' && node.data?.routes) {
               let matchedRouteId = null;

               for (const route of node.data.routes) {
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
            } else if (node?.type === 'loop') {
               const itemsPath = node.data?.itemsPath || 'payload.alivePlayers';
               const itemAlias = node.data?.itemAlias || 'item';
               const indexAlias = node.data?.indexAlias || 'index';
               const maxIterationsValue = Number(node.data?.maxIterations);
               const maxIterations = maxIterationsValue > 0 ? maxIterationsValue : 20;
               const breakCondition = node.data?.breakCondition?.trim();

               const resolvedItems = getByPath(currentPayload, itemsPath);
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
                  const iterationPayload = structuredClone(currentPayload);
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
