# 批量为智能体配置模型 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 AgentsView 中支持多选智能体卡片，通过底部批量操作栏一次性为选中的智能体分配 Provider + Model。

**Architecture:** 在 AgentsView 的每张卡片左上角加一个原生 checkbox。选中任意卡片后，底部固定弹出批量操作栏，内含 Provider / Model 选择器和"应用"按钮。Store 层新增 `batchUpdateAgents` 方法执行批量更新。

**Tech Stack:** React + Zustand + Tailwind CSS + shadcn/ui Select / Button

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/stores/baseSlice.ts` | Modify | 新增 `batchUpdateAgents` action，遍历选中 ID 列表逐个更新并持久化 |
| `src/components/agents/AgentsView.tsx` | Modify | 新增多选状态、checkbox UI、底部批量操作栏、批量应用逻辑 |

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

在 `updateAgent` 方法之后、`fetchInitialData` 之前插入：

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

## Task 2: UI — AgentsView 多选与批量操作栏

**Files:**
- Modify: `src/components/agents/AgentsView.tsx`

**Context:** AgentsView 当前渲染逻辑：
1. 顶部是标题栏 + Create Agent 按钮
2. 下方是 `space-y-8` 内容区：要么显示选中分类的卡片网格，要么显示全部分类
3. 每张卡片 `onClick={() => handleEdit(agent)}` 打开编辑 Dialog

我们要在卡片左上角加一个 checkbox，点击 checkbox 切换选中状态（阻止事件冒泡），点击卡片其余区域仍打开编辑 Dialog。有选中项时，底部显示固定批量操作栏。

- [ ] **Step 1: 引入 `batchUpdateAgents` 和新增本地状态**

在 `src/components/agents/AgentsView.tsx` 顶部 `useState` 附近添加：

```typescript
  const batchUpdateAgents = useAppStore(state => state.batchUpdateAgents);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

- [ ] **Step 2: 新增 toggle 和 clear 辅助函数**

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
```

- [ ] **Step 3: 新增批量应用的状态和回调**

在 `clearSelection` 之后添加：

```typescript
  const [bulkProviderId, setBulkProviderId] = useState('');
  const [bulkModelId, setBulkModelId] = useState('');

  const handleBulkApply = () => {
    if (selectedIds.size === 0 || !bulkProviderId) return;
    batchUpdateAgents(Array.from(selectedIds), {
      providerId: bulkProviderId,
      modelId: bulkModelId || undefined,
    });
    clearSelection();
    setBulkProviderId('');
    setBulkModelId('');
  };
```

- [ ] **Step 4: 改造 Agent 卡片 — 添加 checkbox**

找到 `selectedAgentCategory` 分支中的卡片 JSX（第一个 `.map(agent => (` 处），将卡片最外层 `div` 改为：

```tsx
                    <div
                      key={agent.id}
                      className="bg-card rounded-xl border p-4 flex flex-col shadow-sm cursor-pointer hover:border-primary transition-colors relative"
                      onClick={() => {
                        if (selectedIds.size > 0) {
                          toggleSelection(agent.id);
                        } else {
                          handleEdit(agent);
                        }
                      }}
                    >
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
```

注意：checkbox 的 `label` 使用 `onClick={e => e.stopPropagation()}` 防止触发卡片点击。`input` 的 `onChange` 调用 `toggleSelection`。

卡片原有的内部结构（头像、名称、描述）保持不变，只需要把 `className` 加上 `relative`，并在 `Avatar` 所在 `div` 之前插入上面的 checkbox label。

**对默认分类列表的卡片做同样的修改**（第二个 `.map(agent => (` 处）。两处卡片的 JSX 完全一致，都需要加上 checkbox。

- [ ] **Step 5: 在内容区末尾（`space-y-8` div 内部、条件渲染之后）添加底部批量操作栏**

在 JSX 中，`</div>` 关闭 `space-y-8` 之前（即第 345 行附近），在最后一个条件分支关闭后，添加：

```tsx
          {selectedIds.size > 0 && (
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
                onClick={clearSelection}
              >
                取消
              </Button>
            </div>
          )}
```

- [ ] **Step 6: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 零错误

- [ ] **Step 7: 在浏览器中手动验证**

1. 进入 Agents 视图
2. 勾选 2-3 个 agent 卡片
3. 确认底部弹出批量操作栏，显示"已选择 N 个"
4. 选择 Provider，再选择 Model（或留空使用默认）
5. 点击"应用"，确认选中的 agent 卡片上的 provider/model 信息已更新
6. 点击"取消"，确认底部栏消失，选中状态清空

- [ ] **Step 8: Commit**

```bash
git add src/components/agents/AgentsView.tsx
git commit -m "feat(agents): batch assign provider+model to multiple agents"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ 多选智能体卡片 — Step 4 checkbox + toggleSelection
- ✅ 底部批量操作栏 — Step 5 固定定位栏
- ✅ Provider 选择 — Step 5 Select
- ✅ Model 选择（含默认选项）— Step 5 Select + "使用默认"
- ✅ 批量应用更新 — Step 3 handleBulkApply + Task 1 batchUpdateAgents
- ✅ 取消选择 — Step 5 取消按钮

**2. Placeholder scan:**
- 无 TBD/TODO
- 所有代码块包含完整实现
- 所有命令含预期输出

**3. Type consistency:**
- `batchUpdateAgents` 签名与实现一致
- `bulkProviderId`/`bulkModelId` 与现有 Select 的 `value`/`onValueChange` 类型一致
