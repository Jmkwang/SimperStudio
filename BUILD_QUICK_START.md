# 🚀 一键打包快速参考

## 最简单的方式

```bash
npm run package
```

完成！安装程序会生成在 `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/`

---

## 所有命令

| 命令 | 说明 |
|---|---|
| `npm run package` | 完整打包 |
| `npm run package:clean` | 清理后打包 |
| `npm run package:frontend` | 仅构建前端 |
| `npm run package:backend` | 仅编译后端 |
| `node build.js --help` | 显示帮助 |

---

## 输出文件

打包完成后，在这里找到安装程序：

```
src-tauri/target/x86_64-pc-windows-msvc/release/bundle/
├── nsis/
│   └── SimperStudio_0.4.3_x64-setup.exe    ← 推荐使用
└── msi/
    └── SimperStudio_0.4.3_x64_en-US.msi
```

---

## 常见场景

### 修改了前端代码
```bash
npm run package:frontend
```

### 修改了 Rust 代码
```bash
npm run package:backend
```

### 遇到构建问题
```bash
npm run package:clean
```

### 完整打包
```bash
npm run package
```

---

## 详细文档

见 `PACKAGING.md`
