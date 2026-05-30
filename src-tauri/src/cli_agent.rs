use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;
use std::time::Instant;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

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

    // Build command (no shell — direct exec)
    let mut cmd = Command::new(&request.executable);
    cmd.args(&request.args);

    // Working directory
    if let Some(ref wd) = request.working_dir {
        let path = Path::new(wd);
        if !path.exists() {
            return Err(format!("Working directory does not exist: {}", wd));
        }
        cmd.current_dir(wd);
    }

    // Environment variables
    if let Some(ref env) = request.env_vars {
        for (k, v) in env {
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
            let _ = stdin.write_all(input.as_bytes()).await;
            let _ = stdin.shutdown().await;
        }
    }

    // Register PID for kill support
    if let Some(pid) = child.id() {
        if let Ok(mut pids) = registry.pids.lock() {
            pids.insert(exec_id.clone(), pid);
        }
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

    let exit_result: Result<Option<i32>, String> = {
        let wait = child.wait();
        match tokio::time::timeout(std::time::Duration::from_millis(timeout_ms), wait).await {
            Ok(Ok(status)) => Ok(status.code()),
            Ok(Err(e)) => Err(format!("Process wait error: {}", e)),
            Err(_) => Err("Process timed out".to_string()),
        }
    };

    // Wait for stdout/stderr readers to finish
    let _ = stdout_handle.await;
    let _ = stderr_handle.await;

    let duration_ms = start.elapsed().as_millis() as u64;

    // Remove PID from registry
    if let Ok(mut pids) = registry.pids.lock() {
        pids.remove(&exec_id);
    }

    // Emit exit event
    match exit_result {
        Ok(exit_code) => {
            let _ = app.emit("cli-exit", CliExitEvent {
                execution_id: exec_id,
                exit_code,
                success: exit_code.map_or(false, |c| c == 0),
                duration_ms,
                error: None,
            });
        }
        Err(err) => {
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
        let pids = registry.pids.lock().map_err(|e| e.to_string())?;
        pids.get(&execution_id).copied()
    };

    if let Some(pid) = pid {
        // Kill the process using OS-level signal / TerminateProcess
        #[cfg(target_os = "windows")]
        {
            use std::process::Command as StdCommand;
            let _ = StdCommand::new("taskkill")
                .args(["/F", "/PID", &pid.to_string()])
                .output();
        }
        #[cfg(not(target_os = "windows"))]
        {
            // SAFETY: We're sending SIGKILL to a process we own.
            unsafe { libc::kill(pid as i32, libc::SIGKILL); }
        }

        // Remove from registry
        if let Ok(mut pids) = registry.pids.lock() {
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
    if let Ok(mut pids) = registry.pids.lock() {
        for (_, pid) in pids.drain() {
            #[cfg(target_os = "windows")]
            {
                use std::process::Command as StdCommand;
                let _ = StdCommand::new("taskkill")
                    .args(["/F", "/PID", &pid.to_string()])
                    .output();
            }
            #[cfg(not(target_os = "windows"))]
            {
                unsafe { libc::kill(pid as i32, libc::SIGKILL); }
            }
        }
    }
}
