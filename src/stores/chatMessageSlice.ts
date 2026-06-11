import { v4 as uuidv4 } from 'uuid';
import type { StoreApi } from 'zustand';
import type { ChatSlice } from './chatSlice';
import {
  ChatSession, ChatMessage, MessageAttachment, MessageMeta,
} from '../types/models';
import { invoke } from '@tauri-apps/api/core';
import { createUserMessage } from '@/lib/messageService';
import { debugLogger } from '@/lib/debugLogger';

type FullState = ChatSlice & Record<string, any>;

export function createChatMessageSlice(
  set: StoreApi<FullState>['setState'],
  get: StoreApi<FullState>['getState'],
) {
  return {
    addUserMessage: async (sessionId, text, attachments = [], meta) => {
      const newMessage = createUserMessage(sessionId, text, attachments, meta);
      set((state) => ({
        sessions: state.sessions.map((s: ChatSession) => {
          if (s.id === sessionId) return { ...s, messages: [...s.messages, newMessage], updatedAt: Date.now() };
          return s;
        })
      }));
      try {
        await invoke('add_chat_message', { message: { ...newMessage, content: JSON.stringify(newMessage.content) } });
      } catch {
        console.warn('Failed to persist user message to DB');
        debugLogger.warn('chatSlice', 'persist user message failed', { sessionId });
      }
    },
  };
}
