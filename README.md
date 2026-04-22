# SimperStudio

SimperStudio is a "small and beautiful" desktop application designed to bridge the gap between conversational AI and automated workflows. It acts as a local-first workflow and multi-agent chat hub, combining the seamless multi-agent chat experience of CherryStudio with the powerful, visual node-based automation of n8n.

## Design Philosophy

SimperStudio follows a **"Small & Beautiful" (小而美)** design approach, drawing inspiration from modern macOS and refined minimalist Windows 11 aesthetics.

- **Minimalist Interface:** Clean, distraction-free environment with ample whitespace, subtle glassmorphic effects, and crisp typography utilizing `Inter` or native system UI fonts.
- **Component System:** Built using `shadcn/ui` components and Radix UI primitives for accessible, high-quality interactive elements.
- **Multi-Agent Chat Stacking:** Dynamic chat interface capable of rendering concurrent or stacked responses from multiple agents simultaneously within the same conversation thread, utilizing clear avatars and streaming states.
- **Node-Based Workflow:** A snappy, card-based visual canvas for connecting triggers, actions, and AI agents with clear visual hierarchy and fluid bezier edge connections.
- **Theming:** Full support for system-level Dark and Light modes with smooth color transitions across all UI zones.

## Technical Architecture

The application is built on a modern, high-performance web and desktop stack:

- **App Framework:** [Tauri v2](https://v2.tauri.app/) - Provides a lightweight footprint and native desktop capabilities using a Rust backend.
- **Frontend Framework:** React 19 + Vite - For rapid UI development, robust component architecture, and blazing fast HMR.
- **Styling:** Tailwind CSS - Utility-first CSS framework synced with semantic design tokens.
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/) - Lightweight state management utilizing local storage persistence (`simper-studio-storage`).
- **Workflow Engine:** [React Flow](https://reactflow.dev/) - Powers the interactive, drag-and-drop visual node editor in the Workflow Zone.
- **Database:** Local SQLite (via Tauri SQL plugin) planned for robust, local-first persistent storage for chats, agents, and workflow data.

## Current Status & TODO List

### ✅ What's Done
- **Layout Shell:** Three-pane architecture (Global Sidebar, Context Sidebar, Main Area) implemented with dynamic routing.
- **Chat UI:** Multi-agent conversation interface with concurrent streaming responses, auto-scrolling, and `@` mention popovers.
- **Workflow Canvas:** Interactive node-based editor integrating custom Agent nodes with configuration dialogs.
- **Local State DB:** Zustand store configured with persistence for workspaces, chat sessions, agents, and workflow topologies.
- **Theming:** Light/Dark mode toggle with fluid CSS variable transitions mapped to shadcn/ui.

### ⏳ Pending / TODO
- **Agent Zone UI:** Build the comprehensive interface for creating, configuring, and tweaking individual AI agents.
- **Custom API Integration:** Add global API configuration and the capability to define custom REST endpoints as tools for agents or nodes.
- **Database Migration:** Fully integrate Tauri's SQLite plugin to transition from simple localStorage to robust local desktop database storage.
- **Packaging:** Build, sign, and package the application specifically for the Windows platform.