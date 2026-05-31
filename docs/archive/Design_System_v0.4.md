# SimperStudio 设计系统文档 (Minimal Design System)

基于 shadcn/ui + Tailwind CSS 的组件封装与使用规范。

---

## 1. 设计令牌 (Design Tokens)

所有语义颜色在 `globals.css` 中定义，通过 Tailwind CSS 变量引用。

### 1.1 颜色系统

```css
/* Light Theme */
--background: 0 0% 98%;
--foreground: 0 0% 9%;
--card: 0 0% 100%;
--popover: 0 0% 100%;
--primary: 258 85% 68%;
--primary-foreground: 0 0% 100%;
--secondary: 0 0% 96%;
--muted: 0 0% 96%;
--muted-foreground: 0 0% 45%;
--accent: 258 65% 95%;
--destructive: 0 84% 60%;
--ring: 258 85% 68%;
--border: 0 0% 85%;
--input: 0 0% 85%;
--hover: 0 0% 90%;

/* Dark Theme */
.dark {
  --background: 0 0% 4%;
  --foreground: 0 0% 93%;
  --card: 0 0% 7%;
  --popover: 0 0% 7%;
  --primary: 187 82% 53%;
  --secondary: 0 0% 13%;
  --muted: 0 0% 13%;
  --muted-foreground: 0 0% 63%;
  --accent: 187 50% 15%;
  --destructive: 0 62% 55%;
  --ring: 187 82% 53%;
  --border: 0 0% 16%;
  --input: 0 0% 16%;
  --hover: 0 0% 15%;
}
```

> **注意**：Light 主题主色为紫色（258°），Dark 主题主色为青色（187°），两者色相差异较大。

### 1.2 常用语义 CSS 类

| 用途 | Tailwind 类 |
|------|------------|
| 主背景 | `bg-background` |
| 卡片/面板背景 | `bg-card` |
| 主文字 | `text-foreground` |
| 辅助文字 | `text-muted-foreground` |
| 弱化文字 | `text-muted-foreground/50` 或 `/70` |
| 主色按钮 | `bg-primary text-primary-foreground` |
| 边框 | `border-border` |
| 悬停态 | `hover:bg-hover` |
| 错误 | `text-destructive` / `bg-destructive/10` |
| 成功 | `text-green-600 dark:text-green-400` |

---

## 2. 组件使用规范

### 2.1 Button

```tsx
import { Button } from "@/components/ui/button";
```

**变体 (variant)：**

| variant | 用途 | 样式 |
|---------|------|------|
| `default` | 主要操作 | 紫色/青色实底，`shadow-soft` |
| `destructive` | 危险/删除操作 | 红色实底 |
| `outline` | 次要操作 | 透明 + 边框 |
| `secondary` | 次重要操作 | 浅灰底 + 边框 |
| `ghost` | 弱操作/图标按钮 | 透明，hover 显示背景 |
| `link` | 文字链接 | 主色文字 + 下划线 |

**尺寸 (size)：**

| size | 高度 | 圆角 |
|------|------|------|
| `default` | h-9 (36px) | rounded-xl |
| `sm` | h-8 (32px) | rounded-xl |
| `lg` | h-10 (40px) | rounded-xl |
| `icon` | h-9 w-9 | rounded-xl |

**交互状态：**
- 禁用：`opacity-50 pointer-events-none`
- Focus：`focus-visible:ring-1 focus-visible:ring-ring`
- 点击动画：`active:scale-[0.97]`
- 过渡：`transition-all duration-400 ease-out`

**示例：**
```tsx
<Button variant="default" size="sm" onClick={handleClick}>
  <PlayCircle className="h-4 w-4 mr-1" />
  执行
</Button>

<Button variant="destructive" size="icon" aria-label="删除">
  <Trash2 className="h-4 w-4" />
</Button>

<Button variant="ghost" className="h-8 w-8 p-0">
  <Settings className="h-4 w-4" />
</Button>
```

**⚠️ 旧代码中用 inline-style 的 `<button>`**：`MergedSidebar.tsx`、部分弹出菜单使用纯 `<button>` 加内联样式。新组件优先使用 `Button` 组件。

---

### 2.2 Textarea

```tsx
import { Textarea } from "@/components/ui/textarea";
```

**使用规范：**
- 默认：`className="min-h-[64px] text-sm"`
- 集成输入框（发送/附件在内部）：`className="min-h-[80px] text-sm border-0 focus-visible:ring-0 resize-none pb-10"`
- 禁用态：`disabled` prop

**无边框变体（用于集成式输入框）：**
```tsx
<Textarea
  value={input}
  onChange={...}
  placeholder="输入消息..."
  className="min-h-[80px] text-sm border-0 focus-visible:ring-0 resize-none pb-10"
/>
```

---

### 2.3 Dialog

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
```

**标准结构：**
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle>标题</DialogTitle>
      <DialogDescription>描述文字（可选）</DialogDescription>
    </DialogHeader>
    {/* 内容 */}
    <DialogFooter>
      <Button variant="outline" onClick={...}>取消</Button>
      <Button onClick={...}>确认</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**特殊变体（全屏选择器）：**
```tsx
<DialogContent className="max-w-[70vw] w-[70vw] h-[80vh] p-0 gap-0 rounded-xl overflow-hidden flex flex-col">
```

---

### 2.4 DropdownMenu

```tsx
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
```

**标准用法：**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-48">
    <DropdownMenuItem onClick={...}><Edit className="h-4 w-4 mr-2" />编辑</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={...} className="text-destructive">删除</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### 2.5 Avatar

```tsx
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
```

**规范：** 全应用统一 `rounded-full` + `Bot` fallback。

```tsx
<Avatar className="h-7 w-7 rounded-full border shadow-sm">
  <AvatarImage src={agent.avatar} />
  <AvatarFallback className="rounded-full bg-primary/10 text-primary">
    <Bot className="h-3.5 w-3.5" />
  </AvatarFallback>
</Avatar>
```

**尺寸对照表：**

| 用途 | 容器 | Icon |
|------|------|------|
| 消息气泡 | `h-7 w-7` | `h-3.5 w-3.5` |
| 面包屑/下拉选择 | `h-5 w-5` | `h-3 w-3` |
| Agent 卡片 | `h-10 w-10` | `h-5 w-5` |

---

### 2.6 Tooltip

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
```

**全局延迟：** `delayDuration={400}`（在 `GlobalSidebar.tsx` 的 `TooltipProvider` 中设置）。

**标准用法：**
```tsx
<TooltipProvider delayDuration={400}>
  <Tooltip>
    <TooltipTrigger asChild>
      <button>Hover me</button>
    </TooltipTrigger>
    <TooltipContent side="top">
      <p>提示内容</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

### 2.7 Select & Popover

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
```

**Select 深色模式注意：** `SelectItem` hover 样式使用 `focus:bg-primary/15 focus:text-primary` 而非默认 `focus:bg-accent`，确保深色模式下对比度达标。

---

### 2.8 其他组件

| 组件 | 导入路径 | 备注 |
|------|---------|------|
| Badge | `@/components/ui/badge` | 状态标签 |
| Card | `@/components/ui/card` | 卡片容器 |
| Input | `@/components/ui/input` | 输入框 |
| ScrollArea | `@/components/ui/scroll-area` | 滚动区域 |
| Separator | `@/components/ui/separator` | 分割线 |
| Switch | `@/components/ui/switch` | 开关 |
| Tabs | `@/components/ui/tabs` | 标签页 |
| Toaster | `@/components/ui/toaster` | Toast 通知 |
| Command | `@/components/ui/command` | 命令面板 |

---

## 3. 常用布局模式

### 3.1 弹出菜单（Popover/DropdownMenu）

组件内弹出菜单使用 `DropdownMenu`；自定义内容的弹出面板使用 `Popover`。

**⚠️ Popover 陷阱**：`PopoverContent` 默认使用 `position: absolute`，若父容器有 `overflow: hidden` 会被裁剪。需设置 `PopoverContent` 的 `side` 和 `align` 属性。

### 3.2 内联弹出菜单（MergedSidebar 模式）

`MergedSidebar.tsx` 使用纯 inline-style 渲染自定义弹出菜单（临时的 `div` 覆盖）。这是历史遗留写法，新功能应优先使用 `DropdownMenu` 组件。

### 3.3 模态确认框

```tsx
{deleteItem && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
    onClick={() => setDeleteItem(null)}>
    <div className="bg-popover rounded-xl p-6 shadow-lg border" onClick={e => e.stopPropagation()}>
      <h3 className="text-sm font-semibold mb-2">确认删除</h3>
      <p className="text-sm text-muted-foreground mb-4">确定要删除吗？</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={...}>取消</Button>
        <Button variant="destructive" size="sm" onClick={...}>删除</Button>
      </div>
    </div>
  </div>
)}
```

---

## 4. 无障碍规范

所有新增交互元素需满足：

- **aria-label**：图标按钮必须提供（`Button` + 纯图标 + 无文字）
- **Focus 可见性**：`focus-visible:ring-2 focus-visible:ring-ring`
- **最小点击区**：交互元素 ≥ 44×44px（`min-h-[44px] min-w-[44px]`）
- **键盘可达**：主要交互链路支持 Tab 导航
- **对比度**：正文 ≥ 4.5:1，大号文本 ≥ 3:1

---

## 5. 主题切换

```tsx
import { useTheme } from "@/components/theme/ThemeProvider";

// useTheme() 返回 { theme, setTheme }
// theme: 'light' | 'dark' | 'system'
// setTheme: (theme) => void
```

需要在组件中感知当前实际颜色模式时（如 ReactFlow 的 `colorMode`）：
```tsx
const { theme } = useTheme();
const colorMode = theme === 'dark' ? 'dark'
  : theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : 'light';
```

---

## 6. 常用 cn() 模式

```tsx
import { cn } from "@/lib/utils";

// 条件式 className
<div className={cn(
  "base-class",
  isActive && "active-class",
  variant === 'primary' ? "bg-primary" : "bg-muted"
)} />
```

---

## 7. 命名单与文件结构

| 类型 | 命名规范 | 示例 |
|------|---------|------|
| 组件 | PascalCase | `WorkflowCanvas.tsx` |
| 工具函数 | camelCase | `api.ts` |
| 类型定义 | `models.ts` 集中 | `models.ts` |
| Store slice | camelCase + Slice | `chatSlice.ts` |

---

## 8. 状态管理访问

```tsx
import { useAppStore } from '@/stores';

// 读取状态
const sessions = useAppStore(state => state.sessions);
const agents = useAppStore(state => state.agents);

// 调用 action
const createSession = useAppStore(state => state.createSession);
```

Store 按领域拆分为 5 个 Slice，通过 `stores/index.ts` 合并导出。

---

*文档版本：v1.0 | 最后更新：2026-05-29*
