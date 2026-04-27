# SimperStudio 进度 & 待办清单 (TODO List)

## 🎯 当前进度 (Current Status)

### 🟢 已完成 (Completed)
- [x] **基础框架搭建**: Tauri + React + Vite + TypeScript 初始化。
- [x] **UI/样式集成**: Tailwind CSS + shadcn/ui 安装与基础配置，全局深色模式支持。
- [x] **路由与基础布局**: 左侧全局导航栏（Global Sidebar） + 动态上下文侧边栏 + 主内容区。
- [x] **状态管理基建**: Zustand `appStore.ts` 搭建，包含 Workspaces, Sessions, Messages, Agents, Workflows 的基础结构。
- [x] **多 Agent 聊天基础**: 
  - 支持类似 CherryStudio 的聊天界面
  - 实现 `@` 提及多智能体功能
  - 实现并接入 Vercel AI SDK，处理真实 API 流式响应 (SSE)
  - 修复了流式响应时文本重复累加的严重 Bug (`HHeHelHello` 问题)
- [x] **工作流画布基础**: 集成 React Flow，实现简单的节点与连线渲染。
- [x] **提示词生成区 (Prompt Generator)**:
  - 新增专用页面 `PromptGenerator.tsx` (左侧魔法棒图标进入)
  - 包含顶部提示词编辑和底部对话输入框
  - 已接入 AI 接口，支持自动生成和打磨提示词

### 🔴 待修复 Bug (Pending Bugs - High Priority)
- [x] **UI Bug: 小会话输入框丢失**
  - **现象**: 在没有历史消息的“小会话”视图中，底部的聊天输入框没有显示。
  - **排查点**: 检查 `ChatInterface.tsx` 或 `DualAgentChatView.tsx` 中针对空消息数组时的条件渲染逻辑。
- [x] **State Bug: 工作流保存失效 (刷新消失)**
  - **现象**: 在工作流画布中新增节点或修改连线后，刷新页面数据会重置。
  - **排查点**: 检查 `appStore.ts` 中的 Zustand `persist` 配置是否包含了 `workflows` 节点，以及 `WorkflowCanvas.tsx` 中的保存触发逻辑。
- [x] **UI Bug: 点击特定会话黑屏**
  - **现象**: 点击第二、三个默认会话（"UI Component Design", "General Inquiry"）时，整个主视图变成黑屏/崩溃。
  - **排查点**: 可能是由于对应的 Session 缺少绑定的 workflow 数据，或者存在 `undefined` 导致渲染循环崩溃。

### 🟡 下一步开发计划 (Next Steps)
- [x] **注入测试数据**: 在修复上述持久化和黑屏 Bug 后，为 3 个默认会话注入 3 组不同的工作流测试数据，以验证切换效果。
- [x] **完善工作流逻辑**: 
  - 实现自定义节点（触发器、Agent 节点、输出节点）的完整功能和属性面板。
  - 实现 DAG 执行引擎：按顺序执行工作流并将上一节点的输出传递给下一节点。
- [x] **本地 SQLite 数据库集成**: 替换目前的 Zustand `persist` (localStorage)，使用 Tauri SQLite 插件实现真正的本地持久化存储。
- [x] **构建与打包准备**:
  - 更新 `src-tauri/tauri.conf.json` 中的 `identifier` 和 `productName`。
  - 优化 Tauri build 尺寸，准备最终的 Windows 桌面端打包。
## 狼人杀 Workflow 整合方案 (无自定义节点版)

**目标**：将狼人杀游戏逻辑整合进通用工作流引擎，证明引擎的通用能力。工作流作为状态推演引擎，处理输入的状态 JSON，经过计算和 LLM 决策后输出新状态。

**核心机制：State as Payload**
- 输入输出都是 `GameState JSON`。
- 外部界面通过 Zustand 循环调用该工作流来推进游戏。

**所需通用节点组合 (Workflow Topology)**
1.  **开始节点 (Input)**: 接收当前 `GameState`。
2.  **条件分支节点 (Router)**: 根据 `payload.phase` 分发到：
    *   **黑夜分支**:
        *   LLM 节点：模拟狼人决策 (需支持结构化输出/Tool calling 返回 targetId)。
        *   LLM 节点：模拟神职决策。
        *   Code 节点：法官结算 (计算死亡，更新状态为白天)。
    *   **白天发言分支**:
        *   Code 节点：找出下一个发言人并提取背景信息。
        *   LLM 节点：生成伪装或推理发言。
        *   Code 节点：记录发言，判断是否所有人发言完毕。
    *   **白天投票分支**:
        *   LLM 节点：批量投票决策。
        *   Code 节点：计票并判断胜利条件。
3.  **结束节点 (Output)**: 输出更新后的 `GameState` JSON。

**技术要求检查清单 (需验证引擎是否支持)**
- [x] 路由/条件分发节点。
- [x] 能够编写自定义 JS 逻辑的代码节点。
- [x] Agent 节点已支持结构化输出 (Schema Tool Calling) 约束，以便代码节点提取参数。
- [x] 工作流是否支持循环/状态重入 (通过外部 Zustand 循环驱动)。

## 狼人杀 Workflow 重设计方案（8人局，精简 Code 节点版，仅设计未执行）

**设计时间**：2026-04-27  
**状态**：已确认方案，待落地到 `w5 (Werewolf Game Logic)` 的 `nodes_data/edges_data`

### 一、重设计目标
- 保留“通用节点”前提（不新增自定义节点类型）。
- 发言与决策尽量自由发挥（每个玩家有独立人格和思维方式）。
- 将大量细碎 Code 节点收敛为“回合级裁决”节点。
- 在精简节点的同时，保证规则正确性（屠边、狼刀优先、女巫药剂、猎人开枪、PK）。

### 二、核心设计原则（两层架构）
1. **创意层（Agent）**：负责生成“人味”与策略性内容。  
   - 如夜晚选择、白天发言、投票倾向。  
2. **裁决层（Code）**：负责确定性规则结算。  
   - 如死亡结算、胜负判定、药剂扣减、平票 PK、猎人触发。

> 结论：Agent 可以自由发挥，但“规则生效”只以 Code 裁决结果为准。

### 三、精简后节点拓扑（推荐）

#### 1) 路由骨架
- `trigger:start`  
- `condition:phase-router`（按 phase 分发）
  - `night`
  - `day_speech`
  - `day_vote`
  - `end`

#### 2) Night 分支
- `agent:night-decisions`  
  一次性产出结构化夜间决策：
  - 狼刀目标
  - 预言家查验目标
  - 女巫是否救/毒（及目标）
- `code:night-adjudicator`  
  统一执行夜晚规则：
  - 结算狼刀/女巫
  - 处理猎人夜死开枪规则
  - 扣减女巫药剂
  - 胜负判定（含狼刀优先）
  - 推进到白天阶段

#### 3) Day Speech 分支
- `agent:day-speech-simulator`  
  按玩家人格生成发言（自由发挥）
- `code:day-speech-postprocess`  
  只做流程结构处理：
  - 记录发言
  - 检测狼人是否自爆
  - 决定进入 `day_vote` 或直接 `night`

#### 4) Day Vote 分支
- `agent:day-vote-decisions`  
  产出首轮票型 + 可能 PK 票型
- `code:day-adjudicator`  
  白天统一裁决：
  - 首轮计票
  - 平票进入 PK 并结算
  - 放逐、遗言、猎人开枪
  - 胜负判定
  - 推进到下一夜

#### 5) 输出
- `output:continue`（游戏继续）
- `output:game-over`（终局）

### 四、节点规模对比
- 旧方案：32 节点（含 14 个 Code）
- 新方案（推荐）：约 10~12 节点（Code 收敛为 3 个核心裁决 + 1 个轻量后处理）

### 五、玩家人格（用于“自由发挥”）
在 `payload.players[]` 增加可配置人格字段，用于发言与投票模拟：
- `persona`：性格标签（冷静/激进/表演型等）
- `reasoningStyle`：推理方式（证据派/直觉派/博弈派）
- `riskProfile`：风险偏好（保守/中性/激进）
- `publicStyle`：表达风格（强势、谨慎、碎片化、长逻辑链）

> Agent 节点 prompt 必须显式读取这些字段，确保每名玩家说话像“不同的人”。

### 六、规则正确性要求（必须由 Code 强制）
1. **狼刀优先**：夜晚狼刀若已触发狼胜，后续女巫毒死最后狼人不翻盘。  
2. **屠边规则**：狼人杀光所有村民或所有神职即胜。  
3. **女巫药剂**：解药/毒药各一次；是否首夜可自救由状态开关控制。  
4. **猎人开枪**：被狼刀或被放逐可开枪；被女巫毒死不可开枪。  
5. **平票 PK**：白天平票进入 PK 流程再结算放逐。

### 七、当前引擎约束与适配策略
- 现状：`agent` 执行后默认写入 `payload.llmResult`，会被后续 agent 覆盖。  
- 适配：采用“每阶段聚合 1 个 Agent + 1 个裁决 Code”模式，避免多 agent 结果覆盖冲突。  
- 后续可选优化（非本次必须）：扩展为 `payload.decisions[nodeId]` 持久化多节点决策结果。

### 九、引入 Loop 节点（新增）与分步实施计划

**背景**：仅靠“连线回环”不能等价替代 Loop 语义。当前执行器是单次前向传播，回合循环依赖外部 `Next Round` 触发；图内回边缺少迭代上下文与安全边界。

#### Step 1 — 节点层接入（UI/模型）
- [x] 新增 `loop` 节点类型到画布可选项（NodeType + Select 菜单）。
- [x] 提供 Loop 节点基础配置字段：
  - `itemsPath`（例如 `payload.alivePlayers`）
  - `itemAlias`（默认 `item`）
  - `indexAlias`（默认 `index`）
  - `maxIterations`（默认 20，防死循环）
  - `breakCondition`（可选表达式）

#### Step 2 — 执行器语义实现（核心）
- [x] 在 `executeWorkflow` 中增加 `loop` 节点处理分支。
- [x] Loop 上下文写入规范：
  - `payload.loop = { currentItem, index, total }`
- [x] 每次迭代将当前项向后游节点透传，支持迭代中 `breakCondition` 提前终止。
- [x] 增加超时与迭代上限保护，避免图内无限循环。

> 2026-04-27 更新：Step 1 + Step 2 已落地（含 `payload.xxx` 路径兼容、frame queue 改造、全局步骤上限保护）。

#### Step 3 — 数据汇总与输出约定
- [ ] 约定 Loop 默认汇总结果位置（如 `payload.loopResults[nodeId]`）。
- [ ] 支持迭代结果聚合策略（append / replace，先实现 append）。
- [ ] 明确与现有 `payload.llmResult` 的关系，避免覆盖冲突。

#### Step 4 — 狼人杀流程最小迁移（先一处）
- [ ] 仅替换 Day Speech：使用 `loop` 对“存活玩家列表”逐人发言。
- [ ] 保留夜晚与投票裁决节点不变（降低一次改动风险）。
- [ ] 验证输出仍可被 `day-speech-postprocess` 消费。

#### Step 5 — 狼人杀流程完整适配（第二阶段）
- [ ] 将 Day Vote 扩展为可选 loop 逐人投票（或保留批量投票模式）。
- [ ] 统一玩家人格字段在发言/投票两个 Agent 提示词中生效。
- [ ] 回归检查：屠边、狼刀优先、女巫药剂、猎人开枪、PK 规则不回退。

#### Step 6 — 回归与验收
- [ ] 新增/更新最小测试样例：
  - 正常迭代
  - `breakCondition` 提前结束
  - `maxIterations` 触发保护
  - 狼人杀 Day Speech loop 场景
- [ ] 验证 UI 执行面板可观察当前迭代状态（currentItem/index）。

### 十、关于“狼人杀是否需要重新适配”的结论
- **需要适配，但可以分阶段，非一次性重写。**
- 原因：新增 `loop` 后，狼人杀的“逐人发言/逐人投票”会从“批量模拟”升级为“逐项迭代”，数据结构和后处理输入会变化。
- 建议策略：
  1. 先适配 Day Speech（最能体现自由发挥价值）；
  2. 稳定后再决定是否适配 Day Vote；
  3. 夜晚裁决继续保留回合级 `code` 汇总，不建议拆碎。

