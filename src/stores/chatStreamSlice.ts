import { v4 as uuidv4 } from 'uuid';
import type { StoreApi } from 'zustand';
import type { ChatSlice } from './chatSlice';
import {
  ChatSession, ChatMessage, Agent, MessageMeta, MessageAttachment, WorkflowAgentNodeData,
} from '../types/models';
import { invoke } from '@tauri-apps/api/core';
import { fetchFromResolvedConfig } from '@/lib/api';
import { resolveAgentModelConfig, shortError } from '@/lib/agentProviderRouter';
import { createStreamMessage, createAgentResponse } from '@/lib/messageService';
import { debugLogger } from '@/lib/debugLogger';

type FullState = ChatSlice & Record<string, any>;

// ── Session-level Stream Abort Controllers ──
const sessionAbortControllers = new Map<string, AbortController>();

function abortSessionStream(sessionId: string) {
  const ctrl = sessionAbortControllers.get(sessionId);
  if (ctrl) {
    ctrl.abort();
    sessionAbortControllers.delete(sessionId);
  }
}

function setSessionStream(sessionId: string, controller: AbortController) {
  abortSessionStream(sessionId);
  sessionAbortControllers.set(sessionId, controller);
}

function clearSessionStream(sessionId: string, controller: AbortController) {
  if (sessionAbortControllers.get(sessionId) === controller) {
    sessionAbortControllers.delete(sessionId);
  }
}

// ── Streaming Chunk Throttle Buffer ──
const streamChunkBuffer = new Map<string, { sessionId: string; messageId: string; agentId: string; nodeId?: string; chunks: string[] }>();
let streamFlushTimer: ReturnType<typeof setTimeout> | null = null;
const STREAM_FLUSH_MS = 50;

async function runAgentResponse({
  sessionId, messageId, agent, prompt, nodeId, nodeData, signal, thinkingLevel, responseMeta,
  addAgentResponseStream, addAgentThinkingStream, completeAgentResponse, getSettings,
}: {
  sessionId: string; messageId: string; agent: Agent; prompt: string; nodeId?: string;
  nodeData?: Pick<WorkflowAgentNodeData, 'overrideProviderId' | 'overrideModelId' | 'overrideSystemPrompt'>;
  signal?: AbortSignal;
  thinkingLevel?: 'default' | 'off';
  responseMeta?: MessageMeta;
  addAgentResponseStream: any; addAgentThinkingStream: any; completeAgentResponse: any; getSettings: () => any;
}) {
  addAgentResponseStream(sessionId, messageId, agent.id, '', nodeId, responseMeta);
  let streamKey: string | undefined;
  try {
    const settings = getSettings();

    const config = resolveAgentModelConfig(agent, nodeData, settings);

    const systemPrompt = nodeData?.overrideSystemPrompt || agent.systemPrompt;

    const result = await fetchFromResolvedConfig(config, prompt, systemPrompt, {
      maxTokens: agent.maxTokens,
      temperature: agent.temperature,
      thinkingLevel,
    });

    streamKey = debugLogger.streamStart(sessionId, agent.id, config.model.modelId);

    let firstChunk = true;
    const consumeText = async () => {
      for await (const textPart of result.textStream) {
        if (signal?.aborted) break;
        if (textPart && streamKey) {
          debugLogger.streamChunk(streamKey, textPart.length, false);
        }
        if (firstChunk && textPart) {
          addAgentResponseStream(sessionId, messageId, agent.id, textPart, nodeId, {
            ...responseMeta,
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
    };
    const consumeThinking = async () => {
      try {
        if (result.reasoningTextStream) {
          for await (const thinkingPart of result.reasoningTextStream) {
            if (signal?.aborted) break;
            if (thinkingPart && streamKey) {
              debugLogger.streamChunk(streamKey, thinkingPart.length, true);
              addAgentThinkingStream(sessionId, messageId, agent.id, thinkingPart, nodeId);
            }
          }
        }
      } catch {
        // Some providers don't support thinking — ignore silently
      }
    };
    await Promise.all([consumeText(), consumeThinking()]);

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

    debugLogger.streamEnd(streamKey, tokenUsage);

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
    if (streamKey) {
      debugLogger.streamError(streamKey, new Error(detail));
    }
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

async function autoGenerateTitle(sessionId: string, firstUserPrompt: string, get: () => FullState) {
  try {
    const state = get();
    const session = state.sessions.find((s: ChatSession) => s.id === sessionId);
    if (!session) return;

    const userMessages = session.messages.filter((m: ChatMessage) => m.role === 'user');
    if (userMessages.length !== 1) return;

    const settings = state.settings;
    const autoTitle = settings.autoTitle;

    if (autoTitle?.enabled === false) return;

    const providers: any[] = settings.providers ?? [];
    let provider: any;
    if (autoTitle?.providerId) {
      provider = providers.find((p: any) => p.id === autoTitle.providerId && p.isEnabled && p.apiKey);
    }
    if (!provider) {
      provider = providers.find((p: any) => p.id === settings.activeProviderId && p.isEnabled && p.apiKey)
        ?? providers.find((p: any) => p.isEnabled && p.apiKey);
    }
    if (!provider) return;

    let modelId: string | undefined = autoTitle?.modelId;
    if (!modelId) {
      const defaultModel = provider.models.find((m: any) => m.isDefault) ?? provider.models[0];
      modelId = defaultModel?.modelId;
    }
    if (!modelId) return;

    const virtualAgent = { id: '__auto-title__', name: 'Auto Title', avatar: '', systemPrompt: '', providerId: provider.id, modelId };
    const config = resolveAgentModelConfig(virtualAgent as any, {}, settings);

    const titlePrompt = `Summarize the following message into a short topic title (max 20 characters, no punctuation, no quotes, respond with the title only):\n\n${firstUserPrompt.slice(0, 500)}`;
    const { textStream } = await fetchFromResolvedConfig(config, titlePrompt, undefined, { maxTokens: 30 });

    let title = '';
    for await (const chunk of textStream) {
      title += chunk;
    }
    title = title.trim().replace(/^["'「『]|["'」』]$/g, '').trim();
    if (title && title.length > 0 && title.length <= 60) {
      get().renameSession(sessionId, title);
    }
  } catch {
    // Silently ignore all errors — auto-title is best-effort
  }
}

export function createChatStreamSlice(
  set: StoreApi<FullState>['setState'],
  get: StoreApi<FullState>['getState'],
) {
  const flushStreamChunks = () => {
    streamFlushTimer = null;
    if (streamChunkBuffer.size === 0) return;
    const pending = new Map(streamChunkBuffer);
    streamChunkBuffer.clear();

    const affectedSessionIds = new Set<string>();
    for (const entry of pending.values()) {
      affectedSessionIds.add(entry.sessionId);
    }

    set((state) => ({
      sessions: state.sessions.map((s: ChatSession) => {
        if (!affectedSessionIds.has(s.id)) return s;
        let sessionChanged = false;
        const messages = s.messages.map((m: ChatMessage) => {
          if (!m.agentResponses) return m;
          let msgChanged = false;
          const agentResponses = [...m.agentResponses];

          for (let i = 0; i < agentResponses.length; i++) {
            const ar = agentResponses[i];
            const key = [s.id, m.id, ar.agentId, ar.nodeId || ''].join(':');
            const entry = pending.get(key);
            if (entry && entry.chunks.length > 0) {
              msgChanged = true;
              agentResponses[i] = { ...ar, content: { ...ar.content, text: ar.content.text + entry.chunks.join('') } };
            }
          }

          for (const entry of pending.values()) {
            if (entry.messageId !== m.id || entry.sessionId !== s.id) continue;
            const exists = agentResponses.some(ar => ar.agentId === entry.agentId && ar.nodeId === entry.nodeId);
            if (!exists && entry.chunks.length > 0) {
              msgChanged = true;
              agentResponses.push(createAgentResponse(entry.agentId, entry.chunks.join(''), entry.nodeId, 'streaming'));
            }
          }

          if (msgChanged) {
            sessionChanged = true;
            return { ...m, agentResponses, updatedAt: Date.now() };
          }
          return m;
        });
        return sessionChanged ? { ...s, messages, updatedAt: Date.now() } : s;
      })
    }));
  };

  return {
    activeStreamingSessionIds: [],

    addAgentResponseStream: (sessionId, messageId, agentId, textChunk, nodeId, meta) => {
      const state = get();
      const session = state.sessions.find((s: ChatSession) => s.id === sessionId);
      const isNewMessage = session ? session.messages.findIndex((m: ChatMessage) => m.id === messageId) === -1 : false;
      const existingMsg = session?.messages.find((m: ChatMessage) => m.id === messageId);
      const hasAgentResponse = existingMsg?.agentResponses?.some((ar: any) => ar.agentId === agentId && ar.nodeId === nodeId);

      if (isNewMessage || meta || !hasAgentResponse) {
        let newAssistantMsg: ChatMessage | null = null;
        set((state) => {
          const sessions = state.sessions.map((s: ChatSession) => {
            if (s.id === sessionId) {
              const messages = [...s.messages];
              const assistantMsgIndex = messages.findIndex(m => m.id === messageId);
              if (assistantMsgIndex === -1) {
                newAssistantMsg = createStreamMessage(sessionId, agentId, nodeId, meta, messageId);
                newAssistantMsg.agentResponses![0].content.text = textChunk;
                if (meta?._dynamicAgentMeta) {
                  newAssistantMsg.agentResponses![0]._dynamicAgentMeta = meta._dynamicAgentMeta;
                }
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
                  if (meta?._dynamicAgentMeta) {
                    newResp._dynamicAgentMeta = meta._dynamicAgentMeta;
                  }
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
                  if (meta?._dynamicAgentMeta && !resp._dynamicAgentMeta) {
                    resp._dynamicAgentMeta = meta._dynamicAgentMeta;
                  }
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

        if (newAssistantMsg && isNewMessage) {
          const msg: ChatMessage = newAssistantMsg;
          const mergedText = (msg.agentResponses || []).map(r => r.content.text).filter(Boolean).join('\n\n');
          const contentToSave = { ...msg.content, text: mergedText || msg.content.text };
          const msgToSave = {
            ...msg,
            content: JSON.stringify(contentToSave),
            agentResponses: msg.agentResponses ? JSON.stringify(msg.agentResponses) : undefined,
          };
          void invoke('add_chat_message', { message: msgToSave }).catch(() => {
            console.warn('Failed to persist assistant message to DB');
            debugLogger.warn('chatSlice', 'persist assistant message failed', { sessionId });
          });
        }
      } else if (textChunk) {
        const bufferKey = [sessionId, messageId, agentId, nodeId || ''].join(':');
        const existing = streamChunkBuffer.get(bufferKey);
        if (existing) {
          existing.chunks.push(textChunk);
        } else {
          streamChunkBuffer.set(bufferKey, { sessionId, messageId, agentId, nodeId, chunks: [textChunk] });
        }
        if (!streamFlushTimer) {
          streamFlushTimer = setTimeout(flushStreamChunks, STREAM_FLUSH_MS);
        }
      }
    },

    addAgentThinkingStream: (sessionId, messageId, agentId, thinkingChunk, nodeId) => {
      set((state) => {
        const sessions = state.sessions.map((s: ChatSession) => {
          if (s.id === sessionId) {
            const messages = [...s.messages];
            const msgIndex = messages.findIndex(m => m.id === messageId);
            if (msgIndex !== -1) {
              const msg = { ...messages[msgIndex] };
              msg.agentResponses = [...(msg.agentResponses || [])];
              const agentRespIndex = msg.agentResponses.findIndex((ar: any) => ar.agentId === agentId && ar.nodeId === nodeId);
              if (agentRespIndex !== -1) {
                const resp = { ...msg.agentResponses[agentRespIndex] };
                resp.content = { ...resp.content, thinking: (resp.content.thinking || '') + thinkingChunk };
                msg.agentResponses[agentRespIndex] = resp;
              }
              messages[msgIndex] = msg;
            }
            return { ...s, messages, updatedAt: Date.now() };
          }
          return s;
        });
        return { sessions };
      });
    },

    completeAgentResponse: (sessionId, messageId, agentId, nodeId, meta) => {
      if (streamFlushTimer) { clearTimeout(streamFlushTimer); streamFlushTimer = null; }
      flushStreamChunks();

      set((state) => ({
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
      }));

      const state = get();
      const session = state.sessions.find((s: ChatSession) => s.id === sessionId);
      const msg = session?.messages.find((m: ChatMessage) => m.id === messageId);
      if (msg) {
        const msgToSave = {
          ...msg,
          content: JSON.stringify(msg.content),
          agentResponses: msg.agentResponses ? JSON.stringify(msg.agentResponses) : undefined,
        };
        void invoke('update_chat_message', { message: msgToSave }).catch(() => {});
      }
    },

    cancelSessionStream: (sessionId) => {
      abortSessionStream(sessionId);
      for (const key of streamChunkBuffer.keys()) {
        if (key.startsWith(sessionId + ':')) streamChunkBuffer.delete(key);
      }
      set((state) => ({
        activeStreamingSessionIds: state.activeStreamingSessionIds.filter((id: string) => id !== sessionId),
      }));
    },

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

      const controller = new AbortController();
      setSessionStream(sessionId, controller);
      set((state) => ({
        activeStreamingSessionIds: state.activeStreamingSessionIds.includes(sessionId)
          ? state.activeStreamingSessionIds
          : [...state.activeStreamingSessionIds, sessionId],
      }));

      try {
        await Promise.all(agents.map((agent: Agent) => runAgentResponse({
          sessionId, messageId, agent, prompt: promptWithAttachments, nodeId: options.nodeId,
          nodeData: options.nodeData,
          signal: controller.signal,
          thinkingLevel: options.thinkingLevel,
          responseMeta: options.meta,
          addAgentResponseStream: get().addAgentResponseStream,
          addAgentThinkingStream: get().addAgentThinkingStream,
          completeAgentResponse: get().completeAgentResponse,
          getSettings: () => get().settings,
        })));
      } finally {
        clearSessionStream(sessionId, controller);
        set((state) => ({
          activeStreamingSessionIds: state.activeStreamingSessionIds.filter((id: string) => id !== sessionId),
        }));
      }

      void autoGenerateTitle(sessionId, prompt, get);

      return messageId;
    },

    sendToAgent: async (sessionId, agentId, prompt, options = {}) => {
      const { agents } = get();
      const agent = agents.find((a: Agent) => a.id === agentId);
      if (!agent) return undefined;
      const attachments = options.attachments || [];
      if (options.addUserMessage !== false) {
        get().addUserMessage(sessionId, prompt, attachments, { targetAgentId: agentId });
      }
      const messageId = uuidv4();

      const promptWithAttachments = attachments.length > 0
        ? `${prompt}\n\n附件：${attachments.map((file: MessageAttachment) => `${file.name} (${file.mimeType})`).join('、')}`
        : prompt;

      const controller = new AbortController();
      setSessionStream(sessionId, controller);
      set((state) => ({
        activeStreamingSessionIds: state.activeStreamingSessionIds.includes(sessionId)
          ? state.activeStreamingSessionIds
          : [...state.activeStreamingSessionIds, sessionId],
      }));

      try {
        await runAgentResponse({
          sessionId, messageId, agent, prompt: promptWithAttachments, nodeData: undefined,
          signal: controller.signal,
          thinkingLevel: options.thinkingLevel,
          addAgentResponseStream: get().addAgentResponseStream,
          addAgentThinkingStream: get().addAgentThinkingStream,
          completeAgentResponse: get().completeAgentResponse,
          getSettings: () => get().settings,
        });
      } finally {
        clearSessionStream(sessionId, controller);
        set((state) => ({
          activeStreamingSessionIds: state.activeStreamingSessionIds.filter((id: string) => id !== sessionId),
        }));
      }
      return messageId;
    },

    retryAgentResponse: async (sessionId, messageId, agentId, prompt, nodeId) => {
      const { agents } = get();
      const agent = agents.find((a: Agent) => a.id === agentId);
      if (!agent) return;

      set((state) => ({
        sessions: state.sessions.map((s: ChatSession) => {
          if (s.id !== sessionId) return s;
          const messages = [...s.messages];
          const msgIndex = messages.findIndex(m => m.id === messageId);
          if (msgIndex === -1) return s;
          const msg = { ...messages[msgIndex] };
          msg.agentResponses = (msg.agentResponses || []).filter(
            (ar: any) => !(ar.agentId === agentId && ar.nodeId === nodeId)
          );
          messages[msgIndex] = msg;
          return { ...s, messages };
        })
      }));

      await runAgentResponse({
        sessionId, messageId, agent, prompt, nodeId,
        addAgentResponseStream: get().addAgentResponseStream,
        addAgentThinkingStream: get().addAgentThinkingStream,
        completeAgentResponse: get().completeAgentResponse,
        getSettings: () => get().settings,
      });
    },
  };
}
