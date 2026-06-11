import { v4 as uuidv4 } from 'uuid';
import type { StoreApi } from 'zustand';
import type { ChatSlice } from './chatSlice';
import {
  ChatSession, ChatMessage, Agent, Workflow, WorkflowNode,
  WorkflowConversationWindow, AgentChatWindowData,
  MessageMeta,
} from '../types/models';
import { getByPath, replaceTemplateVars } from '@/lib/workflow/helpers';

type FullState = ChatSlice & Record<string, any>;

function getAgentNode(workflow: Workflow | undefined, nodeId: string): WorkflowNode | undefined {
  return workflow?.nodesData.find((node) => node.id === nodeId && (node.type === 'agent' || node.type === 'dynamic-agent'));
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
    if (node?.type === 'agent' && (node.data as any)?.agentId) return node;
    if (node?.type === 'dynamic-agent') return node;
    workflow.edgesData
      .filter((edge) => edge.source === nextNodeId)
      .forEach((edge) => queue.push(edge.target));
  }
  return undefined;
}

export function createChatForwardSlice(
  set: StoreApi<FullState>['setState'],
  get: StoreApi<FullState>['getState'],
) {
  return {
    workflowChatUI: {
      sidebarCollapsedBySession: {},
      multiAgentModeBySession: {},
      windows: [],
      agentChatWindows: [],
      activeWindowId: null,
      zIndexCounter: 20,
    },

    setWorkflowSidebarCollapsed: (sessionId, collapsed) => set((state) => ({
      workflowChatUI: {
        ...state.workflowChatUI,
        sidebarCollapsedBySession: {
          ...state.workflowChatUI.sidebarCollapsedBySession,
          [sessionId]: collapsed,
        },
      },
    })),

    setMultiAgentMode: (sessionId, mode) => set((state) => ({
      workflowChatUI: {
        ...state.workflowChatUI,
        multiAgentModeBySession: {
          ...state.workflowChatUI.multiAgentModeBySession,
          [sessionId]: mode,
        },
      },
    })),

    sendToWorkflowAgent: async (sessionId, nodeId, prompt, options = {}) => {
      const { workflows, agents, sessions } = get();
      const session = sessions.find((item: ChatSession) => item.id === sessionId);
      const workflow = session?.workflowId ? workflows.find((item: Workflow) => item.id === session.workflowId) : undefined;
      const node = getAgentNode(workflow, nodeId);
      if (!session || !workflow || !node) return undefined;

      if (node.type === 'dynamic-agent') {
        const nodeData = node.data as any;
        const inline = nodeData?.inlineConfig;
        const chatPayload = {
          input: prompt,
          prompt,
          message: prompt,
          payload: {
            input: prompt,
            prompt,
            message: prompt,
          },
        };

        const fallbackAgent = nodeData?.fallbackAgentId
          ? agents.find((a: Agent) => a.id === nodeData.fallbackAgentId)
          : undefined;

        let dynamicName = 'Dynamic Agent';
        let dynamicSystemPrompt = '';
        let dynamicRole = '';
        let dynamicPersonality = '';
        let dynamicAvatar = '';

        if (nodeData?.configSource === 'payload') {
          const configPath = String(nodeData?.configPath || 'payload.dynamicAgentConfig');
          const resolved = getByPath(chatPayload, configPath);
          if (resolved && typeof resolved === 'object') {
            dynamicName = String((resolved as any).name || dynamicName);
            dynamicSystemPrompt = String((resolved as any).systemPrompt || '');
            dynamicRole = String((resolved as any).role || '');
            dynamicPersonality = String((resolved as any).personality || '');
            dynamicAvatar = String((resolved as any).avatar || '');
          }
        } else {
          dynamicName = replaceTemplateVars(inline?.nameTemplate || 'Dynamic Agent', chatPayload);
          dynamicSystemPrompt = replaceTemplateVars(inline?.systemPromptTemplate || '', chatPayload);
          dynamicRole = inline?.roleTemplate ? replaceTemplateVars(inline.roleTemplate, chatPayload) : '';
          dynamicPersonality = inline?.personalityTemplate ? replaceTemplateVars(inline.personalityTemplate, chatPayload) : '';
          dynamicAvatar = inline?.avatarTemplate ? replaceTemplateVars(inline.avatarTemplate, chatPayload) : '';
        }

        if (!dynamicAvatar) dynamicAvatar = fallbackAgent?.avatar || '';

        const virtualAgent: Agent = {
          id: `dynamic-${nodeId}`,
          name: dynamicName || fallbackAgent?.name || 'Dynamic Agent',
          avatar: dynamicAvatar,
          systemPrompt: dynamicSystemPrompt || fallbackAgent?.systemPrompt || '',
          providerId: nodeData?.fallbackProviderId || fallbackAgent?.providerId,
          modelId: nodeData?.fallbackModelId || fallbackAgent?.modelId,
          temperature: fallbackAgent?.temperature,
          maxTokens: fallbackAgent?.maxTokens,
        };

        const dynamicMeta = {
          nodeId,
          name: virtualAgent.name,
          role: dynamicRole,
          personality: dynamicPersonality,
          avatar: dynamicAvatar,
          systemPrompt: virtualAgent.systemPrompt,
        };

        const messageId = await get().sendMessageToAgents(sessionId, prompt, [virtualAgent], {
          nodeId,
          addUserMessage: options.addUserMessage !== false,
          meta: {
            workflowId: workflow.id,
            workflowNodeId: nodeId,
            targetAgentId: virtualAgent.id,
            forwardFromMessageId: options.forwardFromMessageId,
            triggeredBy: options.triggeredBy || 'user',
            _dynamicAgentMeta: dynamicMeta,
          },
        });
        if (nodeData?.autoSendToNext && messageId) {
          await get().forwardAgentReplyToNext(sessionId, nodeId, messageId, virtualAgent.id, 'auto');
        }
        return messageId;
      }

      const agent = agents.find((item: Agent) => item.id === (node?.data as any)?.agentId);
      if (!agent) return undefined;

      const nd = node?.data as any;
      const nodeData = {
        overrideProviderId: nd?.overrideProviderId,
        overrideModelId: nd?.overrideModelId,
        overrideSystemPrompt: nd?.overrideSystemPrompt || nd?.prompt || undefined,
      };

      const messageId = await get().sendMessageToAgents(sessionId, prompt, [agent], {
        nodeId,
        nodeData,
        addUserMessage: options.addUserMessage !== false,
        meta: { workflowId: workflow.id, workflowNodeId: nodeId, targetAgentId: agent.id, forwardFromMessageId: options.forwardFromMessageId, triggeredBy: options.triggeredBy || 'user' },
      });
      if (nd?.autoSendToNext && messageId) {
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
      if (!session || !workflow || !currentResponse || !nextNode) return;
      await get().sendToWorkflowAgent(sessionId, nextNode.id, currentResponse.content.text, {
        addUserMessage: true, triggeredBy, forwardFromMessageId: messageId,
      });
    },

    rerunAgentReply: async (sessionId, nodeId, prompt) => {
      return get().sendToWorkflowAgent(sessionId, nodeId, prompt, { addUserMessage: false, triggeredBy: 'reload' });
    },

    rerunAndForwardAgentReply: async (sessionId, nodeId, prompt) => {
      const { sessions, workflows } = get();
      const session = sessions.find((item: ChatSession) => item.id === sessionId);
      const workflow = session?.workflowId ? workflows.find((item: Workflow) => item.id === session.workflowId) : undefined;
      const node = getAgentNode(workflow, nodeId);
      if (!node) return;

      const sourceAgentId = node.type === 'dynamic-agent'
        ? `dynamic-${nodeId}`
        : (node.data as any)?.agentId;
      if (!sourceAgentId) return;

      const messageId = await get().rerunAgentReply(sessionId, nodeId, prompt);
      if (messageId) await get().forwardAgentReplyToNext(sessionId, nodeId, messageId, sourceAgentId, 'reload');
    },

    openWorkflowAgentWindow: (sessionId, workflowId, nodeId, agentId) => set((state) => {
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

    focusWorkflowAgentWindow: (windowId) => set((state) => {
      const nextZIndex = state.workflowChatUI.zIndexCounter + 1;
      return { workflowChatUI: { ...state.workflowChatUI, windows: state.workflowChatUI.windows.map((w: WorkflowConversationWindow) => w.id === windowId ? { ...w, zIndex: nextZIndex } : w), activeWindowId: windowId, zIndexCounter: nextZIndex } };
    }),

    closeWorkflowAgentWindow: (windowId) => set((state) => ({
      workflowChatUI: { ...state.workflowChatUI, windows: state.workflowChatUI.windows.filter((w: WorkflowConversationWindow) => w.id !== windowId), activeWindowId: state.workflowChatUI.activeWindowId === windowId ? null : state.workflowChatUI.activeWindowId },
    })),

    toggleWorkflowAgentWindowMinimized: (windowId) => set((state) => ({
      workflowChatUI: { ...state.workflowChatUI, windows: state.workflowChatUI.windows.map((w: WorkflowConversationWindow) => w.id === windowId ? { ...w, minimized: !w.minimized } : w) },
    })),

    openAgentChatWindow: (sessionId, agentId) => set((state) => {
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

    focusAgentChatWindow: (windowId) => set((state) => {
      const nextZIndex = state.workflowChatUI.zIndexCounter + 1;
      return { workflowChatUI: { ...state.workflowChatUI, agentChatWindows: state.workflowChatUI.agentChatWindows.map((w: AgentChatWindowData) => w.id === windowId ? { ...w, zIndex: nextZIndex } : w), activeWindowId: windowId, zIndexCounter: nextZIndex } };
    }),

    closeAgentChatWindow: (windowId) => set((state) => ({
      workflowChatUI: { ...state.workflowChatUI, agentChatWindows: state.workflowChatUI.agentChatWindows.filter((w: AgentChatWindowData) => w.id !== windowId), activeWindowId: state.workflowChatUI.activeWindowId === windowId ? null : state.workflowChatUI.activeWindowId },
    })),

    toggleAgentChatWindowMinimized: (windowId) => set((state) => ({
      workflowChatUI: { ...state.workflowChatUI, agentChatWindows: state.workflowChatUI.agentChatWindows.map((w: AgentChatWindowData) => w.id === windowId ? { ...w, minimized: !w.minimized } : w) },
    })),
  };
}
