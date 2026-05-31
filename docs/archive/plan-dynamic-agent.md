# Dynamic Agent 节点设计方案

> 状态：Plan 阶段（仅文档，未开始编码）
> 创建日期：2026-05-18
> 对应需求：支持"Agent 设定 Agent"——一个组长 Agent 动态给其他空白 Agent 分配角色/性格/任务

---

## 1. 背景与问题

### 1.1 当前系统的限制

当前 `agent` 节点是**静态绑定**的：
- 节点通过 `agentId` 引用一个在 `agents` 数组中预先定义好的 Agent 实体
- `overrideSystemPrompt` 虽然是节点级覆盖，但它是**静态配置**，不支持模板变量替换
- 系统中的 Agent 实体是固定的，**不能在运行时创建新的 Agent**

### 1.2 用户场景

以狼人杀为例，用户希望：
- 一个"主持人"Agent 动态生成 8 个玩家的角色分配（每个玩家有不同的角色、性格、思维方式）
- 每个玩家在实际发言时，都使用**独立的**性格和思维方式
- 每次运行时角色分配可以不同（随机性）
- 发言是**依次进行**的（串行，非并发）

当前方案的问题：
- 所有角色回复是**同一时间并发生成**的（Promise.all）
- 每个 Agent 只能使用**预先定义好**的 systemPrompt，无法运行时变化
- 要支持 8 个不同角色需要预先创建 8 个 Agent 实体，无法动态分配

---

## 2. 核心概念

### 2.1 什么是 Dynamic Agent 节点

Dynamic Agent 节点是一种**运行时动态配置**的 AI 执行节点。它不绑定到预先定义的 Agent 实体，而是：

1. 在执行时从 `payload` 中读取 Agent 配置（名称、头像、systemPrompt、性格等）
2. 或者使用内联模板配置（支持模板变量替换）
3. 使用解析后的配置执行 LLM 调用
4. 将结果写回 payload

### 2.2 与现有 Agent 节点的区别

| 特性 | Agent 节点 | Dynamic Agent 节点 |
|------|-----------|-------------------|
| Agent 绑定 | 静态 `agentId` 引用 | 动态配置（从 payload 读取或内联模板） |
| systemPrompt | 来自预定义 Agent | 支持模板变量替换，运行时注入 |
| 头像/名称 | 来自预定义 Agent | 运行时动态指定 |
| 用途 | 固定角色执行 | 动态角色分配、多角色模拟、模板化 Agent |
| 模型配置 | 继承自 Agent + 节点覆盖 | 支持 fallback 继承或内联指定 |

### 2.3 典型使用模式

```
[Trigger]
  ↓
[Agent: 主持人] —— 生成角色分配 → payload.roles = [
  { name: "玩家1", role: "狼人", personality: "激进", systemPrompt: "你是狼人..." },
  { name: "玩家2", role: "村民", personality: "谨慎", systemPrompt: "你是村民..." },
  ...
]
  ↓
[Loop] —— 遍历 payload.roles
  ↓
[Dynamic Agent] —— configSource='payload', configPath='loop.currentItem'
  ↓ 每个迭代使用不同的角色配置
[Code] —— 收集发言、判断胜负
```

---

## 3. 数据模型设计

### 3.1 新增类型

```typescript
// src/types/models.ts

/**
 * 动态 Agent 配置对象
 * 可以从 payload 中读取，也可以从内联模板生成
 */
interface DynamicAgentConfig {
  name?: string;              // 动态 Agent 显示名称（支持模板变量）
  avatar?: string;            // 动态 Agent 头像 URL
  systemPrompt: string;       // 系统提示词（支持模板变量）
  role?: string;              // 角色描述（如"狼人"、"预言家"）
  personality?: string;       // 性格描述（如"激进"、"谨慎"）
  providerId?: string;        // 模型服务商（可选，默认继承 fallback）
  modelId?: string;           // 模型 ID（可选，默认继承 fallback）
  temperature?: number;       // 温度参数
  maxTokens?: number;         // 最大 token 数
}

/**
 * Dynamic Agent 节点数据
 */
interface WorkflowDynamicAgentNodeData extends WorkflowNodeDataBase {
  // 配置来源模式
  configSource: 'payload' | 'inline';

  // === payload 模式 ===
  // 从 payload 中读取 DynamicAgentConfig 的路径
  configPath?: string;        // 如 "payload.agentConfig" 或 "payload.assignedRoles[0]"

  // === inline 模式 ===
  // 直接在节点中配置模板（支持模板变量替换）
  inlineConfig?: {
    nameTemplate?: string;         // 如 "{{payload.roleName}}" 或 "玩家{{loop.index}}"
    systemPromptTemplate: string;  // 支持模板变量替换
    avatarTemplate?: string;
    personalityTemplate?: string;
    roleTemplate?: string;
  };

  // 提示词模板（用户输入/任务内容的模板）
  promptTemplate?: string;    // 支持模板变量，如 "{{payload.userInput}}"

  // 模型继承配置（当动态配置未指定 provider/model 时使用）
  fallbackAgentId?: string;   // 备用 Agent（用于继承模型配置）
  fallbackProviderId?: string;
  fallbackModelId?: string;

  // 输出设置
  outputField?: string;       // 结果写入 payload 的哪个字段（默认 'llmResult'）

  // 聊天集成
  autoSendToNext?: boolean;
  enableChatWindow?: boolean; // 是否在工作流聊天中显示独立窗口
}

// WorkflowNodeType 扩展
export type WorkflowNodeType =
  | 'trigger' | 'agent' | 'condition' | 'code' | 'loop' | 'output'
  | 'router' | 'http' | 'set' | 'switch' | 'wait' | 'merge'
  | 'webhook' | 'subworkflow'
  | 'dynamic-agent';  // ← 新增
```

### 3.2 类型兼容

`WorkflowNodeData` 需要扩展以支持 `WorkflowDynamicAgentNodeData`：

```typescript
export type WorkflowNodeData = WorkflowNodeDataBase &
  Partial<WorkflowAgentNodeData> &
  Partial<WorkflowDynamicAgentNodeData> &
  Record<string, unknown>;
```

---

## 4. 执行器设计

### 4.1 文件位置

`src/lib/workflow/nodeExecutors/dynamicAgentExecutor.ts`

### 4.2 执行流程

```typescript
export const dynamicAgentExecute: NodeExecutorFn = async (node, payload, helpers) => {
  // 1. 解析动态配置
  let config: DynamicAgentConfig;

  if (node.data?.configSource === 'payload') {
    const configPath = node.data?.configPath || 'payload.dynamicAgentConfig';
    config = helpers.getByPath(payload, configPath);
  } else {
    // inline 模式：从模板生成配置
    config = {
      name: helpers.replaceTemplateVars(
        node.data?.inlineConfig?.nameTemplate || 'Dynamic Agent',
        payload
      ),
      systemPrompt: helpers.replaceTemplateVars(
        node.data?.inlineConfig?.systemPromptTemplate || '',
        payload
      ),
      avatar: node.data?.inlineConfig?.avatarTemplate
        ? helpers.replaceTemplateVars(node.data.inlineConfig.avatarTemplate, payload)
        : undefined,
      personality: node.data?.inlineConfig?.personalityTemplate
        ? helpers.replaceTemplateVars(node.data.inlineConfig.personalityTemplate, payload)
        : undefined,
      role: node.data?.inlineConfig?.roleTemplate
        ? helpers.replaceTemplateVars(node.data.inlineConfig.roleTemplate, payload)
        : undefined,
    };
  }

  if (!config || !config.systemPrompt) {
    return { ...payload, _error: 'Dynamic Agent: no valid configuration found' };
  }

  // 2. 解析模型配置（三级回退）
  const settings = helpers.getGlobalState?.('settings');
  let providerId = config.providerId;
  let modelId = config.modelId;

  // 回退 1：从 fallbackAgentId 继承
  if (!providerId && node.data?.fallbackAgentId) {
    const agents = helpers.getGlobalState?.('agents') || [];
    const fallbackAgent = agents.find((a: Agent) => a.id === node.data.fallbackAgentId);
    if (fallbackAgent) {
      providerId = fallbackAgent.providerId;
      modelId = fallbackAgent.modelId;
    }
  }

  // 回退 2：从 fallbackProviderId/fallbackModelId 继承
  if (!providerId && node.data?.fallbackProviderId) {
    providerId = node.data.fallbackProviderId;
    modelId = node.data?.fallbackModelId;
  }

  // 回退 3：全局默认（在 resolveAgentModelConfig 中处理）

  // 3. 解析提示词
  const promptText = node.data?.promptTemplate
    ? helpers.replaceTemplateVars(node.data.promptTemplate, payload)
    : (typeof payload === 'object' ? JSON.stringify(payload, null, 2) : String(payload));

  // 4. 调用 LLM
  try {
    // 构造一个虚拟 Agent 对象用于 resolveAgentModelConfig
    const virtualAgent: Agent = {
      id: `dynamic-${node.id}-${Date.now()}`,
      name: config.name || 'Dynamic Agent',
      avatar: config.avatar || '',
      systemPrompt: config.systemPrompt,
      providerId,
      modelId,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    };

    const modelConfig = resolveAgentModelConfig(virtualAgent, {}, settings);
    const { textStream } = await fetchFromResolvedConfig(
      modelConfig,
      promptText,
      config.systemPrompt
    );

    let result = '';
    for await (const chunk of textStream) {
      result += chunk;
    }

    // 5. 构建输出
    const outputField = node.data?.outputField || 'llmResult';
    const output = {
      ...payload,
      [outputField]: result,
      // 保存动态配置元信息，便于下游节点和聊天视图使用
      _dynamicAgentMeta: {
        nodeId: node.id,
        name: config.name,
        role: config.role,
        personality: config.personality,
        avatar: config.avatar,
        systemPrompt: config.systemPrompt,
      }
    };

    return output;

  } catch (e: any) {
    return { ...payload, _error: `${shortError(e.message)}: ${e.message}` };
  }
};
```

### 4.3 模板变量替换

需要在 `helpers.ts` 中新增或复用模板替换函数：

```typescript
// src/lib/workflow/helpers.ts

/**
 * 替换字符串中的模板变量
 * 支持语法：{{path.to.value}} 或 ${path.to.value}
 * 从 payload 中按路径读取值
 */
function replaceTemplateVars(template: string, payload: any): string {
  if (!template) return '';
  return template.replace(/\{\{(.*?)\}\}/g, (match, path) => {
    const value = getByPath(payload, path.trim());
    return value !== undefined ? String(value) : match;
  });
}
```

注意：如果 `agentExecutor` 中已有类似的模板替换逻辑，应该提取为公共工具函数。

---

## 5. UI 设计

### 5.1 节点编辑器（DynamicAgentNode.tsx）

路径：`src/components/workflow/nodes/DynamicAgentNode.tsx`

布局结构：

```
┌─────────────────────────────────────┐
│  ⚡ Dynamic Agent                    │  ← 节点标题（与 Agent 节点区分图标/颜色）
├─────────────────────────────────────┤
│  配置来源                             │
│  ○ 从 Payload 读取  ○ 内联模板配置      │  ← 单选切换
├─────────────────────────────────────┤
│  [从 Payload 读取模式]                │
│  配置路径: payload.roles[0]          │  ← 输入框 + 帮助文本
│  帮助: 期望 DynamicAgentConfig 结构   │
├─────────────────────────────────────┤
│  [内联模板配置模式]                    │
│  名称模板: 玩家{{loop.index}}          │
│  System Prompt 模板:                 │
│  ┌─────────────────────────────┐    │
│  │ 你是 {{payload.roleName}}，   │    │  ← Textarea
│  │ 性格 {{payload.personality}}  │    │
│  └─────────────────────────────┘    │
│  角色模板:                            │
│  性格模板:                            │
│  头像模板:                            │
├─────────────────────────────────────┤
│  提示词模板（可选）                     │
│  ┌─────────────────────────────┐    │
│  │ {{payload.userInput}}        │    │  ← Textarea
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  模型继承                             │
│  备用 Agent: [选择 Agent ▼]          │  ← 用于继承 provider/model
│  或手动指定: Provider [▼] Model [▼]   │
├─────────────────────────────────────┤
│  高级设置                             │
│  输出字段: llmResult                  │
│  [超时] [重试] [失败策略]             │  ← 通用契约
└─────────────────────────────────────┘
```

### 5.2 节点样式

- **颜色主题**：使用紫色渐变（与 Loop 节点区分），表示"动态/变化"
- **图标**：使用 `UserCog` 或 `Mask` 图标，表示"角色扮演/动态配置"
- **边框**：当配置有效时显示正常边框，配置缺失时显示警告色边框

### 5.3 聊天视图集成

当 Dynamic Agent 在工作流聊天中执行时：
- 如果 `enableChatWindow` 为 true，显示独立的对话窗口
- 窗口标题使用动态名称（从 `_dynamicAgentMeta.name` 读取）
- 头像可选，配置了则使用 `_dynamicAgentMeta.avatar`，未配置时使用名称首字母 fallback
- Agent 名称后方显示 Provider/Model 信息（与现有 Agent 气泡一致）

**需要修改的组件：**
- `WorkflowAgentWindow.tsx`：支持从 `_dynamicAgentMeta` 读取动态配置
- `ChatMessageBubble.tsx`：支持显示动态 Agent 信息
- `WorkflowChatView.tsx`：为 Dynamic Agent 节点打开对话窗口

---

## 6. 使用场景：狼人杀工作流升级

### 6.1 当前狼人杀的痛点

- 并发生成：所有角色同时回复，没有依次发言的感觉
- 静态角色：角色性格和思维方式固定在每个预定义 Agent 中
- 缺乏随机性：每次运行角色分配相同

### 6.2 升级后的狼人杀架构

```
[Trigger: 开始游戏]
  ↓
[Agent: 主持人]
  System Prompt: "你是狼人杀主持人。请为 8 位玩家分配角色：
  2 狼人、1 预言家、1 女巫、1 猎人、3 村民。
  每位玩家需要有不同的性格（激进/谨慎/冷静/多疑...）
  输出 JSON: { players: [{id, name, role, personality, systemPrompt}] }"
  → payload.players = [...]
  ↓
[Code: 初始化游戏状态]
  → payload.gameState = { day: 1, phase: 'night', alivePlayers: [...] }
  ↓
[Loop: 夜晚阶段]
  itemsPath: payload.players
  itemAlias: player
  maxIterations: 8
  breakCondition: payload.gameState.phase !== 'night'
  ↓
[Dynamic Agent: 角色行动]
  configSource: 'payload'
  configPath: 'loop.currentItem'
  promptTemplate: "当前是第 {{payload.gameState.day}} 天夜晚。
  存活玩家：{{payload.gameState.alivePlayers}}。
  请执行你的角色行动。"
  fallbackAgentId: 'default-agent'
  → 每个玩家按顺序行动，使用各自的 systemPrompt 和性格
  ↓
[Code: 夜晚结算]
  狼刀、预言家查验、女巫用药 → 更新 gameState
  ↓
[Loop: 白天发言阶段]
  itemsPath: payload.gameState.alivePlayers
  ↓
[Dynamic Agent: 依次发言]
  configSource: 'payload'
  configPath: 'loop.currentItem'
  promptTemplate: "轮到你发言了。请分析当前局势，猜测其他玩家的身份。
  历史发言：{{payload.gameState.speeches}}"
  → 玩家依次发言，每人的性格和思维方式不同
  ↓
[Code: 投票结算]
  → 更新 gameState，检查胜负
  ↓
[Condition: 游戏结束？]
  → 是：[Output: 公布结果]
  → 否：回到 [Loop: 夜晚阶段]
```

### 6.3 改进效果

| 改进项 | 之前 | 之后 |
|--------|------|------|
| 执行顺序 | 并发 Promise.all | 串行 Loop 遍历 |
| 角色性格 | 静态预定义 | 动态生成，每次不同 |
| 角色分配 | 固定 | 主持人 Agent 随机分配 |
| 发言内容 | 机械 JSON | 自由发言，带推理过程 |
| 通用性 | 狼人杀专用 | Loop + Dynamic Agent 通用组合 |

---

## 7. 实现阶段拆分

### Phase 1：核心引擎（最小可用）

- [ ] `src/types/models.ts`
  - [ ] 新增 `DynamicAgentConfig` 接口
  - [ ] 新增 `WorkflowDynamicAgentNodeData` 接口
  - [ ] `WorkflowNodeType` 扩展 `'dynamic-agent'`
  - [ ] `WorkflowNodeData` 联合类型扩展
- [ ] `src/lib/workflow/helpers.ts`
  - [ ] 新增 `replaceTemplateVars()` 模板替换函数
  - [ ] 确认 `getByPath()` 支持数组索引路径（如 `payload.roles[0]`）
- [ ] `src/lib/workflow/nodeExecutors/dynamicAgentExecutor.ts`
  - [ ] 创建执行器文件
  - [ ] 实现 configSource='payload' 和 'inline' 两种模式
  - [ ] 实现三级模型回退（config → fallbackAgent → fallbackProvider → 全局默认）
  - [ ] 集成 `resolveAgentModelConfig` 和 `fetchFromResolvedConfig`
- [ ] `src/lib/workflow/nodeRegistry.ts`
  - [ ] 注册 `dynamic-agent` 执行器
- [ ] 测试
  - [ ] 单元测试：payload 模式读取配置
  - [ ] 单元测试：inline 模式模板替换
  - [ ] 单元测试：模型回退链
  - [ ] 集成测试：Loop + Dynamic Agent 串行执行

### Phase 2：节点编辑器 UI

- [ ] `src/components/workflow/nodes/DynamicAgentNode.tsx`
  - [ ] 创建节点编辑器组件
  - [ ] configSource 单选切换（payload / inline）
  - [ ] payload 模式：configPath 输入 + 帮助文本
  - [ ] inline 模式：模板输入（name / systemPrompt / avatar / personality / role）
  - [ ] 提示词模板输入
  - [ ] fallback Agent 选择器
  - [ ] fallback Provider/Model 选择器
  - [ ] 输出字段输入
  - [ ] 通用契约配置（timeout / retry / onError）
- [ ] `src/components/workflow/WorkflowCanvas.tsx`
  - [ ] 在 `nodeTypes` 中注册 `dynamic-agent`
  - [ ] 在节点面板中添加 Dynamic Agent 分类（AI 分类下）
- [ ] 节点样式
  - [ ] 设计节点颜色主题（紫色渐变区分）
  - [ ] 选择合适图标（`UserCog` / `Mask` / `Sparkles`）

### Phase 3：聊天视图集成

- [ ] `src/components/chat/WorkflowAgentWindow.tsx`
  - [ ] 支持从 `_dynamicAgentMeta` 读取动态名称和头像
  - [ ] 动态 Agent 不使用 `agents` 数组查找，直接使用 meta 信息
- [ ] `src/components/chat/ChatMessageBubble.tsx`
  - [ ] 支持显示动态 Agent 名称（来自 `_dynamicAgentMeta.name`）
  - [ ] 动态头像 fallback（首字母）
- [ ] `src/components/chat/WorkflowChatView.tsx`
  - [ ] Dynamic Agent 节点点击行为：打开对话窗口
  - [ ] 传递动态配置信息到窗口

### Phase 4：狼人杀示例升级（验证场景）

- [ ] 重新设计狼人杀工作流 JSON
  - [ ] 添加"主持人"Agent 节点生成角色分配
  - [ ] 使用 Loop + Dynamic Agent 替代静态 Agent 节点
  - [ ] 夜晚阶段：Loop 遍历所有玩家执行角色行动
  - [ ] 白天阶段：Loop 遍历存活玩家依次发言
- [ ] 回归测试
  - [ ] 角色分配随机性
  - [ ] 串行发言顺序
  - [ ] 性格和思维方式的差异体现
  - [ ] 游戏逻辑正确性（屠边、狼刀、药剂等）

---

## 8. 兼容性考虑

### 8.1 向后兼容

- `WorkflowNodeType` 扩展新类型不影响现有工作流
- `WorkflowNodeData` 使用 `Partial<>` 扩展，现有节点的数据不会受影响
- 节点面板新增 Dynamic Agent 节点，用户手动选择使用

### 8.2 与其他节点的协作

- **Loop 节点**：Dynamic Agent 作为 Loop 内部节点使用时，可以访问 `loop.currentItem`、`loop.index` 等上下文
- **Condition 节点**：可以根据 `_dynamicAgentMeta` 中的信息进行分支判断
- **Code 节点**：可以读取 `payload._dynamicAgentMeta` 进行后续处理
- **Merge 节点**：可以合并多个 Dynamic Agent 的输出结果

### 8.3 与现有 Agent 节点的关系

- Dynamic Agent **不替代**现有 Agent 节点
- 两者共存：Agent 节点用于固定角色，Dynamic Agent 用于动态角色
- 用户可以根据场景选择：
  - 固定助手 → Agent 节点
  - 动态角色扮演 / 批量生成 → Dynamic Agent 节点

---

## 9. 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 模板变量替换性能 | 大量替换时可能变慢 | 限制模板长度，使用简单正则替换 |
| 动态配置缺失 | 运行时找不到配置导致错误 | 执行器前置校验，缺失时返回 `_error` |
| 聊天视图头像闪烁 | 动态头像 URL 可能无效 | 使用 AvatarFallback 首字母兜底 |
| Loop + Dynamic Agent 调试困难 | 8 个迭代难以追踪 | ExecutionTimeline 显示每次迭代的独立记录 |
| 与现有消息过滤冲突 | `agentId` 是动态生成的 | 聊天消息过滤使用 `nodeId` 而非 `agentId` |

---

## 10. 验收标准

### 10.1 功能验收

- [ ] 可以创建 Dynamic Agent 节点并配置两种模式（payload / inline）
- [ ] Loop 内部使用 Dynamic Agent 时，每次迭代使用不同的配置
- [ ] 模板变量替换正确解析 `{{payload.field}}` 语法
- [ ] 模型回退链正确工作（config → fallbackAgent → fallbackProvider → 全局默认）
- [ ] 聊天视图正确显示动态 Agent 名称和头像
- [ ] 狼人杀工作流可以动态分配角色并依次发言

### 10.2 技术验收

- [ ] `tsc --noEmit` 零错误
- [ ] 新增节点有单元测试覆盖
- [ ] 现有测试不失败
- [ ] 工作流导入导出支持 Dynamic Agent 节点数据

---

## 附录：DynamicAgentConfig JSON 示例

### 从 Payload 读取的示例

```json
{
  "players": [
    {
      "name": "玩家1",
      "role": "狼人",
      "personality": "激进、喜欢带节奏",
      "systemPrompt": "你是狼人。你的任务是隐藏身份并引导投票放逐村民。你性格激进，喜欢在发言中质疑他人。",
      "avatar": "https://example.com/werewolf.png"
    },
    {
      "name": "玩家2",
      "role": "村民",
      "personality": "谨慎、观察力强",
      "systemPrompt": "你是普通村民。你没有特殊能力，只能通过观察和推理找出狼人。你性格谨慎，不轻易相信他人。",
      "avatar": "https://example.com/villager.png"
    }
  ]
}
```

对应的节点配置：
- `configSource`: `'payload'`
- `configPath`: `'payload.players[loop.index]'` 或 `'loop.currentItem'`

### 内联模板配置示例

```json
{
  "configSource": "inline",
  "inlineConfig": {
    "nameTemplate": "助手 {{loop.index}}",
    "systemPromptTemplate": "你是一个 {{payload.taskType}} 专家。请完成以下任务。",
    "personalityTemplate": "{{payload.personality}}"
  },
  "promptTemplate": "{{payload.userInput}}",
  "fallbackAgentId": "default-planner-agent"
}
```
