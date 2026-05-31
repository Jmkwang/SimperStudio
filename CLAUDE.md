# SimperStudio — Claude / AI 协作入口

本文件是 AI 协作（Claude / Cursor / Copilot 等）的导航起点。

---

## 1. 文档地图

| 我想… | 去这里 |
|---|---|
| 了解项目是什么、怎么跑、关键架构 | `docs/Development.md` |
| 看产品定位与里程碑 | `docs/PRD.md` |
| 看已实现的全部功能 | `docs/Features.md` |
| 看 UI/UX 与设计系统 | `docs/Design.md` |
| 看当前还没做的事 | `docs/TODO_active.md` |
| 看历史变更 | `docs/CHANGELOG.md` |
| 查节点 / store / 命令 / 视图清单 | `docs/reference/` |
| 看历史 plan / 审计报告 | `docs/archive/` |

> **不要再阅读 `docs/Design_Specs.md` 或 `docs/Design_System.md`**——它们已合并到 `Design.md`，旧版归档在 `docs/archive/`。
> **不要再阅读 `docs/TODO.md`**——已拆分为 `TODO_active.md` + `CHANGELOG.md`，原版归档为 `archive/TODO_v0.4_full.md`。

---

## 2. 文档维护规约（必读）

### 2.1 单一事实源原则

每类信息只有一个权威位置：

| 信息类别 | 权威文档 |
|---|---|
| 节点执行器 / UI / 契约 | `docs/reference/nodes.md` |
| Store slice 字段 / action | `docs/reference/stores.md` |
| Tauri 命令 / SQL Schema | `docs/reference/tauri-commands.md` |
| 视图路由 / viewMode | `docs/reference/views.md` |
| 工作流引擎执行流程 | `docs/reference/workflow-engine.md` |
| 聊天系统数据流 | `docs/reference/chat-system.md` |
| 设计令牌（颜色/字号/间距） | `docs/Design.md` |

其他文档若提到这些信息，**只能用一句话引用 + 链接**，不复述细节。

### 2.2 完成任务时

1. 在 `TODO_active.md` 删除该项
2. 在 `CHANGELOG.md` 当前版本追加一行（含关键文件路径）
3. 如改动涉及节点 / store / 命令 / 视图 → 同步对应 reference 文件
4. 如改动涉及版本号 → **三处必须同步**：`package.json` / `src-tauri/tauri.conf.json` / `src-tauri/Cargo.toml`

### 2.3 新增任务时

- 直接加入 `TODO_active.md` 对应 P 级章节
- 写明涉及文件路径（便于他人/AI 实施时快速定位）
- 不在 TODO 内复制大段代码或上下文，写"详见 src/xxx.ts"

### 2.4 写新文档时

- 一律放 `docs/` 下
- 优先扩展现有 reference 文件而非新建
- 写完更新本 CLAUDE.md 的文档地图
- 文档之间互链使用相对路径，便于在 GitHub / 编辑器跳转

### 2.5 归档判断

- 已完成的 plan-* / phase-* / proposal-* → 移入 `docs/archive/`
- 历史快照（按日期或版本命名的会议记录、daily 等）→ 移入 `docs/archive/`
- 审计报告类（HTML / 一次性输出）→ 移入 `docs/archive/`
- 不要在 archive 写新内容

---

## 3. 默认行为指引（给 AI 协作工具）

收到任务时，先按顺序检查：

1. 读 `docs/Development.md` 了解架构与技术栈
2. 用任务关键词查 `docs/reference/` 对应文件确认事实
3. 进入代码前阅读相关 slice / executor / component 实际实现
4. 修改后**始终**同步对应 reference + CHANGELOG

涉及 UI 改动时：
- 必读 `docs/Design.md` 的设计令牌与组件规范
- 不引入 Token 之外的硬编码颜色 / 字号
- 检查无障碍：focus-visible / aria-label / 对比度 / 最小点击区

涉及工作流节点时：
- 阅读 `docs/reference/nodes.md` 与 `docs/reference/workflow-engine.md`
- 新增节点 6 步走：类型 → 执行器 → 注册 → UI → 画布 → 测试

涉及 Tauri / 数据库时：
- 阅读 `docs/reference/tauri-commands.md`
- 修改 SQL Schema 时同步 `db.rs` 与 `tauri-commands.md`

---

## 4. 项目元信息（速查）

- 当前版本：见 `package.json`
- 数据目录：`<dirs::data_dir>/SimperStudio/`（Win: `%APPDATA%\SimperStudio\`）
- 启动命令：`npm run tauri dev` / `npm run dev`（仅前端）
- 测试命令：`npm test`
- 构建命令：`npm run build` + `npm run tauri build`

---

## 5. 通信偏好

- **回复语言**：中文
- **修改前**：先看相关代码确认事实，避免基于过期文档臆测
- **修改后**：列出涉及的文件路径与 reference 文档同步项
