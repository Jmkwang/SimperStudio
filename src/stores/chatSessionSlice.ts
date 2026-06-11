import { v4 as uuidv4 } from 'uuid';
import type { StoreApi } from 'zustand';
import type { ChatSlice } from './chatSlice';
import {
  ChatSession, ChatMessage, Workflow,
} from '../types/models';
import { invoke } from '@tauri-apps/api/core';
import { writeConfig } from './baseSlice';
import { debugLogger } from '@/lib/debugLogger';

type FullState = ChatSlice & Record<string, any>;

function normalizeSession(session: ChatSession): ChatSession {
  return {
    ...session,
    mode: session.mode || (session.workflowId ? 'workflow' : 'single'),
    messages: session.messages || [],
  };
}

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
  },
  {
    id: 'session-competitor', workspaceId: 'default-workspace', title: '竞品分析：Notion',
    mode: 'workflow', workflowId: 'workflow-competitor-analysis',
    createdAt: Date.now(), updatedAt: Date.now(), messages: []
  }
];

export function createChatSessionSlice(
  set: StoreApi<FullState>['setState'],
  get: StoreApi<FullState>['getState'],
) {
  return {
    sessions: MOCK_SESSIONS,

    createSession: async (title, workspaceId, workflowId, mode) => {
      const newSession: ChatSession = {
        id: uuidv4(), workspaceId, title,
        mode: mode || (workflowId ? 'workflow' : 'single'),
        workflowId, messages: [],
        createdAt: Date.now(), updatedAt: Date.now()
      };
      set((state) => ({ sessions: [...state.sessions, newSession], activeSessionId: newSession.id }));
      try {
        await invoke('add_chat_session', { session: newSession });
      } catch { /* best-effort persistence */ }
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
      } catch (error) { console.error('Failed to create workflow-backed session:', error); debugLogger.error('chatSlice', 'createWorkflowSession failed', { error: String(error) }); }
      set((state) => {
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
        set((state) => ({
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
      try {
        await invoke('add_chat_session', { session: newSession });
        set((state) => ({
          sessions: [...state.sessions, newSession],
          activeWorkflowId: workflowId,
          activeSessionId: newSession.id,
        }));
      } catch { }
    },

    deleteSession: async (id) => {
      try { await invoke('delete_chat_session', { id }); } catch { }
      set((state) => {
        const sessions = state.sessions.filter((s: ChatSession) => s.id !== id);
        const activeSessionId = state.activeSessionId === id ? sessions[0]?.id || null : state.activeSessionId;
        const activeSession = sessions.find((s: ChatSession) => s.id === activeSessionId);
        return { sessions, activeSessionId, activeWorkflowId: activeSession?.workflowId || state.activeWorkflowId };
      });
    },

    renameSession: async (id, title) => {
      set((state) => ({
        sessions: state.sessions.map((s: ChatSession) =>
          s.id === id ? { ...s, title, updatedAt: Date.now() } : s
        ),
      }));
      try { await invoke('update_chat_session', { id, title }); } catch { /* best-effort */ }
    },

    linkWorkflowToSession: (sessionId, workflowId) => set((state) => ({
      sessions: state.sessions.map((s: ChatSession) =>
        s.id === sessionId ? { ...s, workflowId, mode: 'workflow' } : s
      )
    })),

    getWorkflowForSession: (sessionId) => {
      const { sessions, workflows } = get();
      const session = sessions.find((s: ChatSession) => s.id === sessionId);
      if (session?.workflowId) return workflows.find((w: Workflow) => w.id === session.workflowId);
      return undefined;
    },
  };
}
