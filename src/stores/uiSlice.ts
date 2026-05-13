import { ChatSession, Workflow } from '../types/models';

export interface UISlice {
  // View/workspace state
  activeWorkspaceId: string | null;
  activeSessionId: string | null;
  activeWorkflowId: string | null;
  activeAgentId: string | null;
  workflowChatMode: boolean;
  chatLayoutMode: 'A' | 'B';
  debugMode: boolean;
  contextSidebarTab: 'workflows' | 'sessions';
  selectedChatWorkflowId: string | null;

  // Actions
  setActiveWorkspace: (id: string) => void;
  setActiveSession: (id: string) => void;
  setActiveWorkflow: (id: string | null) => void;
  setActiveAgent: (id: string | null) => void;
  setChatLayoutMode: (mode: 'A' | 'B') => void;
  toggleDebugMode: () => void;
  setContextSidebarTab: (tab: 'workflows' | 'sessions') => void;
  setSelectedChatWorkflowId: (id: string | null) => void;
  toggleWorkflowChatMode: (enabled: boolean) => void;

  // Helpers
  getActiveSession: () => ChatSession | undefined;
  getActiveWorkflow: () => Workflow | undefined;
}

export function createUISlice(set: any, get: any): UISlice {
  return {
    activeWorkspaceId: 'default-workspace',
    activeSessionId: 'default-session',
    activeWorkflowId: 'default-workflow',
    activeAgentId: 'agent-1',
    workflowChatMode: false,
    chatLayoutMode: 'B',
    debugMode: true,
    contextSidebarTab: 'workflows',
    selectedChatWorkflowId: null,

    setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
    setActiveSession: (id) => set((state: any) => {
      const session = state.sessions.find((s: ChatSession) => s.id === id);
      return {
        activeSessionId: id,
        activeWorkflowId: session?.workflowId || state.activeWorkflowId,
      };
    }),
    setActiveWorkflow: (id) => set({ activeWorkflowId: id }),
    setActiveAgent: (id) => set({ activeAgentId: id }),
    setChatLayoutMode: (mode) => set({ chatLayoutMode: mode }),
    toggleDebugMode: () => set((state: any) => ({ debugMode: !state.debugMode })),
    setContextSidebarTab: (tab) => set({ contextSidebarTab: tab }),
    setSelectedChatWorkflowId: (id) => set({ selectedChatWorkflowId: id }),
    toggleWorkflowChatMode: (enabled) => set({ workflowChatMode: enabled }),

    getActiveSession: () => {
      const { sessions, activeSessionId } = get();
      return sessions.find((s: ChatSession) => s.id === activeSessionId);
    },

    getActiveWorkflow: () => {
      const { workflows, activeWorkflowId } = get();
      return workflows.find((w: Workflow) => w.id === activeWorkflowId);
    },
  };
}
