import { v4 as uuidv4 } from 'uuid';
import { invoke } from '@tauri-apps/api/core';
import {
  ChatSession, ChatMessage, Agent, Workflow, WorkflowNode,
  MessageAttachment, MessageMeta, WorkflowConversationWindow, AgentChatWindowData
} from '../types/models';
import { fetchFromModel } from '@/lib/api';
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
  sessionId, messageId, agent, prompt, nodeId,
  addAgentResponseStream, completeAgentResponse, getSettings,
}: {
  sessionId: string; messageId: string; agent: Agent; prompt: string; nodeId?: string;
  addAgentResponseStream: any; completeAgentResponse: any; getSettings: () => any;
}) {
  addAgentResponseStream(sessionId, messageId, agent.id, '', nodeId);
  try {
    const settings = getSettings();
    const activeProvider = settings.activeProviderId ? settings.providers.find((p: any) => p.id === settings.activeProviderId) : null;
    const defaultModel = activeProvider?.models.find((m: any) => m.isDefault) || activeProvider?.models[0];
    const providerToUse: string = activeProvider
      ? activeProvider.type
      : (settings.apiProvider === 'custom' ? 'custom' : agent.modelProvider);
    const modelToUse = activeProvider
      ? (defaultModel?.modelId || '')
      : (settings.apiProvider === 'custom' ? settings.customModelId : agent.modelId);
    const hasKey = activeProvider
      ? !!activeProvider.apiKey
      : (providerToUse === 'openai' && settings.openaiKey) ||
        (providerToUse === 'anthropic' && settings.anthropicKey) ||
        (providerToUse === 'google' && settings.googleKey) ||
        providerToUse === 'custom';

    if (!hasKey) {
      await simulateAgentStream({ sessionId, messageId, agent, prompt, nodeId, addAgentResponseStream, completeAgentResponse, settings, isCustom: providerToUse === 'custom' });
      return;
    }

    const { textStream } = await fetchFromModel(providerToUse, modelToUse || '', prompt, settings, agent.systemPrompt);
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
  sessionId, messageId, agent, prompt, nodeId,
  addAgentResponseStream, completeAgentResponse, settings, isCustom,
}: {
  sessionId: string; messageId: string; agent: Agent; prompt: string; nodeId?: string;
  addAgentResponseStream: any; completeAgentResponse: any; settings: any; isCustom: boolean;
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
  completeAgentResponse: (sessionId: string, messageId: string, agentId: string, nodeId?: string) => void;
  sendMessageToAgents: (sessionId: string, prompt: string, agents: Agent[], options?: { attachments?: MessageAttachment[]; nodeId?: string; meta?: MessageMeta; addUserMessage?: boolean }) => Promise<string | undefined>;
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
              messages.push(newAssistantMsg);
            } else {
              const msg = { ...messages[assistantMsgIndex] };
              msg.agentResponses = [...(msg.agentResponses || [])];
              const agentRespIndex = msg.agentResponses.findIndex((ar: any) => ar.agentId === agentId && ar.nodeId === nodeId);
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
      if (newAssistantMsg) {
        const msg: ChatMessage = newAssistantMsg;
        const msgToSave = { ...msg, content: JSON.stringify(msg.content) };
        try {
          if (assistantMsgIndex === -1) await invoke('add_chat_message', { message: msgToSave });
          else await invoke('update_chat_message', { message: msgToSave });
        } catch { }
      }
    },

    completeAgentResponse: (sessionId, messageId, agentId, nodeId) => set((state: any) => ({
      sessions: state.sessions.map((s: ChatSession) => {
        if (s.id === sessionId) {
          const messages = [...s.messages];
          const msgIndex = messages.findIndex(m => m.id === messageId);
          if (msgIndex !== -1) {
            const msg = { ...messages[msgIndex] };
            if (msg.agentResponses) {
              msg.agentResponses = msg.agentResponses.map((ar: any) =>
                ar.agentId === agentId && ar.nodeId === nodeId ? { ...ar, status: 'complete' } : ar
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
      const nodePrompt = node.data?.prompt ? `${node.data.prompt}\n\n${prompt}` : prompt;
      const messageId = await get().sendMessageToAgents(sessionId, nodePrompt, [agent], {
        nodeId,
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
        sessionId, messageId, agent, prompt,
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
