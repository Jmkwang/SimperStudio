import { v4 as uuidv4 } from 'uuid';
import { invoke } from '@tauri-apps/api/core';
import {
  ChatSession, ChatMessage, Agent, Workflow, WorkflowNode,
  MessageAttachment, MessageMeta, WorkflowConversationWindow, AgentChatWindowData,
  WorkflowAgentNodeData,
} from '../types/models';
import { fetchFromResolvedConfig } from '@/lib/api';
import { resolveAgentModelConfig, shortError, ResolveSettings } from '@/lib/agentProviderRouter';
import { createUserMessage, createStreamMessage, createAgentResponse } from '@/lib/messageService';
import { writeConfig } from './baseSlice';

export type WorkflowChatUIState = {
  sidebarCollapsedBySession: Record<string, boolean>;
  windows: WorkflowConversationWindow[];
  agentChatWindows: AgentChatWindowData[];
  activeWindowId: string | null;
  zIndexCounter: number;
};

// ── Helpers ──

function normalizeSession(session: ChatSession): ChatSession {
  return {
    ...session,
    mode: session.mode || (session.workflowId ? 'workflow' : 'single'),
    messages: session.messages || [],
  };
}

function getAgentNode(workflow: Workflow | undefined, nodeId: string): WorkflowNode | undefined {
  return workflow?.nodesData.find((node) => node.id === nodeId && node.type === 'agent');
}

function findNextAgentNode(workflow: Workflow | undefined, nodeId: string): WorkflowNode | undefined {
  if (!workflow) return undefined;
  const visited = new Set<string>();
  const queue = workflow.edgesData
    .filter((edge) => edge.source === nodeId)
    .map((edge) => edge.target);
  while (queue.length > 0) {
    const nextNodeId = queue.shift();
    if (!nextNodeId || visited.has(nextNodeId)) continue;
    visited.add(nextNodeId);
    const node = workflow.nodesData.find((item) => item.id === nextNodeId);
    if (node?.type === 'agent' && node.data?.agentId) return node;
    workflow.edgesData
      .filter((edge) => edge.source === nextNodeId)
      .forEach((edge) => queue.push(edge.target));
  }
  return undefined;
}

async function runAgentResponse({
  sessionId, messageId, agent, prompt, nodeId, nodeData,
  addAgentResponseStream, completeAgentResponse, getSettings,
}: {
  sessionId: string; messageId: string; agent: Agent; prompt: string; nodeId?: string;
  nodeData?: Pick<WorkflowAgentNodeData, 'overrideProviderId' | 'overrideModelId' | 'overrideSystemPrompt'>;
  addAgentResponseStream: any; completeAgentResponse: any; getSettings: () => any;
}) {
  addAgentResponseStream(sessionId, messageId, agent.id, '', nodeId);
  try {
    const settings: ResolveSettings = getSettings();

    // 1. Resolve provider + model via the new router (no fallback)
    const config = resolveAgentModelConfig(agent, nodeData, settings);

    // 2. Determine system prompt: node override > agent systemPrompt
    const systemPrompt = nodeData?.overrideSystemPrompt || agent.systemPrompt;

    // 3. Call the model (no fallback, errors throw)
    const result = await fetchFromResolvedConfig(config, prompt, systemPrompt);

    // 4. Stream chunks + backfill model info on first chunk
    let firstChunk = true;
    for await (const textPart of result.textStream) {
      if (firstChunk && textPart) {
        addAgentResponseStream(sessionId, messageId, agent.id, textPart, nodeId, {
          providerId: config.provider.id,
          providerName: config.providerName,
          modelId: config.model.modelId,
          modelName: config.modelName,
        });
        firstChunk = false;
      } else {
        addAgentResponseStream(sessionId, messageId, agent.id, textPart, nodeId);
      }
    }

    // 5. Extract token usage after stream completes
    let tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;
    try {
      const usage = await result.usage;
      const promptTokens = usage.inputTokens ?? 0;
      const completionTokens = usage.outputTokens ?? 0;
      tokenUsage = {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      };
    } catch { /* some providers may not support usage */ }

    completeAgentResponse(sessionId, messageId, agent.id, nodeId, {
      providerId: config.provider.id,
      providerName: config.providerName,
      modelId: config.model.modelId,
      modelName: config.modelName,
      tokenUsage,
    });
  } catch (e: any) {
    const summary = shortError(e.message || String(e));
    const detail = e.message || String(e);
    addAgentResponseStream(sessionId, messageId, agent.id, '', nodeId, {
      status: 'error',
      errorSummary: summary,
      errorDetail: detail,
    });
    completeAgentResponse(sessionId, messageId, agent.id, nodeId, {
      status: 'error',
      errorSummary: summary,
      errorDetail: detail,
    });
  }
}

// ── Mock Sessions ──

const MOCK_SESSIONS: ChatSession[] = [
  {
    id: 'default-session', workspaceId: 'default-workspace', title: 'My First Workflow',
    mode: 'workflow', workflowId: 'default-workflow',
    createdAt: Date.now(), updatedAt: Date.now(),
    messages: [{ id: uuidv4(), sessionId: 'default-session', role: 'system', content: { text: 'Session initialized.' }, timestamp: Date.now() }]
  },
  {
    id: 'session-ui-design', workspaceId: 'default-workspace', title: 'UI Component Design',
    mode: 'workflow', workflowId: 'workflow-pipeline',
    createdAt: Date.now(), updatedAt: Date.now(), messages: []
  },
  {
    id: 'session-general', workspaceId: 'default-workspace', title: 'General Inquiry',
    mode: 'workflow', workflowId: 'workflow-report',
    createdAt: Date.now(), updatedAt: Date.now(), messages: []
  },
  {
    id: 'session-werewolf', workspaceId: 'default-workspace', title: '狼人杀·标准局',
    mode: 'workflow', workflowId: 'werewolf-standard',
    createdAt: Date.now(), updatedAt: Date.now(), messages: []
  }
];

export interface ChatSlice {
  sessions: ChatSession[];
  workflowChatUI: WorkflowChatUIState;

  createSession: (title: string, workspaceId: string, workflowId?: string, mode?: 'single' | 'workflow') => void;
  createWorkflowBackedSession: (title: string, workspaceId: string) => Promise<void>;
  openWorkflowSession: (workflowId: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;

  addUserMessage: (sessionId: string, text: string, attachments?: MessageAttachment[], meta?: MessageMeta) => void;
  addAgentResponseStream: (sessionId: string, messageId: string, agentId: string, textChunk: string, nodeId?: string, meta?: MessageMeta) => void;
  completeAgentResponse: (sessionId: string, messageId: string, agentId: string, nodeId?: string, meta?: MessageMeta) => void;
  sendMessageToAgents: (sessionId: string, prompt: string, agents: Agent[], options?: { attachments?: MessageAttachment[]; nodeId?: string; nodeData?: any; meta?: MessageMeta; addUserMessage?: boolean }) => Promise<string | undefined>;
  sendToWorkflowAgent: (sessionId: string, nodeId: string, prompt: string, options?: { addUserMessage?: boolean; triggeredBy?: MessageMeta['triggeredBy']; forwardFromMessageId?: string }) => Promise<string | undefined>;
  forwardAgentReplyToNext: (sessionId: string, fromNodeId: string, messageId: string, agentId: string, triggeredBy?: MessageMeta['triggeredBy']) => Promise<void>;
  rerunAgentReply: (sessionId: string, nodeId: string, prompt: string) => Promise<string | undefined>;
  rerunAndForwardAgentReply: (sessionId: string, nodeId: string, prompt: string) => Promise<void>;
  sendToAgent: (sessionId: string, agentId: string, prompt: string, options?: { addUserMessage?: boolean }) => Promise<string | undefined>;

  linkWorkflowToSession: (sessionId: string, workflowId: string) => void;
  getWorkflowForSession: (sessionId: string) => Workflow | undefined;

  setWorkflowSidebarCollapsed: (sessionId: string, collapsed: boolean) => void;
  openWorkflowAgentWindow: (sessionId: string, workflowId: string, nodeId: string, agentId: string) => void;
  focusWorkflowAgentWindow: (windowId: string) => void;
  closeWorkflowAgentWindow: (windowId: string) => void;
  toggleWorkflowAgentWindowMinimized: (windowId: string) => void;

  openAgentChatWindow: (sessionId: string, agentId: string) => void;
  focusAgentChatWindow: (windowId: string) => void;
  closeAgentChatWindow: (windowId: string) => void;
  toggleAgentChatWindowMinimized: (windowId: string) => void;
}

export function createChatSlice(set: any, get: any): ChatSlice {
  return {
    sessions: MOCK_SESSIONS,
    workflowChatUI: {
      sidebarCollapsedBySession: {},
      windows: [],
      agentChatWindows: [],
      activeWindowId: null,
      zIndexCounter: 20,
    },

    createSession: async (title, workspaceId, workflowId, mode) => {
      const newSession: ChatSession = {
        id: uuidv4(), workspaceId, title,
        mode: mode || (workflowId ? 'workflow' : 'single'),
        workflowId, messages: [],
        createdAt: Date.now(), updatedAt: Date.now()
      };
      try { await invoke('add_chat_session', { session: newSession }); } catch { }
      set((state: any) => ({ sessions: [...state.sessions, newSession], activeSessionId: newSession.id }));
    },

    createWorkflowBackedSession: async (title, workspaceId) => {
      const now = Date.now();
      const workflowId = uuidv4();
      const sessionId = uuidv4();
      const newWorkflow: Workflow = {
        id: workflowId, workspaceId, name: title,
        nodesData: [], edgesData: [], status: 'active',
        createdAt: now, updatedAt: now
      };
      const newSession: ChatSession = {
        id: sessionId, workspaceId, title,
        mode: 'workflow', workflowId, messages: [],
        createdAt: now, updatedAt: now
      };
      try {
        await invoke('add_workflow', { workflow: { ...newWorkflow, nodesData: '[]', edgesData: '[]' } });
        await invoke('add_chat_session', { session: newSession });
      } catch (error) { console.error('Failed to create workflow-backed session:', error); }
      set((state: any) => {
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
      const workflow = workflows.find((w: Workflow) => w.id === workflowId);
      if (!workflow) return;
      const existingSession = sessions.find((session: ChatSession) => session.workflowId === workflowId);
      if (existingSession) {
        set((state: any) => ({
          activeWorkflowId: workflowId,
          activeSessionId: existingSession.id,
          sessions: state.sessions.map((s: ChatSession) => s.id === existingSession.id ? normalizeSession(s) : s),
        }));
        return;
      }
      const now = Date.now();
      const newSession: ChatSession = {
        id: uuidv4(), workspaceId: workflow.workspaceId, title: workflow.name,
        mode: 'workflow', workflowId, messages: [],
        createdAt: now, updatedAt: now,
      };
      try { await invoke('add_chat_session', { session: newSession }); } catch { }
      set((state: any) => ({
        sessions: [...state.sessions, newSession],
        activeWorkflowId: workflowId,
        activeSessionId: newSession.id,
      }));
    },

    deleteSession: async (id) => {
      try { await invoke('delete_chat_session', { id }); } catch { }
      set((state: any) => {
        const sessions = state.sessions.filter((s: ChatSession) => s.id !== id);
        const activeSessionId = state.activeSessionId === id ? sessions[0]?.id || null : state.activeSessionId;
        const activeSession = sessions.find((s: ChatSession) => s.id === activeSessionId);
        return { sessions, activeSessionId, activeWorkflowId: activeSession?.workflowId || state.activeWorkflowId };
      });
    },

    addUserMessage: async (sessionId, text, attachments = [], meta) => {
      const newMessage = createUserMessage(sessionId, text, attachments, meta);
      set((state: any) => ({
        sessions: state.sessions.map((s: ChatSession) => {
          if (s.id === sessionId) return { ...s, messages: [...s.messages, newMessage], updatedAt: Date.now() };
          return s;
        })
      }));
      try { await invoke('add_chat_message', { message: { ...newMessage, content: JSON.stringify(newMessage.content) } }); } catch { }
    },

    addAgentResponseStream: async (sessionId, messageId, agentId, textChunk, nodeId, meta) => {
      let assistantMsgIndex = -1;
      let newAssistantMsg: ChatMessage | null = null;
      set((state: any) => {
        const sessions = state.sessions.map((s: ChatSession) => {
          if (s.id === sessionId) {
            const messages = [...s.messages];
            assistantMsgIndex = messages.findIndex(m => m.id === messageId);
            if (assistantMsgIndex === -1) {
              newAssistantMsg = createStreamMessage(sessionId, agentId, nodeId, meta, messageId);
              newAssistantMsg.agentResponses![0].content.text = textChunk;
              // Backfill model info / error state from meta on first creation
              if (meta?.providerId) {
                newAssistantMsg.agentResponses![0].providerId = meta.providerId;
                newAssistantMsg.agentResponses![0].providerName = meta.providerName;
                newAssistantMsg.agentResponses![0].modelId = meta.modelId;
                newAssistantMsg.agentResponses![0].modelName = meta.modelName;
              }
              if (meta?.status === 'error') {
                newAssistantMsg.agentResponses![0].status = 'error';
                newAssistantMsg.agentResponses![0].errorSummary = meta.errorSummary;
                newAssistantMsg.agentResponses![0].errorDetail = meta.errorDetail;
              }
              messages.push(newAssistantMsg);
            } else {
              const msg = { ...messages[assistantMsgIndex] };
              msg.agentResponses = [...(msg.agentResponses || [])];
              const agentRespIndex = msg.agentResponses.findIndex((ar: any) => ar.agentId === agentId && ar.nodeId === nodeId);
              if (agentRespIndex === -1) {
                const newResp = createAgentResponse(agentId, textChunk, nodeId, meta?.status === 'error' ? 'error' : 'streaming');
                if (meta?.providerId) {
                  newResp.providerId = meta.providerId;
                  newResp.providerName = meta.providerName;
                  newResp.modelId = meta.modelId;
                  newResp.modelName = meta.modelName;
                }
                if (meta?.status === 'error') {
                  newResp.errorSummary = meta.errorSummary;
                  newResp.errorDetail = meta.errorDetail;
                }
                msg.agentResponses.push(newResp);
              } else {
                const resp = { ...msg.agentResponses[agentRespIndex] };
                resp.content = { text: resp.content.text + textChunk };
                // Backfill model info if present in meta
                if (meta?.providerId) {
                  resp.providerId = meta.providerId;
                  resp.providerName = meta.providerName;
                  resp.modelId = meta.modelId;
                  resp.modelName = meta.modelName;
                }
                if (meta?.status === 'error') {
                  resp.status = 'error';
                  resp.errorSummary = meta.errorSummary;
                  resp.errorDetail = meta.errorDetail;
                }
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
      if (newAssistantMsg) {
        const msg: ChatMessage = newAssistantMsg;
        const msgToSave = { ...msg, content: JSON.stringify(msg.content) };
        try {
          if (assistantMsgIndex === -1) await invoke('add_chat_message', { message: msgToSave });
          else await invoke('update_chat_message', { message: msgToSave });
        } catch { }
      }
    },

    completeAgentResponse: (sessionId, messageId, agentId, nodeId, meta) => set((state: any) => ({
      sessions: state.sessions.map((s: ChatSession) => {
        if (s.id === sessionId) {
          const messages = [...s.messages];
          const msgIndex = messages.findIndex(m => m.id === messageId);
          if (msgIndex !== -1) {
            const msg = { ...messages[msgIndex] };
            if (msg.agentResponses) {
              msg.agentResponses = msg.agentResponses.map((ar: any) =>
                ar.agentId === agentId && ar.nodeId === nodeId
                  ? {
                      ...ar,
                      status: meta?.status || 'complete',
                      providerId: meta?.providerId || ar.providerId,
                      providerName: meta?.providerName || ar.providerName,
                      modelId: meta?.modelId || ar.modelId,
                      modelName: meta?.modelName || ar.modelName,
                      errorSummary: meta?.errorSummary || ar.errorSummary,
                      errorDetail: meta?.errorDetail || ar.errorDetail,
                      duration: ar.timestamp ? Date.now() - ar.timestamp : ar.duration,
                      tokenUsage: meta?.tokenUsage || ar.tokenUsage,
                    }
                  : ar
              );
            }
            messages[msgIndex] = msg;
          }
          return { ...s, messages };
        }
        return s;
      })
    })),

    sendMessageToAgents: async (sessionId, prompt, agents, options = {}) => {
      const session = get().sessions.find((item: ChatSession) => item.id === sessionId);
      if (!session || agents.length === 0) return undefined;
      const messageId = uuidv4();
      const promptWithAttachments = options.attachments?.length
        ? `${prompt}\n\n附件：${options.attachments.map((file: any) => `${file.name} (${file.mimeType})`).join('、')}`
        : prompt;
      if (options.addUserMessage !== false) {
        get().addUserMessage(sessionId, prompt, options.attachments || [], options.meta);
      }
      await Promise.all(agents.map((agent: Agent) => runAgentResponse({
        sessionId, messageId, agent, prompt: promptWithAttachments, nodeId: options.nodeId,
        nodeData: options.nodeData,
        addAgentResponseStream: get().addAgentResponseStream,
        completeAgentResponse: get().completeAgentResponse,
        getSettings: () => get().settings,
      })));
      return messageId;
    },

    sendToWorkflowAgent: async (sessionId, nodeId, prompt, options = {}) => {
      const { workflows, agents, sessions } = get();
      const session = sessions.find((item: ChatSession) => item.id === sessionId);
      const workflow = session?.workflowId ? workflows.find((item: Workflow) => item.id === session.workflowId) : undefined;
      const node = getAgentNode(workflow, nodeId);
      const agent = agents.find((item: Agent) => item.id === node?.data?.agentId);
      if (!session || !workflow || !node || !agent) return undefined;

      // Node-level overrides (local to this workflow node, do not mutate global Agent config)
      const nodeData = {
        overrideProviderId: node.data?.overrideProviderId,
        overrideModelId: node.data?.overrideModelId,
        overrideSystemPrompt: node.data?.overrideSystemPrompt || node.data?.prompt || undefined,
      };

      const messageId = await get().sendMessageToAgents(sessionId, prompt, [agent], {
        nodeId,
        nodeData,
        addUserMessage: options.addUserMessage !== false,
        meta: { workflowId: workflow.id, workflowNodeId: nodeId, targetAgentId: agent.id, forwardFromMessageId: options.forwardFromMessageId, triggeredBy: options.triggeredBy || 'user' },
      });
      if (node.data?.autoSendToNext && messageId) {
        await get().forwardAgentReplyToNext(sessionId, nodeId, messageId, agent.id, 'auto');
      }
      return messageId;
    },

    forwardAgentReplyToNext: async (sessionId, fromNodeId, messageId, agentId, triggeredBy = 'manual') => {
      const { sessions, workflows } = get();
      const session = sessions.find((item: ChatSession) => item.id === sessionId);
      const workflow = session?.workflowId ? workflows.find((item: Workflow) => item.id === session.workflowId) : undefined;
      const currentMessage = session?.messages.find((message: ChatMessage) => message.id === messageId);
      const currentResponse = currentMessage?.agentResponses?.find((response: any) => response.agentId === agentId && response.nodeId === fromNodeId);
      const nextNode = findNextAgentNode(workflow, fromNodeId);
      if (!session || !workflow || !currentResponse || !nextNode?.data?.agentId) return;
      await get().sendToWorkflowAgent(sessionId, nextNode.id, currentResponse.content.text, {
        addUserMessage: true, triggeredBy, forwardFromMessageId: messageId,
      });
    },

    rerunAgentReply: async (sessionId, nodeId, prompt) => {
      return get().sendToWorkflowAgent(sessionId, nodeId, prompt, { addUserMessage: false, triggeredBy: 'reload' });
    },

    rerunAndForwardAgentReply: async (sessionId, nodeId, prompt) => {
      const { sessions, workflows, agents } = get();
      const session = sessions.find((item: ChatSession) => item.id === sessionId);
      const workflow = session?.workflowId ? workflows.find((item: Workflow) => item.id === session.workflowId) : undefined;
      const node = getAgentNode(workflow, nodeId);
      const agent = agents.find((item: Agent) => item.id === node?.data?.agentId);
      if (!agent) return;
      const messageId = await get().rerunAgentReply(sessionId, nodeId, prompt);
      if (messageId) await get().forwardAgentReplyToNext(sessionId, nodeId, messageId, agent.id, 'reload');
    },

    sendToAgent: async (sessionId, agentId, prompt, options = {}) => {
      const { agents } = get();
      const agent = agents.find((a: Agent) => a.id === agentId);
      if (!agent) return undefined;
      if (options.addUserMessage !== false) {
        get().addUserMessage(sessionId, prompt, [], { targetAgentId: agentId });
      }
      const messageId = uuidv4();
      await runAgentResponse({
        sessionId, messageId, agent, prompt, nodeData: undefined,
        addAgentResponseStream: get().addAgentResponseStream,
        completeAgentResponse: get().completeAgentResponse,
        getSettings: () => get().settings,
      });
      return messageId;
    },

    linkWorkflowToSession: (sessionId, workflowId) => set((state: any) => ({
      sessions: state.sessions.map((s: ChatSession) =>
        s.id === sessionId ? { ...s, workflowId, mode: 'workflow' } : s
      )
    })),

    setWorkflowSidebarCollapsed: (sessionId, collapsed) => set((state: any) => ({
      workflowChatUI: {
        ...state.workflowChatUI,
        sidebarCollapsedBySession: {
          ...state.workflowChatUI.sidebarCollapsedBySession,
          [sessionId]: collapsed,
        },
      },
    })),

    openWorkflowAgentWindow: (sessionId, workflowId, nodeId, agentId) => set((state: any) => {
      const existingWindow = state.workflowChatUI.windows.find((w: WorkflowConversationWindow) => w.sessionId === sessionId && w.nodeId === nodeId);
      const nextZIndex = state.workflowChatUI.zIndexCounter + 1;
      if (existingWindow) {
        return {
          workflowChatUI: {
            ...state.workflowChatUI,
            windows: state.workflowChatUI.windows.map((w: WorkflowConversationWindow) => w.id === existingWindow.id ? { ...w, zIndex: nextZIndex, minimized: false } : w),
            activeWindowId: existingWindow.id, zIndexCounter: nextZIndex,
          },
        };
      }
      const sessionWindows = state.workflowChatUI.windows.filter((w: WorkflowConversationWindow) => w.sessionId === sessionId);
      const newWindow: WorkflowConversationWindow = {
        id: uuidv4(), sessionId, workflowId, nodeId, agentId,
        position: { x: 48 + (sessionWindows.length % 4) * 36, y: 48 + (sessionWindows.length % 4) * 28 },
        zIndex: nextZIndex, minimized: false,
      };
      return { workflowChatUI: { ...state.workflowChatUI, windows: [...state.workflowChatUI.windows, newWindow], activeWindowId: newWindow.id, zIndexCounter: nextZIndex } };
    }),

    focusWorkflowAgentWindow: (windowId) => set((state: any) => {
      const nextZIndex = state.workflowChatUI.zIndexCounter + 1;
      return { workflowChatUI: { ...state.workflowChatUI, windows: state.workflowChatUI.windows.map((w: WorkflowConversationWindow) => w.id === windowId ? { ...w, zIndex: nextZIndex } : w), activeWindowId: windowId, zIndexCounter: nextZIndex } };
    }),

    closeWorkflowAgentWindow: (windowId) => set((state: any) => ({
      workflowChatUI: { ...state.workflowChatUI, windows: state.workflowChatUI.windows.filter((w: WorkflowConversationWindow) => w.id !== windowId), activeWindowId: state.workflowChatUI.activeWindowId === windowId ? null : state.workflowChatUI.activeWindowId },
    })),

    toggleWorkflowAgentWindowMinimized: (windowId) => set((state: any) => ({
      workflowChatUI: { ...state.workflowChatUI, windows: state.workflowChatUI.windows.map((w: WorkflowConversationWindow) => w.id === windowId ? { ...w, minimized: !w.minimized } : w) },
    })),

    openAgentChatWindow: (sessionId, agentId) => set((state: any) => {
      const existingWindow = state.workflowChatUI.agentChatWindows.find((w: AgentChatWindowData) => w.sessionId === sessionId && w.agentId === agentId);
      const nextZIndex = state.workflowChatUI.zIndexCounter + 1;
      if (existingWindow) {
        return {
          workflowChatUI: {
            ...state.workflowChatUI,
            agentChatWindows: state.workflowChatUI.agentChatWindows.map((w: AgentChatWindowData) => w.id === existingWindow.id ? { ...w, zIndex: nextZIndex, minimized: false } : w),
            activeWindowId: existingWindow.id, zIndexCounter: nextZIndex,
          },
        };
      }
      const sessionWindows = state.workflowChatUI.agentChatWindows.filter((w: AgentChatWindowData) => w.sessionId === sessionId);
      const newWindow: AgentChatWindowData = {
        id: uuidv4(), sessionId, agentId,
        position: { x: 48 + (sessionWindows.length % 4) * 36, y: 48 + (sessionWindows.length % 4) * 28 },
        zIndex: nextZIndex, minimized: false,
      };
      return { workflowChatUI: { ...state.workflowChatUI, agentChatWindows: [...state.workflowChatUI.agentChatWindows, newWindow], activeWindowId: newWindow.id, zIndexCounter: nextZIndex } };
    }),

    focusAgentChatWindow: (windowId) => set((state: any) => {
      const nextZIndex = state.workflowChatUI.zIndexCounter + 1;
      return { workflowChatUI: { ...state.workflowChatUI, agentChatWindows: state.workflowChatUI.agentChatWindows.map((w: AgentChatWindowData) => w.id === windowId ? { ...w, zIndex: nextZIndex } : w), activeWindowId: windowId, zIndexCounter: nextZIndex } };
    }),

    closeAgentChatWindow: (windowId) => set((state: any) => ({
      workflowChatUI: { ...state.workflowChatUI, agentChatWindows: state.workflowChatUI.agentChatWindows.filter((w: AgentChatWindowData) => w.id !== windowId), activeWindowId: state.workflowChatUI.activeWindowId === windowId ? null : state.workflowChatUI.activeWindowId },
    })),

    toggleAgentChatWindowMinimized: (windowId) => set((state: any) => ({
      workflowChatUI: { ...state.workflowChatUI, agentChatWindows: state.workflowChatUI.agentChatWindows.map((w: AgentChatWindowData) => w.id === windowId ? { ...w, minimized: !w.minimized } : w) },
    })),

    getWorkflowForSession: (sessionId) => {
      const { sessions, workflows } = get();
      const session = sessions.find((s: ChatSession) => s.id === sessionId);
      if (session?.workflowId) return workflows.find((w: Workflow) => w.id === session.workflowId);
      return undefined;
    },
  };
}
