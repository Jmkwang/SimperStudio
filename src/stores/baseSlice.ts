import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { v4 as uuidv4 } from 'uuid';
import { Workspace, Agent, ChatSession, Settings, Workflow, ChatMessage, ModelProvider, AgentCategory } from '../types/models';
import { debugLogger } from '@/lib/debugLogger';

const LS_KEY = 'simper_config';

/** Safe wrapper: checks that the Tauri IPC bridge is available before invoking */
async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) {
    throw new Error(`Tauri runtime not available (cmd: ${cmd})`);
  }
  return tauriInvoke<T>(cmd, args);
}

/** Fallback avatar mapping for built-in agents whose avatar may be missing in SQLite */
const DEFAULT_AVATAR_MAP: Record<string, string> = {
  'agent-organize': '/avatars/organize.svg',
  'agent-summary': '/avatars/summary.svg',
  'agent-1': '/avatars/architect.svg',
  'agent-2': '/avatars/reviewer.svg',
  'ww-host': '/avatars/judge.svg',
  'ww-wolf-shadow': '/avatars/shadow-wolf.svg',
  'ww-wolf-fury': '/avatars/fury-wolf.svg',
  'ww-seer': '/avatars/star-seer.svg',
  'ww-witch': '/avatars/poison-witch.svg',
  'ww-guard': '/avatars/iron-guard.svg',
  'ww-hunter': '/avatars/flame-hunter.svg',
  'ww-villager': '/avatars/sage-villager.svg',
};

export async function readConfig<T>(name: string): Promise<T | null> {
  let tauriRaw: string | null = null;
  try {
    tauriRaw = await invoke<string>('read_json_config', { name });
    if (tauriRaw) {
      return JSON.parse(tauriRaw) as T;
    }
  } catch {
    /* Tauri backend unavailable — fall through to localStorage */ }
  // Fallback: read from localStorage when Tauri is unavailable or key missing
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    const val = all[name] as T;
    return val ?? null;
  } catch {
    return null;
  }
}

export async function writeConfig(name: string, value: unknown) {
  const payload = JSON.stringify(value);
  try {
    await invoke('write_json_config', { name, value: payload });
  } catch (e) {
    console.warn(`Tauri write_json_config failed for "${name}", falling back to localStorage`, e);
    debugLogger.warn('baseSlice', `writeConfig fallback for "${name}"`, { error: String(e) });
    try {
      const all = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      all[name] = value;
      localStorage.setItem(LS_KEY, JSON.stringify(all));
    } catch (lsErr) {
      console.error(`localStorage fallback failed for "${name}"`, lsErr);
      debugLogger.error('baseSlice', `localStorage fallback failed for "${name}"`, { error: String(lsErr) });
    }
  }
}

export interface BaseSlice {
  workspaces: Workspace[];
  agents: Agent[];
  agentCategories: AgentCategory[];

  addWorkspace: (name: string, description?: string) => void;
  addAgent: (agent: Omit<Agent, 'id' | 'createdAt'>) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
  updateAgent: (id: string, updates: Partial<Agent>) => Promise<void>;
  batchUpdateAgents: (ids: string[], updates: Partial<Agent>) => Promise<{ successCount: number; failedIds: string[] }>;
  addAgentCategory: (category: Omit<AgentCategory, 'id' | 'createdAt'>) => void;
  fetchInitialData: () => Promise<void>;
}

function normalizeSession(session: ChatSession): ChatSession {
  return {
    ...session,
    mode: session.mode || (session.workflowId ? 'workflow' : 'single'),
    messages: session.messages || [],
  };
}

/**
 * Migrate legacy Agent configs to the new multi-provider routing system.
 * Maps old `modelProvider` enum to new `providerId` referencing a configured provider.
 * Agents that already have `providerId` are left untouched.
 */
function migrateAgent(agent: Agent, providers: ModelProvider[]): Agent {
  let migrated = { ...agent };

  // Migrate dicebear external URLs to local SVG avatars
  if (agent.avatar?.includes('dicebear.com')) {
    const seedMap: Record<string, string> = {
      organize: '/avatars/organize.svg',
      summary: '/avatars/summary.svg',
      architect: '/avatars/architect.svg',
      reviewer: '/avatars/reviewer.svg',
      'host-judge': '/avatars/judge.svg',
      'shadow-wolf': '/avatars/shadow-wolf.svg',
      'fury-wolf': '/avatars/fury-wolf.svg',
      'star-seer': '/avatars/star-seer.svg',
      'poison-witch': '/avatars/poison-witch.svg',
      'iron-guard': '/avatars/iron-guard.svg',
      'flame-hunter': '/avatars/flame-hunter.svg',
      'sage-villager': '/avatars/sage-villager.svg',
    };
    const seed = new URL(agent.avatar).searchParams.get('seed');
    if (seed && seedMap[seed]) {
      migrated.avatar = seedMap[seed];
    }
  }

  if (migrated.providerId) return migrated;

  const typeMap: Record<string, string> = {
    openai: 'openai',
    anthropic: 'anthropic',
    google: 'gemini',
    gemini: 'gemini',
    siliconflow: 'siliconflow',
    custom: 'custom',
  };

  if (migrated.modelProvider && migrated.modelProvider !== 'local') {
    const targetType = typeMap[migrated.modelProvider];
    if (targetType) {
      const provider = providers.find((p) => p.type === targetType);
      if (provider) {
        return { ...migrated, providerId: provider.id };
      }
    }
  }

  // 'local' or unmapped: leave providerId empty so it falls back to global activeProvider
  return migrated;
}

/**
 * Build the payload sent to the Rust `add_agent` / `update_agent` commands.
 * The Rust Agent struct uses `#[serde(rename_all = "camelCase")]`, so keys MUST be
 * camelCase. Required fields (modelProvider/modelId/temperature) must never be
 * undefined or the backend deserialization fails and the save is rejected.
 */
function buildAgentPayload(agent: Agent) {
  return {
    ...agent,
    avatar: agent.avatar ?? '',
    systemPrompt: agent.systemPrompt ?? '',
    modelProvider: agent.modelProvider || 'local',
    modelId: agent.modelId || 'default',
    providerId: agent.providerId ?? null,
    maxTokens: agent.maxTokens ?? null,
    temperature: agent.temperature ?? 0.7,
    parameters: typeof agent.parameters === 'string' ? agent.parameters : JSON.stringify(agent.parameters || {}),
    createdAt: agent.createdAt ?? Date.now(),
  };
}

export function createBaseSlice(set: any, get: any): BaseSlice {
  return {
    workspaces: [
      {
        id: 'default-workspace',
        name: 'Personal Workspace',
        description: 'Default personal workspace',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ],
    agentCategories: [
      { id: 'cat-general', name: 'General', createdAt: Date.now() },
      { id: 'cat-technology', name: 'Technology', createdAt: Date.now() },
      { id: 'cat-game', name: 'Game', createdAt: Date.now() },
    ],
    agents: [
      {
        id: 'agent-organize', name: '整理助手',
        avatar: '/avatars/organize.svg',
        systemPrompt: '你是一个文本整理助手，负责整理和组织用户输入的内容，使其结构清晰、层次分明。',
        modelProvider: 'local', modelId: 'default', temperature: 0.7, parameters: {}, createdAt: Date.now(), industry: 'General'
      },
      {
        id: 'agent-summary', name: '总结助手',
        avatar: '/avatars/summary.svg',
        systemPrompt: '你是一个文本总结助手，负责对用户输入的内容进行总结，提取关键信息和要点。',
        modelProvider: 'local', modelId: 'default', temperature: 0.7, parameters: {}, createdAt: Date.now(), industry: 'General'
      },
      {
        id: 'agent-1', name: 'System Architect',
        avatar: '/avatars/architect.svg',
        systemPrompt: 'You are a system architect.',
        modelProvider: 'local', modelId: 'default', temperature: 0.7, parameters: {}, createdAt: Date.now(), industry: 'Technology'
      },
      {
        id: 'agent-2', name: 'Code Reviewer',
        avatar: '/avatars/reviewer.svg',
        systemPrompt: 'You are a strict code reviewer.',
        modelProvider: 'local', modelId: 'default', temperature: 0.7, parameters: {}, createdAt: Date.now(), industry: 'Technology'
      },
      {
        id: 'ww-host', name: '法官·铁面',
        avatar: '/avatars/judge.svg',
        systemPrompt: '你是狼人杀法官，性格铁面无私、语言简洁有力。你负责维持游戏阶段、解释规则、汇总夜晚行动、发布白天信息，并且不能泄露玩家隐藏身份。输出要清晰、简短、可执行。遇到违规行为直接警告。',
        modelProvider: 'local', modelId: 'default', temperature: 0.4, parameters: {}, createdAt: Date.now(), industry: 'Game'
      },
      {
        id: 'ww-wolf-shadow', name: '狼人·暗影',
        avatar: '/avatars/shadow-wolf.svg',
        systemPrompt: '你是狼人阵营的"暗影"，性格阴险狡诈、善于伪装。你擅长在白天发言中装作无辜平民，喜欢嫁祸给可疑的玩家。夜晚袭击时你倾向于选择最有威胁的好人角色。输出结构化决策，包含 targetId 和详细 reason。',
        modelProvider: 'local', modelId: 'default', temperature: 0.85, parameters: {}, createdAt: Date.now(), industry: 'Game'
      },
      {
        id: 'ww-wolf-fury', name: '狼人·狂怒',
        avatar: '/avatars/fury-wolf.svg',
        systemPrompt: '你是狼人阵营的"狂怒"，性格冲动好斗、喜欢激进策略。你不怕暴露身份，倾向于直接攻击发言最多的玩家。你的投票风格激进，喜欢带节奏。输出结构化决策，包含 targetId 和 reason。',
        modelProvider: 'local', modelId: 'default', temperature: 0.95, parameters: {}, createdAt: Date.now(), industry: 'Game'
      },
      {
        id: 'ww-seer', name: '预言家·星眸',
        avatar: '/avatars/star-seer.svg',
        systemPrompt: '你是狼人杀预言家"星眸"，性格冷静理性、逻辑严密。你注重数据和推理，选择查验目标时关注高嫌疑或关键发言玩家。你的发言风格条理清晰，喜欢列举证据。只输出查验目标和理由，不泄露系统外信息。',
        modelProvider: 'local', modelId: 'default', temperature: 0.6, parameters: {}, createdAt: Date.now(), industry: 'Game'
      },
      {
        id: 'ww-witch', name: '女巫·毒心',
        avatar: '/avatars/poison-witch.svg',
        systemPrompt: '你是狼人杀女巫"毒心"，性格精于算计、善于观察。你用药果断但不浪费，解药只在关键时刻使用，毒药留给高度确定的狼人。你善于从夜晚死亡信息推断狼人身份。输出 useHeal、poisonTargetId 和 reason。',
        modelProvider: 'local', modelId: 'default', temperature: 0.7, parameters: {}, createdAt: Date.now(), industry: 'Game'
      },
      {
        id: 'ww-guard', name: '守卫·铁壁',
        avatar: '/avatars/iron-guard.svg',
        systemPrompt: '你是狼人杀守卫"铁壁"，性格忠诚守护、直觉敏锐。你倾向于保护关键角色（如预言家），连续两晚不守同一人。你善于从投票和发言中判断谁是狼人的目标。输出 protectTargetId 和 reason。',
        modelProvider: 'local', modelId: 'default', temperature: 0.65, parameters: {}, createdAt: Date.now(), industry: 'Game'
      },
      {
        id: 'ww-hunter', name: '猎人·烈焰',
        avatar: '/avatars/flame-hunter.svg',
        systemPrompt: '你是狼人杀猎人"烈焰"，性格勇猛果断、不惧牺牲。你投票时直觉优先，喜欢投给看起来最可疑的人。如果你被杀，你会选择带走你认为最可疑的玩家。输出 voteTargetId 和 reason。',
        modelProvider: 'local', modelId: 'default', temperature: 0.8, parameters: {}, createdAt: Date.now(), industry: 'Game'
      },
      {
        id: 'ww-villager', name: '平民·智者',
        avatar: '/avatars/sage-villager.svg',
        systemPrompt: '你是狼人杀平民"智者"，性格善于观察、逻辑清晰。你擅长从其他玩家的发言中找破绽和矛盾，喜欢用推理说服他人。你的投票基于发言分析，不轻易跟风。输出 voteTargetId 和详细的推理 reason。',
        modelProvider: 'local', modelId: 'default', temperature: 0.75, parameters: {}, createdAt: Date.now(), industry: 'Game'
      }
    ],

    addWorkspace: async (name, description = '') => {
      const newWorkspace: Workspace = {
        id: uuidv4(), name, description,
        createdAt: Date.now(), updatedAt: Date.now()
      };
      try {
        await invoke('add_workspace', { workspace: newWorkspace });
        set((state: any) => ({ workspaces: [...state.workspaces, newWorkspace] }));
      } catch (error) {
        console.error('Failed to add workspace', error);
        debugLogger.error('baseSlice', 'addWorkspace failed', { error: String(error) });
      }
    },

    addAgent: async (agentData) => {
      const newAgent: Agent = {
        ...agentData,
        id: uuidv4(),
        createdAt: Date.now()
      };
      try {
        const agentToSave = {
          ...newAgent,
          // Rust Agent struct uses camelCase serde; required fields must never be undefined/null
          modelProvider: newAgent.modelProvider || 'local',
          modelId: newAgent.modelId || 'default',
          providerId: newAgent.providerId,
          temperature: newAgent.temperature ?? 0.7,
          parameters: JSON.stringify(newAgent.parameters || {}),
        };
        await invoke('add_agent', { agent: agentToSave });
      } catch (error) {
        console.error('Failed to persist agent to DB, using in-memory only:', error);
        debugLogger.error('baseSlice', 'addAgent persist failed', { error: String(error) });
        // Continue — save to store even if Tauri backend is unavailable
      }
      const nextAgents = [...get().agents, newAgent];
      set({ agents: nextAgents });
    },

    deleteAgent: async (id) => {
      try {
        await invoke('delete_agent', { id });
      } catch (error) {
        console.error('Failed to delete agent from DB:', error);
      }
      set((state: any) => ({ agents: state.agents.filter((a: Agent) => a.id !== id) }));
    },

    updateAgent: async (id, updates) => {
      const { agents } = get();
      const agent = agents.find((a: Agent) => a.id === id);
      if (!agent) return;
      const updatedAgent = { ...agent, ...updates };
      try {
        await invoke('update_agent', { agent: buildAgentPayload(updatedAgent) });
      } catch (e) {
        console.error('Failed to update agent in DB:', e);
        debugLogger.error('baseSlice', 'updateAgent DB failed', { agentId: id, error: String(e) });
        throw e;
      }
      const nextAgents = agents.map((a: Agent) =>
        a.id === id ? updatedAgent : a
      );
      set({ agents: nextAgents });
    },

    batchUpdateAgents: async (ids, updates) => {
      const { agents } = get();
      const idSet = new Set(ids);
      const agentsToUpdate = agents.filter((a: Agent) => idSet.has(a.id));
      const failedIds: string[] = [];
      for (const agent of agentsToUpdate) {
        const updatedAgent = { ...agent, ...updates };
        try {
          await invoke('update_agent', { agent: buildAgentPayload(updatedAgent) });
        } catch (e) {
          // Tauri backend unavailable (e.g. npm run dev browser mode) — continue with in-memory update
          debugLogger.warn('baseSlice', 'batchUpdateAgents DB persist skipped', { agentId: agent.id, error: String(e) });
        }
      }
      // Always update in-memory store regardless of DB result (matches addAgent behavior)
      const nextAgents = agents.map((agent: Agent) =>
        idSet.has(agent.id) ? { ...agent, ...updates } : agent
      );
      set({ agents: nextAgents });
      return { successCount: agentsToUpdate.length, failedIds };
    },

    addAgentCategory: (categoryData) => set((state: any) => {
      const newCategory: AgentCategory = {
        ...categoryData,
        id: uuidv4(),
        createdAt: Date.now()
      };
      const nextCategories = [...state.agentCategories, newCategory];
      void writeConfig('agent_categories.json', nextCategories);
      return { agentCategories: nextCategories };
    }),

    fetchInitialData: async () => {
      try {
        const modelConfig = await readConfig<Settings>('model.json');
        const agentsConfig = await readConfig<Agent[]>('agents.json');
        const workflowsConfig = await readConfig<Workflow[]>('workflow.json');

        if (modelConfig) {
          set((_st: any) => ({
            settings: {
              ..._st.settings,
              ...modelConfig,
              providers: modelConfig.providers?.length ? modelConfig.providers : _st.settings.providers,
            }
          }));
        }
        const categoriesConfig = await readConfig<AgentCategory[]>('agent_categories.json');
        if (categoriesConfig?.length) {
          set({ agentCategories: categoriesConfig });
        }

        // SQLite is the single source of truth for agents
        const agents = await invoke<Agent[]>('get_agents');
        if (agents.length) {
          const parsedAgents = agents.map((a: any) => ({
            ...a,
            avatar: a.avatar || DEFAULT_AVATAR_MAP[a.id] || '',
            parameters: typeof a.parameters === 'string' ? JSON.parse(a.parameters) : a.parameters,
          }));
          // Ensure built-in agents are always present
          const existingIds = new Set(parsedAgents.map((a: Agent) => a.id));
          const defaults = get().agents as Agent[];
          const missingDefaults = defaults.filter((a: Agent) => !existingIds.has(a.id));
          if (missingDefaults.length) {
            for (const da of missingDefaults) {
              try {
                const agentToSave = { ...da, parameters: JSON.stringify(da.parameters || {}) };
                await invoke('add_agent', { agent: buildAgentPayload(agentToSave) });
              } catch { /* best-effort */ }
            }
            set({ agents: [...parsedAgents, ...missingDefaults] });
          } else {
            set({ agents: parsedAgents });
          }
        } else if (agentsConfig?.length) {
          // Fallback to JSON only for legacy migration
          const providers = modelConfig?.providers || [];
          const migratedAgents = agentsConfig.map((a: Agent) => migrateAgent(a, providers));
          set({ agents: migratedAgents });
          // Migrate legacy JSON agents to SQLite
          for (const agent of migratedAgents) {
            try {
              const agentToSave = { ...agent, parameters: JSON.stringify(agent.parameters || {}) };
              await invoke('add_agent', { agent: agentToSave });
            } catch { /* may already exist in SQLite */ }
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
          set((state: any) => ({ ...state, activeWorkspaceId: defaultWorkspaceId }));

          const sessions = await invoke<ChatSession[]>('get_chat_sessions', { workspaceId: defaultWorkspaceId });
          for (let i = 0; i < sessions.length; i++) {
            const messages = await invoke<ChatMessage[]>('get_chat_messages', { sessionId: sessions[i].id });
            sessions[i].messages = messages.map((m: any) => ({ ...m, content: JSON.parse(m.content as unknown as string) }));
          }
          const dbSessions = sessions.map(normalizeSession);
          set({ sessions: dbSessions });

          // Do not auto-create or auto-select any session on startup
          // Let the user land on the placeholder for their last view

          const workflows = await invoke<Workflow[]>('get_workflows', { workspaceId: defaultWorkspaceId });
          if (workflowsConfig?.length) {
            const migratedConfig = workflowsConfig.map((w: any) => ({
              ...w,
              nodesData: w.nodesData ?? w.nodes_data ?? [],
              edgesData: w.edgesData ?? w.edges_data ?? [],
            }));
            set({ workflows: migratedConfig });
          } else if (workflows.length) {
            const parsedWorkflows = workflows.map((w: any) => ({ ...w, nodesData: JSON.parse(w.nodesData as unknown as string), edgesData: JSON.parse(w.edgesData as unknown as string) }));
            set({ workflows: parsedWorkflows });
          }
        }

        const sidebarOrders = await readConfig<{ workflowOrder?: string[]; agentCategoryOrder?: string[]; sessionOrder?: string[] }>('sidebar_orders.json');
        if (sidebarOrders) {
          set((state: any) => ({
            workflowOrder: sidebarOrders.workflowOrder ?? state.workflowOrder,
            agentCategoryOrder: sidebarOrders.agentCategoryOrder ?? state.agentCategoryOrder,
            sessionOrder: sidebarOrders.sessionOrder ?? state.sessionOrder,
          }));
        }
      } catch (error) {
        console.log('Running in browser mode without Tauri backend - using default data');
        // Browser mode fallback: do not auto-create or auto-select sessions
      }
    },
  };
}
