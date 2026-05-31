# SimperStudio 设计规范与组件系统

本文档**唯一**承载 UI/UX 规范与设计系统。已合并旧版 `Design_Specs.md`（产品级 UX 决策）与 `Design_System.md`（shadcn 组件规范）。

---

## 1. 设计哲学

**"小而美"（Small & Beautiful）**：现代 macOS / Windows 11 极简风格，高留白、轻拟物、精致字距、流畅过渡。应用必须感觉原生、轻量、不杂乱。

---

## 2. 设计令牌（globals.css 单一来源）

### 2.1 颜色（HSL，与 shadcn 同构）

```css
/* Light */
--background: 0 0% 98%;
--foreground: 0 0% 9%;
--card: 0 0% 100%;
--popover: 0 0% 100%;
--primary: 258 85% 68%;        /* 紫色品牌主色 */
--primary-foreground: 0 0% 100%;
--secondary / --muted: 0 0% 96%;
--muted-foreground: 0 0% 45%;
--accent: 258 65% 95%;
--destructive: 0 84% 60%;
--ring: 258 85% 68%;
--border / --input: 0 0% 85%;
--hover: 0 0% 90%;

/* Sidebar 专用 */
--sidebar-bg / --sidebar-text / --sidebar-hover / --sidebar-active / --sidebar-indicator

/* Dark */
.dark {
  --background: 0 0% 4%;
  --foreground: 0 0% 93%;
  --card / --popover: 0 0% 7%;
  --primary: 187 82% 53%;        /* 青色品牌主色 */
  --secondary / --muted: 0 0% 13%;
  --muted-foreground: 0 0% 63%;
  --accent: 187 50% 15%;
  --destructive: 0 62% 55%;
  --ring: 187 82% 53%;
  --border / --input: 0 0% 16%;
  --hover: 0 0% 15%;
}
```

> **已知遗留**：Light 主色为紫（258°），Dark 主色为青（187°），色相差距大。统一为同色相不同明度是 P1 待办（[TODO_active.md](../TODO_active.md)）。

### 2.2 节点配色（工作流画布）

| 节点类型 | 主色 |
|---|---|
| Trigger / Webhook | Emerald / Lime |
| Code / HTTP | Blue / Cyan |
| Agent | Primary（主题色） |
| Dynamic Agent / Loop / Wait | Violet |
| CLI Agent / Switch | Amber |
| Condition | Orange |
| Set/Transform | Teal |
| Merge | Pink |
| Sub-workflow | Indigo |
| Output | Slate |

### 2.3 字号

| 用途 | 大小 | Tailwind |
|---|---|---|
| Display / H1 | 24px SemiBold | `text-2xl font-semibold tracking-tight` |
| H2 / Section | 18px Medium | `text-lg font-medium` |
| Body | 14px Regular | `text-sm` |
| Caption / Meta | 12px Medium | `text-xs font-medium` |

> 历史代码中存在 `text-[9-11px]` 等非标字号，正在归并到 6 级阶梯（12/14/16/18/24/32）。

### 2.4 间距与圆角

- **4pt 网格**：`p-1 / p-2 / p-3 / p-4 / p-6 / p-8`
- **圆角**：`rounded-lg`（按钮/输入 8px）、`rounded-xl`（卡片/面板 12px）
- **阴影**：`shadow-sm`（卡片）、`shadow-lg`（弹窗）

### 2.5 字体

主字体 Inter；回退到系统 UI 字体（San Francisco / Segoe UI）。

---

## 3. 布局架构

### 3.1 主壳（AppShell）

```
┌────────────────┬─────────────────────────────────┐
│                │                                  │
│  MergedSidebar │  Main Content (按 viewMode 路由) │
│  (260px 固定)   │                                  │
│                │                                  │
└────────────────┴─────────────────────────────────┘
```

- **MergedSidebar**：260px 深色侧栏，已合并旧 GlobalSidebar(64px) + ContextSidebar(可调宽)
  - **Mode Switcher Pill**：Agent ↔ Workflow 两种模式
  - **Nav Items**：模式相关 3 个入口（活跃态左侧蓝色指示条）
  - **Recents**：最近 5 项按 `updatedAt` 倒序
  - **Gateway**：底部 Logo + 主题切换 + 设置入口
- **侧栏隐藏**：`profile` 视图（`AppShell.VIEWS_WITHOUT_SIDEBAR`）

### 3.2 工作流编辑器右侧浮动面板

`WorkflowNodePanel`（300px，可关闭）—— 节点详情、Agent 列表，仅在 `workflow-editor` / `workflowChat` 等视图渲染。

### 3.3 主内容区约束

- 最大宽度 `max-w-3xl`（聊天区域），保证可读性
- 工作流画布 `flex-1` 占满

---

## 4. 核心组件规范

### 4.1 Button (`components/ui/button.tsx`)

| 变体 | 用途 |
|---|---|
| `default` | 主操作（保存、发送） |
| `secondary` | 次要操作 |
| `ghost` | 仅 hover 显示背景 |
| `outline` | 边框型 |
| `destructive` | 删除/危险 |
| `icon` | 图标按钮（必须 `aria-label`） |

**状态矩阵**：每个按钮必须可区分 `default / hover / active / focus-visible / disabled`。

- Focus：`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- Active：`active:scale-[0.98]`
- Disabled：`opacity-50 cursor-not-allowed`
- 最小点击区 ≥44×44px

### 4.2 Input / Textarea

- 边框 `border-input`，focus 加 ring
- 错误态 `border-destructive` + helper text 紧贴字段
- 高度 ≥40px，触屏 44px

### 4.3 Dialog / Popover / DropdownMenu

均来自 Radix UI 封装（shadcn 同构）。
- Dialog：`shadow-lg`，遮罩 `bg-black/40`，内容 `rounded-xl`
- Popover：箭头自动定位，z-index 50
- DropdownMenu：键盘导航默认支持

### 4.4 Avatar

- `rounded-full`，缺省 fallback 用 `Bot` 图标 + `bg-primary/10 text-primary`
- 头像源优先 `agent.avatar`，缺省查 `DEFAULT_AVATAR_MAP`（baseSlice）

### 4.5 Tooltip

延迟 `delayDuration={400}` ms（标准值 300-700ms）。

### 4.6 Select

深色模式 `focus:bg-primary/15 focus:text-primary`（避免对比度不足）。

### 4.7 Toast (sonner)

- 成功 / 失败 / info 三态
- 工作流执行完成可触发 + `screen-shake` CSS 动画（用户可在设置关闭 `executionFeedback`）

---

## 5. 聊天界面规范

### 5.1 消息气泡

- **用户气泡**：右对齐，`bg-primary` 或 `bg-muted` 实色
- **Agent 气泡**：左对齐，无明显边框，`bg-muted/30` 背景
- **多 Agent 并发**：垂直堆叠在同一消息块内，各自带 Avatar + Name 头部
- **Agent 头部格式**：`{Name}  {Provider}/{Model}` —— Provider/Model 暗化处理
- **底部元信息**：时间（右对齐）、Token（`↑prompt ↓completion`）、耗时
- **元信息颜色**：`text-muted-foreground/70`（≥4:1 对比度）

### 5.2 输入区

- 集成式 textarea（无边框 `border-0`），底部栏内嵌：左下附件 + 模型切换器，右下发送按钮
- Shift+Enter 换行，Enter 发送
- 流式中发送按钮变红色停止按钮
- 附件以 chips 显示（`max-w-[160px] truncate`）
- 模型切换器点击弹出 provider/model 选择器（实时切换 `activeProvider`）

### 5.3 面包屑

`Topic Name > Model Name | Provider`，下方附对话时间（如 `04/19 21:06`）。

---

## 6. 工作流节点规范

- **结构**：`rounded-xl shadow-sm bg-card`
- **Header**：彩色圆点/图标 + 标题 + 配置按钮（`Settings2`）
- **Body**：配置摘要 + 状态指示器
- **Handles**：`w-3 h-3`，clear targets
- **Hover**：`hover:shadow-md`
- **Selected**：`ring-2 ring-primary`
- **边线**：贝塞尔曲线，数据流时虚线动画

每节点配色见 §2.2，专属字段见 [reference/nodes.md](./reference/nodes.md)。

---

## 7. 主题切换

`ThemeProvider`（`components/theme/ThemeProvider.tsx`）：
- 三态循环：light → dark → system
- 持久化到 `settings.theme`
- 监听 `prefers-color-scheme` 媒体查询

---

## 8. 无障碍（WCAG 2.1 AA 基线）

| 项 | 要求 | 当前状态 |
|---|---|---|
| 对比度（正文 ≥4.5:1） | ✅ `text-muted-foreground/70` 已达标 |
| 对比度（大文字 ≥3:1） | ✅ |
| Focus 可见 | ✅ `:focus-visible` 全局 ring |
| 键盘导航 | ✅ Tab + 方向键（Settings tabs 已支持）|
| `aria-label` 图标按钮 | ✅ 已补齐（ExecutionTimeline / WorkflowNodePanel 等）|
| 最小点击区 44×44px | ✅ NodeBaseConfigSection 节点配置按钮 |
| `prefers-reduced-motion` | ✅ globals.css 全局回退 |
| 屏幕阅读器测试 | ⏳ 未做完整工具验证 |

---

## 9. 微交互

| 场景 | 反馈 |
|---|---|
| 工作流执行成功 | Toast + screen-shake（可关）|
| 工作流执行失败 | Toast 错误 + screen-shake |
| 复制按钮 | `Copy` → `Check`（绿色）2s 渐回 |
| 流式打字 | 闪烁光标（reduce-motion 关闭）|
| 节点状态 | running/retrying 脉冲（reduce-motion 关闭）|

---

## 10. 待办（设计相关）

详见 [TODO_active.md](./TODO_active.md) 的 P11 / P13 章节：
- 字号阶梯归并（消除 `text-[9-11px]`）
- 4pt 间距网格统一
- Light/Dark 主色色相对齐
- Logo 品牌设计
- 多模型对比卡片操作栏
- 中小屏（<768px）抽屉式侧栏
