use rusqlite::{Connection, Result};
use std::sync::Mutex;
use serde::{Deserialize, Serialize};

pub struct DbState {
    pub conn: Mutex<Connection>,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Agent {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub avatar: Option<String>,
    pub system_prompt: String,
    pub model_provider: String,
    pub model_id: String,
    pub temperature: f64,
    pub max_tokens: Option<i64>,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub parameters: String, // stored as JSON string
    pub industry: Option<String>,
    pub created_at: i64,
}

pub fn init_db() -> Result<Connection> {
    // In a real app this would use a proper app_data_dir, 
    // for this demo we'll use a local db file.
    let conn = Connection::open("simperstudio.db")?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            avatar TEXT,
            system_prompt TEXT NOT NULL,
            model_provider TEXT NOT NULL,
            model_id TEXT NOT NULL,
            temperature REAL NOT NULL,
            max_tokens INTEGER,
            api_key TEXT,
            base_url TEXT,
            parameters TEXT NOT NULL,
            industry TEXT,
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS chat_sessions (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            title TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS workflows (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            name TEXT NOT NULL,
            nodes_data TEXT NOT NULL,
            edges_data TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        );
        "
    )?;

    Ok(conn)
}

#[tauri::command]
pub fn get_agents(state: tauri::State<DbState>) -> Result<Vec<Agent>, String> {
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, name, description, avatar, system_prompt, model_provider, model_id, temperature, max_tokens, api_key, base_url, parameters, industry, created_at FROM agents").map_err(|e| e.to_string())?;
    
    let agent_iter = stmt.query_map([], |row| {
        Ok(Agent {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            avatar: row.get(3)?,
            system_prompt: row.get(4)?,
            model_provider: row.get(5)?,
            model_id: row.get(6)?,
            temperature: row.get(7)?,
            max_tokens: row.get(8)?,
            api_key: row.get(9)?,
            base_url: row.get(10)?,
            parameters: row.get(11)?,
            industry: row.get(12)?,
            created_at: row.get(13)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut agents = Vec::new();
    for agent in agent_iter {
        agents.push(agent.map_err(|e| e.to_string())?);
    }
    
    Ok(agents)
}

#[tauri::command]
pub fn add_agent(agent: Agent, state: tauri::State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO agents (id, name, description, avatar, system_prompt, model_provider, model_id, temperature, max_tokens, api_key, base_url, parameters, industry, created_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        (
            &agent.id, &agent.name, &agent.description, &agent.avatar, 
            &agent.system_prompt, &agent.model_provider, &agent.model_id, 
            &agent.temperature, &agent.max_tokens, &agent.api_key, 
            &agent.base_url, &agent.parameters, &agent.industry, &agent.created_at
        )
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}
