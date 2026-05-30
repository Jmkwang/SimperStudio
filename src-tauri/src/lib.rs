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

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_conn = init_db().expect("Failed to initialize database");

    tauri::Builder::default()
        .manage(DbState {
            conn: Mutex::new(db_conn),
        })
        .manage(CliProcessRegistry::new())
        .plugin(tauri_plugin_opener::init())
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
            if let tauri::RunEvent::Exit = event {
                let registry = app_handle.state::<CliProcessRegistry>();
                kill_all_processes(&registry);
            }
        });
}
