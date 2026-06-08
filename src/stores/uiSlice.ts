import { ChatSession, Workflow } from '../types/models';

export interface UISlice {
  // View/workspace state
  currentView: string;
  activeWorkspaceId: string | null;
  activeSessionId: string | null;
  activeWorkflowId: string | null;
  activeAgentId: string | null;
  selectedAgentCategory: string | null;
  workflowChatMode: boolean;
  chatLayoutMode: 'A' | 'B';
  debugMode: boolean;
  contextSidebarTab: 'workflows' | 'sessions';
  selectedChatWorkflowId: string | null;
  settingsActiveTab: 'general' | 'appearance' | 'models' | 'cli';

  // Sidebar item order (array of IDs in display order)
  workflowOrder: string[];
  agentCategoryOrder: string[];
  sessionOrder: string[];

  // Actions
  setActiveWorkspace: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  setActiveWorkflow: (id: string | null) => void;
  setActiveAgent: (id: string | null) => void;
  setSelectedAgentCategory: (category: string | null) => void;
  setChatLayoutMode: (mode: 'A' | 'B') => void;
  toggleDebugMode: () => void;
  setContextSidebarTab: (tab: 'workflows' | 'sessions') => void;
  setSelectedChatWorkflowId: (id: string | null) => void;
  setCurrentView: (view: string) => void;
  setSettingsActiveTab: (tab: 'general' | 'appearance' | 'models' | 'cli') => void;
  toggleWorkflowChatMode: (enabled: boolean) => void;
  previewWorkflowTopology: (workflowId: string) => void;
  setWorkflowOrder: (order: string[]) => void;
  setAgentCategoryOrder: (order: string[]) => void;
  setSessionOrder: (order: string[]) => void;

  // Helpers
  getActiveSession: () => ChatSession | undefined;
  getActiveWorkflow: () => Workflow | undefined;
}

export function createUISlice(set: any, get: any, writeConfig?: any): UISlice {
  const saveSidebarOrders = (state: any) => {
    if (writeConfig) {
      void writeConfig('sidebar_orders.json', {
        workflowOrder: state.workflowOrder,
        agentCategoryOrder: state.agentCategoryOrder,
        sessionOrder: state.sessionOrder,
      });
    }
  };

  const savedView = typeof window !== 'undefined' ? localStorage.getItem('ss_currentView') : null;

  return {
    currentView: savedView || 'workflowChat',
    activeWorkspaceId: 'default-workspace',
    activeSessionId: null,
    activeWorkflowId: null,
    activeAgentId: null,
    selectedAgentCategory: null,
    workflowChatMode: false,
    chatLayoutMode: 'A',
    debugMode: false,
    contextSidebarTab: 'workflows',
    selectedChatWorkflowId: null,
    settingsActiveTab: 'general',
    workflowOrder: [],
    agentCategoryOrder: [],
    sessionOrder: [],

    setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
    setActiveSession: (id) => set((state: any) => {
      if (id === null) {
        return { activeSessionId: null };
      }
      const session = state.sessions.find((s: ChatSession) => s.id === id);
      return {
        activeSessionId: id,
        activeWorkflowId: session?.workflowId || state.activeWorkflowId,
      };
    }),
    setActiveWorkflow: (id) => set({ activeWorkflowId: id }),
    setActiveAgent: (id) => set({ activeAgentId: id }),
    setSelectedAgentCategory: (category) => set({ selectedAgentCategory: category }),
    setChatLayoutMode: (mode) => set({ chatLayoutMode: mode }),
    toggleDebugMode: () => set((state: any) => ({ debugMode: !state.debugMode })),
    setContextSidebarTab: (tab) => set({ contextSidebarTab: tab }),
    setSelectedChatWorkflowId: (id) => set({ selectedChatWorkflowId: id }),
    setCurrentView: (view) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('ss_currentView', view);
      }
      set({ currentView: view });
    },
    setSettingsActiveTab: (tab) => set({ settingsActiveTab: tab }),
    toggleWorkflowChatMode: (enabled) => set({ workflowChatMode: enabled }),
    previewWorkflowTopology: (workflowId) => set({ selectedChatWorkflowId: workflowId, activeSessionId: null }),
    setWorkflowOrder: (order) => set((state: any) => {
      const next = { ...state, workflowOrder: order };
      saveSidebarOrders(next);
      return { workflowOrder: order };
    }),
    setAgentCategoryOrder: (order) => set((state: any) => {
      const next = { ...state, agentCategoryOrder: order };
      saveSidebarOrders(next);
      return { agentCategoryOrder: order };
    }),
    setSessionOrder: (order) => set((state: any) => {
      const next = { ...state, sessionOrder: order };
      saveSidebarOrders(next);
      return { sessionOrder: order };
    }),

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
