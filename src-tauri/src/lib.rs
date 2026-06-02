mod db;
mod cli_agent;

use db::{
    DbState, init_db, get_agents, add_agent, update_agent, delete_agent,
    get_workspaces, add_workspace, update_workspace, delete_workspace,
    get_chat_sessions, add_chat_session, update_chat_session, delete_chat_session,
    get_chat_messages, add_chat_message, update_chat_message, delete_chat_message,
    get_workflows, add_workflow, update_workflow, delete_workflow,
    read_json_config, write_json_config
};
use tauri::Manager;
use cli_agent::{CliProcessRegistry, spawn_cli_agent, kill_cli_agent, get_working_dir_snapshot, kill_all_processes};
use std::sync::Mutex;
use log::{info, error};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    info!("SimperStudio starting up...");
    let db_conn = match init_db() {
        Ok(conn) => {
            info!("Database initialized successfully");
            conn
        }
        Err(e) => {
            error!("Failed to initialize database: {}", e);
            panic!("Failed to initialize database: {}", e);
        }
    };

    tauri::Builder::default()
        .manage(DbState {
            conn: Mutex::new(db_conn),
        })
        .manage(CliProcessRegistry::new())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_log::Builder::new()
            .level(log::LevelFilter::Info)
            .target(tauri_plugin_log::Target::new(
                tauri_plugin_log::TargetKind::Folder {
                    path: dirs::data_dir().unwrap_or_default().join("SimperStudio").join("logs"),
                    file_name: Some("app".into()),
                },
            ))
            .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
            .max_file_size(5_000_000) // 5MB per file
            .build())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_agents, add_agent, update_agent, delete_agent,
            get_workspaces, add_workspace, update_workspace, delete_workspace,
            get_chat_sessions, add_chat_session, update_chat_session, delete_chat_session,
            get_chat_messages, add_chat_message, update_chat_message, delete_chat_message,
            get_workflows, add_workflow, update_workflow, delete_workflow,
            read_json_config, write_json_config,
            spawn_cli_agent, kill_cli_agent, get_working_dir_snapshot
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                tauri::RunEvent::Exit => {
                    info!("SimperStudio shutting down...");
                    let registry = app_handle.state::<CliProcessRegistry>();
                    kill_all_processes(&registry);
                    info!("All CLI processes terminated");
                }
                tauri::RunEvent::Ready => {
                    info!("SimperStudio ready");
                }
                _ => {}
            }
        });
}
