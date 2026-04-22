mod db;

use db::{DbState, init_db, get_agents, add_agent};
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
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            get_agents, 
            add_agent
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
