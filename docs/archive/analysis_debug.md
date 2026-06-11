# SimperStudio 调试与测试体系专业分析报告

> 分析日期：2026-06-10  
> 分析范围：前端（React/Vite/TypeScript）、后端（Rust/Tauri）、测试体系、可观测性、错误处理  
> 分析者视角：资深调试与测试工程师

---

## 执行摘要

### 总体评分：6.2 / 10

SimperStudio 项目在**调试工具**和**工作流引擎容错**方面表现突出，拥有自研的 `debugLogger` + `DebugOverlay` 调试系统和功能完善的 DAG 执行引擎。但在**测试覆盖度**、**CI/CD 基础设施**、**生产环境可观测性**和**全局错误治理**方面存在明显短板。项目目前处于"开发友好、生产脆弱"的状态——开发者可以很好地排查问题，但缺乏自动化保障来防止回归，也缺少面向终端用户的崩溃报告和诊断通道。

### 关键发现

| 维度 | 评分 | 关键结论 |
|------|------|----------|
| 测试覆盖 | **4/10** | 仅 7 个测试文件，无 E2E、无 Rust 测试、UI 组件测试严重不足 |
| 测试质量 | **6/10** | Mock 策略合理，但断言深度不足，缺少边界和负面用例 |
| 错误处理 | **6/10** | 工作流引擎错误处理完善，但全局异常治理和异步错误捕获薄弱 |
| 日志系统 | **7/10** | debugLogger 设计优秀，但生产环境日志和远程收集缺失 |
| 调试工具 | **9/10** | DebugOverlay + StreamMonitor + useDebugTrack 构成一流本地调试体验 |
| 可观测性 | **5/10** | 状态追踪和性能日志有基础，但缺少系统级指标和长期趋势分析 |
| 故障排查 | **6/10** | 错误信息已中文化，但缺少崩溃报告、source map 诊断和自动诊断工具 |
| 容错机制 | **7/10** | 工作流超时/重试/错误分支完善，但网络层和 AI 调用缺少自动重试 |
| 边界情况 | **5/10** | 有死循环保护和取消信号，但并发、存储满载、网络抖动等场景未覆盖 |
| 测试基础设施 | **3/10** | 无 CI/CD、无覆盖率报告、无自动化回归，Playwright 未启用测试 |

---

## 1. 测试覆盖分析（评分：4/10）

### 1.1 当前测试分布

项目共发现 **7 个测试文件**，总计约 800+ 行测试代码：

| 路径 | 类型 | 说明 |
|------|------|------|
| `src/store/__tests__/workflowExecution.test.ts` | 集成测试 | 工作流执行：线性流、条件分支、错误处理、断点续跑、执行记录 |
| `src/store/__tests__/nodeContracts.test.ts` | 集成测试 | 节点契约：Switch、Set/Transform、Wait、Merge、重试、超时、HTTP |
| `src/store/__tests__/workflowChat.test.ts` | 集成测试 | 聊天工作流：窗口管理、Agent 转发、Dynamic Agent 重跑 |
| `src/store/__tests__/workflowSave.test.ts` | 单元测试 | 工作流保存：字段持久化、函数清理 |
| `src/store/__tests__/appStore.test.ts` | 单元测试 | Store 行为：流式响应追加、完成标记、多 Agent 聚合 |
| `src/components/chat/__tests__/ChatMessageBubble.test.tsx` | 组件测试 | 消息气泡：过滤渲染、空状态、头像回退 |
| `src/lib/workflow/nodeExecutors/__tests__/dynamicAgentExecutor.test.ts` | 单元测试 | Dynamic Agent 执行器：配置解析、模板替换、fallback 链 |

### 1.2 覆盖缺口（严重）

**前端组件层（覆盖率 < 10%）**：
- 仅 `ChatMessageBubble` 有测试，其余 22+ 个聊天组件、14+ 个工作流节点编辑器、`AppShell`、`MergedSidebar`、`Settings` 等核心组件完全无测试
- `ErrorBoundary` 和 `ErrorFallback` 无测试——这是最后一道防线，却未验证
- `DebugOverlay`、`DebugBadge` 无测试——调试系统本身不可调试

**业务逻辑层**：
- `src/lib/api.ts`：AI SDK 多服务商适配逻辑无测试
- `src/lib/agentProviderRouter.ts`：模型解析链（三级回退）无测试
- `src/lib/workflow/engine.ts`：核心引擎有集成测试覆盖主要路径，但缺少异常注入测试（如 `executeNode` 抛非 Error 对象、`structuredClone` 循环引用）
- `src/lib/workflow/helpers.ts`：表达式求值器（自定义 tokenizer + parser）无直接单元测试——这是安全关键代码

**Rust 后端层（覆盖率 0%）**：
- `src-tauri/src/lib.rs`：Tauri 命令注册、数据库初始化 panic 路径无测试
- `src-tauri/src/db.rs`：538 行 SQLite CRUD 无测试
- `src-tauri/src/cli_agent.rs`：子进程 spawn、kill、超时、目录快照无测试

**端到端测试（覆盖率 0%）**：
- 项目已安装 `@tauri-apps/cli` 和 `playwright-mcp` 日志，但无 Playwright 测试文件
- 无工作流画布拖拽、节点连接、聊天流式响应的 E2E 验证

---

## 2. 测试质量分析（评分：6/10）

### 2.1 优势

- **Mock 策略合理**：`dynamicAgentExecutor.test.ts` 使用 `vi.mock` 隔离了 `agentProviderRouter` 和 `api` 模块；`workflowChat.test.ts` Mock 了 Tauri `invoke`
- **工厂函数**：`makeMessage`、`setupWorkflow` 等工厂函数减少了样板代码
- **状态隔离**：测试使用 `useAppStore.setState()` 重置，避免测试间污染

### 2.2 不足

- **断言深度不足**：大量测试使用 `toBeDefined()`、`toBe(true)`，缺少对数据结构形状的严格验证。例如 `nodeContracts.test.ts` 中 Merge 节点仅验证 `result.merged` 存在，未验证合并逻辑正确性
- **负面用例稀少**：测试主要验证"成功路径"，缺少以下验证：
  - `ErrorBoundary` 在 `getDerivedStateFromError` 后是否正确渲染
  - `debugLogger` 在 `localStorage` 满时是否静默失败
  - `evaluateExpressionSafe` 面对恶意输入（如 `__proto__` 污染）的行为
  - `withTimeout` 在 promise 已 resolve 后是否清理 timer
- **异步测试脆弱**：`appStore.test.ts` 使用 `await new Promise(r => setTimeout(r, 100))` 等待流式追加，这种固定延时在不同机器上可能 flaky
- **缺少快照测试**：UI 组件（如 `ErrorFallback`）的渲染输出未快照化，视觉回归无保障

---

## 3. 错误处理分析（评分：6/10）

### 3.1 前端错误处理

**ErrorBoundary（基础级）**：
- `ErrorBoundary.tsx` 实现了标准的 `getDerivedStateFromError` + `componentDidCatch`
- `ErrorFallback.tsx` 提供了用户友好的错误界面（中文化、重试按钮、刷新按钮）
- **缺陷**：
  - `componentDidCatch` 仅 `console.error`，未集成 `debugLogger.error()` 进行结构化记录
  - 无错误上报机制（如 Sentry、自定义上报端点）
  - 未捕获异步错误（React 19 的 `ErrorBoundary` 仍不捕获事件处理器和异步代码错误）
  - 缺少 `window.onerror` 和 `window.onunhandledrejection` 全局监听器

**工作流引擎（优秀）**：
- `engine.ts` 实现了多层错误处理：
  - 输入/输出 Schema 验证（`validateSchema`）
  - 节点级超时（`withTimeout`）
  - 节点级重试（固定退避 + 指数退避）
  - 错误分支路由（`onError: 'continue'`、`onError: 'route-to-error'`）
  - 死循环保护（`MAX_WORKFLOW_STEPS = 1000`）
  - 取消信号（`AbortSignal`）全链路传递
- **缺陷**：
  - `nodeExecError` 仅捕获 `e.message`，丢失堆栈信息
  - `structuredClone` 在循环引用 payload 时会抛出，但引擎未捕获此异常
  - 子工作流（`executeWorkflow` 递归）失败时，错误信息未附加父节点上下文

### 3.2 后端错误处理

**Rust 层（基础级）**：
- `lib.rs`：数据库初始化失败直接 `panic!`，应用崩溃而非优雅降级
- `cli_agent.rs`：子进程管理有完善的错误传播（`Result<(), String>`），超时使用 `tokio::time::timeout`
- **缺陷**：
  - `kill_cli_agent` 中 `registry.pids.lock()` 失败时返回字符串错误，但调用方可能未处理
  - `get_working_dir_snapshot` 遇到权限错误时直接返回 `Err`，缺少部分成功模式
  - 无 `panic` 钩子自定义，崩溃时无前端通知

---

## 4. 日志系统分析（评分：7/10）

### 4.1 前端日志（debugLogger）

`src/lib/debugLogger.ts` 是一个**设计优秀的客户端日志系统**：

| 特性 | 实现状态 | 评价 |
|------|----------|------|
| 日志分级 | `info`/`warn`/`error` | ✅ 满足基本需求，建议增加 `debug`/`trace` |
| 事件类型 | 12 种（click/state_change/api_call/error/...） | ✅ 覆盖主要场景 |
| 结构化日志 | `DebugLogEntry` 接口（id/timestamp/type/source/action/data/duration/level） | ✅ 可机器解析 |
| 日志持久化 | `localStorage` 存储最近 200 条，防抖写入（2s） | ✅ 页面刷新不丢失 |
| 日志轮转 | 内存最多 500 条，持久化最多 200 条 | ⚠️ 容量固定，无法配置 |
| 日志导出 | 支持 JSON 和文本格式下载 | ✅ 便于故障排查 |
| 订阅模式 | `Set<Listener>` 支持多消费者 | ✅ DebugOverlay 实时消费 |
| Stream 监控 | `StreamMonitor` 类：stall 检测（15s 阈值）、chunk 计数、字符速率 | ✅ 对 AI 流式响应非常实用 |
| 性能日志 | `performance(label, durationMs, data)` | ✅ 可追踪节点执行耗时 |

**生产环境缺陷**：
- `debugLogger` 完全依赖 `debugMode` 开关，**生产环境（debugMode=false）零日志记录**
- 没有分级输出到控制台（如 `console.error` 始终输出错误）
- 没有远程日志收集（如上报到后端或第三方服务）
- `localStorage` 持久化在存储配额满时会静默丢失日志

### 4.2 后端日志

`lib.rs` 配置了 `tauri-plugin-log`：
- 日志目录：`%APPDATA%/SimperStudio/logs/`
- 文件轮转：5MB 单文件，`KeepAll` 策略
- 日志级别：`Info`
- **缺陷**：
  - 日志级别固定为 `Info`，无法运行时调整
  - 无结构化日志（纯文本），不利于自动化分析
  - 前端 `debugLogger` 与后端 `tauri-plugin-log` 完全割裂，无法关联同一请求的上下文

---

## 5. 调试工具分析（评分：9/10）

这是项目的**最强项**。

### 5.1 DebugOverlay（调试浮窗）

`src/components/debug/DebugOverlay.tsx` 提供了专业级的本地调试体验：

- **实时日志流**：底部浮窗展示所有 debug 事件，自动滚动
- **分类过滤**：All / Clicks / State / API / Streams / Errors / Nav / Perf 标签页
- **搜索过滤**：文本搜索支持 source/action/data 全文匹配
- **悬停高亮**：鼠标悬停交互元素时显示橙色虚线框和 `data-debug-source` 信息
- **快捷操作**：
  - `Escape` 折叠/展开
  - 清除日志、导出 JSON/TXT
  - 统计徽章（实时显示 error/api/state 数量）
- **零开销设计**：`useAppStore.subscribe` 在 `debugMode=false` 时直接 return，不触发 React 重渲染

### 5.2 DebugBadge（调试徽章）

- 组件级标识，显示组件名（如 `ChatMessageBubble`）
- 支持 4 个方位定位
- 仅在 `debugMode` 下渲染

### 5.3 useDebugTrack Hook

- `trackClick`：包装 onClick 处理器，自动记录点击事件
- `debugProps`：生成 `data-debug-source` / `data-debug-action` 属性，供 HoverHighlight 消费
- 与 DebugOverlay 形成闭环：开发者点击 UI → 日志记录 → 浮窗展示 → 悬停定位

### 5.4 StreamMonitor

- 自动检测流式响应 stall（15 秒无 chunk）
- 记录 chunk 数量、字符数、thinking 字符数
- 计算 charsPerSec，帮助诊断模型响应慢问题

**改进建议**：
- 增加 **Performance Timeline** 可视化（类似 Chrome DevTools 的火焰图）
- 增加 **State Diff** 视图（不仅显示 changed keys，还显示前后值对比）
- 增加 **Network Waterfall**（API 调用时序图）

---

## 6. 可观测性分析（评分：5/10）

### 6.1 状态变化追踪

`src/stores/index.ts` 实现了 Zustand 状态订阅追踪：
- 追踪 10 个关键状态键（`activeSessionId`、`currentView`、`debugMode` 等）
- 记录 `from` / `to` 值变化
- **局限**：
  - 仅追踪白名单键，大量业务状态（如 `messages` 内容变化）未追踪
  - 无状态变化时序图
  - 未追踪状态变化触发者（哪个 action 导致的变化）

### 6.2 性能监控

- 工作流节点记录 `startTime`/`endTime`/`durationMs`
- `api.ts` 记录 API 调用耗时
- **缺失**：
  - React 渲染性能（组件 mount/update 耗时）
  - 内存使用监控（AI 流式响应可能累积大量文本）
  - 主线程阻塞检测（Long Task）

### 6.3 执行时间线

- 工作流引擎有 `nodeRecords` 记录每节点状态
- `ExecutionTimeline` 组件（提及于 Development.md）可查看
- **缺失**：
  - 跨会话的时间线持久化
  - 历史执行对比（同一工作流多次运行的性能趋势）

---

## 7. 故障排查分析（评分：6/10）

### 7.1 错误信息清晰度

- `agentProviderRouter.ts` 的 `shortError()` 将 HTTP/网络错误翻译为中文短提示（如 `API Key 错误 (401)`、`请求频率限制 (429)`）
- 工作流错误携带节点 ID 和尝试次数
- **不足**：
  - 缺少错误码体系（如 `SS-E1001`），用户报告问题时难以精确定位
  - 工作流错误未显示可视化路径（哪个节点 → 哪个边 → 哪个节点出错）
  - 无 "复制诊断信息" 按钮（一键复制环境版本、错误日志、状态快照）

### 7.2 堆栈追踪

- 前端：Vite 构建应生成 source map，但未验证是否部署到生产
- Rust：panic 时无自定义钩子，堆栈未格式化输出到日志
- 工作流引擎：`nodeExecError = e.message` 丢失了 JavaScript 堆栈

### 7.3 诊断工具

- `docs/Development.md` 提供了常用调试场景速查表（工作流卡住、API 失败、持久化失效等）
- 设置页有模型连通性测试按钮
- **缺失**：
  - 内置 "系统健康检查" 页面（验证 Tauri 后端、数据库、网络、模型连通性）
  - 日志打包功能（一键导出前后端日志供开发者分析）

---

## 8. 容错机制分析（评分：7/10）

### 8.1 工作流引擎容错

| 机制 | 实现 | 评价 |
|------|------|------|
| 超时 | 节点级 `timeoutMs` + `withTimeout` | ✅ 完善 |
| 重试 | `maxAttempts` + `fixed`/`exponential` 退避 | ✅ 完善 |
| 错误分支 | `onError: 'continue'` / `'route-to-error'` | ✅ 灵活 |
| 死循环保护 | `MAX_WORKFLOW_STEPS = 1000` | ✅ 必要 |
| 取消 | `AbortSignal` 全链路 | ✅ 完善 |
| 输入验证 | `inputSchema` / `outputSchema` | ✅ 基础类型检查 |

### 8.2 网络与 AI 调用容错

- `api.ts` 无自动重试机制——AI 服务商偶发 429/503 会直接失败
- `fetchFromProvider` 无请求超时（依赖 `streamText` 内部超时）
- 无降级方案：如 OpenAI 失败时自动切换到 Anthropic

### 8.3 存储容错

- `localStorage` 满时 `debugLogger` 静默失败
- 浏览器模式（`npm run dev`）使用 `localStorage` 回退，但无容量监控
- SQLite 数据库损坏时 `lib.rs` 直接 panic

### 8.4 进程容错

- `cli_agent.rs` 有超时（默认 5 分钟）和强制终止（`taskkill` / `SIGKILL`）
- 应用退出时自动清理所有子进程
- **不足**：子进程僵尸状态未处理（`stdout_handle.await` 使用 `let _ =` 忽略错误）

---

## 9. 边界情况分析（评分：5/10）

### 9.1 已覆盖的边界

- 工作流空节点/空边：引擎会找不到 `startNode` 而返回 error
- 循环引用 payload：`structuredClone` 会抛异常，但引擎未显式捕获
- 流式响应空 chunk：`streamChunk` 记录空字符串长度 0，不会崩溃
- 表达式求除零：`evalNode` 中 `Number(right) !== 0` 检查，返回 `Infinity`

### 9.2 未覆盖的边界（高风险）

| 场景 | 风险等级 | 说明 |
|------|----------|------|
| 并发工作流执行 | 🔴 高 | 无测试验证多个工作流同时执行时的状态隔离 |
| 网络抖动/断网 | 🔴 高 | AI 调用和 HTTP 节点无断网重连逻辑 |
| `localStorage` 配额满 | 🟡 中 | `debugLogger` 和浏览器模式配置会静默失败 |
| 超大 payload | 🟡 中 | `structuredClone` 大对象可能导致主线程阻塞 |
| 恶意表达式注入 | 🟡 中 | `evaluateExpressionSafe` 无 `__proto__` / `constructor` 过滤 |
| Rust 端并发 DB 访问 | 🟡 中 | `Mutex<Connection>` 串行化，但死锁场景未测试 |
| 模型返回非预期格式 | 🟡 中 | `streamText` 结果解析失败路径未测试 |
| 时区/时间戳溢出 | 🟢 低 | `Date.now()` 在 2286 年前安全 |

---

## 10. 测试基础设施分析（评分：3/10）

### 10.1 当前状态

- **测试框架**：Vitest 4.x + @testing-library/react + jsdom
- **测试命令**：`npm test`（一次性）、`npm run test:watch`（监听）
- **Mock 支持**：`src/test/setup.ts` 提供了 `Worker` 和 `URL.createObjectURL` 的 jsdom 兼容 Mock
- **无 CI/CD**：`.github/` 目录不存在，无 GitHub Actions / 其他 CI 配置
- **无覆盖率**：`vite.config.ts` 未配置 `coverage` 提供者（如 `@vitest/coverage-v8`）
- **无 E2E**：Playwright 未配置测试（仅有 MCP 日志）

### 10.2 环境配置

`vite.config.ts` 测试配置：
```ts
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/test/setup.ts',
  css: false,
}
```
- `globals: true` 方便但可能导致与全局变量污染
- `css: false` 合理，加速测试
- 缺少 `isolate: true` 显式配置（Vitest 默认已隔离）

---

## 问题清单

### P0（阻塞发布）

| # | 问题 | 影响 | 位置 |
|---|------|------|------|
| P0-1 | **Rust 后端零测试**：`db.rs`、`cli_agent.rs` 无单元/集成测试，数据层和进程管理完全无自动化验证 | 数据损坏、进程泄漏风险 | `src-tauri/src/` |
| P0-2 | **无 CI/CD 流水线**：每次提交无自动测试、无构建验证、无发布检查 | 回归风险极高，无法保障主分支稳定性 | 根目录 |
| P0-3 | **数据库初始化失败直接 panic**：`lib.rs` 中 `init_db()` 失败时 `panic!`，应用直接崩溃 | 用户首次启动即闪退，无法诊断 | `src-tauri/src/lib.rs:33` |
| P0-4 | **ErrorBoundary 未集成日志**：`componentDidCatch` 仅 `console.error`，未写入 `debugLogger`，生产环境错误完全丢失 | 无法追踪用户端崩溃 | `src/components/ErrorBoundary.tsx:25` |

### P1（严重影响）

| # | 问题 | 影响 | 位置 |
|---|------|------|------|
| P1-1 | **前端组件测试覆盖率 < 10%**：仅 1 个组件有测试，核心 UI（Settings、WorkflowCanvas、Sidebar）完全无验证 | UI 回归无法发现 | `src/components/` |
| P1-2 | **无 E2E 测试**：工作流拖拽、聊天流式响应、设置保存等用户核心路径无端到端验证 | 关键用户旅程断裂风险 | `e2e/`（缺失） |
| P1-3 | **生产环境零日志**：`debugLogger` 在 `debugMode=false` 时完全静默，错误和性能问题无法追溯 | 线上故障黑盒 | `src/lib/debugLogger.ts` |
| P1-4 | **AI 调用无自动重试**：`api.ts` 直接调用 `streamText`，遇到 429/503 无退避重试 | 用户体验差，工作流易失败 | `src/lib/api.ts` |
| P1-5 | **表达式求值器无安全审计**：`evaluateExpressionSafe` 虽替换了 `new Function`，但未过滤 `__proto__` / `constructor` 等危险属性 | 潜在原型污染风险 | `src/lib/workflow/helpers.ts` |
| P1-6 | **无测试覆盖率报告**：无法量化覆盖缺口，无法设定覆盖目标 | 测试改进无方向 | `vite.config.ts` |
| P1-7 | **全局未捕获异常未监听**：无 `window.onerror` / `onunhandledrejection` 监听器，Promise 拒绝和同步错误可能静默丢失 | 错误漏报 | `src/main.tsx` |

### P2（建议改进）

| # | 问题 | 影响 | 位置 |
|---|------|------|------|
| P2-1 | **DebugOverlay 无测试**：调试系统本身不可测试，回归风险 | 调试工具失效 | `src/components/debug/` |
| P2-2 | **日志容量不可配置**：`maxEntries` 固定 500，`MAX_PERSISTED_ENTRIES` 固定 200 | 长期运行会话日志丢失 | `src/lib/debugLogger.ts` |
| P2-3 | **前后端日志上下文割裂**：前端 `debugLogger` 与后端 `tauri-plugin-log` 无统一 trace ID | 跨层故障排查困难 | 全局 |
| P2-4 | **缺少性能指标收集**：无 FPS、内存、Long Task 监控 | 性能退化无感知 | 全局 |
| P2-5 | **错误码体系缺失**：无结构化错误码（如 `SS-E1001`） | 用户报告问题模糊 | 全局 |
| P2-6 | **测试使用固定延时**：`appStore.test.ts` 中 `setTimeout(r, 100)` 可能 flaky | 测试不稳定 | `src/store/__tests__/appStore.test.ts:38` |
| P2-7 | **Rust 日志无结构化**：`tauri-plugin-log` 输出纯文本，不利于解析 | 自动化分析困难 | `src-tauri/src/lib.rs` |
| P2-8 | **无系统健康检查页面**：用户无法自助诊断 Tauri/DB/网络/模型状态 | 支持成本高 | 全局 |

---

## 改进建议

### 短期（1-2 周）

1. **添加 Rust 单元测试**
   - 为 `db.rs` 添加内存 SQLite 测试（`Connection::open_in_memory()`）
   - 为 `cli_agent.rs` 的 `get_working_dir_snapshot` 添加临时目录测试
   - 使用 `tauri::test` 模块测试命令处理器

2. **配置 CI/CD**
   ```yaml
   # .github/workflows/ci.yml 建议结构
   - 前端测试：npm test
   - 前端构建：npm run build
   - Rust 测试：cd src-tauri && cargo test
   - Tauri 构建：npm run tauri build
   - 覆盖率上传：codecov / 其他平台
   ```

3. **修复 P0 级错误处理**
   - `lib.rs`：数据库初始化失败时返回错误到前端，显示引导修复页面，而非 panic
   - `ErrorBoundary`：集成 `debugLogger.error()` 和全局错误上报
   - `main.tsx`：添加 `window.onerror` 和 `window.onunhandledrejection` 监听器

4. **启用测试覆盖率**
   ```bash
   npm install -D @vitest/coverage-v8
   ```
   在 `vite.config.ts` 中配置 `coverage` 提供者，设定目标：行覆盖率 > 60%。

### 中期（1 个月）

5. **扩展组件测试**
   - 优先覆盖：`ErrorBoundary`、`ErrorFallback`、`DebugOverlay`、`Settings` 核心页签
   - 使用 `@testing-library/user-event` 测试交互（点击、输入、拖拽）
   - 为 `workflow/nodeExecutors/` 下所有执行器添加单元测试

6. **添加 E2E 测试（Playwright）**
   ```bash
   npm install -D @playwright/test
   ```
   优先场景：
   - 创建 Agent → 发送消息 → 验证流式响应
   - 创建工作流 → 拖拽节点 → 连接边 → 执行 → 验证结果
   - 切换设置 → 验证持久化

7. **生产环境日志**
   - 创建 `productionLogger.ts`：在 `debugMode=false` 时仍记录 `error`/`warn` 到 `localStorage`（限制 50 条）
   - 添加 "导出诊断包" 功能：打包前端日志 + 后端日志 + 应用版本 + 状态快照
   - 后端日志增加 JSON 结构化输出选项

8. **AI 调用容错增强**
   - 在 `api.ts` 中添加指数退避重试（最多 3 次，针对 429/503/网络错误）
   - 添加请求超时（如 60 秒）
   - 考虑添加 "服务商降级" 配置（主服务商失败时切换到备用）

### 长期（2-3 个月）

9. **可观测性平台化**
   - 设计统一 Trace ID，贯穿前端 `debugLogger` → Tauri invoke → Rust 命令 → 数据库
   - 增加 React 性能监控（`Profiler` API 包装关键组件）
   - 增加内存监控（定期记录 `performance.memory`）
   - 考虑集成轻量级遥测（如 PostHog 或自研上报）

10. **安全加固**
    - 审计 `evaluateExpressionSafe`：添加 `__proto__`、`constructor`、`prototype` 黑名单
    - 对 `code` 节点执行增加沙箱隔离（目前 MockWorker 在测试环境用 `AsyncFunction`，生产环境用真实 Worker，需确保 CSP 限制）
    - 对 `template` 变量替换增加 XSS 过滤

11. **测试策略体系化**
    - 制定测试金字塔目标：单元 70% / 集成 20% / E2E 10%
    - 核心模块覆盖率目标：
      - `lib/workflow/`：> 80%
      - `stores/`：> 70%
      - `components/`：> 50%
      - `src-tauri/src/`：> 60%
    - 引入 mutation testing（如 `stryker-js`）验证测试有效性

---

## 结论

SimperStudio 的调试体验在同类桌面应用中属于**上游水平**，`DebugOverlay` + `StreamMonitor` + `useDebugTrack` 的组合为开发者提供了近乎实时的可观测性。工作流引擎的容错设计（超时、重试、错误分支、取消）也体现了对生产环境的思考。

然而，项目当前处于**"强调试、弱保障"**的不平衡状态：

- **测试是最大短板**：7 个测试文件、0% Rust 覆盖率、0% E2E 覆盖率，无法支撑持续迭代
- **生产可观测性断层**：调试系统仅在开发模式可用，用户遇到问题时开发者几乎无法获取现场信息
- **基础设施缺失**：无 CI/CD 意味着代码质量完全依赖人工检查

**建议优先级**：
1. **立即**：修复 P0 问题（Rust 测试、CI/CD、panic 处理、ErrorBoundary 日志）
2. **本月**：补齐核心组件测试 + E2E 核心路径 + 覆盖率报告
3. **本季度**：建立生产日志体系 + 可观测性平台 + 安全审计

只有在测试和可观测性双轮驱动下，这个"小而美"的 AI 工作流工具才能在用户手中真正"美"得稳定可靠。

---

*报告生成完毕。如需针对某一维度深入分析或制定具体实施计划，请进一步说明。*
