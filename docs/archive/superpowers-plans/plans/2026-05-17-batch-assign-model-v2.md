# 批量为智能体配置模型 v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 AgentsView 中支持多选智能体卡片，通过底部批量操作栏一次性为选中的智能体分配 Provider + Model。v2 采用"批量编辑模式"切换设计：默认状态不显示 checkbox，点击标题栏"批量编辑"按钮后进入批量模式，此时卡片显示 checkbox，底部弹出操作栏。

**Architecture:** 在 AgentsView 标题栏右侧增加"批量编辑"切换按钮。进入批量模式后，每张卡片左上角显示 checkbox。选中任意卡片后，底部固定弹出批量操作栏，内含 Provider / Model 选择器和"应用"按钮。Store 层新增 `batchUpdateAgents` 方法执行批量更新，v2 支持通过 `bulkMode` 状态控制 UI 显隐。

**Tech Stack:** React + Zustand + Tailwind CSS + shadcn/ui Select / Button / Switch

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/stores/baseSlice.ts` | Modify | 新增 `batchUpdateAgents` action，遍历选中 ID 列表逐个更新并持久化 |
| `src/components/agents/AgentsView.tsx` | Modify | 新增批量模式状态、checkbox UI（仅在批量模式下显示）、底部批量操作栏、批量应用逻辑 |

---

## Task 1: Store — 批量更新 Action

**Files:**
- Modify: `src/stores/baseSlice.ts`

**Context:** `BaseSlice` 接口已有 `updateAgent(id, updates)` 方法。我们需要一个同族方法，接受 ID 数组和统一 updates，逐个映射更新。

- [ ] **Step 1: 在 BaseSlice 接口中添加 `batchUpdateAgents` 签名**

在 `src/stores/baseSlice.ts` 的 `BaseSlice` 接口中，`updateAgent` 下方新增：

```typescript
  batchUpdateAgents: (ids: string[], updates: Partial<Agent>) => void;
```

- [ ] **Step 2: 在 `createBaseSlice` 返回值中实现 `batchUpdateAgents`**

在 `updateAgent` 方法之后、`addAgentCategory` 之前插入：

```typescript
    batchUpdateAgents: (ids, updates) => set((state: any) => {
      const nextAgents = state.agents.map((agent: Agent) =>
        ids.includes(agent.id) ? { ...agent, ...updates } : agent
      );
      void writeConfig('agents.json', nextAgents);
      return { agents: nextAgents };
    }),
```

- [ ] **Step 3: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 零错误

- [ ] **Step 4: Commit**

```bash
git add src/stores/baseSlice.ts
git commit -m "feat(store): add batchUpdateAgents action"
```

---

## Task 2: UI — AgentsView 批量模式与批量操作栏

**Files:**
- Modify: `src/components/agents/AgentsView.tsx`

**Context:** AgentsView 当前渲染逻辑：
1. 顶部是标题栏 + Create Agent 按钮
2. 下方是 `space-y-8` 内容区：要么显示选中分类的卡片网格，要么显示全部分类
3. 每张卡片 `onClick={() => handleEdit(agent)}` 打开编辑 Dialog

v2 采用"批量编辑模式"切换设计：
- 默认状态：和当前一样，无 checkbox，点击卡片打开编辑 Dialog
- 点击标题栏"批量编辑"按钮后进入批量模式：
  - 卡片左上角显示 checkbox
  - 点击卡片本身（非 checkbox）切换选中状态
  - 底部显示固定批量操作栏
- 再次点击"批量编辑"按钮或操作栏"完成"按钮退出批量模式

- [ ] **Step 1: 引入 `batchUpdateAgents` 和新增本地状态**

在 `src/components/agents/AgentsView.tsx` 顶部 `useState` 附近添加：

```typescript
  const batchUpdateAgents = useAppStore(state => state.batchUpdateAgents);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProviderId, setBulkProviderId] = useState('');
  const [bulkModelId, setBulkModelId] = useState('');
```

- [ ] **Step 2: 新增 toggle、clear、exitBulkMode 辅助函数**

在 `handleOpenNew` 之后、`return` 之前添加：

```typescript
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const exitBulkMode = () => {
    setBulkMode(false);
    clearSelection();
    setBulkProviderId('');
    setBulkModelId('');
  };

  const handleBulkApply = () => {
    if (selectedIds.size === 0 || !bulkProviderId) return;
    batchUpdateAgents(Array.from(selectedIds), {
      providerId: bulkProviderId,
      modelId: bulkModelId || undefined,
    });
    exitBulkMode();
  };
```

- [ ] **Step 3: 在标题栏添加"批量编辑"切换按钮**

找到标题栏区域（`flex justify-between items-center mb-8` 的 div），将右侧的 `div`（包含 Create Agent Dialog）改为：

```tsx
          <div className="flex items-center gap-2">
            <Button
              variant={bulkMode ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                if (bulkMode) {
                  exitBulkMode();
                } else {
                  setBulkMode(true);
                }
              }}
            >
              {bulkMode ? t('退出批量') : t('批量编辑')}
            </Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              ... {/* 原有 DialogTrigger 和 DialogContent 保持不变 */}
            </Dialog>
          </div>
```

- [ ] **Step 4: 改造 Agent 卡片 — 条件显示 checkbox**

找到 `selectedAgentCategory` 分支中的卡片 JSX（第一个 `.map(agent => (` 处），将卡片最外层 `div` 改为：

```tsx
                    <div
                      key={agent.id}
                      className={cn(
                        "bg-card rounded-xl border p-4 flex flex-col shadow-sm cursor-pointer hover:border-primary transition-colors",
                        bulkMode && selectedIds.has(agent.id) && "border-primary ring-1 ring-primary/20"
                      )}
                      onClick={() => {
                        if (bulkMode) {
                          toggleSelection(agent.id);
                        } else {
                          handleEdit(agent);
                        }
                      }}
                    >
                      {bulkMode && (
                        <label
                          className="absolute top-2 left-2 z-10 flex items-center justify-center w-5 h-5 rounded border border-foreground/20 bg-background/80 hover:border-primary/50 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 accent-primary cursor-pointer"
                            checked={selectedIds.has(agent.id)}
                            onChange={() => toggleSelection(agent.id)}
                          />
                        </label>
                      )}
                      <div className="flex items-center gap-3 mb-3">
```

注意：需要在文件顶部导入 `cn` 工具函数。如果尚未导入，添加：

```typescript
import { cn } from '@/lib/utils';
```

同时，卡片的 `className` 需要加上 `relative` 以支持 checkbox 的绝对定位。完整 className 应该是：

```tsx
className={cn(
  "bg-card rounded-xl border p-4 flex flex-col shadow-sm cursor-pointer hover:border-primary transition-colors relative",
  bulkMode && selectedIds.has(agent.id) && "border-primary ring-1 ring-primary/20"
)}
```

**对默认分类列表的卡片做同样的修改**（第二个 `.map(agent => (` 处）。两处卡片的 JSX 需要完全相同的修改。

- [ ] **Step 5: 在内容区末尾添加底部批量操作栏**

在 JSX 中，`space-y-8` div 内部、最后一个条件分支关闭后，添加：

```tsx
          {bulkMode && selectedIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-xl border bg-card px-5 py-3 shadow-lg">
              <span className="text-sm font-medium whitespace-nowrap">
                已选择 {selectedIds.size} 个
              </span>
              <div className="h-4 w-px bg-border" />
              <Select
                value={bulkProviderId}
                onValueChange={(v: string) => { setBulkProviderId(v); setBulkModelId(''); }}
              >
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue placeholder="选择服务商" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={bulkModelId}
                onValueChange={(v: string) => setBulkModelId(v)}
                disabled={!bulkProviderId}
              >
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue placeholder={bulkProviderId ? '选择模型' : '先选服务商'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">使用默认</SelectItem>
                  {providers.find(p => p.id === bulkProviderId)?.models.map(m => (
                    <SelectItem key={m.id} value={m.modelId}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!bulkProviderId}
                onClick={handleBulkApply}
              >
                应用
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={exitBulkMode}
              >
                完成
              </Button>
            </div>
          )}
```

- [ ] **Step 6: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 零错误

- [ ] **Step 7: 在浏览器中手动验证**

1. 进入 Agents 视图
2. 确认默认状态下卡片**不显示 checkbox**
3. 点击标题栏"批量编辑"按钮，确认进入批量模式，卡片显示 checkbox
4. 勾选 2-3 个 agent 卡片，确认底部弹出批量操作栏
5. 选择 Provider，再选择 Model（或留空使用默认）
6. 点击"应用"，确认选中的 agent 卡片上的 provider/model 信息已更新，批量模式自动退出
7. 再次进入批量模式，点击"完成"按钮，确认批量模式退出且选中状态清空
8. 确认非批量模式下点击卡片仍打开编辑 Dialog

- [ ] **Step 8: Commit**

```bash
git add src/components/agents/AgentsView.tsx
git commit -m "feat(agents): batch assign provider+model with toggle mode"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ 批量编辑模式切换 — Step 3 批量编辑按钮 + Step 4 条件渲染 checkbox
- ✅ 多选智能体卡片 — Step 4 checkbox + toggleSelection
- ✅ 底部批量操作栏 — Step 5 固定定位栏
- ✅ Provider 选择 — Step 5 Select
- ✅ Model 选择（含默认选项）— Step 5 Select + "使用默认"
- ✅ 批量应用更新 — Step 2 handleBulkApply + Task 1 batchUpdateAgents
- ✅ 退出批量模式 — Step 2 exitBulkMode + Step 5 完成按钮
- ✅ 默认状态无侵入 — 非批量模式下 UI 与当前完全一致

**2. Placeholder scan:**
- 无 TBD/TODO
- 所有代码块包含完整实现
- 所有命令含预期输出

**3. Type consistency:**
- `batchUpdateAgents` 签名与实现一致
- `bulkProviderId`/`bulkModelId` 与现有 Select 的 `value`/`onValueChange` 类型一致
- `cn()` 工具函数已在使用中

**4. v1 vs v2 差异：**
- v1：默认显示 checkbox，选中即触发底部栏
- v2：默认隐藏 checkbox，点击"批量编辑"按钮后进入批量模式才显示 checkbox
- v2 优势：非批量模式下 UI 更干净，不会误触多选；批量模式下意图明确

---

## 文档更新建议

本计划不涉及 docs 文档的修改，但以下文档在功能实现后需要同步更新：

1. **`docs/Development.md`** — "Agent 管理"小节需要更新：
   - 补充 `batchUpdateAgents` action 说明
   - 补充 `agentCategories` 状态说明（如本次会话前已添加但未记录）
   - 更新 "如何添加新的 Agent？" FAQ，提及批量配置功能

2. **`docs/Features.md`** — 在智能体管理特性中补充：
   - 支持多选批量分配模型配置
   - 支持自定义智能体分类

3. **`docs/TODO.md`** — 将本功能标记为已完成
