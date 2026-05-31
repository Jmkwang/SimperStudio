# SimperStudio

SimperStudio is a local-first desktop app that combines multi-agent chat and visual workflow automation in one place. It is built to feel lightweight, fast, and practical for everyday AI-assisted work.

## Highlights

- Multi-agent chat with `@` mentions and streaming responses
- Visual workflow builder powered by React Flow
- 15 implemented node types: `trigger`, `agent`, `condition`, `code`, `loop`, `output`, `router`, `http`, `set`, `switch`, `wait`, `merge`, `webhook`, `subworkflow`, `dynamic-agent`
- Workflow execution timeline with live status, result payload preview, and rerun support
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
| `dynamic-agent` | Runtime-configurable agent persona read from payload or templates. |

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

## How It Works

### Chat Mode
Interact with AI agents in real-time. Switch between different agents, mention them with `@`, and get streaming responses. Perfect for brainstorming, Q&A, and collaborative thinking.

### Workflow Mode
Build visual automation pipelines by connecting nodes. Each node performs a specific task—call an LLM, fetch data, transform it, or route based on conditions. Workflows can be triggered manually, on a schedule, or via webhooks.

### Dynamic Agent
A powerful feature that lets you configure agent personas at runtime. Instead of hardcoding agent behavior, you can pass agent configuration (name, system prompt, model) through the workflow payload. Enables patterns like "agent sets agents" where a leader agent dynamically assigns roles to team members.

## Usage Examples

### Example 1: Multi-Agent Brainstorm Workflow
Create a workflow that routes a user question to 3 specialized agents (Product Manager, Engineer, Designer), collects their responses, and synthesizes them into a final recommendation.

**Nodes:** Trigger → Dynamic Agent (PM) → Dynamic Agent (Engineer) → Dynamic Agent (Designer) → Merge → Agent (Synthesizer) → Output

### Example 2: Data Processing Pipeline
Fetch data from an API, transform it with custom code, analyze it with an LLM, and store the result.

**Nodes:** Trigger → HTTP (fetch data) → Code (transform) → Agent (analyze) → HTTP (save result) → Output

### Example 3: Scheduled Report Generation
Run a workflow every morning to collect metrics, generate insights, and send a summary email.

**Nodes:** Trigger (scheduled) → HTTP (fetch metrics) → Agent (generate insights) → HTTP (send email) → Output

## Development

### Prerequisites

- **Node.js** 18+
- **npm** or yarn
- **Rust toolchain** (for Tauri desktop build)
  - **Windows:** Visual Studio Build Tools 2019+ or Visual Studio Community with C++ workload
  - **macOS:** Xcode Command Line Tools (`xcode-select --install`)
  - **Linux:** `build-essential`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`

### Quick Start

```bash
# 1. Clone and install dependencies
git clone <repository-url>
cd SimperStudio
npm install

# 2. Development mode (web only, http://localhost:1420)
npm run dev

# 3. Desktop development (with Tauri hot reload)
npm run tauri dev

# 4. Run tests
npm test              # Single run
npm run test:watch   # Watch mode

# 5. Production build
npm run build         # Build frontend
npm run tauri build   # Package desktop app
```

### Configuration

**API Keys & Model Providers:**
1. Open Settings → Models
2. Add your provider (OpenAI, Anthropic, Gemini, etc.)
3. Enter API key and configure models
4. Set a default model for the provider

**Local Models (Ollama):**
1. Install [Ollama](https://ollama.ai)
2. Run `ollama serve`
3. In Settings → Models, add Custom provider with base URL `http://localhost:11434`

**Custom API Endpoints:**
Define custom REST endpoints in Settings → Custom APIs to use them as tools in agents or workflow nodes.

## Project Status

Implemented:

- Core app layout and navigation
- Multi-agent chat UI and streaming pipeline (single + workflow dual mode)
- Workflow canvas editing and persistence (React Flow + MiniMap)
- 15 node types with execution engine v2 (BFS queue + registry architecture)
- Dynamic Agent node with runtime-configurable persona
- Loop node UI + runtime semantics (iteration, breakCondition, result aggregation)
- Retry in-place regeneration for agent responses
- Multi-provider model management (OpenAI/Anthropic/Gemini/DeepSeek/SiliconFlow/Custom/Ollama)
- Agent batch management with categories
- Workflow import/export (JSON file + paste)
- Execution timeline with observability and rerun support
- Workflow chat with floating agent windows and forwarding chain
- Config persistence (Tauri JSON config + localStorage fallback)
- Accessibility improvements (focus states, aria-labels, keyboard navigation)

In progress / next:

- Release packaging (Tauri bundle for Windows/macOS/Linux)
- Additional workflow templates and examples
- Performance optimization for large workflows

## FAQ

**Q: Where is my data stored?**  
A: All data (workflows, chats, agents, settings) is stored locally in `%APPDATA%\SimperStudio\` (Windows), `~/Library/Application Support/SimperStudio/` (macOS), or `~/.local/share/SimperStudio/` (Linux). Nothing is sent to external servers.

**Q: Can I use SimperStudio offline?**  
A: Yes, for local workflows and chat. However, you need internet to call external LLM APIs (OpenAI, Anthropic, etc.). Local models via Ollama work fully offline.

**Q: How do I export or backup my workflows?**  
A: Right-click a workflow → Export as JSON. You can also import workflows by pasting JSON or selecting a file. Backups are stored in the local data directory.

**Q: What's the difference between Chat and Workflow modes?**  
A: **Chat** is for real-time conversation with agents. **Workflow** is for building automated pipelines that run step-by-step. Workflows can include chat steps (agent nodes) but are designed for complex, multi-step automation.

**Q: Can I run workflows on a schedule?**  
A: Yes, use a Trigger node set to "scheduled" and configure the cron expression. Webhooks are also supported for external triggers.

**Q: What's a Dynamic Agent?**  
A: A Dynamic Agent reads its configuration (name, system prompt, model) from the workflow payload at runtime. This enables flexible patterns where one agent can spawn and configure other agents dynamically.

**Q: How do I debug a failing workflow?**  
A: Open the workflow and click "Run". The Execution Timeline shows each node's status, duration, and output. Click a node to inspect its result payload.

## Contributing

We welcome contributions! To get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and test thoroughly
4. Commit with clear messages
5. Push to your fork and open a Pull Request

Please ensure:
- Code follows the existing style (2-space indent, TypeScript strict mode)
- Tests pass (`npm test`)
- Documentation is updated if needed
- Changes are documented in `docs/CHANGELOG.md`

For major changes, please open an issue first to discuss your proposal.

## License

This project is licensed under the [MIT License](LICENSE) — feel free to use, modify, and distribute.

## Acknowledgments

SimperStudio stands on the shoulders of giants. We're grateful to:

- **[CherryStudio](https://github.com/kangfenmao/cherry-studio)** — for inspiring the elegant multi-agent chat experience
- **[n8n](https://n8n.io/)** — for pioneering the visual workflow automation paradigm that shaped our node-based engine design

**Development & Intelligence:**
- **[Kimi](https://kimi.moonshot.cn/)** — for deep reasoning and code generation during development
- **[DeepSeek](https://www.deepseek.com/)** — for efficient and capable language understanding throughout the project

This project combines the best ideas from the open-source community with modern AI capabilities to create a tool that's both powerful and delightful to use.

## Additional Docs

- `README.zh-CN.md` – Chinese overview
- `docs/Development.md` – Architecture, tech stack, and development guide
- `docs/PRD.md` – Product requirements and vision
- `docs/Features.md` – Complete feature checklist
- `docs/Design.md` – UI/UX design system and tokens
- `docs/TODO_active.md` – Current tasks and roadmap
- `docs/CHANGELOG.md` – Version history and completed items
- `docs/reference/` – Technical reference (nodes, stores, commands, views, workflow engine, chat system)