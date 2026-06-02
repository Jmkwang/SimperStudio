# SimperStudio 审查部门子代理

基于 `docs/archive/review-department` 的角色定义，为 SimperStudio 项目生成的 12 个专业审查子代理。

## 🏢 工程部（Engineering Department）

| 代理 | 文件 | 职责 |
|------|------|------|
| ⚡ 快速原型师 | `engineering/rapid-prototyper.md` | MVP 速度、核心假设验证、迭代效率 |
| 🏛️ 软件架构师 | `engineering/software-architect.md` | 领域建模、架构模式、权衡分析、ADR |
| ✍️ 技术文档工程师 | `engineering/technical-writer.md` | 文档完整性、准确性、可用性、一致性 |
| 🔄 自主优化架构师 | `engineering/autonomous-optimization-architect.md` | 成本控制、熔断机制、模型优化 |
| 📊 数据工程师 | `engineering/data-engineer.md` | 数据一致性、Schema 设计、数据质量 |
| 👀 代码审查员 | `engineering/code-reviewer.md` | 安全性、正确性、性能、可维护性 |

## 🎨 设计部（Design Department）

| 代理 | 文件 | 职责 |
|------|------|------|
| 🎨 UI 设计师 | `design/ui-designer.md` | 设计系统、组件复用、无障碍合规 |
| 🔍 UX 研究员 | `design/ux-researcher.md` | 用户画像、用户旅程、可用性评估 |
| 🏗️ UX 架构师 | `design/ux-architect.md` | CSS 架构、组件架构、信息架构 |
| 🎬 视觉叙事师 | `design/visual-storyteller.md` | 品牌叙事、视觉一致性、信息可视化 |
| ✨ 趣味注入师 | `design/whimsy-injector.md` | 品牌个性、微交互、文案风格 |
| 🌈 包容性视觉专家 | `design/inclusive-visuals-specialist.md` | 文化包容性、无障碍、国际化 |

## 使用方法

### 1. 单个代理审查

使用 Agent 工具调用特定代理：

```
Agent(subagent_type="code-reviewer", prompt="审查 src/components/chat/ 目录的代码质量")
```

### 2. 多代理联合审查

可以同时调用多个代理进行不同维度的审查：

```
# 并行调用多个代理
parallel([
  () => Agent("code-reviewer", "审查安全性"),
  () => Agent("ui-designer", "审查设计一致性"),
  () => Agent("data-engineer", "审查数据层")
])
```

### 3. 完整审查流程

使用 Workflow 工具编排完整的审查流程：

```javascript
Workflow({
  phases: [
    { title: '工程审查', agents: ['code-reviewer', 'software-architect', 'data-engineer'] },
    { title: '设计审查', agents: ['ui-designer', 'ux-architect', 'ux-researcher'] },
    { title: '专项审查', agents: ['autonomous-optimization-architect', 'technical-writer'] }
  ]
})
```

## 审查维度

每个代理专注于不同的审查维度：

### 工程维度
- **快速原型师**：MVP 价值、验证速度、迭代效率
- **软件架构师**：架构健康度、领域模型、权衡决策
- **技术文档工程师**：文档质量、完整性、可用性
- **自主优化架构师**：成本控制、风险缓解、优化策略
- **数据工程师**：数据一致性、Schema 质量、可靠性
- **代码审查员**：代码质量、安全性、性能

### 设计维度
- **UI 设计师**：视觉一致性、组件复用、无障碍
- **UX 研究员**：用户需求、可用性、竞品对比
- **UX 架构师**：技术架构、信息架构、组件边界
- **视觉叙事师**：品牌传达、视觉故事、信息可视化
- **趣味注入师**：品牌个性、微交互、文案风格
- **包容性视觉专家**：文化包容、无障碍、国际化

## 输出格式

每个代理都会以结构化的方式输出审查结果，包括：
- **评估**：当前状态的评分和分析
- **问题**：发现的问题和风险点
- **建议**：具体的改进建议
- **优先级**：按影响程度排序的改进项

## 项目上下文

所有代理都已配置了 SimperStudio 项目的上下文，包括：
- 技术栈：Tauri 2 + React 19 + Zustand + TypeScript
- 架构特点：5 层状态管理、函数式工作流引擎、多服务商模型路由
- 当前版本：v0.5.4
- 待办事项：参考 `docs/TODO_active.md`
