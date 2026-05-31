# SimperStudio 工作流系统 — AI 参考文档

> 本文档面向 AI Agent 和开发者，详细描述了每种节点类型、运行时执行模型、Payload 数据流系统，以及如何组合创建有效的工作流。

---

## 目录

1. [概述](#概述)
2. [核心概念](#核心概念)
3. [节点类型参考](#节点类型参考)
4. [连线与连接规则](#连线与连接规则)
5. [运行时执行引擎](#运行时执行引擎)
6. [Payload 数据流系统](#payload-数据流系统)
7. [如何创建工作流](#如何创建工作流)
8. [完整示例](#完整示例)
9. [TypeScript 接口定义](#typescript-接口定义)
10. [约束与限制](#约束与限制)

---

## 概述

SimperStudio 工作流是一个由节点（Node）通过连线（Edge）连接而成的**有向图**。图从 **trigger（触发器）** 节点开始，流经处理节点（code、agent、condition、loop），最终到达 **output（输出）** 节点。一个共享的 `payload` 对象贯穿整个图的执行过程——每个节点都可以读取和修改它。

### 数据结构

```typescript
interface Workflow {
  id: string;                    // 工作流唯一标识
  workspaceId: string;           // 所属工作区 ID
  name: string;                  // 工作流名称
  nodes_data: WorkflowNode[];    // 节点数组
  edges_data: WorkflowEdge[];    // 连线数组
  status: 'active' | 'inactive'; // 状态
  createdAt: number;             // 创建时间戳
  updatedAt: number;             // 更新时间戳
}
```

---

## 核心概念

### Payload（数据载荷）

Payload 是一个普通的 JavaScript 对象，在整个工作流中传递。每个节点接收当前的 payload，可以修改它，然后将修改后的版本传递给下游节点。

- 工作流被触发时，payload 由用户提供的初始数据初始化。
- Code 节点可以任意修改 payload。
- Agent 节点将 LLM 响应注入到 `payload.llmResult` 中。
- Payload 在流经图的过程中不断累积状态。

### Source Handle（源连接点）与 Target Handle（目标连接点）

- **Target Handle**（左侧）：输入连接点。节点通过目标连接点接收数据。
- **Source Handle**（右侧）：输出连接点。节点通过源连接点向下游发送数据。
- 没有目标连接点的节点（trigger）是入口点。没有源连接点的节点（output）是终止点。

```
  [Target]  ←←  节点主体  →→  [Source]
  (输入)                          (输出)
```

---

## 节点类型参考

系统中共有 **13 种节点类型**。每种类型都有唯一的类型标识、视觉样式和运行时行为。

节点分为 5 个分类：

| 分类 | 节点类型 |
|------|---------|
| **Trigger（触发）** | trigger, webhook |
| **Flow Control（流程控制）** | condition, switch, loop, wait, merge |
| **Data（数据）** | code, set |
| **AI（智能体）** | agent |
| **Integration（集成）** | http, subworkflow |
| **Output（输出）** | output |

---

### 1. Trigger 节点（触发器）

| 属性 | 值 |
|------|-----|
| 类型 ID | `trigger` |
| 颜色主题 | 翡翠绿（emerald） |
| 图标 | Play ▶ |
| 目标连接点 | 无 |
| 源连接点 | 1 个（右侧） |
| 宽度 | 200px |

#### 用途

Trigger 节点是工作流的**入口点**。一个工作流必须且只能有一个 trigger 节点。执行从这里开始。

#### 数据字段

```typescript
{
  label?: string; // 显示名称，默认 "Trigger"
}
```

#### 运行时行为

1. 引擎在工作流中找到 trigger 节点。
2. 使用用户提供的 `initialPayload` 创建初始执行帧。
3. 将所有从 trigger 源连接点出发的下游节点加入执行队列。
4. Trigger 节点本身**不修改** payload。

#### 示例

```json
{
  "id": "trigger-1",
  "type": "trigger",
  "position": { "x": 50, "y": 200 },
  "data": { "label": "开始游戏" }
}
```

---

### 2. Code 节点（代码执行）

| 属性 | 值 |
|------|-----|
| 类型 ID | `code` |
| 颜色主题 | 蓝色（blue） |
| 图标 | Code2 </> |
| 目标连接点 | 1 个（左侧） |
| 源连接点 | 1 个（右侧） |
| 宽度 | 220px |

#### 用途

Code 节点执行**任意 JavaScript 代码**，并可以访问当前 payload。它是数据转换、状态管理和控制流逻辑的主要机制。

#### 数据字段

```typescript
{
  label?: string;     // 显示名称，默认 "Code Snippet"
  code?: string;      // JavaScript 代码体，默认 "return payload;"
}
```

#### 运行时行为

1. 引擎将代码包装在一个异步函数中：`async function execute(payload) { ... }`。
2. 当前 payload 作为 `payload` 参数传入（深克隆副本）。
3. 代码执行有 **10 秒超时**。如果超时，执行继续但在 `payload._error` 中追加错误信息。
4. 函数的返回值成为新的 payload。
5. 如果代码抛出异常，引擎会捕获它，追加 `payload._error = error.message`，然后继续执行。

#### Code 节点执行环境

在 Code 节点内部，你可以访问：

- `payload` — 当前工作流状态（可读写）
- 标准 JavaScript 全局对象（`Math`、`Date`、`JSON`、`Array`、`Object` 等）
- `console.log` 用于调试
- 支持 `async/await`（函数是异步的）

**不能**访问：

- DOM 或浏览器 API
- Node.js 模块
- 网络请求
- 文件系统操作

#### Code 节点最佳实践

- 始终在最后 `return payload;`（或返回修改后的副本）。
- 访问可能不存在的嵌套属性时使用可选链（`?.`）。
- 保持代码职责单一。
- 使用 `payload._error` 向下游节点传递错误信号。

#### 示例

```json
{
  "id": "init-data",
  "type": "code",
  "position": { "x": 300, "y": 200 },
  "data": {
    "label": "初始化游戏状态",
    "code": "payload.players = payload.players || []; payload.round = payload.round || 1; payload.status = payload.status || 'playing'; return payload;"
  }
}
```

#### 常用 Code 节点模式

**初始化默认值：**
```javascript
payload.field = payload.field || defaultValue;
return payload;
```

**过滤与计算：**
```javascript
payload.alivePlayers = payload.players.filter(p => p.status === "alive");
payload.count = payload.alivePlayers.length;
return payload;
```

**条件修改：**
```javascript
if (payload.count === 0) {
  payload.status = "finished";
}
return payload;
```

**合并上游 Agent 结果：**
```javascript
const result = payload.llmResult || {};
payload.targetId = result.targetId;
payload.reason = result.reason;
return payload;
```

---

### 3. Agent 节点（智能体）

| 属性 | 值 |
|------|-----|
| 类型 ID | `agent` |
| 颜色主题 | 主题色（primary） |
| 图标 | Bot + Agent 头像 |
| 目标连接点 | 1 个（左侧） |
| 源连接点 | 1 个（右侧） |
| 宽度 | 260px |

#### 用途

Agent 节点将任务委派给一个 **LLM 驱动的智能体**。它发送提示词（可引用当前 payload），接收 Agent 的响应，并将其注入到 payload 中。

#### 数据字段

```typescript
{
  label?: string;           // 显示名称
  agentId?: string;         // 要使用的 Agent ID
  prompt?: string;          // 发送给 Agent 的提示词模板
  schema?: string;          // JSON Schema，用于结构化输出（Tool Calling）
  autoSendToNext?: boolean; // 如果为 true，自动将输出转发给下一个 Agent
}
```

#### 运行时行为

1. 引擎根据 `agentId` 从全局 Agent 列表中查找对应的 Agent。
2. 将节点的 `prompt` 与上游上下文组合，构建最终提示词。
3. **当前实现中**，引擎模拟 Agent 响应：
   - 如果定义了 `schema` 且包含 `"targetId"`，生成 `{ targetId: "player_3", reason: "simulated logic" }`。
   - 如果定义了 `schema` 但不包含 `"targetId"`，生成 `{ result: "simulated" }`。
   - 如果未定义 `schema`，生成 `{ output: "[Agent Output for {label}]: processed input." }`。
4. 模拟结果存储在 `payload.llmResult` 中。
5. 带有 `llmResult` 的 payload 传递给下游节点。

#### 提示词模板

prompt 字段支持使用 `{{expression}}` 语法进行**模板插值**。在双花括号内，你可以引用 `payload` 的属性：

```
你是狼人"暗影"。当前局势：{{JSON.stringify(payload.alivePlayers)}}
历史记录：{{JSON.stringify(payload.publicLog)}}
请选择今晚袭击目标。输出 targetId 和 reason。
```

**注意：** 模板插值由前端渲染层处理。运行时 prompt 会原样传递给 Agent。使用 `JSON.stringify()` 来嵌入复杂对象。

#### Schema（结构化输出）

定义 `schema` 后，Agent 被期望返回与 schema 匹配的结构化 JSON。这使得下游 Code 节点可以可靠地解析 Agent 的输出。

```json
"schema": "{\"targetId\":\"string\",\"reason\":\"string\"}"
```

schema 字符串是一个 JSON 对象，键是字段名，值是类型描述。它用作 Agent 的提示和运行时模拟的依据。

#### 示例

```json
{
  "id": "node-seer",
  "type": "agent",
  "position": { "x": 500, "y": 100 },
  "data": {
    "label": "预言家查验",
    "agentId": "agent-seer",
    "prompt": "你是预言家。存活玩家：{{JSON.stringify(payload.alivePlayers)}}\n请选择一名玩家查验身份。输出 targetId 和 reason。",
    "schema": "{\"targetId\":\"string\",\"reason\":\"string\"}"
  }
}
```

---

### 4. Condition 节点（条件路由）

| 属性 | 值 |
|------|-----|
| 类型 ID | `condition` |
| 颜色主题 | 橙色（orange） |
| 图标 | SplitSquareHorizontal |
| 目标连接点 | 1 个（左侧） |
| 源连接点 | 动态多个（每个路由一个，右侧） |
| 宽度 | 240px |

#### 用途

Condition 节点评估 **JavaScript 布尔表达式**，并将 payload 路由到恰好一个下游分支。它是条件逻辑和分支的主要机制。

#### 数据字段

```typescript
{
  label?: string;   // 显示名称，默认 "Router"
  routes?: Array<{
    id: string;       // 唯一路由标识，用作 edge 的 sourceHandle
    condition: string; // 求值为布尔值的 JavaScript 表达式
  }>;
}
```

#### 运行时行为

1. 引擎**按顺序**遍历 `routes` 数组。
2. 对每个路由，在 payload 的深克隆副本上评估 `condition` 表达式。
3. 条件在 `with (payload) { ... }` 作用域的异步函数中评估，因此你可以直接引用 payload 属性而无需 `payload.` 前缀（但建议使用 `payload.` 以提高清晰度）。
4. 每个条件评估有 **2 秒超时**。
5. **第一个条件评估为 `true` 的路由**被选中。
6. 引擎找到 `sourceHandle` 匹配被选中路由 `id` 的连线。
7. Payload 被转发到该连线的目标节点。
8. **只走一条分支。** 其他路由被跳过。

#### 条件表达式语法

条件是标准 JavaScript 表达式。它们可以访问完整的 payload 对象：

```
payload.gameStatus === "playing" && payload.phase === "night"
```

```
payload.value > 50
```

```
payload.players.length > 0
```

如果条件在评估过程中抛出异常，该条件被视为 `false`，继续尝试下一个路由。

#### 重要：路由 ID 与 Edge 的 sourceHandle

Condition 节点的路由与下游节点之间的连接通过 **edge 的 `sourceHandle`** 属性建立，必须匹配路由的 `id`：

```json
// 从 condition 节点通过特定路由到下游节点的连线
{
  "id": "edge-to-night",
  "source": "condition-node-id",
  "sourceHandle": "route-night",
  "target": "night-handler-node-id",
  "animated": true
}
```

如果 `sourceHandle` 不匹配任何路由 `id`，或者没有任何路由匹配，payload 将无处可去（死路）。

#### 示例

```json
{
  "id": "phase-router",
  "type": "condition",
  "position": { "x": 500, "y": 200 },
  "data": {
    "label": "阶段路由",
    "routes": [
      { "id": "route-night", "condition": "payload.phase === 'night'" },
      { "id": "route-day", "condition": "payload.phase === 'day'" },
      { "id": "route-end", "condition": "payload.status !== 'playing'" }
    ]
  }
}
```

对应的连线：

```json
[
  { "id": "e1", "source": "phase-router", "sourceHandle": "route-night", "target": "night-handler" },
  { "id": "e2", "source": "phase-router", "sourceHandle": "route-day", "target": "day-handler" },
  { "id": "e3", "source": "phase-router", "sourceHandle": "route-end", "target": "game-over" }
]
```

---

### 5. Loop 节点（循环）

| 属性 | 值 |
|------|-----|
| 类型 ID | `loop` |
| 颜色主题 | 紫色（violet） |
| 图标 | Repeat |
| 目标连接点 | 1 个（左侧） |
| 源连接点 | 1 个（右侧） |
| 宽度 | 240px |

#### 用途

Loop 节点遍历 payload 中的一个**数组**，对每个元素执行一次下游节点。适用于"让每个玩家轮流行动"或"处理列表中的每个项目"等场景。

#### 数据字段

```typescript
{
  label?: string;          // 显示名称，默认 "Loop"
  itemsPath?: string;      // payload 中数组的点号路径，如 "payload.alivePlayers"
  itemAlias?: string;      // 当前项的变量名，如 "currentSpeaker"
  indexAlias?: string;     // 当前索引的变量名，如 "speakerIndex"
  maxIterations?: number;  // 最大迭代次数，默认 20
  breakCondition?: string; // JavaScript 表达式；如果为 true，循环提前退出
}
```

#### 运行时行为

1. 引擎使用 `itemsPath` 从 payload 中解析数组。
2. 如果路径没有解析到数组，设置 `payload._error` 并跳过循环体。
3. 遍历数组，最多 `min(array.length, maxIterations)` 次。
4. 每次迭代：
   a. 创建当前 payload 的深克隆副本。
   b. 当前元素注入为 `payload[itemAlias]`（如 `payload.currentSpeaker`）。
   c. 当前索引注入为 `payload[indexAlias]`（如 `payload.speakerIndex`）。
   d. 同时设置便捷对象：`payload.loop = { currentItem, index, total }`。
   e. 如果定义了 `breakCondition`，则评估它。如果为 `true`，循环中断。
   f. 从循环源连接点出发的下游节点以本次迭代的 payload 克隆加入执行队列。

#### 重要行为

- 每次迭代创建一个**独立的执行分支**，拥有自己的 payload 副本。
- 下游节点**每次迭代执行一次**，按顺序进行。
- 循环不会"收集"各次迭代的结果——每次迭代是独立的。
- 如果需要跨迭代累积结果，请在 payload 中使用共享状态（如 `payload.results = payload.results || []; payload.results.push(itemResult);`）。

#### itemsPath 路径解析

`itemsPath` 使用点号表示法遍历 payload：

| itemsPath | 解析为 |
|-----------|--------|
| `payload.players` | `payload.players` |
| `payload.alivePlayers` | `payload.alivePlayers` |
| `payload.data.items` | `payload.data.items` |

`payload.` 前缀是可选的——`alivePlayers` 和 `payload.alivePlayers` 都能工作。

#### 示例

```json
{
  "id": "speech-loop",
  "type": "loop",
  "position": { "x": 500, "y": 300 },
  "data": {
    "label": "逐人发言循环",
    "itemsPath": "payload.alivePlayers",
    "itemAlias": "currentSpeaker",
    "indexAlias": "speakerIndex",
    "maxIterations": 10,
    "breakCondition": "payload.gameStatus !== 'playing'"
  }
}
```

---

### 6. Output 节点（输出）

| 属性 | 值 |
|------|-----|
| 类型 ID | `output` |
| 颜色主题 | 石板灰（slate） |
| 图标 | FileOutput |
| 目标连接点 | 1 个（左侧，限制单连接） |
| 源连接点 | 无 |
| 宽度 | 200px |

#### 用途

Output 节点是一个**终止节点**，它将当前 payload 作为工作流结果捕获。它不修改 payload——只是记录它。

#### 数据字段

```typescript
{
  label?: string; // 显示名称，默认 "Output"
}
```

#### 运行时行为

1. 当引擎到达 Output 节点时，将当前 payload 存储在 `results[nodeId]` 中。
2. 同时用此 payload 更新 `finalPayload`（最后执行的 Output 节点获胜）。
3. 不会将下游节点加入队列（Output 节点没有源连接点）。

#### 多个 Output 节点

一个工作流可以有多个 Output 节点。每个节点在图中的各自位置捕获 payload。这对于捕获中间结果很有用（如"夜晚结果"、"投票结果"、"游戏结束"）。

#### 示例

```json
{
  "id": "output-night",
  "type": "output",
  "position": { "x": 800, "y": 100 },
  "data": { "label": "夜晚结果" }
}
```

---

### 7. HTTP Request 节点（HTTP 请求）

| 属性 | 值 |
|------|-----|
| 类型 ID | `http` |
| 颜色主题 | 青色（cyan） |
| 图标 | Globe |
| 目标连接点 | 1 个（左侧） |
| 源连接点 | 1 个（右侧） |
| 宽度 | 220px |

#### 用途

HTTP Request 节点向外部 API 发送 HTTP 请求，支持 GET/POST/PUT/PATCH/DELETE 方法。响应数据注入到 payload 中。

#### 数据字段

```typescript
{
  label?: string;       // 显示名称
  method?: string;      // HTTP 方法，默认 "GET"
  url?: string;         // 请求 URL，支持 {{expression}} 模板
  headers?: string;     // JSON 格式的请求头
  body?: string;        // 请求体（非 GET 时），支持 {{expression}} 模板
  timeoutMs?: number;   // 请求超时，默认 30000ms
}
```

#### 运行时行为

1. 解析 URL 和 headers 中的 `{{expression}}` 模板插值。
2. 发送 HTTP 请求。
3. 响应数据注入到 `payload.httpData`，状态码注入到 `payload.httpStatus`。
4. 同时设置 `payload.output` 为响应数据。

#### 示例

```json
{
  "id": "api-call",
  "type": "http",
  "position": { "x": 300, "y": 200 },
  "data": {
    "label": "获取用户信息",
    "method": "GET",
    "url": "https://api.example.com/users/{{payload.userId}}",
    "headers": "{\"Authorization\": \"Bearer {{payload.token}}\"}",
    "timeoutMs": 5000
  }
}
```

---

### 8. Set / Transform 节点（数据转换）

| 属性 | 值 |
|------|-----|
| 类型 ID | `set` |
| 颜色主题 | 青绿色（teal） |
| 图标 | Shuffle |
| 目标连接点 | 1 个（左侧） |
| 源连接点 | 1 个（右侧） |
| 宽度 | 220px |

#### 用途

Set 节点用于字段映射、重命名、常量注入和白名单过滤。它是纯数据转换节点，不执行代码。

#### 数据字段

```typescript
{
  label?: string;       // 显示名称
  mappings?: Array<{    // 字段映射列表
    sourcePath: string; //   源路径（如 "payload.name"）
    targetPath: string; //   目标路径（如 "userName"）
  }>;
  constants?: string;   // JSON 格式的常量，合并到结果中
  whitelist?: string;   // 逗号分隔的白名单路径，只保留这些字段
}
```

#### 运行时行为

1. 按 `mappings` 从 payload 提取字段并映射到新路径。
2. 合并 `constants` 中的常量值。
3. 如果设置了 `whitelist`，只保留白名单中的字段。
4. 结果合并到 payload 并设置 `payload.output`。

#### 示例

```json
{
  "id": "transform",
  "type": "set",
  "position": { "x": 300, "y": 200 },
  "data": {
    "label": "提取用户字段",
    "mappings": [
      { "sourcePath": "payload.user.name", "targetPath": "userName" },
      { "sourcePath": "payload.user.email", "targetPath": "userEmail" }
    ],
    "constants": "{\"version\": 2}",
    "whitelist": "output.userName, output.userEmail, output.version"
  }
}
```

---

### 9. IF / Switch 节点（多分支路由）

| 属性 | 值 |
|------|-----|
| 类型 ID | `switch` |
| 颜色主题 | 琥珀色（amber） |
| 图标 | GitBranch |
| 目标连接点 | 1 个（左侧） |
| 源连接点 | 动态多个（每个分支一个） |
| 宽度 | 240px |

#### 用途

Switch 节点评估多个条件表达式，将 payload 路由到**第一个匹配**的分支。与 Condition 节点类似，但使用 `branches` 而非 `routes`。

#### 数据字段

```typescript
{
  label?: string;       // 显示名称
  branches?: Array<{    // 分支列表
    id: string;         //   分支 ID（用作 sourceHandle）
    label?: string;     //   分支显示名称
    condition: string;  //   条件表达式
  }>;
}
```

#### 运行时行为

1. 按顺序评估每个分支的 `condition`。
2. 第一个评估为 `true` 的分支被选中。
3. 通过 edge 的 `sourceHandle` 匹配分支 `id` 路由到下游节点。

#### 示例

```json
{
  "id": "priority-switch",
  "type": "switch",
  "position": { "x": 300, "y": 200 },
  "data": {
    "label": "优先级路由",
    "branches": [
      { "id": "b-high", "label": "高", "condition": "payload.value > 100" },
      { "id": "b-mid", "label": "中", "condition": "payload.value > 50" },
      { "id": "b-low", "label": "低", "condition": "true" }
    ]
  }
}
```

---

### 10. Wait / Delay 节点（延时等待）

| 属性 | 值 |
|------|-----|
| 类型 ID | `wait` |
| 颜色主题 | 紫罗兰（violet） |
| 图标 | Timer |
| 目标连接点 | 1 个（左侧） |
| 源连接点 | 1 个（右侧） |
| 宽度 | 220px |

#### 用途

Wait 节点暂停工作流执行，支持固定延时或等待直到条件满足。

#### 数据字段

```typescript
{
  label?: string;          // 显示名称
  waitMode?: 'fixed' | 'until'; // 等待模式，默认 "fixed"
  delayMs?: number;        // 固定延时（毫秒），默认 1000
  untilExpression?: string; // 等待模式为 "until" 时的条件表达式
  timeoutMs?: number;      // 最大等待时间
}
```

#### 运行时行为

- **fixed 模式**：等待指定毫秒后继续。
- **until 模式**：每 500ms 评估一次条件，条件为 `true` 时继续（最多 60 秒）。

#### 示例

```json
{
  "id": "delay",
  "type": "wait",
  "position": { "x": 300, "y": 200 },
  "data": {
    "label": "等待 2 秒",
    "waitMode": "fixed",
    "delayMs": 2000
  }
}
```

---

### 11. Merge 节点（合并）

| 属性 | 值 |
|------|-----|
| 类型 ID | `merge` |
| 颜色主题 | 粉色（pink） |
| 图标 | Merge |
| 目标连接点 | 2 个（input-1, input-2） |
| 源连接点 | 1 个（右侧） |
| 宽度 | 220px |

#### 用途

Merge 节点将多个上游分支的结果合并为一个。支持按顺序、按 key 或等待所有输入完成。

#### 数据字段

```typescript
{
  label?: string;           // 显示名称
  strategy?: 'append' | 'byKey' | 'waitForAll'; // 合并策略
  mergeKey?: string;        // byKey 策略时的合并键
}
```

#### 运行时行为

- **append**：将所有上游结果追加为数组。
- **byKey**：按 `mergeKey` 字段值分组合并。
- **waitForAll**：等待所有输入就绪后合并。

#### 示例

```json
{
  "id": "merge-results",
  "type": "merge",
  "position": { "x": 500, "y": 200 },
  "data": {
    "label": "合并结果",
    "strategy": "byKey",
    "mergeKey": "source"
  }
}
```

---

### 12. Webhook Trigger 节点（Webhook 触发器）

| 属性 | 值 |
|------|-----|
| 类型 ID | `webhook` |
| 颜色主题 | 青柠色（lime） |
| 图标 | Webhook |
| 目标连接点 | 无 |
| 源连接点 | 1 个（右侧） |
| 宽度 | 220px |

#### 用途

Webhook Trigger 通过 HTTP 端点触发工作流。外部系统可以通过 POST 请求启动工作流执行。

#### 数据字段

```typescript
{
  label?: string;       // 显示名称
  method?: string;      // HTTP 方法，默认 "POST"
  path?: string;        // Webhook 路径
  authToken?: string;   // 鉴权令牌
}
```

#### 示例

```json
{
  "id": "webhook-in",
  "type": "webhook",
  "position": { "x": 50, "y": 200 },
  "data": {
    "label": "接收 Webhook",
    "method": "POST",
    "path": "/api/webhook/order",
    "authToken": "secret-token"
  }
}
```

---

### 13. Sub-workflow 节点（子工作流）

| 属性 | 值 |
|------|-----|
| 类型 ID | `subworkflow` |
| 颜色主题 | 靛蓝色（indigo） |
| 图标 | Workflow |
| 目标连接点 | 1 个（左侧） |
| 源连接点 | 1 个（右侧） |
| 宽度 | 220px |

#### 用途

Sub-workflow 节点调用另一个工作流，支持参数传入与输出回传。实现工作流的模块化和复用。

#### 数据字段

```typescript
{
  label?: string;          // 显示名称
  subWorkflowId?: string;  // 要调用的工作流 ID
  inputMapping?: string;   // 输入参数映射（JSON 表达式）
}
```

#### 示例

```json
{
  "id": "sub-wf",
  "type": "subworkflow",
  "position": { "x": 300, "y": 200 },
  "data": {
    "label": "调用子流程",
    "subWorkflowId": "wf-process-order",
    "inputMapping": "{\"orderId\": \"payload.orderId\"}"
  }
}
```

---

## 节点契约（通用字段）

所有节点类型共享以下通用配置字段：

```typescript
interface WorkflowNodeDataBase {
  label?: string;           // 显示名称
  description?: string;     // 节点描述
  timeoutMs?: number;       // 节点级超时（覆盖默认超时）
  retryPolicy?: {           // 重试策略
    maxAttempts?: number;   //   最大尝试次数，默认 1
    backoff?: 'fixed' | 'exponential'; //   退避策略
    delayMs?: number;       //   重试间隔（毫秒）
  };
  onError?: 'stop' | 'continue' | 'route-to-error'; // 失败策略
  inputSchema?: string;     // 输入 JSON Schema
  outputSchema?: string;    // 输出 JSON Schema
}
```

### 失败策略（onError）

| 策略 | 行为 |
|------|------|
| `stop`（默认） | 停止工作流执行，设置 `status: 'error'` |
| `continue` | 记录错误但继续执行下游节点 |
| `route-to-error` | 路由到错误分支（如有） |

---

## 执行记录

引擎跟踪每个节点的执行状态：

```typescript
interface NodeExecutionRecord {
  nodeId: string;           // 节点 ID
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped' | 'retrying';
  startTime?: number;       // 开始时间戳
  endTime?: number;         // 结束时间戳
  durationMs?: number;      // 执行耗时（毫秒）
  attempts: number;         // 尝试次数
  error?: string;           // 错误信息
  input?: unknown;          // 输入快照
  output?: unknown;         // 输出快照
}

interface WorkflowExecutionRecord {
  id: string;               // 执行 ID
  workflowId: string;       // 工作流 ID
  status: 'running' | 'completed' | 'error' | 'cancelled';
  startTime: number;        // 开始时间
  endTime?: number;         // 结束时间
  durationMs?: number;      // 总耗时
  nodeRecords: Record<string, NodeExecutionRecord>; // 每个节点的执行记录
  results: Record<string, unknown>; // 每个节点的输出
}
```

### 取消执行

用户可以在执行过程中手动取消。取消后引擎停止处理队列中的剩余节点，状态重置为 `idle`。

### 断点续跑

支持从指定节点开始执行（`startNodeId` 选项），跳过上游节点。适用于从失败节点重跑的场景。

---

## 导入导出

工作流支持 JSON 格式的导入和导出：

- **导出**：将当前画布的 `nodes_data` + `edges_data` 序列化为 JSON 文件下载。
- **导入**：支持文件选择器导入或粘贴 JSON 代码导入。导入时校验节点 id/type/position/data 完整性以及 edge 的 source/target 存在性。

---

## 连线与连接规则

### 连线数据结构

```typescript
interface WorkflowEdge {
  id: string;              // 唯一连线标识
  source: string;          // 源节点 ID
  target: string;          // 目标节点 ID
  sourceHandle?: string;   // 源连接点 ID（Condition 节点的路由必需）
  targetHandle?: string;   // 目标连接点 ID（很少使用）
  type?: string;           // 连线类型（如 "default"、"smoothstep"）
  animated?: boolean;      // 是否显示动画
  label?: string;          // 可选连线标签
}
```

### 连接规则

| 从 \ 到 | code | agent | condition | switch | loop | wait | merge | http | set | subworkflow | output |
|---------|------|-------|-----------|--------|------|------|-------|------|-----|-------------|--------|
| **trigger** | 可以 | 可以 | 可以 | 可以 | 可以 | 可以 | — | 可以 | 可以 | 可以 | 可以 |
| **webhook** | 可以 | 可以 | 可以 | 可以 | 可以 | 可以 | — | 可以 | 可以 | 可以 | 可以 |
| **code** | 可以 | 可以 | 可以 | 可以 | 可以 | 可以 | 可以 | 可以 | 可以 | 可以 | 可以 |
| **agent** | 可以 | 可以 | 可以 | 可以 | — | 可以 | 可以 | 可以 | 可以 | 可以 | 可以 |
| **condition** | 通过 sourceHandle 匹配路由 id 连接到任意节点 |
| **switch** | 通过 sourceHandle 匹配分支 id 连接到任意节点 |
| **loop** | 可以 | 可以 | — | — | — | 可以 | 可以 | 可以 | 可以 | 可以 | 可以 |
| **wait** | 可以 | 可以 | 可以 | 可以 | 可以 | — | 可以 | 可以 | 可以 | 可以 | 可以 |
| **merge** | 可以 | 可以 | 可以 | 可以 | 可以 | 可以 | — | 可以 | 可以 | 可以 | 可以 |
| **http** | 可以 | 可以 | 可以 | 可以 | 可以 | 可以 | 可以 | — | 可以 | 可以 | 可以 |
| **set** | 可以 | 可以 | 可以 | 可以 | 可以 | 可以 | 可以 | 可以 | — | 可以 | 可以 |
| **subworkflow** | 可以 | 可以 | 可以 | 可以 | 可以 | 可以 | 可以 | 可以 | 可以 | — | 可以 |
| **output** | 不可以（Output 没有源连接点） |

### 多输入

一个节点可以接收来自**多个上游节点**的输入（多条连线指向同一个节点）。运行时引擎按 BFS（广度优先）顺序处理节点——哪个上游节点先完成，下游节点就使用它的 payload。

### 多输出

一个节点可以有**多条输出连线**。运行时引擎会将**所有**下游目标加入队列（Condition 节点除外，它只跟随匹配的路由）。

---

## 运行时执行引擎

### 执行流程

1. **初始化**：找到 trigger 节点，使用 `initialPayload` 创建初始执行帧。
2. **BFS 循环**：使用队列按广度优先顺序处理节点。
3. **每个节点**：
   - 从执行帧中深克隆 payload。
   - 根据节点类型执行对应逻辑。
   - 将结果存储在 `results[nodeId]` 中。
   - 将下游节点以更新后的 payload 加入执行队列。
4. **终止**：当队列为空，或达到 **1000 步**（安全限制）时，执行结束。

### 各节点类型的执行步骤

```
Trigger   → 仅将下游节点加入队列
Code      → 运行 JS 代码，获得新 payload，将下游节点加入队列
Agent     → 模拟/执行 LLM，存入 payload.llmResult，将下游节点加入队列
Condition → 按顺序评估路由，将匹配的 1 个下游节点加入队列
Loop      → 遍历数组，将下游节点加入队列 N 次（每次迭代一次）
Output    → 将 payload 存为结果，无下游
```

### 执行状态

引擎跟踪以下执行状态：

```typescript
{
  status: 'idle' | 'running' | 'completed' | 'error';  // 空闲/运行中/完成/错误
  currentNodeId: string | null;   // 当前正在执行的节点
  results: Record<string, any>;   // 每个节点的 payload 快照
  nodeRecords: Record<string, NodeExecutionRecord>; // 每个节点的执行记录
}
```

### 超时设置

| 操作 | 超时时间 |
|------|---------|
| Code 节点执行 | 10 秒 |
| Condition 条件评估（每个路由） | 2 秒 |
| Loop 中断条件评估 | 2 秒 |
| HTTP 请求默认超时 | 30 秒 |
| Wait until 模式最大等待 | 60 秒 |
| Agent 节点（真实 LLM） | 取决于模型 |
| 节点间视觉延迟 | 400ms（动画节奏） |

**注意**：所有节点支持通过 `timeoutMs` 字段设置节点级超时，覆盖默认值。

---

## Payload 数据流系统

### 保留属性

以下属性在系统中有特殊含义：

| 属性 | 设置者 | 描述 |
|------|--------|------|
| `payload.llmResult` | Agent 节点 | 最后一次 Agent 执行的结构化输出 |
| `payload._error` | 任意节点 | 节点执行失败时的错误信息 |
| `payload.loop` | Loop 节点 | 循环迭代期间的 `{ currentItem, index, total }` |
| `payload[itemAlias]` | Loop 节点 | 当前循环项（名称取决于 `itemAlias` 配置） |
| `payload[indexAlias]` | Loop 节点 | 当前循环索引（名称取决于 `indexAlias` 配置） |
| `payload.httpStatus` | HTTP 节点 | HTTP 响应状态码 |
| `payload.httpData` | HTTP 节点 | HTTP 响应数据 |
| `payload.output` | Set/HTTP 节点 | 节点输出数据 |
| `payload.merged` | Merge 节点 | 合并后的结果 |

### 自定义属性

你可以向 payload 添加任何自定义属性。常见模式：

- `payload.players` — 游戏参与者列表
- `payload.phase` — 当前游戏阶段
- `payload.round` — 回合计数器
- `payload.publicLog` — 所有人可见的公开信息
- `payload.privateLog` — 隐藏信息
- `payload.nightState` — 夜晚阶段的临时状态
- `payload.daySpeeches` — 已收集的发言
- `payload.alivePlayers` — 计算得出的存活子集
- `payload.gameStatus` — 胜负状态

### Payload 流转示例

```
Trigger:        { phase: "night", players: [...], round: 1 }
    ↓
Code (初始化):   { phase: "night", players: [...], round: 1, alivePlayers: [...], publicLog: [] }
    ↓
Code (控制器):   { ..., gameStatus: "playing" }
    ↓
Condition:      路由到 "night" 分支
    ↓
Agent (狼人):    { ..., llmResult: { targetId: "p3", reason: "..." } }
    ↓
Code (结算):     { ..., nightState: { wolfTarget: "p3" }, privateLog: [...] }
    ↓
Output:         捕获完整 payload 作为 "夜晚结果"
```

---

## 如何创建工作流

### 第一步：规划节点

在创建节点之前，先规划：

1. **入口点是什么？** → 需要恰好 1 个 trigger 节点。
2. **需要什么数据？** → 使用 Code 节点初始化和转换数据。
3. **需要 AI 决策吗？** → 使用 Agent 节点。
4. **需要分支吗？** → 使用 Condition 节点配合路由。
5. **需要迭代吗？** → 使用 Loop 节点。
6. **输出是什么？** → 使用 Output 节点捕获结果。

### 第二步：创建节点

每个节点需要：

- `id` — 唯一字符串标识（使用描述性名称，如 `"init-state"`、`"wolf-decision"`）
- `type` — 以下之一：`"trigger"`、`"webhook"`、`"code"`、`"agent"`、`"condition"`、`"switch"`、`"loop"`、`"wait"`、`"merge"`、`"http"`、`"set"`、`"subworkflow"`、`"output"`
- `position` — `{ x: number, y: number }` 用于布局（x 从左到右递增，y 从上到下递增）
- `data` — 节点特定的配置（参见上面各节点类型的说明）

### 第三步：创建连线

每条连线需要：

- `id` — 唯一字符串标识（使用模式 `"e-{源节点id}-{目标节点id}"`）
- `source` — 源节点的 `id`
- `target` — 目标节点的 `id`
- `animated` — `true` 显示流动动画
- `sourceHandle` — **Condition 节点必需**，必须匹配路由的 `id`

### 第四步：验证

检查以下项：

- 恰好 1 个 trigger 节点
- 至少 1 个 output 节点
- 无孤立节点（除 trigger 外每个节点都应该可达）
- Condition 节点的连线必须有正确的 `sourceHandle` 值匹配路由 `id`
- Loop 节点的 `itemsPath` 必须指向有效的数组路径
- Agent 节点的 `agentId` 必须引用一个已存在的 Agent

---

## 完整示例

### 示例 1：简单线性流水线

基础流水线：用户输入 → 数据转换 → Agent 处理 → 输出。

```json
{
  "nodes_data": [
    { "id": "start", "type": "trigger", "position": { "x": 50, "y": 200 }, "data": { "label": "开始" } },
    { "id": "prepare", "type": "code", "position": { "x": 300, "y": 200 }, "data": {
      "label": "准备上下文",
      "code": "payload.context = payload.text || '无输入内容'; payload.timestamp = Date.now(); return payload;"
    }},
    { "id": "analyze", "type": "agent", "position": { "x": 550, "y": 200 }, "data": {
      "label": "分析文本",
      "agentId": "agent-summary",
      "prompt": "请总结以下文本：{{payload.context}}"
    }},
    { "id": "result", "type": "output", "position": { "x": 800, "y": 200 }, "data": { "label": "总结结果" } }
  ],
  "edges_data": [
    { "id": "e1", "source": "start", "target": "prepare", "animated": true },
    { "id": "e2", "source": "prepare", "target": "analyze", "animated": true },
    { "id": "e3", "source": "analyze", "target": "result", "animated": true }
  ]
}
```

### 示例 2：条件分支

根据数据分析结果进行路由的工作流。

```json
{
  "nodes_data": [
    { "id": "start", "type": "trigger", "position": { "x": 50, "y": 200 }, "data": { "label": "开始" } },
    { "id": "check", "type": "code", "position": { "x": 300, "y": 200 }, "data": {
      "label": "分析数据",
      "code": "payload.score = Math.random() * 100; return payload;"
    }},
    { "id": "router", "type": "condition", "position": { "x": 550, "y": 200 }, "data": {
      "label": "分数路由",
      "routes": [
        { "id": "route-high", "condition": "payload.score >= 80" },
        { "id": "route-medium", "condition": "payload.score >= 50" },
        { "id": "route-low", "condition": "payload.score < 50" }
      ]
    }},
    { "id": "high-agent", "type": "agent", "position": { "x": 800, "y": 50 }, "data": {
      "label": "高优先级处理",
      "agentId": "agent-1",
      "prompt": "处理高优先级案例。分数：{{payload.score}}"
    }},
    { "id": "med-agent", "type": "agent", "position": { "x": 800, "y": 200 }, "data": {
      "label": "中优先级处理",
      "agentId": "agent-2",
      "prompt": "处理中优先级案例。分数：{{payload.score}}"
    }},
    { "id": "low-agent", "type": "agent", "position": { "x": 800, "y": 350 }, "data": {
      "label": "低优先级处理",
      "agentId": "agent-1",
      "prompt": "处理低优先级案例。分数：{{payload.score}}"
    }},
    { "id": "out", "type": "output", "position": { "x": 1050, "y": 200 }, "data": { "label": "结果" } }
  ],
  "edges_data": [
    { "id": "e1", "source": "start", "target": "check", "animated": true },
    { "id": "e2", "source": "check", "target": "router", "animated": true },
    { "id": "e3", "source": "router", "sourceHandle": "route-high", "target": "high-agent", "animated": true },
    { "id": "e4", "source": "router", "sourceHandle": "route-medium", "target": "med-agent", "animated": true },
    { "id": "e5", "source": "router", "sourceHandle": "route-low", "target": "low-agent", "animated": true },
    { "id": "e6", "source": "high-agent", "target": "out", "animated": true },
    { "id": "e7", "source": "med-agent", "target": "out", "animated": true },
    { "id": "e8", "source": "low-agent", "target": "out", "animated": true }
  ]
}
```

### 示例 3：循环 + Agent 逐项处理

列表中每个玩家都获得 Agent 生成的发言。

```json
{
  "nodes_data": [
    { "id": "start", "type": "trigger", "position": { "x": 50, "y": 200 }, "data": { "label": "开始" } },
    { "id": "init", "type": "code", "position": { "x": 300, "y": 200 }, "data": {
      "label": "初始化玩家",
      "code": "payload.players = payload.players || [{id:'p1',name:'小明'},{id:'p2',name:'小红'},{id:'p3',name:'小刚'}]; payload.speeches = []; return payload;"
    }},
    { "id": "loop", "type": "loop", "position": { "x": 550, "y": 200 }, "data": {
      "label": "发言循环",
      "itemsPath": "payload.players",
      "itemAlias": "currentPlayer",
      "indexAlias": "playerIndex",
      "maxIterations": 10,
      "breakCondition": ""
    }},
    { "id": "speak", "type": "agent", "position": { "x": 800, "y": 200 }, "data": {
      "label": "生成发言",
      "agentId": "agent-1",
      "prompt": "玩家 {{payload.currentPlayer.name}} 正在发言。请生成一段简短发言。"
    }},
    { "id": "collect", "type": "code", "position": { "x": 1050, "y": 200 }, "data": {
      "label": "收集发言",
      "code": "payload.speeches.push({ player: payload.currentPlayer.name, speech: payload.llmResult?.result || '无发言' }); return payload;"
    }},
    { "id": "out", "type": "output", "position": { "x": 1300, "y": 200 }, "data": { "label": "全部发言" } }
  ],
  "edges_data": [
    { "id": "e1", "source": "start", "target": "init", "animated": true },
    { "id": "e2", "source": "init", "target": "loop", "animated": true },
    { "id": "e3", "source": "loop", "target": "speak", "animated": true },
    { "id": "e4", "source": "speak", "target": "collect", "animated": true },
    { "id": "e5", "source": "collect", "target": "out", "animated": true }
  ]
}
```

### 示例 4：阶段循环游戏流程

循环切换夜晚/白天阶段直到满足胜利条件的工作流。

```json
{
  "nodes_data": [
    { "id": "start", "type": "trigger", "position": { "x": 50, "y": 300 }, "data": { "label": "开始游戏" } },
    { "id": "init", "type": "code", "position": { "x": 300, "y": 300 }, "data": {
      "label": "初始化状态",
      "code": "payload.phase = 'night'; payload.round = 1; payload.status = 'playing'; return payload;"
    }},
    { "id": "phase-ctrl", "type": "code", "position": { "x": 550, "y": 300 }, "data": {
      "label": "阶段控制器",
      "code": "// 在这里检查胜利条件\nreturn payload;"
    }},
    { "id": "router", "type": "condition", "position": { "x": 800, "y": 300 }, "data": {
      "label": "阶段路由",
      "routes": [
        { "id": "r-night", "condition": "payload.status === 'playing' && payload.phase === 'night'" },
        { "id": "r-day", "condition": "payload.status === 'playing' && payload.phase === 'day'" },
        { "id": "r-end", "condition": "payload.status !== 'playing'" }
      ]
    }},
    { "id": "night-logic", "type": "agent", "position": { "x": 1050, "y": 100 }, "data": {
      "label": "夜晚行动",
      "agentId": "agent-1",
      "prompt": "处理夜晚阶段行动。"
    }},
    { "id": "night-end", "type": "code", "position": { "x": 1300, "y": 100 }, "data": {
      "label": "结束夜晚",
      "code": "payload.phase = 'day'; return payload;"
    }},
    { "id": "day-logic", "type": "agent", "position": { "x": 1050, "y": 300 }, "data": {
      "label": "白天行动",
      "agentId": "agent-2",
      "prompt": "处理白天阶段行动。"
    }},
    { "id": "day-end", "type": "code", "position": { "x": 1300, "y": 300 }, "data": {
      "label": "结束白天",
      "code": "payload.phase = 'night'; payload.round++; return payload;"
    }},
    { "id": "game-over", "type": "agent", "position": { "x": 1050, "y": 500 }, "data": {
      "label": "游戏结束",
      "agentId": "agent-1",
      "prompt": "生成游戏总结报告。"
    }},
    { "id": "out-night", "type": "output", "position": { "x": 1550, "y": 100 }, "data": { "label": "夜晚结果" } },
    { "id": "out-day", "type": "output", "position": { "x": 1550, "y": 300 }, "data": { "label": "白天结果" } },
    { "id": "out-end", "type": "output", "position": { "x": 1300, "y": 500 }, "data": { "label": "游戏结束" } }
  ],
  "edges_data": [
    { "id": "e1", "source": "start", "target": "init", "animated": true },
    { "id": "e2", "source": "init", "target": "phase-ctrl", "animated": true },
    { "id": "e3", "source": "phase-ctrl", "target": "router", "animated": true },
    { "id": "e4", "source": "router", "sourceHandle": "r-night", "target": "night-logic", "animated": true },
    { "id": "e5", "source": "night-logic", "target": "night-end", "animated": true },
    { "id": "e6", "source": "night-end", "target": "out-night", "animated": true },
    { "id": "e7", "source": "router", "sourceHandle": "r-day", "target": "day-logic", "animated": true },
    { "id": "e8", "source": "day-logic", "target": "day-end", "animated": true },
    { "id": "e9", "source": "day-end", "target": "out-day", "animated": true },
    { "id": "e10", "source": "router", "sourceHandle": "r-end", "target": "game-over", "animated": true },
    { "id": "e11", "source": "game-over", "target": "out-end", "animated": true }
  ]
}
```

---

## TypeScript 接口定义

### WorkflowNode

```typescript
type WorkflowNodeType = 'trigger' | 'agent' | 'condition' | 'code' | 'loop' | 'output'
  | 'router' | 'http' | 'set' | 'switch' | 'wait' | 'merge' | 'webhook' | 'subworkflow';

interface WorkflowNode {
  id: string;                          // 节点唯一标识
  type: WorkflowNodeType;              // 节点类型
  position: { x: number; y: number };  // 画布位置
  data: WorkflowNodeData;              // 节点配置数据
}

interface NodeRetryPolicy {
  maxAttempts?: number;                // 最大尝试次数
  backoff?: 'fixed' | 'exponential';   // 退避策略
  delayMs?: number;                    // 重试间隔（毫秒）
}

interface WorkflowNodeDataBase {
  label?: string;                      // 显示名称
  description?: string;                // 节点描述
  timeoutMs?: number;                  // 节点级超时
  retryPolicy?: NodeRetryPolicy;       // 重试策略
  onError?: 'stop' | 'continue' | 'route-to-error'; // 失败策略
  inputSchema?: string;                // 输入 JSON Schema
  outputSchema?: string;               // 输出 JSON Schema
}

type WorkflowNodeData = WorkflowNodeDataBase & {
  // Agent 节点
  agentId?: string;
  prompt?: string;
  autoSendToNext?: boolean;
  schema?: string;
  // Condition 节点
  routes?: Array<{ id: string; condition: string }>;
  // Switch 节点
  branches?: Array<{ id: string; label?: string; condition: string }>;
  // Code 节点
  code?: string;
  // Loop 节点
  itemsPath?: string;
  itemAlias?: string;
  indexAlias?: string;
  maxIterations?: number;
  breakCondition?: string;
  // HTTP 节点
  method?: string;
  url?: string;
  headers?: string;
  body?: string;
  // Set 节点
  mappings?: Array<{ sourcePath: string; targetPath: string }>;
  constants?: string;
  whitelist?: string;
  // Wait 节点
  waitMode?: 'fixed' | 'until';
  delayMs?: number;
  untilExpression?: string;
  // Merge 节点
  strategy?: 'append' | 'byKey' | 'waitForAll';
  mergeKey?: string;
  // Webhook 节点
  path?: string;
  authToken?: string;
  // Sub-workflow 节点
  subWorkflowId?: string;
  inputMapping?: string;
  // 开放索引签名
  [key: string]: unknown;
};
```

### WorkflowEdge

```typescript
interface WorkflowEdge {
  id: string;              // 连线唯一标识
  source: string;          // 源节点 ID
  target: string;          // 目标节点 ID
  sourceHandle?: string | null;  // 源连接点 ID（Condition 节点必需）
  targetHandle?: string | null;  // 目标连接点 ID（很少使用）
  type?: string;           // 连线类型
  animated?: boolean;      // 是否显示动画
  label?: string;          // 可选连线标签
}
```

---

## 约束与限制

| 约束 | 值 |
|------|-----|
| 单次执行最大步数 | 1000 |
| Code 节点超时 | 10 秒（可通过 `timeoutMs` 覆盖） |
| Condition 条件评估超时（每个路由） | 2 秒 |
| Loop 中断条件评估超时 | 2 秒 |
| HTTP 请求默认超时 | 30 秒 |
| Wait until 模式最大等待 | 60 秒 |
| 默认最大循环迭代次数 | 20 |
| 每个工作流的 Trigger 节点数 | 恰好 1 个 |
| 最少 Output 节点数 | 建议至少 1 个 |
| 节点间视觉延迟 | 400ms |
| Condition/Switch 的 Edge sourceHandle | 必须精确匹配路由/分支 `id` |
| Merge 节点目标连接点 | 2 个（input-1, input-2） |
| 重试最大次数 | 由 `retryPolicy.maxAttempts` 配置 |
| 指数退避 | `backoff: 'exponential'`，间隔按 2 的幂递增 |

---

## 速查：节点类型一览

```
trigger    → 入口点，无输入，1 个输出
webhook    → HTTP 端点触发，无输入，1 个输出
code       → JavaScript 执行，1 个输入，1 个输出
agent      → LLM 委派，1 个输入，1 个输出
condition  → 条件路由，1 个输入，动态多个输出（通过路由）
switch     → 多分支路由，1 个输入，动态多个输出（通过分支）
loop       → 数组迭代，1 个输入，1 个输出（执行 N 次）
wait       → 延时等待，1 个输入，1 个输出
merge      → 合并上游，2 个输入，1 个输出
http       → HTTP 请求，1 个输入，1 个输出
set        → 数据转换，1 个输入，1 个输出
subworkflow → 子工作流调用，1 个输入，1 个输出
output     → 终止捕获，1 个输入，无输出
```

## 速查：Edge 的 sourceHandle

```
普通节点：      sourceHandle 可选（或 null）
Condition 节点：sourceHandle 必须匹配 route.id
               → 决定条件走哪条分支
```

## 速查：Payload 生命周期

```
用户输入 → { 自定义数据 }
    ↓
Trigger/Webhook → payload 不变
    ↓
Code → payload 被修改（添加/计算/过滤字段）
    ↓
Set → payload 字段映射/常量注入/白名单过滤
    ↓
HTTP → payload.httpStatus + payload.httpData + payload.output
    ↓
Agent → payload.llmResult = { 结构化 Agent 输出 }
    ↓
Condition/Switch → payload 路由到一条分支
    ↓
Wait → 暂停指定时间或直到条件满足
    ↓
Loop → payload[itemAlias] = 当前项，payload[indexAlias] = 当前索引
    ↓
Merge → payload.merged = 合并结果
    ↓
Sub-workflow → 调用子工作流，结果回传到 payload
    ↓
Output → payload 被捕获为结果
```
