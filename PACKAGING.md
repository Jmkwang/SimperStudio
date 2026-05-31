# 🚀 SimperStudio 打包指南

## 快速开始

### 方式 1：使用 npm 命令（推荐）

```bash
# 完整打包
npm run package

# 清理后打包
npm run package:clean

# 仅构建前端
npm run package:frontend

# 仅编译后端
npm run package:backend
```

### 方式 2：使用 Node.js 脚本

```bash
# 完整打包
node build.js

# 清理后打包
node build.js --clean

# 仅构建前端
node build.js --frontend

# 仅编译后端
node build.js --backend

# 显示帮助
node build.js --help
```

### 方式 3：使用 Windows Batch 脚本

```bash
# 完整打包
build.bat

# 清理后打包
build.bat --clean

# 仅构建前端
build.bat --frontend

# 仅编译后端
build.bat --backend

# 显示帮助
build.bat --help
```

---

## 打包流程说明

### 完整打包包含以下步骤：

1. **前端构建** (TypeScript + Vite)
   - 编译 TypeScript
   - 打包 React 应用
   - 输出到 `dist/` 目录

2. **Rust 后端编译**
   - 编译 Tauri 后端
   - 输出二进制到 `src-tauri/target/x86_64-pc-windows-msvc/release/`

3. **生成安装程序**
   - 生成 NSIS 安装程序 (.exe)
   - 生成 MSI 安装程序 (.msi)

---

## 输出文件位置

打包完成后，安装程序位于：

```
src-tauri/target/x86_64-pc-windows-msvc/release/bundle/
├── nsis/
│   └── SimperStudio_0.4.3_x64-setup.exe    ← 推荐使用
└── msi/
    └── SimperStudio_0.4.3_x64_en-US.msi
```

### 文件说明

| 文件 | 大小 | 说明 |
|---|---|---|
| `SimperStudio_0.4.3_x64-setup.exe` | ~3 MB | NSIS 安装程序，用户体验更好 |
| `SimperStudio_0.4.3_x64_en-US.msi` | ~5 MB | MSI 安装程序，企业环境常用 |

---

## 常见场景

### 场景 1：快速打包（推荐）
```bash
npm run package
```
适合日常开发和发布。

### 场景 2：完全重新打包
```bash
npm run package:clean
```
适合修改了 Rust 代码或遇到构建问题时。

### 场景 3：仅修改了前端代码
```bash
npm run package:frontend
```
快速验证前端改动，不需要重新编译 Rust。

### 场景 4：仅修改了 Rust 代码
```bash
npm run package:backend
```
快速编译后端，不需要重新构建前端。

---

## 手动打包（完全控制）

如果需要更细粒度的控制，可以手动执行每一步：

```bash
# 1. 清理旧构建
rm -rf dist src-tauri/target

# 2. 前端构建
npm run build

# 3. Rust 编译
cd src-tauri
cargo build --release
cd ..

# 4. 生成安装程序
npx tauri build
```

---

## 版本号同步

修改版本号时，需要同步三处：

1. **package.json**
   ```json
   "version": "0.4.3"
   ```

2. **src-tauri/tauri.conf.json**
   ```json
   "version": "0.4.3"
   ```

3. **src-tauri/Cargo.toml**
   ```toml
   version = "0.4.3"
   ```

---

## 故障排除

### 问题 1：Rust 编译失败
```bash
# 清理 Rust 缓存
cd src-tauri
cargo clean
cd ..

# 重新打包
npm run package:clean
```

### 问题 2：前端构建失败
```bash
# 清理 node_modules
rm -rf node_modules package-lock.json

# 重新安装依赖
npm install

# 重新打包
npm run package
```

### 问题 3：找不到 WiX 或 NSIS
这些工具由 Tauri 自动下载。如果缺失，运行：
```bash
npx tauri build
```
Tauri 会自动下载所需工具。

---

## 脚本文件说明

### build.js
- **类型**：Node.js 脚本
- **优点**：跨平台（Windows/Mac/Linux）
- **用法**：`node build.js [options]`

### build.bat
- **类型**：Windows Batch 脚本
- **优点**：无需 Node.js 环境
- **用法**：`build.bat [options]`

---

## 环境要求

- Node.js 18+
- Rust 1.70+
- Windows 10+ (for building Windows installers)
- 网络连接（首次打包会下载 WiX 和 NSIS）

---

## 更多信息

- 项目文档：见 `docs/Development.md`
- Tauri 官方文档：https://tauri.app/
- 打包配置：`src-tauri/tauri.conf.json`
