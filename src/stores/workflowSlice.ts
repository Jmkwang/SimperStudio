import { v4 as uuidv4 } from 'uuid';
import { invoke } from '@tauri-apps/api/core';
import { Workflow, WorkflowNode, WorkflowEdge, WorkflowNodeData, ChatSession } from '../types/models';
import { writeConfig } from './baseSlice';
import { executeWorkflow as engineExecuteWorkflow } from '../lib/workflow/engine';
import { debugLogger } from '@/lib/debugLogger';
import { toast } from 'sonner';

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
  renameWorkflow: (id: string, name: string) => void;

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
    id: 'workflow-competitor-analysis',
    workspaceId: 'default-workspace',
    name: '竞品分析报告生成',
    description: '输入产品名称，自动分析竞品并生成结构化报告',
    testPayload: { input: 'Notion' },
    nodesData: [
      { id: 'ca-trigger', type: 'trigger', position: { x: 50, y: 200 }, data: { label: '输入产品名称' } },
      { id: 'ca-analyst', type: 'agent', position: { x: 300, y: 200 }, data: {
        label: '竞品分析师',
        agentId: 'agent-competitor-analyst',
        prompt: '请分析产品 "{{payload.input}}" 的竞品情况。识别核心定位、目标用户、3-5个直接竞品、功能对比矩阵、SWOT分析和市场机会点。',
        autoSendToNext: true
      }},
      { id: 'ca-writer', type: 'agent', position: { x: 600, y: 200 }, data: {
        label: '报告撰写员',
        agentId: 'agent-report-writer',
        prompt: '请基于以下竞品分析数据，撰写一份专业的 Markdown 竞品分析报告：\n\n{{payload.llmResult}}'
      }},
      { id: 'ca-output', type: 'output', position: { x: 900, y: 200 }, data: { label: '最终报告' } }
    ],
    edgesData: [
      { id: 'e-ca-1', source: 'ca-trigger', target: 'ca-analyst', animated: true },
      { id: 'e-ca-2', source: 'ca-analyst', target: 'ca-writer', animated: true },
      { id: 'e-ca-3', source: 'ca-writer', target: 'ca-output', animated: true }
    ],
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'workflow-gift-recommender',
    workspaceId: 'default-workspace',
    name: '礼物推荐助手',
    description: '输入送礼场景，先由礼物策划师推荐选项，再由评估师选出最佳方案',
    testPayload: { input: '朋友快过生日了，TA 平时喜欢烘焙和摄影，预算 300 元左右，送什么礼物好？' },
    nodesData: [
      { id: 'gift-trigger', type: 'trigger', position: { x: 50, y: 200 }, data: { label: '输入送礼场景' } },
      { id: 'gift-planner', type: 'agent', position: { x: 300, y: 200 }, data: {
        label: '礼物策划师',
        agentId: 'agent-gift-planner',
        prompt: '请根据以下送礼场景，推荐 3-5 个合适的礼物选项：\n\n{{payload.input}}',
        autoSendToNext: true
      }},
      { id: 'gift-evaluator', type: 'agent', position: { x: 600, y: 200 }, data: {
        label: '礼物评估师',
        agentId: 'agent-gift-evaluator',
        prompt: '请对以下礼物推荐选项进行评估，从性价比、独特性、情感价值和实用性四个维度打分，并给出最终推荐：\n\n{{payload.llmResult}}'
      }},
      { id: 'gift-output', type: 'output', position: { x: 900, y: 200 }, data: { label: '最终推荐' } }
    ],
    edgesData: [
      { id: 'e-gift-1', source: 'gift-trigger', target: 'gift-planner', animated: true },
      { id: 'e-gift-2', source: 'gift-planner', target: 'gift-evaluator', animated: true },
      { id: 'e-gift-3', source: 'gift-evaluator', target: 'gift-output', animated: true }
    ],
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'werewolf-standard',
    workspaceId: 'default-workspace',
    name: '狼人杀·标准局',
    testPayload: {},
    nodesData: [
      { id: 'ww-trigger', type: 'trigger', position: { x: 50, y: 450 }, data: { label: '开始游戏' } },
      { id: 'ww-init', type: 'code', position: { x: 300, y: 450 }, data: {
        label: '初始化局势',
        code: 'payload.phase = payload.phase || "night"; payload.round = payload.round || 1; payload.gameStatus = payload.gameStatus || "playing"; payload.publicLog = payload.publicLog || []; payload.privateLog = payload.privateLog || []; payload.daySpeeches = payload.daySpeeches || []; payload.nightState = payload.nightState || {}; payload.players = payload.players || []; payload._loopResults = payload._loopResults || []; return payload;'
      }},
      { id: 'ww-host-generate', type: 'agent', position: { x: 550, y: 450 }, data: {
        label: '法官·生成角色',
        agentId: 'ww-host',
        prompt: '你是狼人杀法官。请为一场8人标准局生成角色配置。\n\n角色要求：\n- 2个狼人（werewolf）：需要独特的名字和性格\n- 1个预言家（seer）\n- 1个女巫（witch）\n- 1个守卫（guard）\n- 1个猎人（hunter）\n- 2个平民（villager）\n\n为每个角色生成：\n- id: p1~p8\n- name: 有特色的中文名字\n- role: 角色类型\n- personality: 性格描述（30字以内）\n- systemPrompt: 该角色的系统提示词（定义其行为风格，80字以内）\n\n输出格式：{"playerConfigs":[{"id","name","role","personality","systemPrompt"}]}',
        schema: '{"playerConfigs":[{"id":"string","name":"string","role":"string","personality":"string","systemPrompt":"string"}]}'
      }},
      { id: 'ww-setup-players', type: 'code', position: { x: 800, y: 450 }, data: {
        label: '设置玩家',
        code: 'if (payload.llmResult?.playerConfigs) { payload.playerConfigs = payload.llmResult.playerConfigs; payload.players = payload.playerConfigs.map(p => ({...p, status: "alive"})); payload.players.forEach(p => { if (p.role === "witch") p.potions = {heal: true, poison: true}; if (p.role === "guard") p.lastProtected = null; }); payload.alivePlayers = payload.players.filter(p => p.status === "alive"); payload.aliveWolves = payload.alivePlayers.filter(p => p.role === "werewolf"); payload.seerConfig = payload.playerConfigs.find(p => p.role === "seer"); payload.witchConfig = payload.playerConfigs.find(p => p.role === "witch"); payload.guardConfig = payload.playerConfigs.find(p => p.role === "guard"); payload.publicLog.push({phase: "init", playerConfigs: payload.playerConfigs.map(p => ({id: p.id, name: p.name, role: p.role}))}); } return payload;'
      }},
      { id: 'ww-controller', type: 'code', position: { x: 1050, y: 450 }, data: {
        label: '阶段控制器',
        code: 'payload.alivePlayers = payload.players.filter(p => p.status === "alive"); payload.aliveWolves = payload.alivePlayers.filter(p => p.role === "werewolf"); const wolves = payload.aliveWolves.length; const goods = payload.alivePlayers.filter(p => p.role !== "werewolf").length; if (wolves === 0) payload.gameStatus = "good_wins"; else if (wolves >= goods) payload.gameStatus = "wolves_win"; return payload;'
      }},
      { id: 'ww-router', type: 'condition', position: { x: 1300, y: 450 }, data: {
        label: '阶段路由', routes: [
          { id: 'route-night', condition: 'payload.gameStatus === "playing" && payload.phase === "night"' },
          { id: 'route-speech', condition: 'payload.gameStatus === "playing" && payload.phase === "day_speech"' },
          { id: 'route-vote', condition: 'payload.gameStatus === "playing" && payload.phase === "day_vote"' },
          { id: 'route-end', condition: 'payload.gameStatus !== "playing"' }
        ]
      }},
      // Night phase
      { id: 'ww-wolf-loop', type: 'loop', position: { x: 1550, y: 50 }, data: {
        label: '狼人决策循环',
        itemsPath: 'payload.aliveWolves',
        itemAlias: 'currentWolf',
        indexAlias: 'wolfIndex',
        maxIterations: 10,
        breakCondition: 'payload.gameStatus !== "playing"'
      }},
      { id: 'ww-wolf-action', type: 'dynamic-agent', position: { x: 1800, y: 50 }, data: {
        label: '狼人·夜袭',
        configSource: 'inline',
        inlineConfig: {
          nameTemplate: '{{currentWolf.name}}',
          systemPromptTemplate: '{{currentWolf.systemPrompt}}'
        },
        promptTemplate: '你是{{currentWolf.name}}，角色：{{currentWolf.role}}，性格：{{currentWolf.personality}}。\n\n当前局势：{{JSON.stringify(payload.alivePlayers)}}\n历史记录：{{JSON.stringify(payload.publicLog)}}\n\n你是狼人阵营，请选择今晚要袭击的目标玩家。输出 targetId（目标玩家ID）和 reason（理由）。',
        schema: '{"targetId":"string","reason":"string"}',
        outputField: 'llmResult'
      }},
      { id: 'ww-wolf-collect', type: 'code', position: { x: 2050, y: 50 }, data: {
        label: '收集狼人投票',
        code: 'payload.wolfVotes = payload.wolfVotes || []; const vote = payload.llmResult?.targetId ? {wolfId: payload.currentWolf.id, targetId: payload.llmResult.targetId, reason: payload.llmResult.reason} : null; if (vote) payload.wolfVotes.push(vote); payload._allWolvesVoted = payload.wolfVotes.length >= payload.aliveWolves.length; return payload;'
      }},
      { id: 'ww-wolf-check', type: 'condition', position: { x: 2300, y: 50 }, data: {
        label: '狼人投票完成？', routes: [
          { id: 'route-done', condition: 'payload._allWolvesVoted === true' },
          { id: 'route-continue', condition: 'payload._allWolvesVoted !== true' }
        ]
      }},
      { id: 'ww-seer-action', type: 'dynamic-agent', position: { x: 2550, y: 50 }, data: {
        label: '预言家·查验',
        configSource: 'inline',
        inlineConfig: {
          nameTemplate: '{{payload.seerConfig.name}}',
          systemPromptTemplate: '{{payload.seerConfig.systemPrompt}}'
        },
        promptTemplate: '你是{{payload.seerConfig.name}}，角色：{{payload.seerConfig.role}}，性格：{{payload.seerConfig.personality}}。\n\n当前存活玩家：{{JSON.stringify(payload.alivePlayers)}}\n历史记录：{{JSON.stringify(payload.privateLog)}}\n\n请选择一个玩家查验身份。输出 targetId 和 reason。',
        schema: '{"targetId":"string","reason":"string"}',
        outputField: 'seerResult'
      }},
      { id: 'ww-witch-action', type: 'dynamic-agent', position: { x: 2800, y: 50 }, data: {
        label: '女巫·用药',
        configSource: 'inline',
        inlineConfig: {
          nameTemplate: '{{payload.witchConfig.name}}',
          systemPromptTemplate: '{{payload.witchConfig.systemPrompt}}'
        },
        promptTemplate: '你是{{payload.witchConfig.name}}，角色：{{payload.witchConfig.role}}，性格：{{payload.witchConfig.personality}}。\n\n当前局势：{{JSON.stringify(payload.alivePlayers)}}\n今晚被袭击的是 {{payload.wolfVotes?.[0]?.targetId || "未知"}}\n你的药水状态：{{JSON.stringify(payload.players.find(p=>p.role==="witch")?.potions)}}\n\n是否使用解药或毒药？输出 useHeal（boolean）、poisonTargetId（string或null）和 reason。',
        schema: '{"useHeal":"boolean","poisonTargetId":"string|null","reason":"string"}',
        outputField: 'witchResult'
      }},
      { id: 'ww-guard-action', type: 'dynamic-agent', position: { x: 3050, y: 50 }, data: {
        label: '守卫·守护',
        configSource: 'inline',
        inlineConfig: {
          nameTemplate: '{{payload.guardConfig.name}}',
          systemPromptTemplate: '{{payload.guardConfig.systemPrompt}}'
        },
        promptTemplate: '你是{{payload.guardConfig.name}}，角色：{{payload.guardConfig.role}}，性格：{{payload.guardConfig.personality}}。\n\n当前存活玩家：{{JSON.stringify(payload.alivePlayers)}}\n你上次守护的是 {{payload.players.find(p=>p.role==="guard")?.lastProtected || "无"}}\n\n请选择今晚守护的玩家（不能连续守同一人）。输出 protectTargetId 和 reason。',
        schema: '{"protectTargetId":"string","reason":"string"}',
        outputField: 'guardResult'
      }},
      { id: 'ww-resolve-night', type: 'code', position: { x: 3300, y: 50 }, data: {
        label: '结算夜晚',
        code: 'const deaths = new Set(); const wolfTarget = payload.wolfVotes?.[0]?.targetId; const protectTarget = payload.guardResult?.protectTargetId; const useHeal = payload.witchResult?.useHeal; const poisonTarget = payload.witchResult?.poisonTargetId; if (wolfTarget && wolfTarget !== protectTarget && !useHeal) deaths.add(wolfTarget); if (poisonTarget) deaths.add(poisonTarget); deaths.forEach(id => { const p = payload.players.find(pl => pl.id === id); if (p) p.status = "dead"; }); payload.lastNightDeaths = Array.from(deaths); payload.publicLog.push({round: payload.round, phase: "night_result", deaths: payload.lastNightDeaths}); const witch = payload.players.find(p => p.role === "witch"); if (witch) { if (useHeal) witch.potions.heal = false; if (poisonTarget) witch.potions.poison = false; } const guard = payload.players.find(p => p.role === "guard"); if (guard) guard.lastProtected = protectTarget; payload.alivePlayers = payload.players.filter(p => p.status === "alive"); payload.aliveWolves = payload.alivePlayers.filter(p => p.role === "werewolf"); const wolves = payload.aliveWolves.length; const goods = payload.alivePlayers.filter(p => p.role !== "werewolf").length; if (wolves === 0) payload.gameStatus = "good_wins"; else if (wolves >= goods) payload.gameStatus = "wolves_win"; else payload.phase = "day_speech"; payload.nightState = {}; payload.wolfVotes = []; return payload;'
      }},
      { id: 'ww-night-output', type: 'output', position: { x: 3550, y: 50 }, data: { label: '夜晚结果' } },
      // Day speech phase
      { id: 'ww-prepare-speech', type: 'code', position: { x: 1550, y: 300 }, data: {
        label: '准备发言',
        code: 'payload.alivePlayers = payload.players.filter(p => p.status === "alive"); payload.daySpeeches = []; payload.votes = []; payload._allSpoke = false; payload._allVoted = false; payload.publicLog.push({round: payload.round, phase: "day_speech_start", alive: payload.alivePlayers.map(p=>p.id), lastNightDeaths: payload.lastNightDeaths||[]}); return payload;'
      }},
      { id: 'ww-speech-loop', type: 'loop', position: { x: 1800, y: 300 }, data: {
        label: '逐人发言循环',
        itemsPath: 'payload.alivePlayers',
        itemAlias: 'currentSpeaker',
        indexAlias: 'speakerIndex',
        maxIterations: 12,
        breakCondition: 'payload.gameStatus !== "playing"'
      }},
      { id: 'ww-speech-action', type: 'dynamic-agent', position: { x: 2050, y: 300 }, data: {
        label: '玩家发言',
        configSource: 'inline',
        inlineConfig: {
          nameTemplate: '{{currentSpeaker.name}}',
          systemPromptTemplate: '{{currentSpeaker.systemPrompt}}'
        },
        promptTemplate: '你是{{currentSpeaker.name}}，角色：{{currentSpeaker.role}}，性格：{{currentSpeaker.personality}}。\n\n当前局势：{{JSON.stringify(payload.alivePlayers)}}\n历史记录：{{JSON.stringify(payload.publicLog)}}\n白天已发言：{{JSON.stringify(payload.daySpeeches)}}\n\n请发表你的白天发言。输出 speech（发言内容）和 suspicion（你怀疑谁）。',
        schema: '{"speech":"string","suspicion":"string"}',
        outputField: 'llmResult'
      }},
      { id: 'ww-speech-collect', type: 'code', position: { x: 2300, y: 300 }, data: {
        label: '记录发言',
        code: 'payload.daySpeeches = payload.daySpeeches || []; payload.daySpeeches.push({playerId: payload.currentSpeaker.id, name: payload.currentSpeaker.name, speech: payload.llmResult?.speech || "发言略", suspicion: payload.llmResult?.suspicion || ""}); payload.publicLog.push({round: payload.round, phase: "day_speech", playerId: payload.currentSpeaker.id, speech: payload.llmResult?.speech || "发言略"}); payload._allSpoke = payload.daySpeeches.length >= payload.alivePlayers.length; return payload;'
      }},
      { id: 'ww-speech-check', type: 'condition', position: { x: 2550, y: 300 }, data: {
        label: '发言完成？', routes: [
          { id: 'route-done', condition: 'payload._allSpoke === true' },
          { id: 'route-continue', condition: 'payload._allSpoke !== true' }
        ]
      }},
      { id: 'ww-speech-output', type: 'output', position: { x: 2800, y: 300 }, data: { label: '发言记录' } },
      // Day vote phase
      { id: 'ww-vote-loop', type: 'loop', position: { x: 1550, y: 550 }, data: {
        label: '逐人投票循环',
        itemsPath: 'payload.alivePlayers',
        itemAlias: 'currentSpeaker',
        indexAlias: 'voteIndex',
        maxIterations: 12,
        breakCondition: 'payload.gameStatus !== "playing"'
      }},
      { id: 'ww-vote-action', type: 'dynamic-agent', position: { x: 1800, y: 550 }, data: {
        label: '玩家投票',
        configSource: 'inline',
        inlineConfig: {
          nameTemplate: '{{currentSpeaker.name}}',
          systemPromptTemplate: '{{currentSpeaker.systemPrompt}}'
        },
        promptTemplate: '你是{{currentSpeaker.name}}，角色：{{currentSpeaker.role}}，性格：{{currentSpeaker.personality}}。\n\n白天发言记录：{{JSON.stringify(payload.daySpeeches)}}\n存活玩家：{{JSON.stringify(payload.alivePlayers)}}\n\n请投票放逐一个玩家。输出 voteTargetId（目标玩家ID）和 reason（理由）。',
        schema: '{"voteTargetId":"string","reason":"string"}',
        outputField: 'llmResult'
      }},
      { id: 'ww-vote-collect', type: 'code', position: { x: 2050, y: 550 }, data: {
        label: '收集投票',
        code: 'payload.votes = payload.votes || []; payload.votes.push({playerId: payload.currentSpeaker.id, targetId: payload.llmResult?.voteTargetId, reason: payload.llmResult?.reason}); payload._allVoted = payload.votes.length >= payload.alivePlayers.length; return payload;'
      }},
      { id: 'ww-vote-check', type: 'condition', position: { x: 2300, y: 550 }, data: {
        label: '投票完成？', routes: [
          { id: 'route-done', condition: 'payload._allVoted === true' },
          { id: 'route-continue', condition: 'payload._allVoted !== true' }
        ]
      }},
      { id: 'ww-resolve-vote', type: 'code', position: { x: 2550, y: 550 }, data: {
        label: '结算投票',
        code: 'const voteCounts = {}; for (const v of payload.votes || []) { if (v.targetId) voteCounts[v.targetId] = (voteCounts[v.targetId] || 0) + 1; } let maxVotes = 0; let exileTarget = null; for (const [id, count] of Object.entries(voteCounts)) { if (count > maxVotes) { maxVotes = count; exileTarget = id; } } if (maxVotes <= 1) exileTarget = null; if (exileTarget) { const target = payload.players.find(p => p.id === exileTarget); if (target) { target.status = "dead"; payload.publicLog.push({round: payload.round, phase: "vote_result", exiled: exileTarget}); if (target.role === "hunter") { const wolfTarget = payload.alivePlayers.find(p => p.role === "werewolf" && p.id !== exileTarget); if (wolfTarget) { wolfTarget.status = "dead"; payload.publicLog.push({round: payload.round, phase: "hunter_shoot", killed: wolfTarget.id}); } } } } else { payload.publicLog.push({round: payload.round, phase: "vote_result", exiled: null, reason: "平票"}); } payload.alivePlayers = payload.players.filter(p => p.status === "alive"); payload.aliveWolves = payload.alivePlayers.filter(p => p.role === "werewolf"); const wolves = payload.aliveWolves.length; const goods = payload.alivePlayers.filter(p => p.role !== "werewolf").length; if (wolves === 0) payload.gameStatus = "good_wins"; else if (wolves >= goods) payload.gameStatus = "wolves_win"; else { payload.phase = "night"; payload.round = (payload.round || 1) + 1; payload.daySpeeches = []; payload.votes = []; payload.nightState = {}; payload.wolfVotes = []; } return payload;'
      }},
      { id: 'ww-vote-output', type: 'output', position: { x: 2800, y: 550 }, data: { label: '投票结果' } },
      // End phase
      { id: 'ww-host-end', type: 'agent', position: { x: 1550, y: 800 }, data: {
        label: '法官·终局播报',
        agentId: 'ww-host',
        prompt: '游戏结束。获胜阵营：{{payload.gameStatus}}\n最终局势：{{JSON.stringify(payload.players)}}\n历史记录：{{JSON.stringify(payload.publicLog)}}\n\n请作为法官生成终局播报，说明获胜阵营、关键转折点、各角色表现和最终存活玩家。',
        schema: '{"summary":"string"}'
      }},
      { id: 'ww-end-output', type: 'output', position: { x: 1800, y: 800 }, data: { label: '游戏结束' } }
    ],
    edgesData: [
      { id: 'ww-e1', source: 'ww-trigger', target: 'ww-init', animated: true },
      { id: 'ww-e2', source: 'ww-init', target: 'ww-host-generate', animated: true },
      { id: 'ww-e2b', source: 'ww-host-generate', target: 'ww-setup-players', animated: true },
      { id: 'ww-e2c', source: 'ww-setup-players', target: 'ww-controller', animated: true },
      { id: 'ww-e3', source: 'ww-controller', target: 'ww-router', animated: true },
      // Night
      { id: 'ww-e4', source: 'ww-router', sourceHandle: 'route-night', target: 'ww-wolf-loop', animated: true },
      { id: 'ww-e5', source: 'ww-wolf-loop', target: 'ww-wolf-action', animated: true },
      { id: 'ww-e6', source: 'ww-wolf-action', target: 'ww-wolf-collect', animated: true },
      { id: 'ww-e7', source: 'ww-wolf-collect', target: 'ww-wolf-check', animated: true },
      { id: 'ww-e8', source: 'ww-wolf-check', sourceHandle: 'route-done', target: 'ww-seer-action', animated: true },
      { id: 'ww-e9', source: 'ww-seer-action', target: 'ww-witch-action', animated: true },
      { id: 'ww-e10', source: 'ww-witch-action', target: 'ww-guard-action', animated: true },
      { id: 'ww-e11', source: 'ww-guard-action', target: 'ww-resolve-night', animated: true },
      { id: 'ww-e12', source: 'ww-resolve-night', target: 'ww-night-output', animated: true },
      { id: 'ww-e13', source: 'ww-night-output', target: 'ww-controller', animated: true },
      // Speech
      { id: 'ww-e14', source: 'ww-router', sourceHandle: 'route-speech', target: 'ww-prepare-speech', animated: true },
      { id: 'ww-e15', source: 'ww-prepare-speech', target: 'ww-speech-loop', animated: true },
      { id: 'ww-e16', source: 'ww-speech-loop', target: 'ww-speech-action', animated: true },
      { id: 'ww-e17', source: 'ww-speech-action', target: 'ww-speech-collect', animated: true },
      { id: 'ww-e18', source: 'ww-speech-collect', target: 'ww-speech-check', animated: true },
      { id: 'ww-e19', source: 'ww-speech-check', sourceHandle: 'route-done', target: 'ww-speech-output', animated: true },
      { id: 'ww-e20', source: 'ww-speech-output', target: 'ww-controller', animated: true },
      // Vote
      { id: 'ww-e21', source: 'ww-router', sourceHandle: 'route-vote', target: 'ww-vote-loop', animated: true },
      { id: 'ww-e22', source: 'ww-vote-loop', target: 'ww-vote-action', animated: true },
      { id: 'ww-e23', source: 'ww-vote-action', target: 'ww-vote-collect', animated: true },
      { id: 'ww-e24', source: 'ww-vote-collect', target: 'ww-vote-check', animated: true },
      { id: 'ww-e25', source: 'ww-vote-check', sourceHandle: 'route-done', target: 'ww-resolve-vote', animated: true },
      { id: 'ww-e26', source: 'ww-resolve-vote', target: 'ww-vote-output', animated: true },
      { id: 'ww-e27', source: 'ww-vote-output', target: 'ww-controller', animated: true },
      // End
      { id: 'ww-e28', source: 'ww-router', sourceHandle: 'route-end', target: 'ww-host-end', animated: true },
      { id: 'ww-e29', source: 'ww-host-end', target: 'ww-end-output', animated: true }
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
          const cleanNodes: WorkflowNode[] = nodes.map((n) => {
            const d = n.data as any;
            return {
              id: n.id, type: n.type, position: n.position,
              data: {
                label: d?.label, description: d?.description,
                timeoutMs: d?.timeoutMs, retryPolicy: d?.retryPolicy, onError: d?.onError,
                inputSchema: d?.inputSchema, outputSchema: d?.outputSchema,
                agentId: d?.agentId, prompt: d?.prompt, schema: d?.schema, autoSendToNext: d?.autoSendToNext,
                overrideProviderId: d?.overrideProviderId, overrideModelId: d?.overrideModelId,
                overrideSystemPrompt: d?.overrideSystemPrompt,
                configSource: d?.configSource, configPath: d?.configPath, inlineConfig: d?.inlineConfig,
                promptTemplate: d?.promptTemplate, fallbackAgentId: d?.fallbackAgentId,
                fallbackProviderId: d?.fallbackProviderId, fallbackModelId: d?.fallbackModelId,
                outputField: d?.outputField, enableChatWindow: d?.enableChatWindow,
                routes: d?.routes, code: d?.code,
                itemsPath: d?.itemsPath, itemAlias: d?.itemAlias, indexAlias: d?.indexAlias,
                maxIterations: d?.maxIterations, breakCondition: d?.breakCondition, aggregationStrategy: d?.aggregationStrategy,
                method: d?.method, url: d?.url, headers: d?.headers, body: d?.body,
                mappings: d?.mappings, constants: d?.constants, whitelist: d?.whitelist,
                branches: d?.branches, waitMode: d?.waitMode, delayMs: d?.delayMs, untilExpression: d?.untilExpression,
                strategy: d?.strategy, mergeKey: d?.mergeKey,
                webhookMethod: d?.webhookMethod, webhookPath: d?.webhookPath, authToken: d?.authToken,
                subWorkflowId: d?.subWorkflowId, inputs: d?.inputs,
              } as WorkflowNodeData
            };
          });
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
        debugLogger.error('workflowSlice', 'saveWorkflow failed', { workflowId: id, error: String(error) });
      }
    },

    deleteWorkflow: async (id) => {
      try {
        await invoke('delete_workflow', { id });
        const linkedSessions = get().sessions.filter((s: any) => s.workflowId === id);
        await Promise.all(linkedSessions.map((s: any) => invoke('delete_chat_session', { id: s.id })));
      } catch (error) {
        console.error('Failed to delete workflow:', error);
        debugLogger.error('workflowSlice', 'deleteWorkflow failed', { workflowId: id, error: String(error) });
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

    renameWorkflow: (id, name) => {
      set((state: any) => {
        const workflows = state.workflows.map((w: Workflow) =>
          w.id === id ? { ...w, name, updatedAt: Date.now() } : w
        );
        void writeConfig('workflow.json', workflows);
        return { workflows };
      });
      try { invoke('update_workflow', { id, name }); } catch { /* best-effort */ }
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
      const { workflows, setWorkflowExecutionState, sessions } = get();
      const workflow = workflows.find((w: Workflow) => w.id === workflowId);
      if (!workflow) return initialPayload;

      // Find an existing workflow chat session so engine results can be written to chat
      const workflowSession = sessions.find(
        (s: ChatSession) => s.workflowId === workflowId && s.mode === 'workflow'
      );
      const workflowSessionId: string | null = workflowSession?.id || null;

      // Create a user message for the trigger payload (one per execution)
      let executionMessageId: string | null = null;
      if (workflowSessionId) {
        const { addUserMessage } = get();
        executionMessageId = uuidv4();
        const triggerText = `⚙️ Workflow execution started\n\n**Input:**\n\`\`\`json\n${JSON.stringify(initialPayload, null, 2)}\n\`\`\``;
        addUserMessage(workflowSessionId, triggerText, [], { workflowId, triggeredBy: 'system' as any });
      }

      const abortController = new AbortController();
      set({ _abortController: abortController });

      // Global timeout: 5 minutes to prevent indefinite hangs
      const GLOBAL_TIMEOUT_MS = 5 * 60 * 1000;
      const timeoutId = setTimeout(() => abortController.abort(), GLOBAL_TIMEOUT_MS);

      try {
        const result = await engineExecuteWorkflow(
          workflow.nodesData,
          workflow.edgesData,
          initialPayload,
          {
            ...options,
            signal: abortController.signal,
            onNodeResult: (nodeId: string, nodeType: string, payload: any, nodeData: any) => {
              // Fire-and-forget: write agent/dynamic-agent/cli-agent results to the workflow chat session
              if (!workflowSessionId || !executionMessageId) return;
              if (nodeType !== 'agent' && nodeType !== 'dynamic-agent' && nodeType !== 'cli-agent') return;

              const state = get();

              // CLI Agent: write stdout result to chat
              if (nodeType === 'cli-agent') {
                const outputField = nodeData?.outputField || 'cliOutput';
                const cliResult = payload[outputField];
                const exitCode = payload.cliExitCode;
                const stderr = payload.cliStderr;

                if (cliResult == null && exitCode === 0 && !stderr) return;

                const responseText = typeof cliResult === 'object'
                  ? JSON.stringify(cliResult, null, 2)
                  : String(cliResult || '');

                const agentId = `cli-agent-${nodeId}`;
                const statusLine = `[Exit Code: ${exitCode ?? 'unknown'}]`;
                const fullText = stderr
                  ? `${statusLine}\n\n${responseText}\n\n--- stderr ---\n${stderr}`
                  : `${statusLine}\n\n${responseText}`;

                state.addAgentResponseStream(workflowSessionId, executionMessageId, agentId, fullText, nodeId, {
                  workflowId,
                  workflowNodeId: nodeId,
                });
                state.completeAgentResponse(workflowSessionId, executionMessageId, agentId, nodeId);
                return;
              }

              const llmResult = payload.llmResult ?? payload.output;
              if (llmResult == null) return;

              const responseText = typeof llmResult === 'object' && llmResult !== null
                ? JSON.stringify(llmResult, null, 2)
                : String(llmResult);

              let agentId: string;
              let dynamicMeta: any;

              if (nodeType === 'dynamic-agent') {
                const meta = payload._dynamicAgentMeta || {};
                agentId = `dynamic-${nodeId}`;
                dynamicMeta = meta;
              } else {
                agentId = nodeData?.agentId || `unknown-${nodeId}`;
                dynamicMeta = undefined;
              }

              state.addAgentResponseStream(workflowSessionId, executionMessageId, agentId, responseText, nodeId, {
                workflowId,
                workflowNodeId: nodeId,
                ...(dynamicMeta ? { _dynamicAgentMeta: dynamicMeta } : {}),
              });
              state.completeAgentResponse(workflowSessionId, executionMessageId, agentId, nodeId);
            },
          },
          (stateUpdate) => setWorkflowExecutionState(stateUpdate),
          { agents: get().agents, settings: get().settings, workflows: get().workflows },
        );

        // Execution feedback (toast + screen shake)
        const { settings: currentSettings } = get();
        if (currentSettings?.executionFeedback !== false) {
          toast.success(result.status === 'completed' ? 'Workflow completed!' : 'Workflow execution failed');
          triggerScreenShake();
        }

        // Browser Notification on workflow completion
        if (currentSettings?.workflowNotifications && result.status === 'completed') {
          try {
            if (typeof Notification !== 'undefined') {
              if (Notification.permission === 'granted') {
                new Notification('SimperStudio', { body: '工作流执行完成' });
              } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                  if (permission === 'granted') {
                    new Notification('SimperStudio', { body: '工作流执行完成' });
                  }
                });
              }
            }
          } catch (_) { /* Notification API unavailable */ }
        }

        // Webhook call on workflow completion
        if (currentSettings?.webhookUrl && result.status === 'completed') {
          try {
            fetch(currentSettings.webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ event: 'workflow.completed', workflowId, timestamp: Date.now() }),
            }).catch(() => {});
          } catch (_) { /* fetch unavailable */ }
        }

        return result.finalPayload;
      } catch (e: any) {
        const msg = e.name === 'AbortError' ? 'Workflow timed out after 5 minutes' : (e.message || String(e));
        console.error('Workflow execution failed:', msg);
        debugLogger.error('workflowSlice', 'executeWorkflow failed', { error: msg });
        setWorkflowExecutionState({ status: 'error' });

        // Error feedback
        const { settings: currentSettings } = get();
        if (currentSettings?.executionFeedback !== false) {
          toast.error('Workflow execution failed');
          triggerScreenShake();
        }

        return { ...initialPayload, _error: msg };
      } finally {
        clearTimeout(timeoutId);
        set({ _abortController: null });
      }
    },
  };
}

/**
 * Trigger a brief screen-shake animation on the root element.
 * Adds a CSS class that kicks off the shake keyframes, then removes it after the animation ends.
 */
function triggerScreenShake() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.add('animate-screen-shake');
  const cleanup = () => root.classList.remove('animate-screen-shake');
  root.addEventListener('animationend', cleanup, { once: true });
  // Fallback: remove after 600ms if animationend doesn't fire
  setTimeout(cleanup, 600);
}
