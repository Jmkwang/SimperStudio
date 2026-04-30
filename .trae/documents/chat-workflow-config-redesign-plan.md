# SimperStudio 聊天、会话、远程访问与 JSON 配置改造计划

**目标**：按当前反馈改造聊天输入区与侧栏体验，修复 Chats 新建会话与 Workflow 的对应关系，补齐空侧栏内容，支持远程访问自定义端口，并把模型、智能体、工作流配置迁移到独立 JSON 文件管理，同时默认中文。

**当前观察**：
- 聊天顶部筛选栏在 [ChatInterface.tsx](file:///g:/workspace/SimperStudio/src/components/chat/ChatInterface.tsx#L175-L215)，目前包含“全部 / 按智能体 / 按模型”。
- 输入区与 @ 提及弹层在 [ChatInterface.tsx](file:///g:/workspace/SimperStudio/src/components/chat/ChatInterface.tsx#L237-L273)，目前 @ 主要靠键盘输入触发。
- Chats / Workflows / Agents 侧栏在 [ContextSidebar.tsx](file:///g:/workspace/SimperStudio/src/components/layout/ContextSidebar.tsx#L104-L135)。选中的空 `div` 是 `content.items` 为空时没有空状态展示。
- ChatSession 类型已有 `workflowId`，但 Rust SQLite `chat_sessions` 表和命令当前没有保存 `workflow_id`，这是“会话与 workflow 对应”失效的关键点之一。
- `settings.language` 默认是 `en`，需要改为 `zh`。
- `Allow Remote Access` 当前只是设置项，Vite 固定 `host: 0.0.0.0`、端口 `1420`，没有自定义端口运行时能力。
- 当前模型配置保存在 settings 内，Agents / Workflows / Sessions 主要走 SQLite；需要规划独立 `model.json`、`agents.json`、`workflow.json` 的配置读写适配。

---

## 一、聊天输入区 UI 改造

### 1. 移除顶部筛选栏里的“按模型”

**文件**：
- 修改：`g:\workspace\SimperStudio\src\components\chat\ChatInterface.tsx`

**计划**：
1. 删除 `ModelFilterValue` 类型与 `modelFilter` 状态。
2. 删除 `modelOptions` 派生逻辑。
3. `visibleGroups` 过滤逻辑只保留智能体过滤。
4. 删除顶部整条 `border-b` 筛选栏，避免在消息区顶部占据视觉空间。
5. 保留回复卡片内的模型标识，因为模型属于智能体定义，作为元信息展示即可，不再作为全局筛选入口。

### 2. 将智能体选择改到输入框下方的 @ 按钮

**文件**：
- 修改：`g:\workspace\SimperStudio\src\components\chat\ChatInterface.tsx`

**计划**：
1. 输入框区域改为两层结构：
   - 第一层：输入框 + 发送按钮。
   - 第二层：工具栏，包含 `@` 智能体按钮、上传文件/图片按钮、当前目标智能体提示。
2. `@` 按钮点击后打开智能体选择弹层，复用现有 `showMentions` 逻辑。
3. 弹层文案改为中文，例如“选择智能体”。
4. 当当前 ChatSession 绑定了 Workflow 时：
   - 工具栏显示“当前工作流会发送给：整理助手、总结助手”。
   - @ 按钮可用于插入提及，但实际发送仍优先使用 workflow 中的智能体，符合当前 `resolveAgentsForMessage` 逻辑。
5. 当没有 Workflow 绑定时：
   - @ 按钮用于选择一个或多个智能体，插入 `@智能体名` 到输入框。
   - 发送时沿用 `@` 文本解析。

### 3. 增加添加文件 / 上传图片入口

**文件**：
- 修改：`g:\workspace\SimperStudio\src\components\chat\ChatInterface.tsx`
- 可能修改：`g:\workspace\SimperStudio\src\types\models.ts`

**计划**：
1. 在输入框下方工具栏增加文件按钮，图标建议使用 `Paperclip` 或 `ImagePlus`。
2. 增加隐藏的 `<input type="file">`，支持 `image/*`，必要时兼容常见文本文件。
3. 第一阶段不引入真实文件上传后端，只把选择的文件以附件元数据保存在前端待发送状态：`name`、`type`、`size`、临时预览 URL 或 base64。
4. `ChatMessage.content` 目前只有 `{ text }`，计划扩展为可选 `attachments`：
   - `id`
   - `name`
   - `mimeType`
   - `size`
   - `kind: 'image' | 'file'`
   - `dataUrl?: string`
5. 用户发送时，消息卡片显示附件 chip；图片显示小预览。
6. 模型调用阶段先把附件名附加到 prompt 上，图片真正多模态输入作为后续扩展，避免本次引入大范围 API 改造。

---

## 二、Chats 新建会话与 Workflow 对应关系修复

### 1. 明确产品规则

**理解**：“Chats 的会话是与 Workflow 对应的”，因此一个 ChatSession 应该总是绑定一个 Workflow。新建 Chat 不应该只创建孤立聊天，而应该创建或选择一个对应 Workflow。

### 2. 新建 Chat 时同步创建 Workflow 并绑定

**文件**：
- 修改：`g:\workspace\SimperStudio\src\components\layout\ContextSidebar.tsx`
- 修改：`g:\workspace\SimperStudio\src\store\appStore.ts`
- 修改：`g:\workspace\SimperStudio\src\types\models.ts`
- 修改：`g:\workspace\SimperStudio\src-tauri\src\db.rs`

**计划**：
1. 新增 store action：`createWorkflowBackedSession(title, workspaceId)`。
2. 该 action 内部：
   - 创建空 Workflow，名称与 Chat 一致或使用“新工作流”。
   - 保存 workflow。
   - 创建 ChatSession，并写入 `workflowId`。
   - 设置 `activeWorkflowId` 与 `activeSessionId`。
3. `ContextSidebar` 中 Chats 的加号改为调用 `createWorkflowBackedSession`。
4. 如果当前在 Workflow 视图点击加号，仍只创建 Workflow；但可考虑同步创建一个对应 ChatSession，保持双向一致。第一阶段优先保证 Chats 加号有效且绑定 workflow。

### 3. SQLite 补齐 workflowId 持久化

**文件**：
- 修改：`g:\workspace\SimperStudio\src-tauri\src\db.rs`

**计划**：
1. `chat_sessions` 表增加 `workflow_id TEXT` 列。
2. `init_db` 中增加兼容迁移：
   - 检查 `chat_sessions` 是否已有 `workflow_id`。
   - 没有则执行 `ALTER TABLE chat_sessions ADD COLUMN workflow_id TEXT`。
3. Rust `ChatSession` struct 增加 `workflow_id: Option<String>`。
4. `get_chat_sessions` 查询增加 workflow_id。
5. `add_chat_session` 插入 workflow_id。
6. `update_chat_session` 更新 workflow_id。
7. 前端 Tauri camelCase 会映射为 `workflowId`，与现有 TS 类型对齐。

---

## 三、侧栏空列表处理

**文件**：
- 修改：`g:\workspace\SimperStudio\src\components\layout\ContextSidebar.tsx`
- 可能修改：`g:\workspace\SimperStudio\src\hooks\useTranslation.ts`

**计划**：
1. 对 `content.items.length === 0` 增加空状态，而不是显示空白区域。
2. 根据 `currentView` 展示中文默认提示：
   - Chats：暂无会话，点击右上角 + 创建。
   - Workflows：暂无工作流，点击右上角 + 创建。
   - Agents：暂无智能体。
   - Settings：设置项在主区域中配置。
3. 保持侧栏列表高度与滚动行为不变。
4. 将新增文案加入翻译表，但默认语言改中文后即使缺 key 也应尽量避免英文兜底。

---

## 四、Allow Remote Access 支持自定义端口

### 1. 设置模型扩展

**文件**：
- 修改：`g:\workspace\SimperStudio\src\store\appStore.ts`
- 修改：`g:\workspace\SimperStudio\src\types\models.ts`
- 修改：`g:\workspace\SimperStudio\src\components\settings\SettingsView.tsx`

**计划**：
1. settings 增加 `remoteAccessPort: number | string`，默认 `1420`。
2. 设置页 `Allow Remote Access` 下方增加端口输入框。
3. 校验端口范围为 `1-65535`，展示中文错误提示。
4. 说明文字改成动态端口，例如 `http://本机IP:端口/`。

### 2. 生效机制说明与最小实现

**限制**：Vite dev server 的端口由 `vite.config.ts` 启动时决定，运行中的前端设置不能直接改变当前 dev server 端口。

**计划**：
1. 在 `vite.config.ts` 中读取环境变量，例如 `SIMPER_REMOTE_PORT` 或 `VITE_REMOTE_PORT`，默认 `1420`。
2. `tauri.conf.json` 的 `devUrl` 当前固定 `http://localhost:1420`，若要完全动态，需要配合启动脚本或文档化运行命令。
3. 由于本轮不能只做 UI 假功能，计划实现：
   - 设置中保存端口配置。
   - Vite 配置支持环境变量端口。
   - Tauri devUrl 保持默认端口；如果用户设置非默认端口，需要使用对应环境变量启动开发服务。
4. 如果希望桌面 App 内一键重启到新端口，需额外引入进程管理能力，本次不做。

---

## 五、默认使用中文

**文件**：
- 修改：`g:\workspace\SimperStudio\src\store\appStore.ts`
- 修改：`g:\workspace\SimperStudio\src\components\chat\ChatInterface.tsx`
- 修改：`g:\workspace\SimperStudio\src\components\settings\SettingsView.tsx`
- 修改：`g:\workspace\SimperStudio\src\hooks\useTranslation.ts`

**计划**：
1. `settings.language` 默认从 `en` 改为 `zh`。
2. ChatInterface 中硬编码英文文案改中文：
   - `No active session`
   - `No messages yet. Start a conversation!`
   - `You`
   - `Send`
   - `Mention Agent`
   - 输入框 placeholder。
3. SettingsView 中硬编码英文说明改中文或接入 `t()`。
4. 翻译 hook 默认 fallback 可保持英文，但新增关键中文 key。

---

## 六、模型、智能体、Workflow 独立 JSON 配置适配

### 1. 配置文件设计

**建议文件位置**：
- `model.json`
- `agents.json`
- `workflow.json`

**考虑**：
- Tauri 桌面环境应优先使用应用数据目录，避免把用户配置写进项目源代码目录。
- 浏览器开发模式没有 Rust 文件系统命令时，继续使用内置默认数据。

### 2. Rust 后端增加 JSON 配置命令

**文件**：
- 修改：`g:\workspace\SimperStudio\src-tauri\src\db.rs` 或新增模块后在 `lib.rs` 注册
- 修改：`g:\workspace\SimperStudio\src-tauri\src\lib.rs`

**计划**：
1. 增加通用命令：
   - `read_json_config(name: String) -> String`
   - `write_json_config(name: String, value: String) -> Result<(), String>`
2. 限制 `name` 只能是白名单：`model.json`、`agents.json`、`workflow.json`，避免任意文件读写风险。
3. 文件不存在时返回空或默认 JSON。
4. 写入时使用 pretty JSON，并确保目录存在。

### 3. 前端 Store 适配

**文件**：
- 修改：`g:\workspace\SimperStudio\src\store\appStore.ts`
- 修改：`g:\workspace\SimperStudio\src\components\settings\SettingsView.tsx`
- 修改：`g:\workspace\SimperStudio\src\components\agents` 下相关智能体编辑文件（执行时再精确定位）
- 修改：`g:\workspace\SimperStudio\src\components\workflow\WorkflowCanvas.tsx`

**计划**：
1. `fetchInitialData` 启动时优先读取 JSON 配置：
   - `model.json` 用于 settings / 模型配置。
   - `agents.json` 用于 agents。
   - `workflow.json` 用于 workflows。
2. 如果 JSON 文件不存在或为空，回退到当前 SQLite / 默认内置数据。
3. `updateSettings` 保存模型配置时写入 `model.json`。
4. `addAgent` / `updateAgent` 保存后写入 `agents.json`。
5. `createWorkflow` / `saveWorkflow` 保存后写入 `workflow.json`。
6. SQLite 可保留作为兼容层，但 JSON 作为新的配置来源；不要同时引入两套相互覆盖的冲突逻辑。

### 4. 模型配置结构调整

**目标**：模型配置独立，智能体只引用模型。

**计划**：
1. `model.json` 保存 provider、baseUrl、apiKey、models 列表等。
2. `Agent.modelProvider` + `Agent.modelId` 继续作为引用字段。
3. Settings 页改为编辑全局模型配置，不再把“当前使用哪个模型”误认为全局会话筛选条件。
4. 聊天发送时仍从 Agent 获取 `modelProvider/modelId`，再到 `model.json/settings` 中解析 key/baseUrl。

---

## 七、验证计划

### 1. 静态检查

1. 运行 TypeScript 构建：`npm run build`。
2. 如果存在 lint/typecheck 脚本，按 `package.json` 实际脚本运行。

### 2. 功能验证

1. 启动开发服务，打开聊天页。
2. 确认顶部丑的筛选栏消失。
3. 确认输入框下方出现 @ 按钮、上传文件/图片按钮、当前工作流目标智能体提示。
4. 点击 @ 按钮，能选择智能体并插入输入框。
5. 选择图片后，能在待发送区看到文件名/预览；发送后消息中保留附件展示。
6. 点击 Chats 的 +：
   - 新会话出现在 Chats 列表。
   - 同时创建对应 Workflow。
   - 新 ChatSession 有 workflowId。
   - 刷新后对应关系仍存在。
7. 切到 Settings/Profile/Prompts 等空列表侧栏，不再出现纯空白。
8. Settings 默认中文，语言选择默认中文。
9. Allow Remote Access 可输入端口，非法端口有提示，保存后进入 settings / model.json。
10. 关闭重启后，模型、智能体、workflow 配置能从 JSON 恢复。

---

## 八、实施顺序

1. 先改默认中文与聊天输入区 UI，因为反馈最直观。
2. 再修复 Chats 新建会话与 Workflow 绑定，包括 SQLite `workflow_id`。
3. 再补侧栏空状态。
4. 再做 Allow Remote Access 端口配置。
5. 最后做 JSON 配置适配，因为涉及 Store、Tauri 命令、数据来源优先级，风险最大。
6. 每完成一块都运行构建或至少 TypeScript 检查，避免最后集中爆错。

---

## 九、风险与取舍

1. 上传图片本轮先做 UI 与消息结构，不保证真实多模态模型调用；否则会牵涉 `fetchFromModel` 的 provider 协议重构。
2. 自定义远程访问端口无法在已运行的 Vite dev server 中即时改变；本轮实现配置保存和启动时读取环境变量。
3. JSON 配置与 SQLite 同时存在时要定义优先级，计划采用 JSON 优先、SQLite/默认数据兜底。
4. `agents.json`、`workflow.json` 如果存放在应用数据目录，用户不一定能直接看到；如果你希望放在项目根目录，执行时需要调整为项目根目录文件，但这会更偏开发环境而不是桌面 App 用户配置。
