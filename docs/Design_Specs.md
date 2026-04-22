# SimperStudio: UI/UX Design Specifications & Component Guidelines

## 1. Design System Foundation
### Aesthetic: "Small & Beautiful" (小而美)
Inspired by modern macOS and refined minimalist Windows 11. Focuses on high whitespace, subtle glassmorphic effects, crisp typography, and fluid interactions. The application must feel native, lightweight, and uncluttered.

### 1.1 Typography
*   **Primary Font:** `Inter` (or system UI fonts: San Francisco on macOS, Segoe UI on Windows).
*   **Scale:**
    *   Display/H1: 24px, SemiBold, tracking-tight
    *   H2/Section: 18px, Medium
    *   Body: 14px, Regular (text-sm in Tailwind)
    *   Caption/Meta: 12px, Medium (text-xs)

### 1.2 Color Palette (Semantic)
Tailwind CSS variables synced with `shadcn/ui` theme structure.
*   **Background:** 
    *   Light: `#FAFAFA` (Main), `#FFFFFF` (Panels/Cards)
    *   Dark: `#0A0A0A` (Main), `#121212` (Panels/Cards)
*   **Foreground (Text):** 
    *   Light: `#171717` (Primary), `#737373` (Muted)
    *   Dark: `#EDEDED` (Primary), `#A3A3A3` (Muted)
*   **Primary/Accent:** Subtle branding color (e.g., Slate or Indigo).
*   **Node Colors (Workflow):**
    *   Trigger: Emerald/Green
    *   Action: Blue/Indigo
    *   LLM/AI: Purple/Violet

### 1.3 Effects & Spacing
*   **Shadows:** `shadow-sm` for cards, `shadow-lg` for modals/dropdowns. Very soft blur radius (e.g., `rgba(0,0,0,0.05)`).
*   **Radius:** `rounded-lg` (8px) for buttons/inputs, `rounded-xl` (12px) for cards/panels.
*   **Spacing Rhythm:** 4pt grid system (p-1, p-2, p-4). Ample whitespace (gap-4, p-6 for main sections).

## 2. Layout Architecture
App shell divided into three primary zones using Flexbox/CSS Grid.

### 2.1 Global Navigation Sidebar (Left)
*   **Width:** Narrow, approx 64px (Icons only with tooltips).
*   **Content:** App Logo, Main Nav (Chats, Workspaces, Agents, Workflows), Bottom Nav (Settings, User/Status).
*   **Visual:** Slightly muted background (`bg-muted/50`) or distinct border to separate from the workspace.

### 2.2 Contextual Sidebar (Left-Middle)
*   **Width:** ~240px - 280px (Collapsible).
*   **Content:** Dynamic based on Global Nav.
    *   *Workspaces/Chats:* List of active threads/history.
    *   *Agents:* List of configured agents.
    *   *Workflows:* Saved workflows.
*   **Visual:** Border separated (`border-r`), clean list layout with hover states.

### 2.3 Main Content Area (Right)
*   **Width:** Flexible (`flex-1`).
*   **Content:** The active view (Chat Interface, Workflow Canvas, Agent Settings).
*   **Visual:** Clean background. Max-width constraints on text/chat for readability (max-w-3xl).

### 2.4 Right Sidebar (Properties - Optional/Floating)
*   **Width:** ~300px (Collapsible or overlay).
*   **Content:** Node properties in workflow editor, or specific Agent settings when invoked.

## 3. Core Component Specs (shadcn/ui mapping)

### 3.1 Buttons & Controls
*   **Variants:** Default (Solid), Secondary (Subtle bg), Ghost (Hover only), Outline (Bordered), Icon-only.
*   **Interaction:** `active:scale-[0.98]` for tactile click feedback. Subtle `transition-colors duration-200`. Use custom thin scrollbars (hide native Windows scrollbars).

### 3.2 Inputs & Forms
*   **Style:** Minimalist borders (`border-input`), focus ring (`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`).
*   **Feedback:** Clear error states (red border + helper text).

### 3.3 Chat Interface
*   **User Bubble:** Right-aligned, solid subtle background (`bg-primary` or muted color).
*   **Agent Bubble:** Left-aligned, transparent or very light background with distinct Avatar and Name header.
*   **Simultaneous Responses:** When multiple agents reply, stack them vertically within the message block, clearly separated by headers.
*   **Input Area:** Sticky bottom, auto-expanding textarea. Floating `@` mention popover for agent selection (keyboard navigable).
*   **Generative UI (Skills):** Render custom UI responses within clean `Card` components with subtle drop shadows.

### 3.4 Workflow Nodes (React Flow)
*   **Design:** Card-like structure (`rounded-xl`, `shadow-sm`, `bg-card`).
*   **Header:** Colored dot/icon indicating type + Title.
*   **Body:** Minimal summary of configuration (e.g., "GET /api/data") + Status indicator (Running, Success, Error).
*   **Handles (Ports):** Clear targets (`w-3 h-3`).
*   **Interaction:** Elevate on hover (`hover:shadow-md`), distinct border on select (`ring-2 ring-primary`). Smooth bezier curves for edges, animated dashes for data flow.

## 4. Interactions & UX Quality
*   **Routing:** Subtle crossfade when switching main sidebar tabs.
*   **Theme:** Full support for system Dark/Light modes with smooth color transitions.
*   **Accessibility:** Proper aria-labels, focus management, and minimum touch/click target sizes (44px equivalent).
*   **Performance:** UI must not block main thread; use lazy loading for complex views (like the React Flow canvas).

## 5. Handoff to Frontend Engineer
- [ ] Initialize Vite/React project with `tailwindcss`, `lucide-react`, and `shadcn/ui`.
- [ ] Setup base theme variables (globals.css) for Light/Dark mode.
- [ ] Implement Application Shell (Global Sidebar + Context Sidebar + Main layout).
- [ ] Build reusable UI primitives (Button, Input, Dialog, ScrollArea, Avatar, Tooltip).
- [ ] Construct complex views (Chat View with mentions, Workflow Canvas).