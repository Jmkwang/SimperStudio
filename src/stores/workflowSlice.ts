import { v4 as uuidv4 } from 'uuid';
import { invoke } from '@tauri-apps/api/core';
import { Workflow, WorkflowNode, WorkflowEdge } from '../types/models';
import { writeConfig } from './baseSlice';
import { executeWorkflow as engineExecuteWorkflow } from '../lib/workflow/engine';

export type WorkflowExecutionState = {
  status: 'idle' | 'running' | 'completed' | 'error';
  currentNodeId: string | null;
  results: Record<string, any>;
  nodeRecords: Record<string, { status: string; startTime?: number; endTime?: number; durationMs?: number; attempts: number; error?: string }>;
};

export interface WorkflowSlice {
  workflows: Workflow[];
  workflowExecution: WorkflowExecutionState;
  _abortController: AbortController | null;

  createWorkflow: (name: string, workspaceId: string) => void;
  saveWorkflow: (id: string, nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
  deleteWorkflow: (id: string) => Promise<void>;

  setWorkflowExecutionState: (state: Partial<WorkflowExecutionState>) => void;
  executeWorkflow: (workflowId: string, initialPayload: Record<string, any>, options?: { startNodeId?: string; concurrency?: number }) => Promise<Record<string, any>>;
  cancelWorkflowExecution: () => void;
}

const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: 'default-workflow',
    workspaceId: 'default-workspace',
    name: 'My First Workflow',
    nodesData: [
      { id: 'trigger-1', type: 'trigger', position: { x: 100, y: 250 }, data: { label: 'User Input' } },
      { id: 'agent-organize', type: 'agent', position: { x: 400, y: 100 }, data: { label: '整理', agentId: 'agent-organize', prompt: '整理并组织用户输入的内容，使其结构清晰。' } },
      { id: 'agent-summary', type: 'agent', position: { x: 400, y: 400 }, data: { label: '总结', agentId: 'agent-summary', prompt: '对用户输入的内容进行总结，提取关键信息。' } },
      { id: 'output-1', type: 'output', position: { x: 750, y: 100 }, data: { label: '整理结果' } },
      { id: 'output-2', type: 'output', position: { x: 750, y: 400 }, data: { label: '总结结果' } }
    ],
    edgesData: [
      { id: 'e-trigger-organize', source: 'trigger-1', target: 'agent-organize', animated: true },
      { id: 'e-trigger-summary', source: 'trigger-1', target: 'agent-summary', animated: true },
      { id: 'e-organize-output1', source: 'agent-organize', target: 'output-1', animated: true },
      { id: 'e-summary-output2', source: 'agent-summary', target: 'output-2', animated: true }
    ],
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'workflow-pipeline',
    workspaceId: 'default-workspace',
    name: 'Data Processing Pipeline',
    nodesData: [
      { id: 't1', type: 'trigger', position: { x: 50, y: 150 }, data: { label: 'Data Input' } },
      { id: 'a1', type: 'agent', position: { x: 300, y: 150 }, data: { label: 'Data Cleaner', agentId: 'agent-1', prompt: 'Clean this data' } },
      { id: 'o1', type: 'output', position: { x: 550, y: 150 }, data: { label: 'Cleaned Data' } }
    ],
    edgesData: [
      { id: 'e1', source: 't1', target: 'a1', animated: true },
      { id: 'e2', source: 'a1', target: 'o1', animated: true }
    ],
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'workflow-report',
    workspaceId: 'default-workspace',
    name: 'Weekly Report Generator',
    nodesData: [
      { id: 't2', type: 'trigger', position: { x: 100, y: 100 }, data: { label: 'Start Report' } },
      { id: 'a2', type: 'agent', position: { x: 350, y: 100 }, data: { label: 'Report Writer', agentId: 'agent-summary', prompt: 'Generate report' } },
      { id: 'o2', type: 'output', position: { x: 600, y: 100 }, data: { label: 'Final Report' } }
    ],
    edgesData: [
      { id: 'e3', source: 't2', target: 'a2', animated: true },
      { id: 'e4', source: 'a2', target: 'o2', animated: true }
    ],
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'werewolf-standard',
    workspaceId: 'default-workspace',
    name: '狼人杀·标准局',
    nodesData: [
      { id: 'ww-trigger', type: 'trigger', position: { x: 50, y: 450 }, data: { label: '开始游戏' } },
      { id: 'ww-init', type: 'code', position: { x: 380, y: 450 }, data: {
        label: '初始化局势',
        code: 'payload.players = Array.isArray(payload.players) && payload.players.length ? payload.players : [{id:"p1",name:"1号·暗影",role:"werewolf",status:"alive",personality:"shadow"},{id:"p2",name:"2号·狂怒",role:"werewolf",status:"alive",personality:"fury"},{id:"p3",name:"3号·星眸",role:"seer",status:"alive"},{id:"p4",name:"4号·毒心",role:"witch",status:"alive",potions:{heal:true,poison:true}},{id:"p5",name:"5号·铁壁",role:"guard",status:"alive",lastProtected:null},{id:"p6",name:"6号·烈焰",role:"hunter",status:"alive"},{id:"p7",name:"7号·智者",role:"villager",status:"alive"},{id:"p8",name:"8号·勇者",role:"villager",status:"alive"}]; payload.phase = payload.phase || "night"; payload.round = payload.round || 1; payload.gameStatus = payload.gameStatus || "playing"; payload.publicLog = payload.publicLog || []; payload.privateLog = payload.privateLog || []; payload.daySpeeches = payload.daySpeeches || []; payload.alivePlayers = payload.players.filter(p => p.status === "alive"); return payload;'
      }},
      { id: 'ww-controller', type: 'code', position: { x: 710, y: 450 }, data: {
        label: '阶段控制器',
        code: 'payload.alivePlayers = payload.players.filter(p => p.status === "alive"); const wolves = payload.players.filter(p => p.role === "werewolf" && p.status === "alive").length; const goods = payload.players.filter(p => p.role !== "werewolf" && p.status === "alive").length; if (wolves === 0) payload.gameStatus = "good_wins"; else if (wolves >= goods) payload.gameStatus = "wolves_win"; return payload;'
      }},
      { id: 'ww-router', type: 'condition', position: { x: 1040, y: 450 }, data: {
        label: '阶段路由', routes: [
          { id: 'route-night', condition: 'payload.gameStatus === "playing" && payload.phase === "night"' },
          { id: 'route-speech', condition: 'payload.gameStatus === "playing" && payload.phase === "day_speech"' },
          { id: 'route-vote', condition: 'payload.gameStatus === "playing" && payload.phase === "day_vote"' },
          { id: 'route-end', condition: 'payload.gameStatus !== "playing"' }
        ]
      }},
      { id: 'ww-wolf-shadow', type: 'agent', position: { x: 1420, y: 50 }, data: {
        label: '暗影·夜袭决策',
        agentId: 'ww-wolf-shadow',
        prompt: '你是狼人"暗影"。当前局势：{{JSON.stringify(payload.alivePlayers)}}\n历史记录：{{JSON.stringify(payload.publicLog)}}\n\n请选择今晚袭击目标，要选最有威胁的好人。输出 targetId 和 reason。',
        schema: '{"targetId":"string","reason":"string"}'
      }},
      { id: 'ww-wolf-fury', type: 'agent', position: { x: 1420, y: 250 }, data: {
        label: '狂怒·夜袭投票',
        agentId: 'ww-wolf-fury',
        prompt: '你是狼人"狂怒"。当前局势：{{JSON.stringify(payload.alivePlayers)}}\n历史记录：{{JSON.stringify(payload.publicLog)}}\n\n你倾向今晚袭击谁？输出 targetId 和 reason。',
        schema: '{"targetId":"string","reason":"string"}'
      }},
      { id: 'ww-resolve-wolf', type: 'code', position: { x: 1780, y: 150 }, data: {
        label: '结算狼人袭击',
        code: 'payload.nightState = payload.nightState || {}; const shadowTarget = payload.llmResult?.targetId; const aliveNonWolves = payload.alivePlayers.filter(p => p.role !== "werewolf"); payload.nightState.wolfTarget = shadowTarget || aliveNonWolves[0]?.id; payload.privateLog.push({round:payload.round,phase:"night",actor:"wolves",action:"kill",targetId:payload.nightState.wolfTarget}); return payload;'
      }},
      { id: 'ww-seer', type: 'agent', position: { x: 2140, y: 50 }, data: {
        label: '星眸·查验',
        agentId: 'ww-seer',
        prompt: '你是预言家"星眸"。当前存活玩家：{{JSON.stringify(payload.alivePlayers)}}\n历史记录：{{JSON.stringify(payload.privateLog)}}\n\n请选择一个玩家查验身份。输出 targetId 和 reason。',
        schema: '{"targetId":"string","reason":"string"}'
      }},
      { id: 'ww-witch', type: 'agent', position: { x: 2140, y: 250 }, data: {
        label: '毒心·用药',
        agentId: 'ww-witch',
        prompt: '你是女巫"毒心"。当前局势：{{JSON.stringify(payload.alivePlayers)}}\n今晚被袭击的是 {{payload.nightState?.wolfTarget}}\n你的药水状态：{{JSON.stringify(payload.players.find(p=>p.role==="witch")?.potions)}}\n\n是否使用解药或毒药？输出 useHeal、poisonTargetId 和 reason。',
        schema: '{"useHeal":"boolean","poisonTargetId":"string|null","reason":"string"}'
      }},
      { id: 'ww-guard', type: 'agent', position: { x: 2500, y: 150 }, data: {
        label: '铁壁·守护',
        agentId: 'ww-guard',
        prompt: '你是守卫"铁壁"。当前存活玩家：{{JSON.stringify(payload.alivePlayers)}}\n你上次守护的是 {{payload.players.find(p=>p.role==="guard")?.lastProtected || "无"}}\n\n请选择今晚守护的玩家（不能连续守同一人）。输出 protectTargetId 和 reason。',
        schema: '{"protectTargetId":"string","reason":"string"}'
      }},
      { id: 'ww-resolve-night', type: 'code', position: { x: 2860, y: 150 }, data: {
        label: '结算夜晚',
        code: 'const s = payload.nightState || {}; const deaths = new Set(); if (s.wolfTarget && !s.witchHeal && s.wolfTarget !== s.protectTarget) deaths.add(s.wolfTarget); if (s.witchPoison) deaths.add(s.witchPoison); deaths.forEach(id => { const p = payload.players.find(pl => pl.id === id); if (p) p.status = "dead"; }); payload.lastNightDeaths = Array.from(deaths); payload.publicLog.push({round:payload.round,phase:"night_result",deaths:payload.lastNightDeaths}); const witch = payload.players.find(p => p.role === "witch"); if (witch && s.witchHeal) witch.potions = {...witch.potions,heal:false}; if (witch && s.witchPoison) witch.potions = {...witch.potions,poison:false}; const guard = payload.players.find(p => p.role === "guard"); if (guard) guard.lastProtected = s.protectTarget; const wolves = payload.players.filter(p => p.role === "werewolf" && p.status === "alive").length; const goods = payload.players.filter(p => p.role !== "werewolf" && p.status === "alive").length; if (wolves === 0) payload.gameStatus = "good_wins"; else if (wolves >= goods) payload.gameStatus = "wolves_win"; else payload.phase = "day_speech"; payload.alivePlayers = payload.players.filter(p => p.status === "alive"); return payload;'
      }},
      { id: 'ww-night-output', type: 'output', position: { x: 3220, y: 150 }, data: { label: '夜晚结果' } },
      { id: 'ww-prepare-speech', type: 'code', position: { x: 1420, y: 480 }, data: {
        label: '准备发言',
        code: 'payload.alivePlayers = payload.players.filter(p => p.status === "alive"); payload.daySpeeches = []; payload.publicLog.push({round:payload.round,phase:"day_speech_start",alive:payload.alivePlayers.map(p=>p.id),lastNightDeaths:payload.lastNightDeaths||[]}); return payload;'
      }},
      { id: 'ww-speech-loop', type: 'loop', position: { x: 1780, y: 480 }, data: {
        label: '逐人发言循环',
        itemsPath: 'payload.alivePlayers',
        itemAlias: 'currentSpeaker',
        indexAlias: 'speakerIndex',
        maxIterations: 10,
        breakCondition: 'payload.gameStatus !== "playing"'
      }},
      { id: 'ww-villager', type: 'agent', position: { x: 2140, y: 480 }, data: {
        label: '智者·白天发言',
        agentId: 'ww-villager',
        prompt: '你是平民"智者"，当前发言玩家：{{JSON.stringify(payload.currentSpeaker)}}\n公开信息：{{JSON.stringify(payload.publicLog)}}\n白天已发言：{{JSON.stringify(payload.daySpeeches)}}\n存活玩家：{{JSON.stringify(payload.alivePlayers)}}\n\n请生成该玩家的白天发言。输出 speech 和 suspicion。',
        schema: '{"speech":"string","suspicion":"string"}'
      }},
      { id: 'ww-collect-speech', type: 'code', position: { x: 2500, y: 480 }, data: {
        label: '记录发言',
        code: 'payload.daySpeeches = payload.daySpeeches || []; payload.daySpeeches.push({playerId:payload.currentSpeaker?.id,playerName:payload.currentSpeaker?.name,speech:payload.llmResult?.speech||"发言略",suspicion:payload.llmResult?.suspicion||""}); payload.publicLog.push({round:payload.round,phase:"day_speech",playerId:payload.currentSpeaker?.id,speech:payload.llmResult?.speech||"发言略"}); payload.phase = "day_vote"; return payload;'
      }},
      { id: 'ww-speech-output', type: 'output', position: { x: 2860, y: 480 }, data: { label: '发言记录' } },
      { id: 'ww-hunter', type: 'agent', position: { x: 1420, y: 730 }, data: {
        label: '烈焰·投票',
        agentId: 'ww-hunter',
        prompt: '你是猎人"烈焰"。白天发言：{{JSON.stringify(payload.daySpeeches)}}\n存活玩家：{{JSON.stringify(payload.alivePlayers)}}\n\n请根据发言分析投票放逐目标。输出 voteTargetId 和 reason。',
        schema: '{"voteTargetId":"string","reason":"string"}'
      }},
      { id: 'ww-resolve-vote', type: 'code', position: { x: 1780, y: 730 }, data: {
        label: '结算投票',
        code: 'const targetId = payload.llmResult?.voteTargetId || payload.alivePlayers.find(p => p.role === "werewolf")?.id || payload.alivePlayers[0]?.id; const target = payload.players.find(p => p.id === targetId); if (target) target.status = "dead"; payload.publicLog.push({round:payload.round,phase:"vote_result",exiled:targetId,reason:payload.llmResult?.reason||""}); const hunter = payload.players.find(p => p.role === "hunter" && p.id === targetId); if (hunter) { const wolfTarget = payload.alivePlayers.find(p => p.role === "werewolf"); if (wolfTarget) { wolfTarget.status = "dead"; payload.publicLog.push({round:payload.round,phase:"hunter_shoot",killed:wolfTarget.id}); } } const wolves = payload.players.filter(p => p.role === "werewolf" && p.status === "alive").length; const goods = payload.players.filter(p => p.role !== "werewolf" && p.status === "alive").length; if (wolves === 0) payload.gameStatus = "good_wins"; else if (wolves >= goods) payload.gameStatus = "wolves_win"; else { payload.phase = "night"; payload.round = (payload.round || 1) + 1; } payload.alivePlayers = payload.players.filter(p => p.status === "alive"); return payload;'
      }},
      { id: 'ww-vote-output', type: 'output', position: { x: 2140, y: 730 }, data: { label: '投票结果' } },
      { id: 'ww-host', type: 'agent', position: { x: 1420, y: 950 }, data: {
        label: '铁面·终局播报',
        agentId: 'ww-host',
        prompt: '游戏结束。最终局势：{{JSON.stringify(payload)}}\n\n请作为法官生成终局播报，说明获胜阵营、关键转折点、各角色表现和最终存活玩家。',
        schema: '{"summary":"string"}'
      }},
      { id: 'ww-end-output', type: 'output', position: { x: 1780, y: 950 }, data: { label: '游戏结束' } }
    ],
    edgesData: [
      { id: 'ww-e1', source: 'ww-trigger', target: 'ww-init', animated: true },
      { id: 'ww-e2', source: 'ww-init', target: 'ww-controller', animated: true },
      { id: 'ww-e3', source: 'ww-controller', target: 'ww-router', animated: true },
      { id: 'ww-e4', source: 'ww-router', sourceHandle: 'route-night', target: 'ww-wolf-shadow', animated: true },
      { id: 'ww-e5', source: 'ww-router', sourceHandle: 'route-night', target: 'ww-wolf-fury', animated: true },
      { id: 'ww-e6', source: 'ww-wolf-shadow', target: 'ww-resolve-wolf', animated: true },
      { id: 'ww-e7', source: 'ww-wolf-fury', target: 'ww-resolve-wolf', animated: true },
      { id: 'ww-e8', source: 'ww-resolve-wolf', target: 'ww-seer', animated: true },
      { id: 'ww-e9', source: 'ww-resolve-wolf', target: 'ww-witch', animated: true },
      { id: 'ww-e10', source: 'ww-seer', target: 'ww-guard', animated: true },
      { id: 'ww-e11', source: 'ww-witch', target: 'ww-guard', animated: true },
      { id: 'ww-e12', source: 'ww-guard', target: 'ww-resolve-night', animated: true },
      { id: 'ww-e13', source: 'ww-resolve-night', target: 'ww-night-output', animated: true },
      { id: 'ww-e14', source: 'ww-router', sourceHandle: 'route-speech', target: 'ww-prepare-speech', animated: true },
      { id: 'ww-e15', source: 'ww-prepare-speech', target: 'ww-speech-loop', animated: true },
      { id: 'ww-e16', source: 'ww-speech-loop', target: 'ww-villager', animated: true },
      { id: 'ww-e17', source: 'ww-villager', target: 'ww-collect-speech', animated: true },
      { id: 'ww-e18', source: 'ww-collect-speech', target: 'ww-speech-output', animated: true },
      { id: 'ww-e19', source: 'ww-router', sourceHandle: 'route-vote', target: 'ww-hunter', animated: true },
      { id: 'ww-e20', source: 'ww-hunter', target: 'ww-resolve-vote', animated: true },
      { id: 'ww-e21', source: 'ww-resolve-vote', target: 'ww-vote-output', animated: true },
      { id: 'ww-e22', source: 'ww-router', sourceHandle: 'route-end', target: 'ww-host', animated: true },
      { id: 'ww-e23', source: 'ww-host', target: 'ww-end-output', animated: true }
    ],
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

export function createWorkflowSlice(set: any, get: any): WorkflowSlice {
  return {
    workflows: MOCK_WORKFLOWS,
    workflowExecution: {
      status: 'idle',
      currentNodeId: null,
      results: {},
      nodeRecords: {}
    },
    _abortController: null,

    createWorkflow: async (name, workspaceId) => {
      const newWorkflow: Workflow = {
        id: uuidv4(), workspaceId, name,
        nodesData: [], edgesData: [], status: 'active',
        createdAt: Date.now(), updatedAt: Date.now()
      };
      try {
        await invoke('add_workflow', { workflow: { ...newWorkflow, nodesData: '[]', edgesData: '[]' } });
      } catch { /* Tauri backend not available */ }
      const nextWorkflows = [...get().workflows, newWorkflow];
      set({ workflows: nextWorkflows, activeWorkflowId: newWorkflow.id });
      try { await writeConfig('workflow.json', nextWorkflows); } catch {}
    },

    saveWorkflow: async (id, nodes, edges) => {
      try {
        const { workflows } = get();
        const wf = workflows.find((w: Workflow) => w.id === id);
        if (wf) {
          const cleanNodes: WorkflowNode[] = nodes.map((n) => ({
            id: n.id, type: n.type, position: n.position,
            data: {
              label: n.data?.label, description: n.data?.description,
              timeoutMs: n.data?.timeoutMs, retryPolicy: n.data?.retryPolicy, onError: n.data?.onError,
              inputSchema: n.data?.inputSchema, outputSchema: n.data?.outputSchema,
              agentId: n.data?.agentId, prompt: n.data?.prompt, schema: n.data?.schema, autoSendToNext: n.data?.autoSendToNext,
              routes: n.data?.routes, code: n.data?.code,
              itemsPath: n.data?.itemsPath, itemAlias: n.data?.itemAlias, indexAlias: n.data?.indexAlias,
              maxIterations: n.data?.maxIterations, breakCondition: n.data?.breakCondition, aggregationStrategy: n.data?.aggregationStrategy,
              method: n.data?.method, url: n.data?.url, headers: n.data?.headers, body: n.data?.body,
              mappings: n.data?.mappings, constants: n.data?.constants, whitelist: n.data?.whitelist,
              branches: n.data?.branches, waitMode: n.data?.waitMode, delayMs: n.data?.delayMs, untilExpression: n.data?.untilExpression,
              strategy: n.data?.strategy, mergeKey: n.data?.mergeKey,
              webhookMethod: n.data?.webhookMethod, webhookPath: n.data?.webhookPath, authToken: n.data?.authToken,
              subWorkflowId: n.data?.subWorkflowId, inputMapping: n.data?.inputMapping,
            }
          }));
          const cleanEdges: WorkflowEdge[] = edges.map((e) => ({
            id: e.id, source: e.source, sourceHandle: e.sourceHandle,
            target: e.target, targetHandle: e.targetHandle, animated: e.animated
          }));
          const wfToSave = { ...wf, nodesData: JSON.stringify(cleanNodes), edgesData: JSON.stringify(cleanEdges), updatedAt: Date.now() };
          await invoke('update_workflow', { workflow: wfToSave });
          set((state: any) => {
            const wfs = state.workflows.map((w: Workflow) => {
              if (w.id === id) return { ...w, nodesData: cleanNodes, edgesData: cleanEdges, updatedAt: Date.now() };
              return w;
            });
            void writeConfig('workflow.json', wfs);
            return { workflows: wfs };
          });
        }
      } catch (error) {
        console.error('Failed to save workflow:', error);
      }
    },

    deleteWorkflow: async (id) => {
      try {
        await invoke('delete_workflow', { id });
        const linkedSessions = get().sessions.filter((s: any) => s.workflowId === id);
        await Promise.all(linkedSessions.map((s: any) => invoke('delete_chat_session', { id: s.id })));
      } catch (error) {
        console.error('Failed to delete workflow:', error);
      }
      set((state: any) => {
        const workflows = state.workflows.filter((w: Workflow) => w.id !== id);
        const sessions = state.sessions.filter((s: any) => s.workflowId !== id);
        const activeWorkflowId = state.activeWorkflowId === id ? workflows[0]?.id || null : state.activeWorkflowId;
        const activeSessionId = state.sessions.find((s: any) => s.id === state.activeSessionId)?.workflowId === id
          ? sessions[0]?.id || null
          : state.activeSessionId;
        void writeConfig('workflow.json', workflows);
        return { workflows, sessions, activeWorkflowId, activeSessionId };
      });
    },

    setWorkflowExecutionState: (updates) => set((state: any) => ({
      workflowExecution: { ...state.workflowExecution, ...updates }
    })),

    cancelWorkflowExecution: () => {
      const ctrl = get()._abortController;
      if (ctrl) ctrl.abort();
      set({ _abortController: null });
    },

    executeWorkflow: async (workflowId, initialPayload, options) => {
      const { workflows, setWorkflowExecutionState } = get();
      const workflow = workflows.find((w: Workflow) => w.id === workflowId);
      if (!workflow) return initialPayload;

      const abortController = new AbortController();
      set({ _abortController: abortController });

      try {
        const result = await engineExecuteWorkflow(
          workflow.nodesData,
          workflow.edgesData,
          initialPayload,
          { ...options, signal: abortController.signal },
          (stateUpdate) => setWorkflowExecutionState(stateUpdate)
        );
        return result.finalPayload;
      } catch (e: any) {
        console.error('Workflow execution failed:', e);
        setWorkflowExecutionState({ status: 'error' });
        return initialPayload;
      } finally {
        set({ _abortController: null });
      }
    },
  };
}
