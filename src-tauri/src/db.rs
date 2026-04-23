use rusqlite::{Connection, Result};
use std::sync::Mutex;
use serde::{Deserialize, Serialize};

pub struct DbState {
    pub conn: Mutex<Connection>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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

#[tauri::command]
pub fn get_workspaces(state: tauri::State<DbState>) -> Result<Vec<Workspace>, String> {
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, name, description, created_at, updated_at FROM workspaces").map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([], |row| {
        Ok(Workspace {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut workspaces = Vec::new();
    for item in iter {
        workspaces.push(item.map_err(|e| e.to_string())?);
    }
    Ok(workspaces)
}

#[tauri::command]
pub fn add_workspace(workspace: Workspace, state: tauri::State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO workspaces (id, name, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        (&workspace.id, &workspace.name, &workspace.description, &workspace.created_at, &workspace.updated_at)
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_workspace(workspace: Workspace, state: tauri::State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "UPDATE workspaces SET name = ?1, description = ?2, updated_at = ?3 WHERE id = ?4",
        (&workspace.name, &workspace.description, &workspace.updated_at, &workspace.id)
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_workspace(id: String, state: tauri::State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute("DELETE FROM workspaces WHERE id = ?1", [&id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatSession {
    pub id: String,
    pub workspace_id: String,
    pub title: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[tauri::command]
pub fn get_chat_sessions(workspace_id: String, state: tauri::State<DbState>) -> Result<Vec<ChatSession>, String> {
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, workspace_id, title, created_at, updated_at FROM chat_sessions WHERE workspace_id = ?1").map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([&workspace_id], |row| {
        Ok(ChatSession {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            title: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut sessions = Vec::new();
    for item in iter {
        sessions.push(item.map_err(|e| e.to_string())?);
    }
    Ok(sessions)
}

#[tauri::command]
pub fn add_chat_session(session: ChatSession, state: tauri::State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO chat_sessions (id, workspace_id, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        (&session.id, &session.workspace_id, &session.title, &session.created_at, &session.updated_at)
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_chat_session(session: ChatSession, state: tauri::State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "UPDATE chat_sessions SET title = ?1, updated_at = ?2 WHERE id = ?3",
        (&session.title, &session.updated_at, &session.id)
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_chat_session(id: String, state: tauri::State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute("DELETE FROM chat_sessions WHERE id = ?1", [&id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub id: String,
    pub session_id: String,
    pub role: String,
    pub content: String, // stored as JSON string
    pub timestamp: i64,
}

#[tauri::command]
pub fn get_chat_messages(session_id: String, state: tauri::State<DbState>) -> Result<Vec<ChatMessage>, String> {
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, session_id, role, content, timestamp FROM chat_messages WHERE session_id = ?1 ORDER BY timestamp ASC").map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([&session_id], |row| {
        Ok(ChatMessage {
            id: row.get(0)?,
            session_id: row.get(1)?,
            role: row.get(2)?,
            content: row.get(3)?,
            timestamp: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut messages = Vec::new();
    for item in iter {
        messages.push(item.map_err(|e| e.to_string())?);
    }
    Ok(messages)
}

#[tauri::command]
pub fn add_chat_message(message: ChatMessage, state: tauri::State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO chat_messages (id, session_id, role, content, timestamp) VALUES (?1, ?2, ?3, ?4, ?5)",
        (&message.id, &message.session_id, &message.role, &message.content, &message.timestamp)
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_chat_message(message: ChatMessage, state: tauri::State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "UPDATE chat_messages SET content = ?1 WHERE id = ?2",
        (&message.content, &message.id)
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_chat_message(id: String, state: tauri::State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute("DELETE FROM chat_messages WHERE id = ?1", [&id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workflow {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub nodes_data: String, // stored as JSON string
    pub edges_data: String, // stored as JSON string
    pub status: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[tauri::command]
pub fn get_workflows(workspace_id: String, state: tauri::State<DbState>) -> Result<Vec<Workflow>, String> {
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, workspace_id, name, nodes_data, edges_data, status, created_at, updated_at FROM workflows WHERE workspace_id = ?1").map_err(|e| e.to_string())?;
    
    let iter = stmt.query_map([&workspace_id], |row| {
        Ok(Workflow {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            name: row.get(2)?,
            nodes_data: row.get(3)?,
            edges_data: row.get(4)?,
            status: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut workflows = Vec::new();
    for item in iter {
        workflows.push(item.map_err(|e| e.to_string())?);
    }
    Ok(workflows)
}

#[tauri::command]
pub fn add_workflow(workflow: Workflow, state: tauri::State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO workflows (id, workspace_id, name, nodes_data, edges_data, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        (&workflow.id, &workflow.workspace_id, &workflow.name, &workflow.nodes_data, &workflow.edges_data, &workflow.status, &workflow.created_at, &workflow.updated_at)
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_workflow(workflow: Workflow, state: tauri::State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "UPDATE workflows SET name = ?1, nodes_data = ?2, edges_data = ?3, status = ?4, updated_at = ?5 WHERE id = ?6",
        (&workflow.name, &workflow.nodes_data, &workflow.edges_data, &workflow.status, &workflow.updated_at, &workflow.id)
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_workflow(id: String, state: tauri::State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute("DELETE FROM workflows WHERE id = ?1", [&id]).map_err(|e| e.to_string())?;
    Ok(())
}
