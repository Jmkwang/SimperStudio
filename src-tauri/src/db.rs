use rusqlite::{Connection, Result};
use std::sync::Mutex;
use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};

fn app_data_dir() -> PathBuf {
    dirs::data_dir().unwrap_or_else(|| PathBuf::from(".")).join("SimperStudio")
}

fn db_path() -> PathBuf {
    app_data_dir().join("simperstudio.db")
}

fn ensure_app_dir() {
    let dir = app_data_dir();
    if !dir.exists() {
        let _ = fs::create_dir_all(&dir);
    }
}

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
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub avatar: Option<String>,
    pub system_prompt: String,
    pub model_provider: String,
    pub model_id: String,
    #[serde(default)]
    pub provider_id: Option<String>,
    pub temperature: f64,
    #[serde(default)]
    pub max_tokens: Option<i64>,
    #[serde(default)]
    pub api_key: Option<String>,
    #[serde(default)]
    pub base_url: Option<String>,
    pub parameters: String,
    #[serde(default)]
    pub industry: Option<String>,
    pub created_at: i64,
}

pub fn init_db() -> Result<Connection> {
    ensure_app_dir();
    let conn = Connection::open(db_path())?;

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
            provider_id TEXT,
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
            workflow_id TEXT,
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

        -- High-frequency query indexes
        CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
        CREATE INDEX IF NOT EXISTS idx_chat_sessions_workspace ON chat_sessions(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_workflows_workspace ON workflows(workspace_id);
        "
    )?;

    let has_workflow_id = conn
        .prepare("PRAGMA table_info(chat_sessions)")?
        .query_map([], |row| row.get::<_, String>(1))?
        .filter_map(Result::ok)
        .any(|name| name == "workflow_id");

    if !has_workflow_id {
        conn.execute("ALTER TABLE chat_sessions ADD COLUMN workflow_id TEXT", [])?;
    }

    let has_provider_id = conn
        .prepare("PRAGMA table_info(agents)")?
        .query_map([], |row| row.get::<_, String>(1))?
        .filter_map(Result::ok)
        .any(|name| name == "provider_id");

    if !has_provider_id {
        conn.execute("ALTER TABLE agents ADD COLUMN provider_id TEXT", [])?;
    }

    let has_agent_responses = conn
        .prepare("PRAGMA table_info(chat_messages)")?
        .query_map([], |row| row.get::<_, String>(1))?
        .filter_map(Result::ok)
        .any(|name| name == "agent_responses");

    if !has_agent_responses {
        conn.execute("ALTER TABLE chat_messages ADD COLUMN agent_responses TEXT", [])?;
    }

    Ok(conn)
}

#[tauri::command]
pub fn get_agents(state: tauri::State<DbState>) -> Result<Vec<Agent>, String> {
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, name, description, avatar, system_prompt, model_provider, model_id, temperature, max_tokens, api_key, base_url, parameters, industry, created_at, provider_id FROM agents").map_err(|e| e.to_string())?;
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
            provider_id: row.get(14)?,
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
        "INSERT INTO agents (id, name, description, avatar, system_prompt, model_provider, model_id, temperature, max_tokens, api_key, base_url, parameters, industry, created_at, provider_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
        (&agent.id, &agent.name, &agent.description, &agent.avatar, &agent.system_prompt, &agent.model_provider, &agent.model_id, &agent.temperature, &agent.max_tokens, &agent.api_key, &agent.base_url, &agent.parameters, &agent.industry, &agent.created_at, &agent.provider_id)
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_agent(agent: Agent, state: tauri::State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "UPDATE agents SET name = ?1, description = ?2, avatar = ?3, system_prompt = ?4, model_provider = ?5, model_id = ?6, temperature = ?7, max_tokens = ?8, api_key = ?9, base_url = ?10, parameters = ?11, industry = ?12, provider_id = ?13 WHERE id = ?14",
        (&agent.name, &agent.description, &agent.avatar, &agent.system_prompt, &agent.model_provider, &agent.model_id, &agent.temperature, &agent.max_tokens, &agent.api_key, &agent.base_url, &agent.parameters, &agent.industry, &agent.provider_id, &agent.id)
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_agent(id: String, state: tauri::State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute("DELETE FROM agents WHERE id = ?1", [&id]).map_err(|e| e.to_string())?;
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
    pub workflow_id: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[tauri::command]
pub fn get_chat_sessions(workspace_id: String, state: tauri::State<DbState>) -> Result<Vec<ChatSession>, String> {
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, workspace_id, title, workflow_id, created_at, updated_at FROM chat_sessions WHERE workspace_id = ?1").map_err(|e| e.to_string())?;
    let iter = stmt.query_map([&workspace_id], |row| {
        Ok(ChatSession {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            title: row.get(2)?,
            workflow_id: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
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
        "INSERT INTO chat_sessions (id, workspace_id, title, workflow_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (&session.id, &session.workspace_id, &session.title, &session.workflow_id, &session.created_at, &session.updated_at)
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_chat_session(session: ChatSession, state: tauri::State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "UPDATE chat_sessions SET title = ?1, workflow_id = ?2, updated_at = ?3 WHERE id = ?4",
        (&session.title, &session.workflow_id, &session.updated_at, &session.id)
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
    pub content: String,
    pub timestamp: i64,
    #[serde(default)]
    pub agent_responses: Option<String>,
}

#[tauri::command]
pub fn get_chat_messages(session_id: String, state: tauri::State<DbState>) -> Result<Vec<ChatMessage>, String> {
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, session_id, role, content, timestamp, agent_responses FROM chat_messages WHERE session_id = ?1 ORDER BY timestamp ASC").map_err(|e| e.to_string())?;
    let iter = stmt.query_map([&session_id], |row| {
        Ok(ChatMessage {
            id: row.get(0)?,
            session_id: row.get(1)?,
            role: row.get(2)?,
            content: row.get(3)?,
            timestamp: row.get(4)?,
            agent_responses: row.get(5)?,
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
        "INSERT INTO chat_messages (id, session_id, role, content, timestamp, agent_responses) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (&message.id, &message.session_id, &message.role, &message.content, &message.timestamp, &message.agent_responses)
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_chat_message(message: ChatMessage, state: tauri::State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "UPDATE chat_messages SET content = ?1, agent_responses = ?2 WHERE id = ?3",
        (&message.content, &message.agent_responses, &message.id)
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
    pub nodes_data: String,
    pub edges_data: String,
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

#[tauri::command]
pub fn read_json_config(name: String) -> Result<String, String> {
    let path = config_path();
    if !path.exists() {
        return Ok(String::new());
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let all: serde_json::Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    if let Some(val) = all.get(&name) {
        Ok(serde_json::to_string(val).map_err(|e| e.to_string())?)
    } else {
        Ok(String::new())
    }
}

#[tauri::command]
pub fn write_json_config(name: String, value: String) -> Result<(), String> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let val: serde_json::Value = serde_json::from_str(&value).map_err(|e| e.to_string())?;
    let mut all: serde_json::Value = if path.exists() {
        let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&raw).unwrap_or(serde_json::json!({}))
    } else {
        serde_json::json!({})
    };
    all[&name] = val;
    let pretty = serde_json::to_string_pretty(&all).map_err(|e| e.to_string())?;
    fs::write(path, pretty).map_err(|e| e.to_string())
}

fn config_path() -> PathBuf {
    app_data_dir().join("config").join("config.json")
}
