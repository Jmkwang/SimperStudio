# SimperStudio: Product Requirements Document (PRD)

## 1. Product Vision & Goals

**Vision:** SimperStudio is a "Small & Beautiful" desktop application designed to bridge the gap between conversational AI and automated workflows. It combines the seamless multi-agent chat experience of CherryStudio with the powerful, visual node-based automation of n8n, all within a lightweight, local-first environment.

**Goals:**
*   **Local-First & Fast:** Ensure lightning-fast performance and data privacy by storing user data locally.
*   **Intuitive UI/UX:** Provide a clean, distraction-free interface that feels native to the user's operating system.
*   **Extensible:** Allow users to connect any custom API and build complex workflows without heavy coding.
*   **Hybrid Power:** Seamlessly integrate chat-based interactions with visual workflow executions.

---

## 2. Core Features

### 2.1 Multi-Agent Chat
*   Support for multiple LLM providers (OpenAI, Anthropic, Gemini, local models via Ollama).
*   Ability to switch agents mid-conversation or have agents collaborate.
*   Thread management (history, branching, context pruning).
*   **Workflow-based sessions:** Each workflow can have unlimited chat sessions.

### 2.2 Custom APIs & Integrations
*   **Multi-provider model management:** Support configuring multiple providers (OpenAI, Anthropic, Gemini, Custom), each with multiple models.
*   Ability to define custom REST endpoints as tools for agents or nodes in workflows.
*   Secure local credential storage.

### 2.3 Workflow Zone
*   Visual, node-based editor (drag-and-drop).
*   Trigger nodes (manual, scheduled, webhook).
*   Action nodes (API calls, data transformation, logic gates).
*   LLM integration nodes (prompting an agent within a workflow).
*   **Dynamic Agent nodes:** Runtime-configurable agent nodes that read their persona (name, avatar, system prompt, personality) from the workflow payload or inline templates. Enables "agent sets agents" patterns where a leader agent dynamically assigns roles to blank agents.
*   Execution history and debugging tools.
*   **MiniMap:** Visual overview of the workflow canvas.

### 2.4 Workspace Zone
*   Project-based organization.
*   Users can group specific chats, agents, and workflows into distinct workspaces (e.g., "Personal", "Work", "Side Project").
*   Workspace-specific variables and context.

### 2.5 Agent Zone
*   Agent creation and configuration interface.
*   Define system prompts, assign specific tools (from Custom APIs), and set model parameters (temperature, max tokens).
*   Agent library/marketplace for sharing and importing agent configurations.

### 2.6 Model Provider Management
*   **Provider List:** Left panel showing all configured providers with name, type, base URL, and enable status.
*   **Provider Detail:** Right panel showing selected provider's configuration:
    *   Basic info: Name, Type, Base URL, API Key, Custom Header
    *   **Model List:** Multiple models per provider, each with name and model ID
    *   **Default Model:** Star-marked default model for the provider
    *   Actions: Add/Delete models, Enable/Disable provider, Set as active provider
*   **Active Provider:** One provider is designated as "active" and used for all AI calls.
*   **Add Provider UX:** Form validation with red border + error text on required fields. Auto-fill default name and base URL by provider type. Auto-select newly created provider.
*   **Settings Organization:** Language and Remote Access settings are separated into individual cards for clarity.

---

## 3. Technical Architecture

*   **App Framework:** Tauri (Rust backend, web frontend) for a lightweight footprint and native desktop capabilities.
*   **Frontend Framework:** React 19+ with Vite for rapid development and HMR.
*   **State Management:** Zustand 5.
*   **UI Components:** Radix UI / shadcn/ui or similar headless components styled with Tailwind CSS.
*   **Workflow Engine (UI):** React Flow (@xyflow/react) for the visual node editor.
*   **Database:** Local SQLite (via Tauri SQL plugin) for persistent storage.

---

## 4. Data Models (SQLite Schema)

Below is a conceptual schema for the local SQLite database.

### `Workspaces`
*   `id` (UUID, Primary Key)
*   `name` (String)
*   `description` (String)
*   `created_at` (Timestamp)
*   `updated_at` (Timestamp)

### `Agents`
*   `id` (UUID, Primary Key)
*   `name` (String)
*   `avatar` (String)
*   `system_prompt` (Text)
*   `model_provider` (String)
*   `model_id` (String)
*   `parameters` (JSON)
*   `created_at` (Timestamp)

### `Chats`
*   `id` (UUID, Primary Key)
*   `workspace_id` (UUID, Foreign Key)
*   `title` (String)
*   `mode` (String: 'single' | 'workflow')
*   `workflow_id` (UUID, Foreign Key, Nullable)
*   `created_at` (Timestamp)
*   `updated_at` (Timestamp)

### `Messages`
*   `id` (UUID, Primary Key)
*   `chat_id` (UUID, Foreign Key)
*   `agent_id` (UUID, Foreign Key, Nullable for user messages)
*   `role` (String: user, assistant, system)
*   `content` (Text)
*   `timestamp` (Timestamp)

### `Workflows`
*   `id` (UUID, Primary Key)
*   `workspace_id` (UUID, Foreign Key)
*   `name` (String)
*   `nodes_data` (JSON - React Flow structure)
*   `edges_data` (JSON - React Flow structure)
*   `status` (String: active, inactive)
*   `created_at` (Timestamp)
*   `updated_at` (Timestamp)

### `CustomAPIs` (Tools)
*   `id` (UUID, Primary Key)
*   `name` (String)
*   `endpoint` (String)
*   `method` (String)
*   `headers` (JSON)
*   `body_template` (Text)

### `ModelProviders` (Settings)
*   `id` (UUID, Primary Key)
*   `name` (String)
*   `type` (String: openai, anthropic, gemini, custom)
*   `api_key` (String)
*   `base_url` (String)
*   `is_enabled` (Boolean)
*   `custom_header` (String, Nullable)
*   `models` (JSON - Array of {id, name, modelId, isDefault})

---

## 5. UI/UX Guidelines for the UI Designer

*   **Aesthetic:** "Small & Beautiful." Think modern macOS or refined minimalist Windows 11. High whitespace, subtle shadows, crisp typography (Inter or system UI fonts).
*   **Layout:**
    *   Left Sidebar: Navigation (Chats, Workflows, Agents, Prompts, Settings).
    *   Main Content Area: Dynamic based on selection.
    *   Right Sidebar (Optional/Collapsible): Context, Agent Settings, or Node Properties.
*   **Context Sidebar Behavior:**
    *   **Chat view:** Shows workflow list (left) + sessions for selected workflow (right), toggle via top tabs.
    *   **Workflow view:** Shows workflow list only.
    *   **Agents view:** Shows agent list.
    *   **Prompts/Settings/Profile:** No sidebar.
*   **Theming:** Full Support for System Dark/Light modes with smooth transitions.
*   **Workflow Editor:** Needs to feel snappy. Nodes should be clearly legible, with distinct colors for different node types (Trigger, Action, LLM). Connections must be easily manageable. MiniMap for canvas overview.
*   **Interactions:** Hover states, subtle click animations, and keyboard shortcuts for power users.

---

## 6. Development Phases

### Phase 1: MVP (Completed)
*   Tauri + React + Vite setup.
*   SQLite integration.
*   Basic UI layout (Sidebar + Main Area).
*   Agent configuration and single-agent chat.
*   Basic Custom API setup (making REST calls from chat).

### Phase 2: Chat Refactor & Workflow Chat (P0) — Completed
*   Split chat sessions into single-agent mode and workflow mode.
*   Add workflow conversation windows and agent-to-agent forwarding actions.
*   Unify message metadata and chat/workflow orchestration actions.
*   New session dialog with single/workflow mode selection.
*   Workflow sidebar collapse/expand behavior.
*   Context sidebar shows different content per view (chat/workflow/agents).

### Phase 3: Composable Node Ecosystem (P1) — Completed
*   Added 7 new node types: HTTP Request, Set/Transform, IF/Switch, Merge, Wait/Delay, Webhook Trigger, Sub-workflow.
*   Standardized node configuration contracts: `timeoutMs`, `retryPolicy`, `onError`, `inputSchema/outputSchema`.
*   Workflow import/export (JSON file and paste import).
*   Categorized node panel with search (Trigger/Flow Control/Data/AI/Integration/Output).
*   MiniMap on workflow canvas.

### Phase 4: Reliable Runtime Semantics (P2) — Completed
*   Node-level input/output schema validation.
*   Unified retry/timeout/error-branch semantics (`stop`/`continue`/`route-to-error`).
*   Idempotent execution keys (`executionId:nodeId`).
*   Resume from failure (`startNodeId` option).
*   Cancel execution support.

### Phase 5: Observability & Operations (P3) — Mostly Completed
*   Execution history with `NodeExecutionRecord` (status, startTime, endTime, durationMs, attempts, error).
*   Node-level input/output snapshots.
*   ExecutionTimeline UI component with expandable details.
*   Rerun support (full run, from failed node, single-node debug rerun).
*   Export execution logs (JSON).
*   `prefers-reduced-motion` support for animations.
*   Remaining: alert hooks, accessibility polish (contrast, click targets, aria-labels, responsive layout).

### Phase 6: Multi-Provider Model Management (P4) — Completed
*   Replaced single API provider settings with multi-provider system.
*   Each provider supports multiple models with default model selection.
*   Settings page redesigned: left provider list + right detail panel.
*   Provider CRUD: Add, update, delete, enable/disable, set active.
*   Model CRUD per provider: Add, delete, set default.
*   API layer updated to use active provider and default model.
*   Add Provider UX: validation feedback, auto-fill defaults, auto-select new provider.
*   Settings organization: Language and Remote Access separated into individual cards.
*   Multi-agent mode toggle: button text changed to "拓扑/聊天".

### Phase 7: Tests, Packaging, and V1 Launch (P5) — In Progress
*   vitest + @testing-library/react test infrastructure.
*   41 test cases covering: store layer, workflow execution, node contracts, chat rendering, workflow chat interactions.
*   Remaining: packaging, documentation landing page, auto-updater.
