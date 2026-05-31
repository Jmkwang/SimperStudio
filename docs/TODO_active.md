# SimperStudio - 当前任务清单

> 已完成项见 [CHANGELOG.md](./CHANGELOG.md)。本文档**只**列尚未完成或部分完成的工作。

最后整理：v0.4.4

---

## 🔴 P0 — 阻塞发布

### 浏览器手动验证清单
代码功能已完成，但缺少完整人工回归。

- [ ] **Single Chat 完整链路**：新建 → 发送 → @agent → 附件 → 复制 → retry
- [ ] **Workflow Chat 完整链路**：新建 → 侧栏收展 → 节点点击 → 浮窗 → retry
- [ ] **多窗口交互**：重叠 → 聚焦 → 关闭/最小化
- [ ] **转发链路**：手动转发 → 自动转发（autoSendToNext） → reload 后转发
- [ ] **状态隔离**：切回普通 session，确认 workflow UI 状态不污染单聊
- [ ] **工作流导入导出**：文件导入 + 粘贴导入流程

## 🟡 P1 — 设计系统统一

### 颜色与字号
- [ ] **消除硬编码颜色**：GlobalSidebar logo `lunar-*`、WorkflowCanvas MiniMap hex、GenericNode 红色系、SettingsModelsTab 多种颜色 → 全部用语义 Token
- [ ] **统一字号阶梯**：消除 `text-[9px]` / `text-[10px]` / `text-[11px]`，归并到 12/14/16/18/24/32 共 6 级
- [ ] **统一 4pt 间距网格**：`p-4` / `p-6` / `p-8` 混用 → 4/8/12/16/24/32
- [ ] **主题色一致性**：Light 紫色（258°）vs Dark 青色（187°）色相差距过大，建议同色相不同明度

### 保存模式
- [ ] **统一保存模式**：主题切换自动保存 vs 设置页手动保存的不一致 → 选一种统一

---

## 🟡 P1 — 节点配置交互

- [ ] **节点配置交互完全对齐**：14 个节点编辑器虽已接入 `NodeBaseConfigSection`，但部分节点的专属字段排版仍不一致

---

## 🟢 P2 — 视觉叙事与品牌

- [ ] **Logo 品牌设计**：当前 "S" 字母占位 → 设计有辨识度的 Logo（工作流节点连线抽象图形）
- [ ] **首次启动 Onboarding**：3 步快速引导
- [ ] **狼人杀 Demo 高亮**：在空状态或引导中标注

### 微交互
- [ ] **Agent 创建成功**：Toast → Avatar 轻微动画反馈
- [ ] **狼人杀游戏状态**：角色头像旁的存活/死亡徽章

---

## 🟢 P2 — 多模型对比

- [ ] **MultiModelComparison 卡片操作栏**：底部一排功能图标（复制/刷新/引用/点赞/收藏/删除/更多）—— 可复用 `MessageHoverActions`
- [ ] **AgentResultCard 状态图标和时间**：每个卡片顶部重复模型名称、状态图标（如绿色星星）、时间和 Token 信息

---

## 🟢 P2 — 列表与导航 UI

- [ ] **会话列表顶部固定 "+ 新增会话" 按钮**：作为第一条
- [ ] **列表项采用「头像/图标 + 助手名称」形式**：进一步美化 `ContextItem`
- [ ] **列表项三点菜单**（编辑/删除/更多）

---

## 🟢 P2 — AI 回复气泡

- [ ] **AI 回复去除左边框线**：当前用 `bg-muted/30`，但有用户反馈左侧有视觉痕迹

---

## 🟢 P3 — 可观测性增强

- [ ] **告警钩子**：本地通知 / Webhook 扩展（之前规划但未做）
- [ ] **中小屏适配**：< 768px 抽屉式侧栏

---

## 🟢 P3 — 国际化补完

- [ ] **硬编码字符串修复**：
  - SettingsGeneralTab 中文字符串绕过 `t()` 系统
  - "Test Run" / "Running..." / "Create Agent" / "Execution Timeline" / "Export" 未翻译
  - ContextSidebar default case 中文字符串未走 `t()`

---

## 🟢 P3 — 代码质量遗留

### 类型与数据模型
- [ ] **Agent 废弃字段清理**：`Agent.modelProvider` / `apiKey` / `baseUrl` 仍被 `baseSlice.ts` migration 使用，迁移逻辑稳定后可删除（含 db.rs 表字段移除）
- [ ] **Settings 旧版字段清理**：13 个旧字段仍被 `api.ts` fallback 路径使用，移除 fallback 后再删

### 文案
- [ ] 测试全部模型对话框 `{t('models in total,')}` 文案不自然
- [ ] 新建服务商默认模型硬编码 `gpt-4o`：对 Anthropic/Gemini/DeepSeek 服务商需手动删除再添加

---

## 🟢 P4 — V1.0 发布准备

- [ ] **Tauri 打包配置**（Windows / macOS / Linux）
- [ ] **文档落地页** Landing Page
- [ ] **自动更新器** Auto-updater
- [ ] **应用签名与公证**：macOS Notarization / Windows Code Signing
- [ ] **发布渠道**：GitHub Releases / 官网下载

---

## 🟢 P4 — 设计审计 P1 残留

- [ ] WorkflowCanvas 节点尺寸/间距标准化
- [ ] GenericNode `red-500/red-700/red-950` 替换为 `text-destructive` 系列
- [ ] ExecutionTimeline 颜色 token 化

---

## 文档维护项（持续）

- [ ] 节点新增时同步 `reference/nodes.md`
- [ ] Store 字段变更时同步 `reference/stores.md`
- [ ] Tauri 命令变更时同步 `reference/tauri-commands.md`
- [ ] 视图新增时同步 `reference/views.md`
- [ ] 版本号同步：`package.json` / `tauri.conf.json` / `Cargo.toml` 三处

---

## 任务记账规约

### 完成一个任务时

1. 在本文件**删除**或注释该项
2. 在 `CHANGELOG.md` 对应版本下**追加一条**（含简要说明 + 关键文件路径）
3. 如属于 reference 表里描述的内容（节点 / store / 命令 / 视图）→ 同步更新 reference/

### 新增一个任务时

1. 选择正确的 P 优先级章节
2. 用 `- [ ]` 列出，1 行简述 + 必要时 1-2 行展开
3. 标注涉及的关键文件路径（便于实施时定位）

### 不要在本文件做

- ❌ 写历史故事（去 CHANGELOG）
- ❌ 复制粘贴大段代码（去对应组件源文件 + 写注释）
- ❌ 列已完成项作为"参考"（已完成 = 已删）
