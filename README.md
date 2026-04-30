# SimperStudio

SimperStudio is a local-first desktop app that combines multi-agent chat and visual workflow automation in one place. It is built to feel lightweight, fast, and practical for everyday AI-assisted work.

## Highlights

- Multi-agent chat with `@` mentions and streaming responses
- Visual workflow builder powered by React Flow
- Node types: `trigger`, `agent`, `condition`, `code`, `loop`, `output`
- Workflow test-run panel with live execution status and result payload preview
- Light/Dark theme support
- Tauri desktop shell (Rust backend + React frontend)

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
- Multi-agent chat UI and streaming pipeline
- Workflow canvas editing and persistence
- Loop node UI + runtime semantics (Step 1 & Step 2)

In progress / next:

- Loop result aggregation contract (`payload.loopResults[...]`)
- Werewolf workflow phased migration to loop-based day speech flow
- SQLite persistence consolidation and release packaging

## Additional Docs

- `README.zh-CN.md` – Chinese overview
- `docs/TODO.md` – Detailed progress and phased implementation checklist
- `docs/` – Product/design docs