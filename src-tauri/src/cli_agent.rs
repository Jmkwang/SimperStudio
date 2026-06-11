use std::collections::HashMap;
use std::path::Path;
use tokio::sync::Mutex;
use std::time::Instant;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use log::{info, warn, error};

// ---------------------------------------------------------------------------
// Security: allowed executables whitelist
// ---------------------------------------------------------------------------

const ALLOWED_EXECUTABLES: &[&str] = &[
    "npx", "npm", "node", "python", "python3", "cargo", "git", "docker",
    "pnpm", "yarn", "bun", "rustup", "rustc", "go", "dotnet", "mvn", "gradle",
];

const ALLOWED_ENV_PREFIXES: &[&str] = &["SIMPER_"];
const ALLOWED_ENV_EXACT: &[&str] = &[
    "NODE_ENV", "HOME", "USERPROFILE", "HOMEDRIVE", "HOMEPATH",
    "APPDATA", "LOCALAPPDATA", "TEMP", "TMP", "XDG_CONFIG_HOME",
    "RUST_LOG", "RUST_BACKTRACE", "CI", "TERM", "COLORTERM",
];

const FORBIDDEN_ENV_VARS: &[&str] = &[
    "PATH", "LD_PRELOAD", "LD_LIBRARY_PATH", "DYLD_INSERT_LIBRARIES",
    "DYLD_LIBRARY_PATH", "DYLD_FRAMEWORK_PATH", "DYLD_FALLBACK_LIBRARY_PATH",
    "CLASSPATH", "JAVA_TOOL_OPTIONS", "_JAVA_OPTIONS", "PYTHONPATH",
    "NODE_OPTIONS", "ENV", "BASH_ENV", "PROMPT_COMMAND", "PS4",
];

// ---------------------------------------------------------------------------
// State: execution IDs of active CLI processes (for kill lookup via PID)
// ---------------------------------------------------------------------------

pub struct CliProcessRegistry {
    /// Maps execution_id -> PID. The actual Child is owned by the spawn task.
    /// kill uses the PID to send SIGKILL / TerminateProcess.
    pids: Mutex<HashMap<String, u32>>,
}

impl CliProcessRegistry {
    pub fn new() -> Self {
        Self {
            pids: Mutex::new(HashMap::new()),
        }
    }
}

// ---------------------------------------------------------------------------
// Request / Event DTOs
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SpawnCliRequest {
    pub execution_id: String,
    pub executable: String,
    pub args: Vec<String>,
    pub working_dir: Option<String>,
    pub env_vars: Option<HashMap<String, String>>,
    pub stdin_input: Option<String>,
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CliOutputEvent {
    pub execution_id: String,
    pub stream: String, // "stdout" | "stderr"
    pub line: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CliExitEvent {
    pub execution_id: String,
    pub exit_code: Option<i32>,
    pub success: bool,
    pub duration_ms: u64,
    pub error: Option<String>,
}

// ---------------------------------------------------------------------------
// File snapshot DTO (for change detection)
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileSnapshot {
    pub relative_path: String,
    pub modified_ms: u64,
    pub size_bytes: u64,
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

fn validate_executable(executable: &str) -> Result<(), String> {
    let path = Path::new(executable);
    let file_name = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(executable);

    // Strip .exe extension on Windows for whitelist check
    #[cfg(target_os = "windows")]
    let base_name = file_name.strip_suffix(".exe").unwrap_or(file_name);
    #[cfg(not(target_os = "windows"))]
    let base_name = file_name;

    let is_whitelisted = ALLOWED_EXECUTABLES.iter().any(|&allowed| allowed.eq_ignore_ascii_case(base_name));
    if !is_whitelisted {
        return Err(format!("Executable '{}' is not in the allowed whitelist", executable));
    }

    if path.is_absolute() {
        if !path.exists() {
            return Err(format!("Executable does not exist: {}", executable));
        }
        if !path.is_file() {
            return Err(format!("Executable is not a file: {}", executable));
        }
    }

    Ok(())
}

fn validate_and_filter_env_vars(env: &HashMap<String, String>) -> Result<HashMap<String, String>, String> {
    let mut filtered = HashMap::new();
    for (k, v) in env {
        let upper = k.to_uppercase();
        if FORBIDDEN_ENV_VARS.contains(&upper.as_str()) {
            return Err(format!("Environment variable '{}' is forbidden", k));
        }
        let is_allowed = ALLOWED_ENV_PREFIXES.iter().any(|prefix| upper.starts_with(prefix))
            || ALLOWED_ENV_EXACT.iter().any(|&exact| exact == upper);
        if !is_allowed {
            return Err(format!("Environment variable '{}' is not allowed. Only SIMPER_* prefix or known safe variables are permitted", k));
        }
        filtered.insert(k.clone(), v.clone());
    }
    Ok(filtered)
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/// Spawn a CLI process asynchronously and stream output via Tauri events.
///
/// Events emitted:
///   - "cli-output"  { executionId, stream, line }  — each stdout/stderr line
///   - "cli-exit"    { executionId, exitCode, success, durationMs, error } — on completion
#[tauri::command]
pub async fn spawn_cli_agent(
    app: AppHandle,
    registry: tauri::State<'_, CliProcessRegistry>,
    request: SpawnCliRequest,
) -> Result<(), String> {
    let start = Instant::now();
    let exec_id = request.execution_id.clone();
    info!("[CLI] Spawning agent: {} (exec_id: {})", request.executable, exec_id);

    // Validate executable against whitelist
    validate_executable(&request.executable)?;

    // Build command (no shell — direct exec)
    let mut cmd = Command::new(&request.executable);
    cmd.args(&request.args);

    // Working directory
    if let Some(ref wd) = request.working_dir {
        let path = Path::new(wd);
        if !path.exists() {
            return Err(format!("Working directory does not exist: {}", wd));
        }
        if !path.is_dir() {
            return Err(format!("Working directory is not a directory: {}", wd));
        }
        cmd.current_dir(wd);
    }

    // Environment variables (filtered)
    if let Some(ref env) = request.env_vars {
        let filtered = validate_and_filter_env_vars(env)?;
        for (k, v) in filtered {
            cmd.env(k, v);
        }
    }

    // Pipe stdio
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    // On Windows: prevent console window from flashing
    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    // If stdin_input is provided, pipe stdin too
    if request.stdin_input.is_some() {
        cmd.stdin(std::process::Stdio::piped());
    }

    // Spawn the child process
    let mut child = cmd.spawn().map_err(|e| {
        format!("Failed to spawn '{}': {}", request.executable, e)
    })?;

    // Write to stdin if provided, then close
    if let Some(ref input) = request.stdin_input {
        if let Some(ref mut stdin) = child.stdin {
            use tokio::io::AsyncWriteExt;
            if let Err(e) = stdin.write_all(input.as_bytes()).await {
                warn!("[CLI] Failed to write stdin for {}: {}", exec_id, e);
            }
            if let Err(e) = stdin.shutdown().await {
                warn!("[CLI] Failed to shutdown stdin for {}: {}", exec_id, e);
            }
        }
    }

    // Register PID for kill support
    if let Some(pid) = child.id() {
        let mut pids = registry.pids.lock().await;
        pids.insert(exec_id.clone(), pid);
    }

    // Take stdout/stderr before any long-lived await
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let app_stdout = app.clone();
    let app_stderr = app.clone();
    let exec_id_stdout = exec_id.clone();
    let exec_id_stderr = exec_id.clone();

    // Spawn async readers for stdout
    let stdout_handle = tokio::spawn(async move {
        if let Some(stdout) = stdout {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = app_stdout.emit("cli-output", CliOutputEvent {
                    execution_id: exec_id_stdout.clone(),
                    stream: "stdout".to_string(),
                    line,
                });
            }
        }
    });

    // Spawn async readers for stderr
    let stderr_handle = tokio::spawn(async move {
        if let Some(stderr) = stderr {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = app_stderr.emit("cli-output", CliOutputEvent {
                    execution_id: exec_id_stderr.clone(),
                    stream: "stderr".to_string(),
                    line,
                });
            }
        }
    });

    // Apply timeout and wait for exit
    let timeout_ms = request.timeout_ms.unwrap_or(300_000); // 5 min default

    let wait_result = tokio::time::timeout(
        std::time::Duration::from_millis(timeout_ms),
        child.wait()
    ).await;

    let timed_out = wait_result.is_err();

    if timed_out {
        warn!("[CLI] Agent {} timed out after {}ms, killing...", exec_id, timeout_ms);
        if let Err(e) = child.kill().await {
            error!("[CLI] Failed to kill timed-out agent {}: {}", exec_id, e);
        }
        // Abort output readers to prevent hanging on closed pipes
        stdout_handle.abort();
        stderr_handle.abort();
        // Remove PID from registry
        let mut pids = registry.pids.lock().await;
        pids.remove(&exec_id);
    }

    // Wait for stdout/stderr readers to finish (or be aborted)
    let _ = stdout_handle.await;
    let _ = stderr_handle.await;

    let duration_ms = start.elapsed().as_millis() as u64;

    // Remove PID from registry (if not already removed by timeout handler)
    if !timed_out {
        let mut pids = registry.pids.lock().await;
        pids.remove(&exec_id);
    }

    // Emit exit event
    let exit_result = match wait_result {
        Ok(Ok(status)) => Ok(status.code()),
        Ok(Err(e)) => Err(format!("Process wait error: {}", e)),
        Err(_) => Err("Process timed out".to_string()),
    };

    match exit_result {
        Ok(exit_code) => {
            let success = exit_code.map_or(false, |c| c == 0);
            if success {
                info!("[CLI] Agent {} completed successfully in {}ms", exec_id, duration_ms);
            } else {
                warn!("[CLI] Agent {} exited with code {:?} in {}ms", exec_id, exit_code, duration_ms);
            }
            let _ = app.emit("cli-exit", CliExitEvent {
                execution_id: exec_id,
                exit_code,
                success,
                duration_ms,
                error: None,
            });
        }
        Err(err) => {
            error!("[CLI] Agent {} failed after {}ms: {}", exec_id, duration_ms, err);
            let _ = app.emit("cli-exit", CliExitEvent {
                execution_id: exec_id,
                exit_code: None,
                success: false,
                duration_ms,
                error: Some(err.clone()),
            });
            return Err(err);
        }
    }

    Ok(())
}

/// Kill a running CLI process by execution ID (uses OS-level process kill).
#[tauri::command]
pub async fn kill_cli_agent(
    app: AppHandle,
    registry: tauri::State<'_, CliProcessRegistry>,
    execution_id: String,
) -> Result<(), String> {
    let pid = {
        let pids = registry.pids.lock().await;
        pids.get(&execution_id).copied()
    };

    if let Some(pid) = pid {
        // Kill the process using OS-level signal / TerminateProcess
        #[cfg(target_os = "windows")]
        {
            use std::process::Command as StdCommand;
            let output = StdCommand::new("taskkill")
                .args(["/F", "/T", "/PID", &pid.to_string()])
                .output();
            match output {
                Ok(out) if out.status.success() => {
                    info!("[CLI] Killed process tree for PID {} (execution_id: {})", pid, execution_id);
                }
                Ok(out) => {
                    let stderr = String::from_utf8_lossy(&out.stderr);
                    warn!("[CLI] taskkill exited with error for PID {}: {}", pid, stderr);
                }
                Err(e) => {
                    error!("[CLI] Failed to execute taskkill for PID {}: {}", pid, e);
                }
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            let result = unsafe { libc::kill(pid as i32, libc::SIGKILL) };
            if result != 0 {
                let err = std::io::Error::last_os_error();
                error!("[CLI] Failed to kill PID {} (execution_id: {}): {}", pid, execution_id, err);
            } else {
                info!("[CLI] Killed PID {} (execution_id: {})", pid, execution_id);
            }
        }

        // Remove from registry
        {
            let mut pids = registry.pids.lock().await;
            pids.remove(&execution_id);
        }

        let _ = app.emit("cli-exit", CliExitEvent {
            execution_id,
            exit_code: None,
            success: false,
            duration_ms: 0,
            error: Some("Process killed by user".to_string()),
        });
        Ok(())
    } else {
        Err(format!("No active process with id: {}", execution_id))
    }
}

/// Take a recursive snapshot of all files in a directory (for change detection).
#[tauri::command]
pub fn get_working_dir_snapshot(dir: String) -> Result<Vec<FileSnapshot>, String> {
    let path = Path::new(&dir);
    if !path.exists() {
        return Err(format!("Directory does not exist: {}", dir));
    }
    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", dir));
    }

    let mut snapshots = Vec::new();
    collect_file_snapshots(path, path, &mut snapshots)?;
    Ok(snapshots)
}

fn collect_file_snapshots(
    base: &Path,
    current: &Path,
    out: &mut Vec<FileSnapshot>,
) -> Result<(), String> {
    let entries = std::fs::read_dir(current)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            // Skip hidden directories and node_modules
            let name = path.file_name().unwrap_or_default().to_string_lossy();
            if name.starts_with('.') || name == "node_modules" || name == "target" {
                continue;
            }
            collect_file_snapshots(base, &path, out)?;
        } else if path.is_file() {
            let metadata = entry.metadata().ok();
            let modified_ms = metadata
                .as_ref()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0);
            let size_bytes = metadata.map(|m| m.len()).unwrap_or(0);
            let relative_path = path
                .strip_prefix(base)
                .unwrap_or(&path)
                .to_string_lossy()
                .replace('\\', "/");

            out.push(FileSnapshot {
                relative_path,
                modified_ms,
                size_bytes,
            });
        }
    }
    Ok(())
}

/// Cleanup: kill all active processes (called on app exit).
pub fn kill_all_processes(registry: &CliProcessRegistry) {
    let mut pids = registry.pids.blocking_lock();
    for (exec_id, pid) in pids.drain() {
        #[cfg(target_os = "windows")]
        {
            use std::process::Command as StdCommand;
            let output = StdCommand::new("taskkill")
                .args(["/F", "/T", "/PID", &pid.to_string()])
                .output();
            match output {
                Ok(out) if out.status.success() => {
                    info!("[CLI] Killed process tree for PID {} (execution_id: {})", pid, exec_id);
                }
                Ok(out) => {
                    let stderr = String::from_utf8_lossy(&out.stderr);
                    warn!("[CLI] taskkill exited with error for PID {}: {}", pid, stderr);
                }
                Err(e) => {
                    error!("[CLI] Failed to execute taskkill for PID {}: {}", pid, e);
                }
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            let result = unsafe { libc::kill(pid as i32, libc::SIGKILL) };
            if result != 0 {
                let err = std::io::Error::last_os_error();
                error!("[CLI] Failed to kill PID {} (execution_id: {}): {}", pid, exec_id, err);
            } else {
                info!("[CLI] Killed PID {} (execution_id: {})", pid, exec_id);
            }
        }
    }
}
