import type { StoreApi } from 'zustand';
import {
  ChatSession, ChatMessage, Agent, Workflow, WorkflowNode,
  MessageAttachment, MessageMeta, WorkflowConversationWindow, AgentChatWindowData,
} from '../types/models';
import { createChatSessionSlice } from './chatSessionSlice';
import { createChatMessageSlice } from './chatMessageSlice';
import { createChatStreamSlice } from './chatStreamSlice';
import { createChatForwardSlice } from './chatForwardSlice';

// Full application state as seen by this slice (ChatSlice + cross-slice properties via get())
type FullState = ChatSlice & Record<string, any>;

export type WorkflowChatUIState = {
  sidebarCollapsedBySession: Record<string, boolean>;
  multiAgentModeBySession: Record<string, boolean>;
  windows: WorkflowConversationWindow[];
  agentChatWindows: AgentChatWindowData[];
  activeWindowId: string | null;
  zIndexCounter: number;
};

export interface ChatSlice {
  sessions: ChatSession[];
  workflowChatUI: WorkflowChatUIState;
  activeStreamingSessionIds: string[];

  createSession: (title: string, workspaceId: string, workflowId?: string, mode?: 'single' | 'workflow') => void;
  createWorkflowBackedSession: (title: string, workspaceId: string) => Promise<void>;
  openWorkflowSession: (workflowId: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;

  addUserMessage: (sessionId: string, text: string, attachments?: MessageAttachment[], meta?: MessageMeta) => void;
  addAgentResponseStream: (sessionId: string, messageId: string, agentId: string, textChunk: string, nodeId?: string, meta?: MessageMeta) => void;
  addAgentThinkingStream: (sessionId: string, messageId: string, agentId: string, thinkingChunk: string, nodeId?: string) => void;
  completeAgentResponse: (sessionId: string, messageId: string, agentId: string, nodeId?: string, meta?: MessageMeta) => void;
  cancelSessionStream: (sessionId: string) => void;
  sendMessageToAgents: (sessionId: string, prompt: string, agents: Agent[], options?: { attachments?: MessageAttachment[]; nodeId?: string; nodeData?: any; meta?: MessageMeta; addUserMessage?: boolean; thinkingLevel?: 'default' | 'off' }) => Promise<string | undefined>;
  sendToWorkflowAgent: (sessionId: string, nodeId: string, prompt: string, options?: { addUserMessage?: boolean; triggeredBy?: MessageMeta['triggeredBy']; forwardFromMessageId?: string }) => Promise<string | undefined>;
  forwardAgentReplyToNext: (sessionId: string, fromNodeId: string, messageId: string, agentId: string, triggeredBy?: MessageMeta['triggeredBy']) => Promise<void>;
  rerunAgentReply: (sessionId: string, nodeId: string, prompt: string) => Promise<string | undefined>;
  rerunAndForwardAgentReply: (sessionId: string, nodeId: string, prompt: string) => Promise<void>;
  sendToAgent: (sessionId: string, agentId: string, prompt: string, options?: { addUserMessage?: boolean; attachments?: MessageAttachment[]; thinkingLevel?: 'default' | 'off' }) => Promise<string | undefined>;
  retryAgentResponse: (sessionId: string, messageId: string, agentId: string, prompt: string, nodeId?: string) => Promise<void>;

  linkWorkflowToSession: (sessionId: string, workflowId: string) => void;
  getWorkflowForSession: (sessionId: string) => Workflow | undefined;

  setWorkflowSidebarCollapsed: (sessionId: string, collapsed: boolean) => void;
  setMultiAgentMode: (sessionId: string, mode: boolean) => void;
  openWorkflowAgentWindow: (sessionId: string, workflowId: string, nodeId: string, agentId: string) => void;
  focusWorkflowAgentWindow: (windowId: string) => void;
  closeWorkflowAgentWindow: (windowId: string) => void;
  toggleWorkflowAgentWindowMinimized: (windowId: string) => void;

  openAgentChatWindow: (sessionId: string, agentId: string) => void;
  focusAgentChatWindow: (windowId: string) => void;
  closeAgentChatWindow: (windowId: string) => void;
  toggleAgentChatWindowMinimized: (windowId: string) => void;
}

export function createChatSlice(set: StoreApi<FullState>['setState'], get: StoreApi<FullState>['getState']): ChatSlice {
  return {
    ...createChatSessionSlice(set, get),
    ...createChatMessageSlice(set, get),
    ...createChatStreamSlice(set, get),
    ...createChatForwardSlice(set, get),
  };
}
