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

### 2.2 Custom APIs & Integrations
*   Global API configuration settings.
*   Ability to define custom REST endpoints as tools for agents or nodes in workflows.
*   Secure local credential storage.

### 2.3 Workflow Zone
*   Visual, node-based editor (drag-and-drop).
*   Trigger nodes (manual, scheduled, webhook).
*   Action nodes (API calls, data transformation, logic gates).
*   LLM integration nodes (prompting an agent within a workflow).
*   Execution history and debugging tools.

### 2.4 Workspace Zone
*   Project-based organization.
*   Users can group specific chats, agents, and workflows into distinct workspaces (e.g., "Personal", "Work", "Side Project").
*   Workspace-specific variables and context.

### 2.5 Agent Zone
*   Agent creation and configuration interface.
*   Define system prompts, assign specific tools (from Custom APIs), and set model parameters (temperature, max tokens).
*   Agent library/marketplace for sharing and importing agent configurations.

---

## 3. Technical Architecture

*   **App Framework:** Tauri (Rust backend, web frontend) for a lightweight footprint and native desktop capabilities.
*   **Frontend Framework:** React 18+ with Vite for rapid development and HMR.
*   **State Management:** Zustand (preferred) or Redux Toolkit.
*   **UI Components:** Radix UI / shadcn/ui or similar headless components styled with Tailwind CSS.
*   **Workflow Engine (UI):** React Flow for the visual node editor.
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

---

## 5. UI/UX Guidelines for the UI Designer

*   **Aesthetic:** "Small & Beautiful." Think modern macOS or refined minimalist Windows 11. High whitespace, subtle shadows, crisp typography (Inter or system UI fonts).
*   **Layout:**
    *   Left Sidebar: Navigation (Chats, Workspaces, Agents, Workflows, Settings).
    *   Main Content Area: Dynamic based on selection.
    *   Right Sidebar (Optional/Collapsible): Context, Agent Settings, or Node Properties.
*   **Theming:** Full Support for System Dark/Light modes with smooth transitions.
*   **Workflow Editor:** Needs to feel snappy. Nodes should be clearly legible, with distinct colors for different node types (Trigger, Action, LLM). Connections must be easily manageable.
*   **Interactions:** Hover states, subtle click animations, and keyboard shortcuts for power users.

---

## 6. Development Phases

### Phase 1: MVP (Minimum Viable Product)
*   Tauri + React + Vite setup.
*   SQLite integration.
*   Basic UI layout (Sidebar + Main Area).
*   Agent configuration and single-agent chat.
*   Basic Custom API setup (making REST calls from chat).

### Phase 2: Workflow Integration
*   Implement React Flow.
*   Build basic Workflow Zone (create nodes, connect them).
*   Implement a simple local execution engine for workflows.
*   Connect workflows to Agents (Agents can trigger workflows, workflows can query Agents).

### Phase 3: Workspaces & Polish (Beta)
*   Implement Workspace Zone for organization.
*   Multi-agent collaborative chat features.
*   UI/UX refinement and animation polish.
*   User testing and bug fixing.

### Phase 4: V1 Launch
*   Packaging for Windows, macOS, Linux.
*   Documentation and landing page.
*   Auto-updater implementation.