# SimperStudio

SimperStudio is a local-first desktop app that combines multi-agent chat and visual workflow automation in one place. It is built to feel lightweight, fast, and practical for everyday AI-assisted work.

## Highlights

- Multi-agent chat with `@` mentions and streaming responses
- Visual workflow builder powered by React Flow
- 14 implemented node types: `trigger`, `agent`, `condition`, `code`, `loop`, `output`, `router`, `http`, `set`, `switch`, `wait`, `merge`, `webhook`, `subworkflow`
- 1 planned: `dynamic-agent` (runtime-configurable persona — design doc at `docs/plan-dynamic-agent.md`)
- Workflow test-run panel with live execution status and result payload preview
- Light/Dark theme support
- Tauri desktop shell (Rust backend + React frontend)

## Node Types

| Node | Description |
|------|-------------|
| `trigger` | Entry point that starts workflow execution. |
| `agent` | Calls an LLM with a system prompt and returns the generated response. |
| `condition` | Evaluates JS expressions to route data into matching branches. |
| `code` | Executes custom JavaScript with async and timeout guard support. |
| `loop` | Iterates over an array, injecting context vars and aggregating results. |
| `output` | Terminates the workflow and returns the final result. |
| `router` | Distributes execution across multiple branches (shared logic with condition). |
| `http` | Sends HTTP requests with template variables, timeout and retry support. |
| `set` | Maps fields, injects constants and filters output with a whitelist. |
| `switch` | Routes based on value matching across multiple conditions (first match wins). |
| `wait` | Pauses execution for a fixed delay or until a polling condition is met. |
| `merge` | Combines outputs from multiple upstream nodes into a unified payload. |
| `webhook` | Exposes an HTTP endpoint for external systems to trigger the workflow. |
| `subworkflow` | Invokes another workflow with parameter passing and result return. |
| `dynamic-agent` *(planned)* | Runtime-configurable agent persona read from payload or templates. |

## Tech Stack

- **Desktop runtime:** [Tauri v2](https://v2.tauri.app/)
- **Frontend:** React 19 + Vite + TypeScript
- **UI:** Tailwind CSS + shadcn/ui + Radix UI
- **State:** Zustand
- **Workflow canvas:** [React Flow](https://reactflow.dev/)
- **LLM integration:** Vercel AI SDK providers

## Workflow Engine Notes

Current runtime supports:

- **Condition routing:** first matched route is taken
- **Code node execution:** async JavaScript with timeout guard
- **Loop node execution:**
  - iterates over `itemsPath`
  - injects `itemAlias` and `indexAlias`
  - exposes `payload.loop = { currentItem, index, total }`
  - supports `breakCondition`
  - supports per-node iteration cap (`maxIterations`)
  - includes global workflow step cap to avoid runaway graph execution

## Development

### Prerequisites

- Node.js 18+
- npm
- Rust toolchain + Tauri prerequisites (for desktop packaging)

### Install

```bash
npm install
```

### Run web dev server

```bash
npm run dev
```

### Build frontend

```bash
npm run build
```

### Run Tauri app (desktop)

```bash
npm run tauri dev
```

## Project Status

Implemented:

- Core app layout and navigation
- Multi-agent chat UI and streaming pipeline (single + workflow dual mode)
- Workflow canvas editing and persistence (React Flow + MiniMap)
- 14 node types with execution engine v2 (BFS queue + registry architecture)
- Loop node UI + runtime semantics (iteration, breakCondition, result aggregation)
- Retry in-place regeneration for agent responses
- Multi-provider model management (OpenAI/Anthropic/Gemini/DeepSeek/SiliconFlow/Custom)
- Agent batch management with categories
- Workflow import/export (JSON file + paste)
- Execution timeline with observability and rerun support
- Workflow chat with floating agent windows and forwarding chain
- Config persistence (Tauri JSON config + localStorage fallback)

In progress / next:

- Dynamic Agent node (design complete, implementation pending) — see `docs/plan-dynamic-agent.md`
- Werewolf workflow upgrade to dynamic-agent + loop-based sequential speech
- Loop aggregation semantics refinement (`payload.loopResults` vs `payload.llmResult`)
- Accessibility polish (contrast, click targets, aria-labels, keyboard navigation)
- Release packaging (Tauri bundle for Windows/macOS/Linux)

## Additional Docs

- `README.zh-CN.md` – Chinese overview
- `docs/TODO.md` – Detailed progress and phased implementation checklist
- `docs/` – Product/design docs