# SimperStudio Workflow System — AI Reference

> This document is written for AI agents and developers. It describes every node type, the runtime execution model, the payload system, and how to compose valid workflows.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Node Types Reference](#node-types-reference)
4. [Edge and Connection Rules](#edge-and-connection-rules)
5. [Runtime Execution Engine](#runtime-execution-engine)
6. [Payload System](#payload-system)
7. [How to Create a Workflow](#how-to-create-a-workflow)
8. [Complete Examples](#complete-examples)
9. [TypeScript Interfaces](#typescript-interfaces)
10. [Constraints and Limits](#constraints-and-limits)

---

## Overview

A SimperStudio workflow is a directed graph of nodes connected by edges. The graph starts at a **trigger** node, flows through processing nodes (code, agent, condition, loop), and terminates at **output** nodes. A shared `payload` object flows through the entire graph — each node can read and modify it.

### Data Structure

```typescript
interface Workflow {
  id: string;
  workspaceId: string;
  name: string;
  nodes_data: WorkflowNode[];
  edges_data: WorkflowEdge[];
  status: 'active' | 'inactive';
  createdAt: number;
  updatedAt: number;
}
```

---

## Core Concepts

### Payload

The payload is a plain JavaScript object that travels through the entire workflow. Every node receives the current payload, may modify it, and passes the modified version to downstream nodes.

- The payload is initialized with user-provided data when the workflow is triggered.
- Code nodes can mutate the payload arbitrarily.
- Agent nodes inject their LLM response into `payload.llmResult`.
- The payload accumulates state as it flows through the graph.

### Source Handle vs Target Handle

- **Target Handle** (left side): The input connection point. A node receives data through its target handle.
- **Source Handle** (right side): The output connection point. A node sends data downstream through its source handle.
- A node with no target handle (trigger) is an entry point. A node with no source handle (output) is a terminal point.

---

## Node Types Reference

There are **13 node types** in the system. Each has a unique type identifier, visual style, and runtime behavior.

Nodes are organized into 5 categories:

| Category | Node Types |
|----------|-----------|
| **Trigger** | trigger, webhook |
| **Flow Control** | condition, switch, loop, wait, merge |
| **Data** | code, set |
| **AI** | agent |
| **Integration** | http, subworkflow |
| **Output** | output |

---

### 1. Trigger Node

| Property | Value |
|----------|-------|
| Type ID | `trigger` |
| Color | Emerald green |
| Icon | Play ▶ |
| Target Handles | None |
| Source Handles | 1 (right side) |
| Width | 200px |

#### Purpose

The trigger node is the **entry point** of a workflow. A workflow must have exactly one trigger node. Execution begins here.

#### Data Fields

```typescript
{
  label?: string; // Display name, default "Trigger"
}
```

#### How It Works at Runtime

1. The engine finds the trigger node in the workflow.
2. It creates the initial execution frame with the user-provided `initialPayload`.
3. It enqueues all downstream nodes connected from the trigger's source handle.
4. The trigger node itself does not modify the payload.

#### Example

```json
{
  "id": "trigger-1",
  "type": "trigger",
  "position": { "x": 50, "y": 200 },
  "data": { "label": "Start Game" }
}
```

---

### 2. Code Node

| Property | Value |
|----------|-------|
| Type ID | `code` |
| Color | Blue |
| Icon | Code2 </> |
| Target Handles | 1 (left side) |
| Source Handles | 1 (right side) |
| Width | 220px |

#### Purpose

The code node executes **arbitrary JavaScript** with access to the current payload. It is the primary mechanism for data transformation, state management, and control flow logic.

#### Data Fields

```typescript
{
  label?: string;     // Display name, default "Code Snippet"
  code?: string;      // JavaScript code body, default "return payload;"
}
```

#### How It Works at Runtime

1. The engine wraps the code in an async function: `async function execute(payload) { ... }`.
2. The current payload is passed as the `payload` parameter (a deep clone).
3. The code runs with a **10-second timeout**. If it exceeds this, execution continues with an error appended to `payload._error`.
4. The return value of the function becomes the new payload.
5. If the code throws an error, the engine catches it, appends `payload._error = error.message`, and continues.

#### Code Node Environment

Inside a code node, you have access to:

- `payload` — the current workflow state (read/write)
- Standard JavaScript globals (`Math`, `Date`, `JSON`, `Array`, `Object`, etc.)
- `console.log` for debugging
- `async/await` is supported (the function is async)

You **cannot** access:

- DOM or browser APIs
- Node.js modules
- Network requests
- File system operations

#### Code Node Best Practices

- Always `return payload;` at the end (or a modified copy of it).
- Use optional chaining (`?.`) when accessing nested properties that may not exist.
- Keep code focused on a single responsibility.
- Use `payload._error` to signal errors to downstream nodes.

#### Example

```json
{
  "id": "init-data",
  "type": "code",
  "position": { "x": 300, "y": 200 },
  "data": {
    "label": "Initialize Game State",
    "code": "payload.players = payload.players || []; payload.round = payload.round || 1; payload.status = payload.status || 'playing'; return payload;"
  }
}
```

#### Common Code Node Patterns

**Initialize defaults:**
```javascript
payload.field = payload.field || defaultValue;
return payload;
```

**Filter and compute:**
```javascript
payload.alivePlayers = payload.players.filter(p => p.status === "alive");
payload.count = payload.alivePlayers.length;
return payload;
```

**Conditional mutation:**
```javascript
if (payload.count === 0) {
  payload.status = "finished";
}
return payload;
```

**Merge results from upstream agent:**
```javascript
const result = payload.llmResult || {};
payload.targetId = result.targetId;
payload.reason = result.reason;
return payload;
```

---

### 3. Agent Node

| Property | Value |
|----------|-------|
| Type ID | `agent` |
| Color | Primary (theme color) |
| Icon | Bot + Agent Avatar |
| Target Handles | 1 (left side) |
| Source Handles | 1 (right side) |
| Width | 260px |

#### Purpose

The agent node delegates a task to an **LLM-powered Agent**. It sends a prompt (which can reference the current payload), receives the agent's response, and injects it into the payload.

#### Data Fields

```typescript
{
  label?: string;           // Display name
  agentId?: string;         // ID of the Agent to use
  prompt?: string;          // Prompt template sent to the agent
  schema?: string;          // JSON schema for structured output (Tool Calling)
  autoSendToNext?: boolean; // If true, automatically forward output to next agent
}
```

#### How It Works at Runtime

1. The engine resolves the agent by `agentId` from the global agent list.
2. It constructs the final prompt by combining the node's `prompt` with any upstream context.
3. **In the current implementation**, the engine simulates the agent response:
   - If `schema` is defined and contains `"targetId"`, it generates `{ targetId: "player_3", reason: "simulated logic" }`.
   - If `schema` is defined but does not contain `"targetId"`, it generates `{ result: "simulated" }`.
   - If no `schema` is defined, it generates `{ output: "[Agent Output for {label}]: processed input." }`.
4. The simulated result is stored in `payload.llmResult`.
5. The payload (with `llmResult`) is passed to downstream nodes.

#### Prompt Templates

The prompt field supports **template interpolation** using `{{expression}}` syntax. Inside the double braces, you can reference `payload` properties:

```
你是狼人"暗影"。当前局势：{{JSON.stringify(payload.alivePlayers)}}
历史记录：{{JSON.stringify(payload.publicLog)}}
请选择今晚袭击目标。输出 targetId 和 reason。
```

**Note:** Template interpolation is performed by the frontend rendering layer. At runtime, the prompt is passed as-is to the agent. Use `JSON.stringify()` to embed complex objects.

#### Schema (Structured Output)

When `schema` is defined, the agent is expected to return structured JSON matching the schema. This enables downstream code nodes to reliably parse the agent's output.

```json
"schema": "{\"targetId\":\"string\",\"reason\":\"string\"}"
```

The schema string is a JSON object where keys are field names and values are type descriptions. It is used as a hint for the agent and for runtime simulation.

#### Example

```json
{
  "id": "node-seer",
  "type": "agent",
  "position": { "x": 500, "y": 100 },
  "data": {
    "label": "Seer Investigation",
    "agentId": "agent-seer",
    "prompt": "You are the Seer. Alive players: {{JSON.stringify(payload.alivePlayers)}}\nChoose a player to investigate. Output targetId and reason.",
    "schema": "{\"targetId\":\"string\",\"reason\":\"string\"}"
  }
}
```

---

### 4. Condition Node (Router)

| Property | Value |
|----------|-------|
| Type ID | `condition` |
| Color | Orange |
| Icon | SplitSquareHorizontal |
| Target Handles | 1 (left side) |
| Source Handles | Dynamic (one per route, right side) |
| Width | 240px |

#### Purpose

The condition node evaluates **JavaScript boolean expressions** and routes the payload to exactly one downstream branch. It is the primary mechanism for conditional logic and branching.

#### Data Fields

```typescript
{
  label?: string;   // Display name, default "Router"
  routes?: Array<{
    id: string;       // Unique route identifier, used as sourceHandle on edges
    condition: string; // JavaScript expression that evaluates to boolean
  }>;
}
```

#### How It Works at Runtime

1. The engine iterates through the `routes` array **in order**.
2. For each route, it evaluates the `condition` expression against a deep clone of the current payload.
3. The condition is evaluated inside an async function with `with (payload) { ... }` scope, so you can directly reference payload properties without the `payload.` prefix (though using `payload.` is recommended for clarity).
4. Evaluation has a **2-second timeout** per condition.
5. The **first route whose condition evaluates to `true`** is selected.
6. The engine finds the edge whose `sourceHandle` matches the selected route's `id`.
7. The payload is forwarded to the target node of that edge.
8. **Only one branch is taken.** Other routes are skipped.

#### Condition Expression Syntax

Conditions are standard JavaScript expressions. They have access to the full payload object:

```
payload.gameStatus === "playing" && payload.phase === "night"
```

```
payload.value > 50
```

```
payload.players.length > 0
```

If a condition throws an error during evaluation, it is treated as `false` and the next route is tried.

#### Important: Route ID and Edge sourceHandle

The connection between a condition node's route and its downstream node is established through the **edge's `sourceHandle`** property, which must match the route's `id`:

```json
// Edge from condition to a downstream node via specific route
{
  "id": "edge-to-night",
  "source": "condition-node-id",
  "sourceHandle": "route-night",
  "target": "night-handler-node-id",
  "animated": true
}
```

If `sourceHandle` does not match any route `id`, or if no route matches, the payload goes nowhere (dead end).

#### Example

```json
{
  "id": "phase-router",
  "type": "condition",
  "position": { "x": 500, "y": 200 },
  "data": {
    "label": "Phase Router",
    "routes": [
      { "id": "route-night", "condition": "payload.phase === 'night'" },
      { "id": "route-day", "condition": "payload.phase === 'day'" },
      { "id": "route-end", "condition": "payload.status !== 'playing'" }
    ]
  }
}
```

With corresponding edges:

```json
[
  { "id": "e1", "source": "phase-router", "sourceHandle": "route-night", "target": "night-handler" },
  { "id": "e2", "source": "phase-router", "sourceHandle": "route-day", "target": "day-handler" },
  { "id": "e3", "source": "phase-router", "sourceHandle": "route-end", "target": "game-over" }
]
```

---

### 5. Loop Node

| Property | Value |
|----------|-------|
| Type ID | `loop` |
| Color | Violet/Purple |
| Icon | Repeat |
| Target Handles | 1 (left side) |
| Source Handles | 1 (right side) |
| Width | 240px |

#### Purpose

The loop node iterates over an **array** in the payload, executing downstream nodes once per item. It is used for scenarios like "let each player take a turn" or "process each item in a list."

#### Data Fields

```typescript
{
  label?: string;          // Display name, default "Loop"
  itemsPath?: string;      // Dot-notation path to the array in payload, e.g. "payload.alivePlayers"
  itemAlias?: string;      // Variable name for the current item, e.g. "currentSpeaker"
  indexAlias?: string;     // Variable name for the current index, e.g. "speakerIndex"
  maxIterations?: number;  // Maximum number of iterations, default 20
  breakCondition?: string; // JavaScript expression; if true, loop exits early
}
```

#### How It Works at Runtime

1. The engine resolves the array from the payload using `itemsPath`.
2. If the path does not resolve to an array, it sets `payload._error` and skips the loop body.
3. It iterates through the array, up to `min(array.length, maxIterations)` times.
4. For each iteration:
   a. A deep clone of the current payload is created.
   b. The current item is injected as `payload[itemAlias]` (e.g., `payload.currentSpeaker`).
   c. The current index is injected as `payload[indexAlias]` (e.g., `payload.speakerIndex`).
   d. A convenience object is also set: `payload.loop = { currentItem, index, total }`.
   e. If `breakCondition` is defined, it is evaluated. If `true`, the loop breaks.
   f. Downstream nodes connected from the loop's source handle are enqueued with this iteration's payload clone.

#### Important Behavior

- Each iteration creates an **independent execution branch** with its own payload copy.
- Downstream nodes are executed **once per iteration** in sequence.
- The loop does not "collect" results from iterations — each iteration is independent.
- If you need to accumulate results across iterations, use a shared state in the payload (e.g., `payload.results = payload.results || []; payload.results.push(itemResult);`).

#### itemsPath Resolution

The `itemsPath` uses dot-notation to traverse the payload:

| itemsPath | Resolves to |
|-----------|-------------|
| `payload.players` | `payload.players` |
| `payload.alivePlayers` | `payload.alivePlayers` |
| `payload.data.items` | `payload.data.items` |

The `payload.` prefix is optional — `alivePlayers` and `payload.alivePlayers` both work.

#### Example

```json
{
  "id": "speech-loop",
  "type": "loop",
  "position": { "x": 500, "y": 300 },
  "data": {
    "label": "Player Speech Loop",
    "itemsPath": "payload.alivePlayers",
    "itemAlias": "currentSpeaker",
    "indexAlias": "speakerIndex",
    "maxIterations": 10,
    "breakCondition": "payload.gameStatus !== 'playing'"
  }
}
```

---

### 6. Output Node

| Property | Value |
|----------|-------|
| Type ID | `output` |
| Color | Slate gray |
| Icon | FileOutput |
| Target Handles | 1 (left side, limited to single connection) |
| Source Handles | None |
| Width | 200px |

#### Purpose

The output node is a **terminal node** that captures the current payload as a workflow result. It does not modify the payload — it simply records it.

#### Data Fields

```typescript
{
  label?: string; // Display name, default "Output"
}
```

#### How It Works at Runtime

1. When the engine reaches an output node, it stores the current payload in `results[nodeId]`.
2. It also updates `finalPayload` with this payload (the last output node to execute wins).
3. No downstream nodes are enqueued (output nodes have no source handles).

#### Multiple Output Nodes

A workflow can have multiple output nodes. Each captures the payload at its point in the graph. This is useful for capturing intermediate results (e.g., "Night Result", "Vote Result", "Game Over").

#### Example

```json
{
  "id": "output-night",
  "type": "output",
  "position": { "x": 800, "y": 100 },
  "data": { "label": "Night Result" }
}
```

---

### 7. HTTP Request Node

| Property | Value |
|----------|-------|
| Type ID | `http` |
| Color | Cyan |
| Icon | Globe |
| Target Handle | 1 (left) |
| Source Handle | 1 (right) |

Sends HTTP requests to external APIs. Supports GET/POST/PUT/PATCH/DELETE. Response data injected into `payload.httpData`, status into `payload.httpStatus`.

**Data fields:** `method`, `url` (supports `{{expression}}`), `headers`, `body`, `timeoutMs`

---

### 8. Set / Transform Node

| Property | Value |
|----------|-------|
| Type ID | `set` |
| Color | Teal |
| Icon | Shuffle |
| Target Handle | 1 (left) |
| Source Handle | 1 (right) |

Field mapping, renaming, constant injection, and whitelist filtering. Pure data transformation without code execution.

**Data fields:** `mappings` (sourcePath→targetPath), `constants` (JSON), `whitelist` (comma-separated paths)

---

### 9. IF / Switch Node

| Property | Value |
|----------|-------|
| Type ID | `switch` |
| Color | Amber |
| Icon | GitBranch |
| Target Handle | 1 (left) |
| Source Handle | Dynamic (one per branch) |

Evaluates multiple conditions and routes payload to the **first matching** branch. Similar to Condition but uses `branches` instead of `routes`.

**Data fields:** `branches` (id, label, condition)

---

### 10. Wait / Delay Node

| Property | Value |
|----------|-------|
| Type ID | `wait` |
| Color | Violet |
| Icon | Timer |
| Target Handle | 1 (left) |
| Source Handle | 1 (right) |

Pauses workflow execution. Supports fixed delay or wait-until-condition mode.

**Data fields:** `waitMode` (fixed/until), `delayMs`, `untilExpression`, `timeoutMs`

---

### 11. Merge Node

| Property | Value |
|----------|-------|
| Type ID | `merge` |
| Color | Pink |
| Icon | Merge |
| Target Handle | 2 (input-1, input-2) |
| Source Handle | 1 (right) |

Merges multiple upstream branches into one. Supports append, byKey, and waitForAll strategies.

**Data fields:** `strategy` (append/byKey/waitForAll), `mergeKey`

---

### 12. Webhook Trigger Node

| Property | Value |
|----------|-------|
| Type ID | `webhook` |
| Color | Lime |
| Icon | Webhook |
| Target Handle | None |
| Source Handle | 1 (right) |

Triggers workflow via HTTP endpoint. External systems can start workflow execution with POST requests.

**Data fields:** `method`, `path`, `authToken`

---

### 13. Sub-workflow Node

| Property | Value |
|----------|-------|
| Type ID | `subworkflow` |
| Color | Indigo |
| Icon | Workflow |
| Target Handle | 1 (left) |
| Source Handle | 1 (right) |

Calls another workflow with parameter passing and result return. Enables workflow modularization and reuse.

**Data fields:** `subWorkflowId`, `inputMapping`

---

## Node Contracts (Common Fields)

All node types share these common configuration fields:

```typescript
interface WorkflowNodeDataBase {
  label?: string;           // Display name
  description?: string;     // Node description
  timeoutMs?: number;       // Per-node timeout (overrides default)
  retryPolicy?: {           // Retry strategy
    maxAttempts?: number;   //   Max attempts, default 1
    backoff?: 'fixed' | 'exponential'; //   Backoff strategy
    delayMs?: number;       //   Retry delay (ms)
  };
  onError?: 'stop' | 'continue' | 'route-to-error'; // Failure strategy
  inputSchema?: string;     // Input JSON Schema
  outputSchema?: string;    // Output JSON Schema
}
```

### Failure Strategy (onError)

| Strategy | Behavior |
|----------|----------|
| `stop` (default) | Stop workflow execution, set `status: 'error'` |
| `continue` | Log error but continue executing downstream nodes |
| `route-to-error` | Route to error branch (if exists) |

---

## Execution Records

The engine tracks per-node execution state:

```typescript
interface NodeExecutionRecord {
  nodeId: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped' | 'retrying';
  startTime?: number;
  endTime?: number;
  durationMs?: number;
  attempts: number;
  error?: string;
  input?: unknown;
  output?: unknown;
}
```

### Cancel Execution

Users can manually cancel during execution. The engine stops processing remaining nodes in the queue and resets status to `idle`.

### Resume from Failure

Supports starting from a specific node (`startNodeId` option), skipping upstream nodes. Useful for rerunning from failed nodes.

---

## Import/Export

Workflows support JSON format import and export:

- **Export:** Serialize current canvas `nodes_data` + `edges_data` to JSON file download.
- **Import:** Support file picker or paste JSON code import. Validates node id/type/position/data integrity and edge source/target existence.

---

## Edge and Connection Rules

### Edge Data Structure

```typescript
interface WorkflowEdge {
  id: string;              // Unique edge identifier
  source: string;          // Source node ID
  target: string;          // Target node ID
  sourceHandle?: string;   // Source handle ID (required for condition node routes)
  targetHandle?: string;   // Target handle ID (rarely used)
  type?: string;           // Edge type (e.g., "default", "smoothstep")
  animated?: boolean;      // Whether the edge animates
  label?: string;          // Optional edge label
}
```

### Connection Rules

| From \ To | code | agent | condition | switch | loop | wait | merge | http | set | subworkflow | output |
|-----------|------|-------|-----------|--------|------|------|-------|------|-----|-------------|--------|
| **trigger** | Yes | Yes | Yes | Yes | Yes | Yes | — | Yes | Yes | Yes | Yes |
| **webhook** | Yes | Yes | Yes | Yes | Yes | Yes | — | Yes | Yes | Yes | Yes |
| **code** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **agent** | Yes | Yes | Yes | Yes | — | Yes | Yes | Yes | Yes | Yes | Yes |
| **condition** | Via sourceHandle matching route id to any node |
| **switch** | Via sourceHandle matching branch id to any node |
| **loop** | Yes | Yes | — | — | — | Yes | Yes | Yes | Yes | Yes | Yes |
| **wait** | Yes | Yes | Yes | Yes | Yes | — | Yes | Yes | Yes | Yes | Yes |
| **merge** | Yes | Yes | Yes | Yes | Yes | Yes | — | Yes | Yes | Yes | Yes |
| **http** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | — | Yes | Yes | Yes |
| **set** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | — | Yes | Yes |
| **subworkflow** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | — | Yes |
| **output** | No | Output has no source handle |

### Multiple Inputs

A node can receive input from **multiple upstream nodes** (multiple edges targeting the same node). At runtime, the engine processes nodes in BFS (breadth-first) order — whichever upstream node completes first, its payload is used when the downstream node is dequeued.

### Multiple Outputs

A node can have **multiple outgoing edges**. At runtime, the engine enqueues **all** downstream targets (except for condition nodes, which only follow the matched route).

---

## Runtime Execution Engine

### Execution Flow

1. **Initialize**: Find the trigger node, create the initial execution frame with `initialPayload`.
2. **BFS Loop**: Process nodes in breadth-first order using a queue.
3. **Per Node**:
   - Deep clone the payload from the execution frame.
   - Execute node logic based on type.
   - Store result in `results[nodeId]`.
   - Enqueue downstream nodes with the updated payload.
4. **Termination**: When the queue is empty, or after **1000 steps** (safety limit), execution ends.

### Step-by-Step for Each Node Type

```
Trigger → just enqueue downstream
Code    → run JS code, get new payload, enqueue downstream
Agent   → simulate/execute LLM, store in payload.llmResult, enqueue downstream
Condition → evaluate routes in order, enqueue ONE matched downstream node
Loop    → iterate array, enqueue downstream nodes N times (one per iteration)
Output  → store payload as result, no downstream
```

### Execution State

The engine tracks execution state:

```typescript
{
  status: 'idle' | 'running' | 'completed' | 'error';
  currentNodeId: string | null;  // Currently executing node
  results: Record<string, any>;  // Payload snapshot per node
  nodeRecords: Record<string, NodeExecutionRecord>; // Per-node execution records
}
```

### Timeouts

| Operation | Timeout |
|-----------|---------|
| Code node execution | 10 seconds |
| Condition evaluation (per route) | 2 seconds |
| Loop break condition evaluation | 2 seconds |
| HTTP request default | 30 seconds |
| Wait until mode max | 60 seconds |
| Agent node (real LLM) | Depends on model |
| Inter-node delay | 400ms (visual pacing) |

**Note:** All nodes support per-node timeout via `timeoutMs` field, which overrides the default.

---

## Payload System

### Reserved Properties

These properties have special meaning in the system:

| Property | Set By | Description |
|----------|--------|-------------|
| `payload.llmResult` | Agent node | The structured output from the last agent execution |
| `payload._error` | Any node | Error message if node execution failed |
| `payload.loop` | Loop node | `{ currentItem, index, total }` during loop iterations |
| `payload[itemAlias]` | Loop node | The current loop item (name depends on `itemAlias` config) |
| `payload[indexAlias]` | Loop node | The current loop index (name depends on `indexAlias` config) |
| `payload.httpStatus` | HTTP node | HTTP response status code |
| `payload.httpData` | HTTP node | HTTP response data |
| `payload.output` | Set/HTTP node | Node output data |
| `payload.merged` | Merge node | Merged result |

### Custom Properties

You can add any custom properties to the payload. Common patterns:

- `payload.players` — list of game participants
- `payload.phase` — current game phase
- `payload.round` — round counter
- `payload.publicLog` — shared information visible to all
- `payload.privateLog` — hidden information
- `payload.nightState` — temporary state for night phase
- `payload.daySpeeches` — collected speeches
- `payload.alivePlayers` — computed subset
- `payload.gameStatus` — win/loss status

### Payload Flow Example

```
Trigger:     { phase: "night", players: [...], round: 1 }
    ↓
Code (init): { phase: "night", players: [...], round: 1, alivePlayers: [...], publicLog: [] }
    ↓
Code (ctrl): { ..., gameStatus: "playing" }
    ↓
Condition:   routes to "night" branch
    ↓
Agent (wolf): { ..., llmResult: { targetId: "p3", reason: "..." } }
    ↓
Code (resolve): { ..., nightState: { wolfTarget: "p3" }, privateLog: [...] }
    ↓
Output:      captures full payload as "Night Result"
```

---

## How to Create a Workflow

### Step 1: Plan Your Nodes

Before creating nodes, plan:

1. **What is the entry point?** → You need exactly 1 trigger node.
2. **What data do you need?** → Use code nodes to initialize and transform data.
3. **Do you need AI decisions?** → Use agent nodes.
4. **Do you need branching?** → Use condition nodes with routes.
5. **Do you need iteration?** → Use loop nodes.
6. **What are the outputs?** → Use output nodes to capture results.

### Step 2: Create Nodes

Each node needs:

- `id` — a unique string identifier (use descriptive names like `"init-state"`, `"wolf-decision"`)
- `type` — one of: `"trigger"`, `"webhook"`, `"code"`, `"agent"`, `"condition"`, `"switch"`, `"loop"`, `"wait"`, `"merge"`, `"http"`, `"set"`, `"subworkflow"`, `"output"`
- `position` — `{ x: number, y: number }` for layout (x increases left-to-right, y increases top-to-bottom)
- `data` — node-specific configuration (see each node type above)

### Step 3: Create Edges

Each edge needs:

- `id` — a unique string identifier (use pattern `"e-{sourceId}-{targetId}"`)
- `source` — the source node's `id`
- `target` — the target node's `id`
- `animated` — `true` for visual flow animation
- `sourceHandle` — **required for condition nodes**, must match the route `id`

### Step 4: Validate

Check for:

- Exactly 1 trigger node
- At least 1 output node
- No orphaned nodes (every node except trigger should be reachable)
- Condition node edges must have correct `sourceHandle` values matching route `id`s
- Loop node's `itemsPath` must point to a valid array path
- Agent node's `agentId` must reference an existing agent

---

## Complete Examples

### Example 1: Simple Linear Pipeline

A basic pipeline: user input → transform → agent → output.

```json
{
  "nodes_data": [
    { "id": "start", "type": "trigger", "position": { "x": 50, "y": 200 }, "data": { "label": "Start" } },
    { "id": "prepare", "type": "code", "position": { "x": 300, "y": 200 }, "data": {
      "label": "Prepare Context",
      "code": "payload.context = payload.text || 'No input provided'; payload.timestamp = Date.now(); return payload;"
    }},
    { "id": "analyze", "type": "agent", "position": { "x": 550, "y": 200 }, "data": {
      "label": "Analyze Text",
      "agentId": "agent-summary",
      "prompt": "Summarize the following text: {{payload.context}}"
    }},
    { "id": "result", "type": "output", "position": { "x": 800, "y": 200 }, "data": { "label": "Summary Result" } }
  ],
  "edges_data": [
    { "id": "e1", "source": "start", "target": "prepare", "animated": true },
    { "id": "e2", "source": "prepare", "target": "analyze", "animated": true },
    { "id": "e3", "source": "analyze", "target": "result", "animated": true }
  ]
}
```

### Example 2: Conditional Branching

A workflow that routes based on data analysis.

```json
{
  "nodes_data": [
    { "id": "start", "type": "trigger", "position": { "x": 50, "y": 200 }, "data": { "label": "Start" } },
    { "id": "check", "type": "code", "position": { "x": 300, "y": 200 }, "data": {
      "label": "Analyze Data",
      "code": "payload.score = Math.random() * 100; return payload;"
    }},
    { "id": "router", "type": "condition", "position": { "x": 550, "y": 200 }, "data": {
      "label": "Score Router",
      "routes": [
        { "id": "route-high", "condition": "payload.score >= 80" },
        { "id": "route-medium", "condition": "payload.score >= 50" },
        { "id": "route-low", "condition": "payload.score < 50" }
      ]
    }},
    { "id": "high-agent", "type": "agent", "position": { "x": 800, "y": 50 }, "data": {
      "label": "High Priority Handler",
      "agentId": "agent-1",
      "prompt": "Handle high priority case. Score: {{payload.score}}"
    }},
    { "id": "med-agent", "type": "agent", "position": { "x": 800, "y": 200 }, "data": {
      "label": "Medium Handler",
      "agentId": "agent-2",
      "prompt": "Handle medium case. Score: {{payload.score}}"
    }},
    { "id": "low-agent", "type": "agent", "position": { "x": 800, "y": 350 }, "data": {
      "label": "Low Priority Handler",
      "agentId": "agent-1",
      "prompt": "Handle low priority. Score: {{payload.score}}"
    }},
    { "id": "out", "type": "output", "position": { "x": 1050, "y": 200 }, "data": { "label": "Result" } }
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

### Example 3: Loop with Agent Per Item

A workflow where each player in a list gets an agent-generated speech.

```json
{
  "nodes_data": [
    { "id": "start", "type": "trigger", "position": { "x": 50, "y": 200 }, "data": { "label": "Start" } },
    { "id": "init", "type": "code", "position": { "x": 300, "y": 200 }, "data": {
      "label": "Init Players",
      "code": "payload.players = payload.players || [{id:'p1',name:'Alice'},{id:'p2',name:'Bob'},{id:'p3',name:'Charlie'}]; payload.speeches = []; return payload;"
    }},
    { "id": "loop", "type": "loop", "position": { "x": 550, "y": 200 }, "data": {
      "label": "Speech Loop",
      "itemsPath": "payload.players",
      "itemAlias": "currentPlayer",
      "indexAlias": "playerIndex",
      "maxIterations": 10,
      "breakCondition": ""
    }},
    { "id": "speak", "type": "agent", "position": { "x": 800, "y": 200 }, "data": {
      "label": "Generate Speech",
      "agentId": "agent-1",
      "prompt": "Player {{payload.currentPlayer.name}} is speaking. Generate a short speech."
    }},
    { "id": "collect", "type": "code", "position": { "x": 1050, "y": 200 }, "data": {
      "label": "Collect Speech",
      "code": "payload.speeches.push({ player: payload.currentPlayer.name, speech: payload.llmResult?.result || 'No speech' }); return payload;"
    }},
    { "id": "out", "type": "output", "position": { "x": 1300, "y": 200 }, "data": { "label": "All Speeches" } }
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

### Example 4: Game Loop with Phase Cycling

A workflow that cycles through phases until a win condition is met.

```json
{
  "nodes_data": [
    { "id": "start", "type": "trigger", "position": { "x": 50, "y": 300 }, "data": { "label": "Start Game" } },
    { "id": "init", "type": "code", "position": { "x": 300, "y": 300 }, "data": {
      "label": "Init State",
      "code": "payload.phase = 'night'; payload.round = 1; payload.status = 'playing'; return payload;"
    }},
    { "id": "phase-ctrl", "type": "code", "position": { "x": 550, "y": 300 }, "data": {
      "label": "Phase Controller",
      "code": "// Check win conditions here\nreturn payload;"
    }},
    { "id": "router", "type": "condition", "position": { "x": 800, "y": 300 }, "data": {
      "label": "Phase Router",
      "routes": [
        { "id": "r-night", "condition": "payload.status === 'playing' && payload.phase === 'night'" },
        { "id": "r-day", "condition": "payload.status === 'playing' && payload.phase === 'day'" },
        { "id": "r-end", "condition": "payload.status !== 'playing'" }
      ]
    }},
    { "id": "night-logic", "type": "agent", "position": { "x": 1050, "y": 100 }, "data": {
      "label": "Night Actions",
      "agentId": "agent-1",
      "prompt": "Process night phase actions."
    }},
    { "id": "night-end", "type": "code", "position": { "x": 1300, "y": 100 }, "data": {
      "label": "End Night",
      "code": "payload.phase = 'day'; return payload;"
    }},
    { "id": "day-logic", "type": "agent", "position": { "x": 1050, "y": 300 }, "data": {
      "label": "Day Actions",
      "agentId": "agent-2",
      "prompt": "Process day phase actions."
    }},
    { "id": "day-end", "type": "code", "position": { "x": 1300, "y": 300 }, "data": {
      "label": "End Day",
      "code": "payload.phase = 'night'; payload.round++; return payload;"
    }},
    { "id": "game-over", "type": "agent", "position": { "x": 1050, "y": 500 }, "data": {
      "label": "Game Over",
      "agentId": "agent-1",
      "prompt": "Generate a game summary."
    }},
    { "id": "out-night", "type": "output", "position": { "x": 1550, "y": 100 }, "data": { "label": "Night Result" } },
    { "id": "out-day", "type": "output", "position": { "x": 1550, "y": 300 }, "data": { "label": "Day Result" } },
    { "id": "out-end", "type": "output", "position": { "x": 1300, "y": 500 }, "data": { "label": "Game Over" } }
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

## TypeScript Interfaces

### WorkflowNode

```typescript
type WorkflowNodeType = 'trigger' | 'agent' | 'condition' | 'code' | 'loop' | 'output'
  | 'router' | 'http' | 'set' | 'switch' | 'wait' | 'merge' | 'webhook' | 'subworkflow';

interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

interface NodeRetryPolicy {
  maxAttempts?: number;
  backoff?: 'fixed' | 'exponential';
  delayMs?: number;
}

interface WorkflowNodeDataBase {
  label?: string;
  description?: string;
  timeoutMs?: number;
  retryPolicy?: NodeRetryPolicy;
  onError?: 'stop' | 'continue' | 'route-to-error';
  inputSchema?: string;
  outputSchema?: string;
}

type WorkflowNodeData = WorkflowNodeDataBase & {
  // Agent node
  agentId?: string;
  prompt?: string;
  autoSendToNext?: boolean;
  schema?: string;
  // Condition node
  routes?: Array<{ id: string; condition: string }>;
  // Switch node
  branches?: Array<{ id: string; label?: string; condition: string }>;
  // Code node
  code?: string;
  // Loop node
  itemsPath?: string;
  itemAlias?: string;
  indexAlias?: string;
  maxIterations?: number;
  breakCondition?: string;
  // HTTP node
  method?: string;
  url?: string;
  headers?: string;
  body?: string;
  // Set node
  mappings?: Array<{ sourcePath: string; targetPath: string }>;
  constants?: string;
  whitelist?: string;
  // Wait node
  waitMode?: 'fixed' | 'until';
  delayMs?: number;
  untilExpression?: string;
  // Merge node
  strategy?: 'append' | 'byKey' | 'waitForAll';
  mergeKey?: string;
  // Webhook node
  path?: string;
  authToken?: string;
  // Sub-workflow node
  subWorkflowId?: string;
  inputMapping?: string;
  // Open-ended for custom properties
  [key: string]: unknown;
};
```

### WorkflowEdge

```typescript
interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  animated?: boolean;
  label?: string;
}
```

---

## Constraints and Limits

| Constraint | Value |
|-----------|-------|
| Maximum workflow steps per execution | 1000 |
| Code node timeout | 10 seconds (overridable via `timeoutMs`) |
| Condition evaluation timeout (per route) | 2 seconds |
| Loop break condition timeout | 2 seconds |
| HTTP request default timeout | 30 seconds |
| Wait until mode max wait | 60 seconds |
| Default max loop iterations | 20 |
| Trigger nodes per workflow | Exactly 1 |
| Minimum output nodes | At least 1 recommended |
| Inter-node visual delay | 400ms |
| Edge sourceHandle for condition/switch | Must match route/branch `id` exactly |
| Merge node target handles | 2 (input-1, input-2) |
| Max retry attempts | Configurable via `retryPolicy.maxAttempts` |
| Exponential backoff | `backoff: 'exponential'`, delay doubles each attempt |

---

## Quick Reference: Node Type Map

```
trigger     → Entry point, no input, one output
webhook     → HTTP endpoint trigger, no input, one output
code        → JavaScript execution, one input, one output
agent       → LLM delegation, one input, one output
condition   → Conditional routing, one input, dynamic outputs (via routes)
switch      → Multi-branch routing, one input, dynamic outputs (via branches)
loop        → Array iteration, one input, one output (executed N times)
wait        → Delay/pause, one input, one output
merge       → Merge upstream, two inputs, one output
http        → HTTP request, one input, one output
set         → Data transformation, one input, one output
subworkflow → Sub-workflow call, one input, one output
output      → Terminal capture, one input, no output
```

## Quick Reference: Edge sourceHandle

```
Normal nodes:       sourceHandle is optional (or null)
Condition nodes:    sourceHandle MUST match a route.id
Switch nodes:       sourceHandle MUST match a branch.id
                    → determines which branch to take
```

## Quick Reference: Payload Lifecycle

```
User Input → { custom data }
    ↓
Trigger/Webhook → payload unchanged
    ↓
Code → payload modified (add/compute/filter fields)
    ↓
Set → payload field mapping / constant injection / whitelist filter
    ↓
HTTP → payload.httpStatus + payload.httpData + payload.output
    ↓
Agent → payload.llmResult = { structured agent output }
    ↓
Condition/Switch → payload routed to ONE branch
    ↓
Wait → pause for specified time or until condition met
    ↓
Loop → payload[itemAlias] = current item, payload[indexAlias] = current index
    ↓
Merge → payload.merged = merged result
    ↓
Sub-workflow → calls child workflow, result returned to payload
    ↓
Output → payload captured as result
```
