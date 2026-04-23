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

          const workspaces = await invoke<Workspace[]>('get_workspaces');
          if (workspaces.length > 0) {
            set({ workspaces });
            const defaultWorkspaceId = workspaces[0].id;
            set({ activeWorkspaceId: defaultWorkspaceId });

            // Load sessions for default workspace
            const sessions = await invoke<ChatSession[]>('get_chat_sessions', { workspaceId: defaultWorkspaceId });
            
            // For each session, load its messages
            for (let i = 0; i < sessions.length; i++) {
                const messages = await invoke<ChatMessage[]>('get_chat_messages', { sessionId: sessions[i].id });
                // We need to parse content back to object
                sessions[i].messages = messages.map(m => ({...m, content: JSON.parse(m.content as unknown as string)}));
            }
            set({ sessions });

            // Load workflows
            const workflows = await invoke<Workflow[]>('get_workflows', { workspaceId: defaultWorkspaceId });
            // parse nodes and edges back from string
            const parsedWorkflows = workflows.map(w => ({...w, nodes_data: JSON.parse(w.nodes_data as unknown as string), edges_data: JSON.parse(w.edges_data as unknown as string)}));
            set({ workflows: parsedWorkflows });
          }
        } catch (error) {
          console.error('Failed to fetch initial data:', error);
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

      createSession: async (title, workspaceId) => {
        const newSession: ChatSession = {
          id: uuidv4(),
          workspaceId,
          title,
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
                 const wfToSave = {...wf, nodes_data: JSON.stringify(nodes), edges_data: JSON.stringify(edges), updatedAt: Date.now()};
                 await invoke('update_workflow', { workflow: wfToSave });
                 
                 set((state) => {
                    const wfs = state.workflows.map(w => {
                        if (w.id === id) {
                            return { ...w, nodes_data: nodes, edges_data: edges, updatedAt: Date.now() };
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

      getActiveWorkflow: () => {
         const { workflows, activeWorkflowId } = get();
         return workflows.find(w => w.id === activeWorkflowId);
      },

      updateSettings: (updates) => set((state) => ({
        settings: { ...state.settings, ...updates }
      }))
    })
);
