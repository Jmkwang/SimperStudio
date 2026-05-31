# SettingsView 组件化重构方案

## 问题

`SettingsView.tsx` 单文件 1100+ 行，三个页签（通用/外观/模型）以及三个对话框全部耦合在同一组件中。对话框引用了 models 页签的数据（`selectedProvider`），但挂载在页签条件渲染外部，切换页签时易因作用域不一致导致黑屏。

## 目标

将三个页签拆分为独立组件，每个组件自包含其状态、逻辑和对话框。SettingsView 简化为纯路由壳。

## 拆分方案

```
src/components/settings/
├── SettingsView.tsx              ← 薄壳：左侧标签栏 + 页签路由
├── SettingsGeneralTab.tsx        ← 通用设置（语言、远程访问）
├── SettingsAppearanceTab.tsx     ← 外观设置（主题切换）
└── SettingsModelsTab.tsx         ← 模型管理（服务商 CRUD、模型测试、API 格式）
```

## 各组件职责

### SettingsView（~60 行）
- 左侧标签栏（General / Appearance / Models）
- `activeTab` 状态
- 按 activeTab 路由渲染对应子组件

### SettingsGeneralTab（~50 行）
- 语言选择（中文/English/Español）
- 远程访问开关 + 端口配置
- 保存按钮 → `updateSettings`

### SettingsAppearanceTab（~30 行）
- 主题选择（Light / Dark / System）
- 保存按钮 → `updateSettings` + `setTheme`

### SettingsModelsTab（~600 行）
- 服务商列表 + 行内添加
- 服务商详情面板（名称、类型、API 格式、Base URL、API Key）
- 模型分组列表（展开/折叠、分组名编辑、模型增删、默认设星）
- 模型连通性测试（单模型 + 全部，费用提示）
- 获取模型列表弹窗（拉取 → 全选 → 添加）
- 所有对话框内聚在此组件内

## 共享数据

| 数据 | 来源 | 使用方 |
|------|------|--------|
| `settings` | `useAppStore` | 所有组件 |
| `updateSettings` | `useAppStore` | GeneralTab, AppearanceTab |
| `addProvider/updateProvider/deleteProvider/setActiveProvider` | `useAppStore` | ModelsTab |
| `t()` | `useTranslation` | 所有组件 |
| `setTheme` | `useTheme` | AppearanceTab |

所有数据通过各组件直接调用 `useAppStore` 获取，无需 props 传递。

## 实施步骤

1. 创建 `SettingsGeneralTab.tsx`
2. 创建 `SettingsAppearanceTab.tsx`
3. 创建 `SettingsModelsTab.tsx`，将模型相关的状态、函数、JSX 完整迁移
4. 精简 `SettingsView.tsx`，仅保留标签栏和页签路由
5. TypeScript 编译验证
6. 浏览器功能回归

## 验收

- [ ] 三个页签正常切换，无黑屏
- [ ] 通用设置：语言切换、远程访问、保存
- [ ] 外观设置：主题切换、保存
- [ ] 模型管理：服务商 CRUD、模型增删、API 格式切换、连通性测试、获取模型列表
- [ ] 切换页签后再切回，状态保持
