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

  // Actions
  fetchInitialData: () => Promise<void>;
  addWorkspace: (name: string, description?: string) => void;
  setActiveWorkspace: (id: string) => void;

  addAgent: (agent: Omit<Agent, 'id' | 'createdAt'>) => Promise<void>;
  updateAgent: (id: string, updates: Partial<Agent>) => void;

  createSession: (title: string, workspaceId: string) => void;
  setActiveSession: (id: string) => void;

  addUserMessage: (sessionId: string, text: string) => void;
  addAgentResponseStream: (sessionId: string, messageId: string, agentId: string, textChunk: string) => void;
  completeAgentResponse: (sessionId: string, messageId: string, agentId: string) => void;

  // Workflow Actions
  createWorkflow: (name: string, workspaceId: string) => void;
  saveWorkflow: (id: string, nodes: any[], edges: any[]) => void;
  setActiveWorkflow: (id: string | null) => void;
  setActiveAgent: (id: string | null) => void;

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
          title: 'Project Planning',
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
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: []
        },
        {
          id: '3',
          workspaceId: 'default-workspace',
          title: 'General Inquiry',
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
               position: { x: 100, y: 150 },
               data: { label: 'User Input' },
             },
             {
               id: 'agent-1',
               type: 'agent',
               position: { x: 400, y: 150 },
               data: { label: 'Summarizer', agentId: 'agent-1', prompt: 'Summarize the input text.' },
             },
             {
               id: 'output-1',
               type: 'output',
               position: { x: 750, y: 150 },
               data: { label: 'Chat Response' },
             },
          ],
          edges_data: [
             { id: 'e1-2', source: 'trigger-1', target: 'agent-1', animated: true },
             { id: 'e2-3', source: 'agent-1', target: 'output-1', animated: true },
          ],
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'w1',
          workspaceId: 'default-workspace',
          name: 'Data Processing Pipeline',
          nodes_data: [],
          edges_data: [],
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'w2',
          workspaceId: 'default-workspace',
          name: 'Weekly Report Generator',
          nodes_data: [],
          edges_data: [],
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'w3',
          workspaceId: 'default-workspace',
          name: 'User Onboarding Flow',
          nodes_data: [],
          edges_data: [],
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ],
      activeWorkspaceId: 'default-workspace',
      activeSessionId: 'default-session',
      activeWorkflowId: 'default-workflow',
      activeAgentId: 'agent-1',

      settings: {
        theme: 'system',
        language: 'en',
        apiProvider: 'openai',
        openaiKey: '',
        anthropicKey: '',
        googleKey: '',
        customProtocol: 'openai-compatible',
        customBaseUrl: '',
        customModelId: '',
        customApiKey: '',
        customHeader: '',
        geminiKey: '',
        allowRemoteAccess: true,
      },

      fetchInitialData: async () => {
        try {
          const agents = await invoke<Agent[]>('get_agents');
          set({ agents });
        } catch (error) {
          console.error('Failed to fetch initial data:', error);
        }
      },

      addWorkspace: (name, description = '') => set((state) => {
        const newWorkspace: Workspace = {
          id: uuidv4(),
          name,
          description,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        return { workspaces: [...state.workspaces, newWorkspace] };
      }),

      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

      addAgent: async (agentData) => {
        const newAgent: Agent = {
          ...agentData,
          id: uuidv4(),
          createdAt: Date.now()
        };

        try {
          // Call Tauri backend to add the agent
          await invoke('add_agent', { agent: newAgent });
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

      createSession: (title, workspaceId) => set((state) => {
        const newSession: ChatSession = {
          id: uuidv4(),
          workspaceId,
          title,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        return { sessions: [...state.sessions, newSession], activeSessionId: newSession.id };
      }),

      setActiveSession: (id) => set({ activeSessionId: id }),

      addUserMessage: (sessionId, text) => set((state) => {
        const newMessage: ChatMessage = {
          id: uuidv4(),
          sessionId,
          role: 'user',
          content: { text },
          timestamp: Date.now()
        };

        const sessions = state.sessions.map(s => {
          if (s.id === sessionId) {
            return { ...s, messages: [...s.messages, newMessage], updatedAt: Date.now() };
          }
          return s;
        });

        return { sessions };
      }),

      addAgentResponseStream: (sessionId, messageId, agentId, textChunk) => set((state) => {
        const sessions = state.sessions.map(s => {
          if (s.id === sessionId) {
            const messages = [...s.messages];

            // Find existing assistant message block for this interaction round, or create one
            let assistantMsgIndex = messages.findIndex(m => m.id === messageId);

            if (assistantMsgIndex === -1) {
               // Create new assistant message block
               const newAssistantMsg: ChatMessage = {
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
            }

            return { ...s, messages, updatedAt: Date.now() };
          }
          return s;
        });
        return { sessions };
      }),

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

      createWorkflow: (name, workspaceId) => set((state) => {
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
        return { workflows: [...state.workflows, newWorkflow], activeWorkflowId: newWorkflow.id };
      }),

      saveWorkflow: (id, nodes, edges) => set((state) => {
         const workflows = state.workflows.map(w => {
            if (w.id === id) {
               return { ...w, nodes_data: nodes, edges_data: edges, updatedAt: Date.now() };
            }
            return w;
         });
         return { workflows };
      }),

      setActiveWorkflow: (id) => set({ activeWorkflowId: id }),
      setActiveAgent: (id) => set({ activeAgentId: id }),

      getActiveWorkflow: () => {
         const { workflows, activeWorkflowId } = get();
         return workflows.find(w => w.id === activeWorkflowId);
      },

      updateSettings: (updates) => set((state) => ({
        settings: { ...state.settings, ...updates }
      }))
    })
);