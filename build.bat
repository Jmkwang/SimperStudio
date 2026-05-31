@echo off
REM SimperStudio 一键打包脚本 (Windows)
REM 用法: build.bat [options]
REM 选项: --clean 清理旧构建 | --frontend 仅前端 | --backend 仅后端 | --help 帮助

setlocal enabledelayedexpansion

set "CLEAN=0"
set "FRONTEND_ONLY=0"
set "BACKEND_ONLY=0"
set "SHOW_HELP=0"

REM 解析参数
for %%A in (%*) do (
    if "%%A"=="--clean" set "CLEAN=1"
    if "%%A"=="--frontend" set "FRONTEND_ONLY=1"
    if "%%A"=="--backend" set "BACKEND_ONLY=1"
    if "%%A"=="--help" set "SHOW_HELP=1"
)

if %SHOW_HELP%==1 (
    echo.
    echo SimperStudio 一键打包脚本
    echo.
    echo 用法:
    echo   build.bat [options]
    echo.
    echo 选项:
    echo   --clean      清理旧构建产物后再打包
    echo   --frontend   仅构建前端（不打包）
    echo   --backend    仅编译 Rust 后端
    echo   --help       显示此帮助信息
    echo.
    echo 示例:
    echo   build.bat              # 完整打包
    echo   build.bat --clean      # 清理后打包
    echo   build.bat --frontend   # 仅构建前端
    echo   build.bat --backend    # 仅编译后端
    echo.
    exit /b 0
)

echo.
echo ============================================================
echo   SimperStudio 打包工具
echo ============================================================
echo.

if %CLEAN%==1 (
    echo [清理] 删除旧构建产物...
    if exist dist rmdir /s /q dist
    if exist src-tauri\target rmdir /s /q src-tauri\target
    echo [✓] 清理完成
    echo.
)

if %FRONTEND_ONLY%==1 (
    echo [构建] 前端构建 (TypeScript + Vite)...
    call npm run build
    if errorlevel 1 (
        echo [✗] 前端构建失败
        exit /b 1
    )
    echo [✓] 前端构建完成，输出在 dist/ 目录
    echo.
    exit /b 0
)

if %BACKEND_ONLY%==1 (
    echo [编译] Rust 后端编译...
    cd src-tauri
    cargo build --release
    if errorlevel 1 (
        echo [✗] 后端编译失败
        cd ..
        exit /b 1
    )
    cd ..
    echo [✓] 后端编译完成
    echo.
    exit /b 0
)

REM 完整打包流程
echo [构建] 前端构建 (TypeScript + Vite)...
call npm run build
if errorlevel 1 (
    echo [✗] 前端构建失败
    exit /b 1
)
echo [✓] 前端构建完成
echo.

echo [编译] Rust 后端编译...
cd src-tauri
cargo build --release
if errorlevel 1 (
    echo [✗] 后端编译失败
    cd ..
    exit /b 1
)
cd ..
echo [✓] 后端编译完成
echo.

echo [打包] 生成安装程序...
call npx tauri build
if errorlevel 1 (
    echo [✗] 打包失败
    exit /b 1
)
echo [✓] 打包完成
echo.

echo ============================================================
echo   打包完成！
echo ============================================================
echo.
echo 生成的文件:
echo.

if exist "src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis" (
    for %%F in (src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis\*.exe) do (
        for /F "usebackq" %%A in ('%%~zF') do set /A "SIZE=%%A/1024/1024"
        echo   📦 %%~nF (!SIZE! MB^)
        echo      路径: %%F
        echo.
    )
)

if exist "src-tauri\target\x86_64-pc-windows-msvc\release\bundle\msi" (
    for %%F in (src-tauri\target\x86_64-pc-windows-msvc\release\bundle\msi\*.msi) do (
        for /F "usebackq" %%A in ('%%~zF') do set /A "SIZE=%%A/1024/1024"
        echo   📦 %%~nF (!SIZE! MB^)
        echo      路径: %%F
        echo.
    )
)

echo 推荐使用 NSIS 版本 (.exe)，用户体验更好。
echo.

endlocal
