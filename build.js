#!/usr/bin/env node

/**
 * SimperStudio 一键打包脚本
 * 用法: node build.js [options]
 *
 * 选项:
 *   --clean      清理旧构建产物后再打包
 *   --frontend   仅构建前端（不打包）
 *   --backend    仅编译 Rust 后端
 *   --help       显示帮助信息
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const shouldClean = args.includes('--clean');
const frontendOnly = args.includes('--frontend');
const backendOnly = args.includes('--backend');
const showHelpFlag = args.includes('--help');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`  ${title}`, 'bright');
  log(`${'='.repeat(60)}\n`, 'blue');
}

function runCommand(cmd, description) {
  log(`▶ ${description}...`, 'yellow');
  try {
    execSync(cmd, { stdio: 'inherit', shell: true, cwd: __dirname });
    log(`✓ ${description} 完成`, 'green');
    return true;
  } catch (error) {
    log(`✗ ${description} 失败`, 'red');
    process.exit(1);
  }
}

function displayHelp() {
  log(`
SimperStudio 一键打包脚本

用法:
  node build.js [options]

选项:
  --clean      清理旧构建产物后再打包
  --frontend   仅构建前端（不打包）
  --backend    仅编译 Rust 后端
  --help       显示此帮助信息

示例:
  node build.js              # 完整打包
  node build.js --clean      # 清理后打包
  node build.js --frontend   # 仅构建前端
  node build.js --backend    # 仅编译后端

输出位置:
  前端资源:     dist/
  Rust 二进制:  src-tauri/target/x86_64-pc-windows-msvc/release/tmp_tauri.exe
  NSIS 安装程序: src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/
  MSI 安装程序:  src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/
  `, 'blue');
}

function cleanBuild() {
  logSection('清理旧构建产物');
  const dirsToClean = [
    'dist',
    'src-tauri/target',
  ];

  for (const dir of dirsToClean) {
    const fullPath = path.join(__dirname, dir);
    if (fs.existsSync(fullPath)) {
      log(`删除 ${dir}...`, 'yellow');
      try {
        execSync(`${process.platform === 'win32' ? 'rmdir /s /q' : 'rm -rf'} "${fullPath}"`, { stdio: 'inherit', shell: true });
      } catch (e) {
        // 忽略删除错误
      }
    }
  }
  log('✓ 清理完成\n', 'green');
}

function buildFrontend() {
  logSection('构建前端');
  runCommand('npm run build', '前端构建 (TypeScript + Vite)');
}

function buildBackend() {
  logSection('编译 Rust 后端');
  runCommand('cd src-tauri && cargo build --release && cd ..', 'Rust 后端编译');
}

function buildPackage() {
  logSection('生成安装程序');
  runCommand('npx tauri build', '打包应用');
}

function showResults() {
  logSection('打包完成');

  const bundlePath = path.join(__dirname, 'src-tauri/target/x86_64-pc-windows-msvc/release/bundle');
  const nsiPath = path.join(bundlePath, 'nsis');
  const msiPath = path.join(bundlePath, 'msi');

  log('生成的文件:\n', 'green');

  if (fs.existsSync(nsiPath)) {
    const files = fs.readdirSync(nsiPath).filter(f => f.endsWith('.exe'));
    for (const file of files) {
      const filePath = path.join(nsiPath, file);
      const size = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
      log(`  📦 ${file} (${size} MB)`, 'green');
      log(`     路径: ${filePath}\n`, 'yellow');
    }
  }

  if (fs.existsSync(msiPath)) {
    const files = fs.readdirSync(msiPath).filter(f => f.endsWith('.msi'));
    for (const file of files) {
      const filePath = path.join(msiPath, file);
      const size = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
      log(`  📦 ${file} (${size} MB)`, 'green');
      log(`     路径: ${filePath}\n`, 'yellow');
    }
  }

  log('推荐使用 NSIS 版本 (.exe)，用户体验更好。\n', 'blue');
}

// 主程序
async function main() {
  if (showHelpFlag) {
    displayHelp();
    return;
  }

  log('\n🚀 SimperStudio 打包工具\n', 'bright');

  if (shouldClean) {
    cleanBuild();
  }

  if (frontendOnly) {
    buildFrontend();
    log('\n✓ 前端构建完成，输出在 dist/ 目录\n', 'green');
    return;
  }

  if (backendOnly) {
    buildBackend();
    log('\n✓ 后端编译完成\n', 'green');
    return;
  }

  // 完整打包流程
  buildFrontend();
  buildBackend();
  buildPackage();
  showResults();
}

main().catch(error => {
  log(`\n✗ 打包失败: ${error.message}\n`, 'red');
  process.exit(1);
});
