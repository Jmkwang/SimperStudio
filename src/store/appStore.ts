import { create } from 'zustand';
import { Workspace, Agent, ChatSession, ChatMessage, Workflow } from '../types/models';
import { v4 as uuidv4 } from 'uuid';
import { invoke } from '@tauri-apps/api/core';

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

  // Actions
  fetchInitialData: () => Promise<void>;
  addWorkspace: (name: string, description?: string) => void;
  setActiveWorkspace: (id: string) => void;

  addAgent: (agent: Omit<Agent, 'id' | 'createdAt'>) => Promise<void>;
  updateAgent: (id: string, updates: Partial<Agent>) => void;

  createSession: (title: string, workspaceId: string, workflowId?: string) => void;
  setActiveSession: (id: string) => void;

  addUserMessage: (sessionId: string, text: string) => void;
  addAgentResponseStream: (sessionId: string, messageId: string, agentId: string, textChunk: string) => void;
  completeAgentResponse: (sessionId: string, messageId: string, agentId: string) => void;

  // Workflow Actions
  createWorkflow: (name: string, workspaceId: string) => void;
  saveWorkflow: (id: string, nodes: any[], edges: any[]) => void;
  setActiveWorkflow: (id: string | null) => void;
  setActiveAgent: (id: string | null) => void;

  // Workflow Chat Mode
  toggleWorkflowChatMode: (enabled: boolean) => void;
  linkWorkflowToSession: (sessionId: string, workflowId: string) => void;
  getWorkflowForSession: (sessionId: string) => Workflow | undefined;

  // Workflow Execution State
  workflowExecution: {
     status: 'idle' | 'running' | 'completed' | 'error';
     currentNodeId: string | null;
     results: Record<string, any>;
  };
  setWorkflowExecutionState: (state: Partial<AppState['workflowExecution']>) => void;
  executeWorkflow: (workflowId: string, initialPayload: Record<string, any>) => Promise<Record<string, any>>;


  // Settings Actions
  settings: {
    theme: string;
    language: string;
    apiProvider: string;
    openaiKey: string;
    anthropicKey: string;
    googleKey: string;
    customProtocol: string;
    customBaseUrl: string;
    customModelId: string;
    customApiKey: string;
    customHeader: string;
    geminiKey: string;
    allowRemoteAccess: boolean;
  };
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
        }
      ],
      sessions: [
        {
          id: 'default-session',
          workspaceId: 'default-workspace',
          title: 'My First Workflow',
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
          workflowId: 'w1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: []
        },
        {
          id: '3',
          workspaceId: 'default-workspace',
          title: 'General Inquiry',
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
          id: 'w5',
          workspaceId: 'default-workspace',
          name: 'Werewolf Game Logic',
          nodes_data: [
             { id: 't1', type: 'trigger', position: { x: 50, y: 350 }, data: { label: 'Start Phase' } },
             { id: 'r-phase', type: 'condition', position: { x: 250, y: 350 }, data: { label: 'Phase Router', routes: [
                 { id: 'route-night', condition: 'payload.phase === "night" && payload.gameStatus === "playing"' },
                 { id: 'route-day', condition: 'payload.phase === "day" && payload.gameStatus === "playing"' },
                 { id: 'route-end', condition: 'payload.gameStatus !== "playing"' }
               ]
             }},
             { id: 'llm-wolf', type: 'agent', position: { x: 550, y: 50 }, data: {
                 label: 'Werewolves Action',
                 prompt: 'Current State: {{JSON.stringify(payload)}}\n\nWho should the werewolves kill tonight?',
                 schema: '{"targetId": "string", "reason": "string"}'
             }},
             { id: 'code-wolf', type: 'code', position: { x: 850, y: 50 }, data: {
                 label: 'Save Wolf Target',
                 code: 'payload.nightState = payload.nightState || {}; payload.nightState.wolfTarget = payload.llmResult?.targetId; return payload;'
             }},
             { id: 'llm-seer', type: 'agent', position: { x: 1150, y: 50 }, data: {
                 label: 'Seer Action',
                 prompt: 'Current State: {{JSON.stringify(payload)}}\n\nWho should the seer inspect?',
                 schema: '{"targetId": "string", "reason": "string"}'
             }},
             { id: 'code-seer', type: 'code', position: { x: 1450, y: 50 }, data: {
                 label: 'Save Seer Target',
                 code: 'payload.nightState = payload.nightState || {}; payload.nightState.seerTarget = payload.llmResult?.targetId; return payload;'
             }},
             { id: 'llm-witch', type: 'agent', position: { x: 1750, y: 50 }, data: {
                 label: 'Witch Action',
                 prompt: 'Current State: {{JSON.stringify(payload)}}\n\nWolf target is {{payload.nightState.wolfTarget}}. Witch has potions: {{JSON.stringify(payload.players.find(p=>p.role==="witch")?.potions)}}. Use heal on target? Or use poison on someone else?',
                 schema: '{"useHeal": "boolean", "poisonTargetId": "string|null"}'
             }},
             { id: 'code-witch', type: 'code', position: { x: 2050, y: 50 }, data: {
                 label: 'Save Witch Action',
                 code: 'payload.nightState = payload.nightState || {}; payload.nightState.witchHeal = payload.llmResult?.useHeal; payload.nightState.witchPoison = payload.llmResult?.poisonTargetId; return payload;'
             }},
             { id: 'code-night-resolve', type: 'code', position: { x: 2350, y: 50 }, data: {
                 label: 'Resolve Night',
                 code: 'const s = payload.nightState; const p = payload.players; let died = []; if (s.wolfTarget && !s.witchHeal) died.push(s.wolfTarget); if (s.witchPoison) died.push(s.witchPoison); died.forEach(id => { const player = p.find(x => x.id === id); if(player) player.status = "dead"; }); payload.phase = "day"; payload.nightState = {}; const wolves = p.filter(x => x.role === "werewolf" && x.status === "alive").length; const goods = p.filter(x => x.role !== "werewolf" && x.status === "alive").length; if (wolves === 0) payload.gameStatus = "good_wins"; else if (wolves >= goods) payload.gameStatus = "wolves_win"; return payload;'
             }},
             { id: 'out-day', type: 'output', position: { x: 2650, y: 50 }, data: { label: 'To Day Phase' } },
             { id: 'llm-day-vote', type: 'agent', position: { x: 550, y: 450 }, data: {
                 label: 'Town Vote',
                 prompt: 'Current State: {{JSON.stringify(payload)}}\n\nWho should the town vote out today?',
                 schema: '{"targetId": "string", "reason": "string"}'
             }},
             { id: 'code-day-resolve', type: 'code', position: { x: 850, y: 450 }, data: {
                 label: 'Resolve Day',
                 code: 'if(payload.llmResult?.targetId) { const target = payload.players.find(p => p.id === payload.llmResult.targetId); if(target) target.status = "dead"; } payload.phase = "night"; payload.dayCount = (payload.dayCount || 0) + 1; const p = payload.players; const wolves = p.filter(x => x.role === "werewolf" && x.status === "alive").length; const goods = p.filter(x => x.role !== "werewolf" && x.status === "alive").length; if (wolves === 0) payload.gameStatus = "good_wins"; else if (wolves >= goods) payload.gameStatus = "wolves_win"; return payload;'
             }},
             { id: 'out-night', type: 'output', position: { x: 1150, y: 450 }, data: { label: 'To Night Phase' } },
             { id: 'out-end', type: 'output', position: { x: 550, y: 650 }, data: { label: 'Game Over' } }
          ],
          edges_data: [
             { id: 'e-start', source: 't1', target: 'r-phase', animated: true },
             { id: 'e-night-1', source: 'r-phase', sourceHandle: 'route-night', target: 'llm-wolf', animated: true },
             { id: 'e-night-2', source: 'llm-wolf', target: 'code-wolf', animated: true },
             { id: 'e-night-3', source: 'code-wolf', target: 'llm-seer', animated: true },
             { id: 'e-night-4', source: 'llm-seer', target: 'code-seer', animated: true },
             { id: 'e-night-5', source: 'code-seer', target: 'llm-witch', animated: true },
             { id: 'e-night-6', source: 'llm-witch', target: 'code-witch', animated: true },
             { id: 'e-night-7', source: 'code-witch', target: 'code-night-resolve', animated: true },
             { id: 'e-night-8', source: 'code-night-resolve', target: 'out-day', animated: true },
             { id: 'e-day-1', source: 'r-phase', sourceHandle: 'route-day', target: 'llm-day-vote', animated: true },
             { id: 'e-day-2', source: 'llm-day-vote', target: 'code-day-resolve', animated: true },
             { id: 'e-day-3', source: 'code-day-resolve', target: 'out-night', animated: true },
             { id: 'e-end-1', source: 'r-phase', sourceHandle: 'route-end', target: 'out-end', animated: true }
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
      workflowExecution: {
        status: 'idle',
        currentNodeId: null,
        results: {}
      },


      settings: {
        theme: 'system',
        language: 'en',
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
      },

      fetchInitialData: async () => {
        try {
          const agents = await invoke<Agent[]>('get_agents');
          const parsedAgents = agents.map(a => ({...a, parameters: typeof a.parameters === 'string' ? JSON.parse(a.parameters) : a.parameters}));
          set({ agents: parsedAgents });

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
            set({ sessions });

            const workflows = await invoke<Workflow[]>('get_workflows', { workspaceId: defaultWorkspaceId });
            const parsedWorkflows = workflows.map(w => ({...w, nodes_data: JSON.parse(w.nodes_data as unknown as string), edges_data: JSON.parse(w.edges_data as unknown as string)}));
            set({ workflows: parsedWorkflows });
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
          // Update local state only if backend call succeeds
          set((state) => ({ agents: [...state.agents, newAgent] }));
        } catch (error) {
          console.error('Failed to add agent:', error);
          throw error;
        }
      },

      updateAgent: (id, updates) => set((state) => ({
        agents: state.agents.map(agent => 
          agent.id === id ? { ...agent, ...updates } : agent
        )
      })),

      createSession: async (title, workspaceId, workflowId) => {
        const newSession: ChatSession = {
          id: uuidv4(),
          workspaceId,
          title,
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

      setActiveSession: (id) => set({ activeSessionId: id }),

      addUserMessage: async (sessionId, text) => {
        const newMessage: ChatMessage = {
          id: uuidv4(),
          sessionId,
          role: 'user',
          content: { text },
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

      addAgentResponseStream: async (sessionId, messageId, agentId, textChunk) => {
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
                     content: { text: '' }, // Optional overall text
                     agentResponses: [{
                       agentId,
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

                  const agentRespIndex = msg.agentResponses.findIndex(ar => ar.agentId === agentId);
                  if (agentRespIndex === -1) {
                    msg.agentResponses.push({
                       agentId,
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

      completeAgentResponse: (sessionId, messageId, agentId) => set((state) => {
        const sessions = state.sessions.map(s => {
           if (s.id === sessionId) {
             const messages = [...s.messages];
             const msgIndex = messages.findIndex(m => m.id === messageId);
             if (msgIndex !== -1) {
               const msg = { ...messages[msgIndex] };
               if (msg.agentResponses) {
                 msg.agentResponses = msg.agentResponses.map(ar =>
                   ar.agentId === agentId ? { ...ar, status: 'complete' } : ar
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
            set((state) => ({ workflows: [...state.workflows, newWorkflow], activeWorkflowId: newWorkflow.id }));
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
                     breakCondition: n.data?.breakCondition
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
                    return { workflows: wfs };
                 });
             }
         } catch (error) {
             console.error("Failed to save workflow:", error);
         }
      },

      setActiveWorkflow: (id) => set({ activeWorkflowId: id }),
      setActiveAgent: (id) => set({ activeAgentId: id }),

      toggleWorkflowChatMode: (enabled) => set({ workflowChatMode: enabled }),

      linkWorkflowToSession: (sessionId, workflowId) => set((state) => ({
        sessions: state.sessions.map(s =>
          s.id === sessionId ? { ...s, workflowId } : s
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

      updateSettings: (updates) => set((state) => ({
        settings: { ...state.settings, ...updates }
      }))
    })
);
