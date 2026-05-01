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
    *   Webhook Trigger: Lime
    *   Code: Blue
    *   Agent: Primary (theme color)
    *   Condition: Orange
    *   Switch: Amber
    *   Loop: Violet
    *   Wait/Delay: Violet
    *   Merge: Pink
    *   HTTP Request: Cyan
    *   Set/Transform: Teal
    *   Sub-workflow: Indigo
    *   Output: Slate/Gray

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
*   **State Matrix (Required):** 每个交互控件都必须定义并可区分 `default / hover / active / focus-visible / disabled` 五种状态。
*   **Interaction:** `active:scale-[0.98]` for tactile click feedback. Subtle `transition-colors duration-200`. Use custom thin scrollbars (hide native Windows scrollbars).
*   **Focus & Disabled:** Focus 使用清晰 ring（`focus-visible:ring-2`）；Disabled 需降低视觉权重并禁用交互（建议 opacity 0.45~0.6，cursor not-allowed）。

### 3.2 Inputs & Forms
*   **Style:** Minimalist borders (`border-input`), focus ring (`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`).
*   **Feedback:** Clear error states (red border + helper text).
*   **Validation UX:** 错误信息必须贴近字段展示；复杂字段需常驻 helper text，不仅依赖 placeholder。
*   **Sizing:** 输入类控件高度建议不小于 40px，移动端或触屏优先 44px。

### 3.3 Chat Interface
*   **User Bubble:** Right-aligned, solid subtle background (`bg-primary` or muted color).
*   **Agent Bubble:** Left-aligned, transparent or very light background with distinct Avatar and Name header.
*   **Simultaneous Responses:** When multiple agents reply, stack them vertically within the message block, clearly separated by headers.
*   **Input Area:** Sticky bottom, auto-expanding textarea. Floating `@` mention popover for agent selection (keyboard navigable).
*   **Generative UI (Skills):** Render custom UI responses within clean `Card` components with subtle drop shadows.

### 3.4 Workflow Nodes (React Flow)
*   **Design:** Card-like structure (`rounded-xl`, `shadow-sm`, `bg-card`).
*   **Header:** Colored dot/icon indicating type + Title.
*   **Body:** Minimal summary of configuration (e.g., “GET /api/data”) + Status indicator (Running, Success, Error).
*   **Handles (Ports):** Clear targets (`w-3 h-3`).
*   **Interaction:** Elevate on hover (`hover:shadow-md`), distinct border on select (`ring-2 ring-primary`). Smooth bezier curves for edges, animated dashes for data flow.
*   **Execution State Semantics (Required):**
    * Running: 主色高亮 + 轻微脉冲动画（可被 reduced-motion 关闭）。
    * Success: 绿色状态标识，保持静态。
    * Error: 红色状态标识 + 明确错误 icon。
    * Skipped: 低饱和/低对比状态，表达”未执行”。
    * Retrying: 琥珀色状态标识 + 次级脉冲节奏。
    * Cancelled: 灰色状态标识，表示用户手动取消。

### 3.5 ExecutionTimeline Component
*   **Position:** 浮动在画布底部，`absolute bottom-4`，最大宽度 `max-w-3xl`。
*   **Header:** 执行状态指示器（running/completed/error）+ Export 按钮 + 关闭按钮。
*   **Node List:** 按执行时间排序，每行显示：状态圆点 + 节点名称 + 状态文本 + 耗时 + 重试次数。
*   **Expandable Details:** 点击节点展开：错误信息、尝试次数、输入/输出快照（JSON 格式化）。
*   **Rerun Button:** 错误节点显示重跑按钮（RotateCcw 图标）。
*   **Animations:** running/retrying 状态使用 `motion-safe:animate-pulse`，尊重 `prefers-reduced-motion`。

### 3.6 Node Configuration Dialog
*   **统一基础区块：** 所有节点配置对话框应包含以下通用区块：
    * 名称（label）
    * 描述（description）
    * 超时设置（timeoutMs）
    * 重试策略（retryPolicy: maxAttempts/backoff/delayMs）
    * 失败策略（onError: stop/continue/route-to-error）
*   **节点特定配置：** 在通用区块下方显示节点类型特定的配置字段。

## 4. Interactions & UX Quality
*   **Routing:** Subtle crossfade when switching main sidebar tabs.
*   **Theme:** Full support for system Dark/Light modes with smooth color transitions.
*   **Accessibility (Required):**
    * 正文文本对比度不低于 4.5:1。
    * 大号文本（≥18px 或 14px bold）对比度不低于 3:1。
    * 所有可交互元素最小点击区域不低于 44×44px。
    * 键盘可达：主要交互链路支持 Tab 导航与可见 focus。
    * 图标按钮必须提供可访问名称（aria-label）。
*   **Motion:** 支持 `prefers-reduced-motion`，在该模式下关闭脉冲/大幅位移动画，仅保留必要淡入淡出。
*   **Performance:** UI must not block main thread; use lazy loading for complex views (like the React Flow canvas).

## 4.1 Responsive & Density Rules
*   **Breakpoints:**
    * `>=1280px`：三栏完整布局（Global Sidebar + Context Sidebar + Main）。
    * `1024px - 1279px`：保留三栏，但 Context Sidebar 默认可折叠。
    * `768px - 1023px`：优先双栏，Context Sidebar 默认收起为按钮入口。
    * `<768px`：主内容优先，侧栏改为抽屉式。
*   **Workflow Chat:** 在中小屏下优先保证节点图与对话窗口可用，窗口重叠数量应受限，避免遮挡核心操作。
*   **Density:** 保持 4pt/8pt 间距节奏；紧凑模式仅用于信息密度高区域（如执行日志列表），默认页面使用舒适密度。

## 5. Handoff to Frontend Engineer
- [ ] Initialize Vite/React project with `tailwindcss`, `lucide-react`, and `shadcn/ui`.
- [ ] Setup base theme variables (globals.css) for Light/Dark mode.
- [ ] Implement Application Shell (Global Sidebar + Context Sidebar + Main layout).
- [ ] Build reusable UI primitives (Button, Input, Dialog, ScrollArea, Avatar, Tooltip).
- [ ] Construct complex views (Chat View with mentions, Workflow Canvas).