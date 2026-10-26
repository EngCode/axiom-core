/*======> Reference By Comment <======
 * ===> 01 - Config
 * ===> 02 - Server
 * ===> 03 - Routes
 */

//=====> Config <=====//

use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, AtomicU16, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager};

use crate::data::{api, db};
use crate::Db;

pub const DEFAULT_PORT: u16 = 47615;

static RUNNING: AtomicBool = AtomicBool::new(false);
static STARTED_PORT: AtomicU16 = AtomicU16::new(0);
static LAST_ERROR: Mutex<Option<String>> = Mutex::new(None);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiConfig {
    pub enabled: bool,
    pub port: u16,
    pub token: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiStatus {
    pub enabled: bool,
    pub port: u16,
    pub token: String,
    pub running: bool,
    pub error: Option<String>,
    pub restart_required: bool,
}

fn meta(connection: &Connection, key: &str) -> Option<String> {
    connection
        .query_row("SELECT value FROM meta WHERE key = ?1", [key], |row| row.get(0))
        .optional()
        .ok()
        .flatten()
}

fn set_meta(connection: &Connection, key: &str, value: &str) {
    let _ = connection.execute(
        "INSERT INTO meta(key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [key, value],
    );
}

fn new_token() -> String {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0);
    format!("ax_{stamp:x}_{:x}", std::process::id())
}

pub fn ensure_config(connection: &Connection) -> ApiConfig {
    let enabled = meta(connection, "api.enabled")
        .map(|value| value != "0")
        .unwrap_or(true);
    let port = meta(connection, "api.port")
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(DEFAULT_PORT);
    let token = meta(connection, "api.token").filter(|value| !value.is_empty()).unwrap_or_else(|| {
        let token = new_token();
        set_meta(connection, "api.token", &token);
        token
    });
    set_meta(connection, "api.enabled", if enabled { "1" } else { "0" });
    set_meta(connection, "api.port", &port.to_string());
    ApiConfig { enabled, port, token }
}

pub fn status(connection: &Connection) -> ApiStatus {
    let config = ensure_config(connection);
    let error = LAST_ERROR.lock().ok().and_then(|value| value.clone());
    ApiStatus {
        enabled: config.enabled,
        port: config.port,
        token: config.token,
        running: RUNNING.load(Ordering::SeqCst),
        error,
        restart_required: STARTED_PORT.load(Ordering::SeqCst) != 0
            && STARTED_PORT.load(Ordering::SeqCst) != config.port,
    }
}

pub fn save_config(connection: &Connection, config: &ApiConfig) -> Result<ApiStatus, String> {
    //===> Guard Clause: Port Range <===//
    if config.port < 1024 {
        return Err("Choose a port above 1023.".to_string());
    }
    if config.token.trim().len() < 8 {
        return Err("The API token must be at least 8 characters.".to_string());
    }
    set_meta(connection, "api.enabled", if config.enabled { "1" } else { "0" });
    set_meta(connection, "api.port", &config.port.to_string());
    set_meta(connection, "api.token", config.token.trim());
    Ok(status(connection))
}

//=====> Server <=====//

pub fn start(app: AppHandle, config: ApiConfig) {
    if !config.enabled {
        return;
    }
    thread::spawn(move || serve(app, config));
}

fn serve(app: AppHandle, config: ApiConfig) {
    let listener = match TcpListener::bind(("127.0.0.1", config.port)) {
        Ok(listener) => listener,
        Err(error) => {
            if let Ok(mut slot) = LAST_ERROR.lock() {
                *slot = Some(format!(
                    "Could not bind 127.0.0.1:{} — {error}. Change the port in User → Local API.",
                    config.port
                ));
            }
            RUNNING.store(false, Ordering::SeqCst);
            return;
        }
    };

    RUNNING.store(true, Ordering::SeqCst);
    STARTED_PORT.store(config.port, Ordering::SeqCst);
    if let Ok(mut slot) = LAST_ERROR.lock() {
        *slot = None;
    }

    for stream in listener.incoming() {
        let Ok(stream) = stream else { continue };
        let app = app.clone();
        let token = config.token.clone();
        thread::spawn(move || {
            let _ = handle(stream, &app, &token);
        });
    }
}

fn handle(mut stream: TcpStream, app: &AppHandle, token: &str) -> std::io::Result<()> {
    let Some(request) = read_request(&mut stream) else {
        return write_response(&mut stream, 400, json!({ "error": "bad request" }));
    };

    //===> CORS Preflight <===//
    if request.method == "OPTIONS" {
        return write_response(&mut stream, 204, json!({}));
    }

    //===> Health Is Open; Everything Else Requires The Token <===//
    if request.path != "/v1/health" {
        let authorized = request
            .headers
            .get("authorization")
            .map(|value| value == &format!("Bearer {token}"))
            .unwrap_or(false)
            || request.headers.get("x-axiom-token").map(|value| value == token).unwrap_or(false);
        if !authorized {
            return write_response(&mut stream, 401, json!({ "error": "invalid token" }));
        }
    }

    match route(app, &request) {
        Ok((status, body)) => write_response(&mut stream, status, body),
        Err((status, message)) => write_response(&mut stream, status, json!({ "error": message })),
    }
}

struct Request {
    method: String,
    path: String,
    query: HashMap<String, String>,
    headers: HashMap<String, String>,
    body: String,
}

fn read_request(stream: &mut TcpStream) -> Option<Request> {
    let mut buffer = Vec::new();
    let mut chunk = [0u8; 4096];
    let header_end = loop {
        let read = stream.read(&mut chunk).ok()?;
        if read == 0 {
            return None;
        }
        buffer.extend_from_slice(&chunk[..read]);
        if buffer.windows(4).any(|window| window == b"\r\n\r\n") {
            break buffer
                .windows(4)
                .position(|window| window == b"\r\n\r\n")?
                + 4;
        }
        if buffer.len() > 1_000_000 {
            return None;
        }
    };

    let head = String::from_utf8_lossy(&buffer[..header_end]).into_owned();
    let mut lines = head.split("\r\n");
    let request_line = lines.next()?;
    let mut parts = request_line.split_whitespace();
    let method = parts.next()?.to_string();
    let target = parts.next()?.to_string();

    let mut headers = HashMap::new();
    for line in lines {
        let Some((name, value)) = line.split_once(':') else { continue };
        headers.insert(name.trim().to_lowercase(), value.trim().to_string());
    }

    let length = headers
        .get("content-length")
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(0);
    let mut body_bytes = buffer[header_end..].to_vec();
    while body_bytes.len() < length {
        let read = stream.read(&mut chunk).ok()?;
        if read == 0 {
            break;
        }
        body_bytes.extend_from_slice(&chunk[..read]);
    }

    let (path, query_string) = target.split_once('?').unwrap_or((&target, ""));
    let mut query = HashMap::new();
    for pair in query_string.split('&').filter(|pair| !pair.is_empty()) {
        let (key, value) = pair.split_once('=').unwrap_or((pair, ""));
        query.insert(key.to_string(), value.to_string());
    }

    Some(Request {
        method,
        path: path.to_string(),
        query,
        headers,
        body: String::from_utf8_lossy(&body_bytes).into_owned(),
    })
}

fn write_response(stream: &mut TcpStream, status: u16, body: Value) -> std::io::Result<()> {
    let text = serde_json::to_string(&body).unwrap_or_else(|_| "{\"error\":\"serialization\"}".to_string());
    let reason = match status {
        200 => "OK",
        201 => "Created",
        204 => "No Content",
        400 => "Bad Request",
        401 => "Unauthorized",
        404 => "Not Found",
        409 => "Conflict",
        _ => "Error",
    };
    let response = format!(
        "HTTP/1.1 {status} {reason}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Headers: Authorization, Content-Type, X-Axiom-Token\r\nAccess-Control-Allow-Methods: GET, POST, PATCH, OPTIONS\r\nConnection: close\r\n\r\n{text}",
        text.len()
    );
    stream.write_all(response.as_bytes())?;
    stream.flush()
}

//=====> Routes <=====//

fn route(app: &AppHandle, request: &Request) -> Result<(u16, Value), (u16, String)> {
    let segments: Vec<&str> = request.path.trim_matches('/').split('/').collect();
    let db = app.state::<Db>();
    let mut connection = db
        .0
        .lock()
        .map_err(|_| (500, "database lock".to_string()))?;

    match (&request.method[..], segments.as_slice()) {
        //===> Health & Version <===//
        ("GET", ["v1", "health"]) => Ok((
            200,
            json!({ "ok": true, "name": "Axiom Core", "version": env!("CARGO_PKG_VERSION") }),
        )),
        ("GET", ["v1", "version"]) => Ok((
            200,
            json!({ "name": "Axiom Core", "version": env!("CARGO_PKG_VERSION"), "api": 1 }),
        )),

        //===> Snapshot <===//
        ("GET", ["v1", "snapshot"]) => {
            let state = db::load_state(&connection)
                .map_err(|error| (500, error.to_string()))?
                .ok_or((404, "workspace is not initialized".to_string()))?;
            Ok((200, serde_json::to_value(state).map_err(|error| (500, error.to_string()))?))
        }

        //===> Projects <===//
        ("GET", ["v1", "projects"]) => {
            let state = db::load_state(&connection)
                .map_err(|error| (500, error.to_string()))?
                .ok_or((404, "workspace is not initialized".to_string()))?;
            Ok((200, json!(state.projects)))
        }
        ("GET", ["v1", "projects", id]) => {
            let state = db::load_state(&connection)
                .map_err(|error| (500, error.to_string()))?
                .ok_or((404, "workspace is not initialized".to_string()))?;
            let project = state
                .projects
                .into_iter()
                .find(|project| project.id == *id)
                .ok_or((404, "project not found".to_string()))?;
            let issues: Vec<_> = state
                .issues
                .into_iter()
                .filter(|issue| issue.project_id.as_deref() == Some(*id))
                .collect();
            Ok((200, json!({ "project": project, "issues": issues })))
        }

        //===> Issues <===//
        ("GET", ["v1", "issues"]) => {
            let state = db::load_state(&connection)
                .map_err(|error| (500, error.to_string()))?
                .ok_or((404, "workspace is not initialized".to_string()))?;
            let issues: Vec<_> = state
                .issues
                .into_iter()
                .filter(|issue| {
                    request
                        .query
                        .get("project")
                        .map(|project| issue.project_id.as_deref() == Some(project.as_str()))
                        .unwrap_or(true)
                })
                .filter(|issue| {
                    request
                        .query
                        .get("status")
                        .map(|status| &issue.status == status)
                        .unwrap_or(true)
                })
                .collect();
            Ok((200, json!(issues)))
        }
        ("GET", ["v1", "issues", id]) => {
            let state = db::load_state(&connection)
                .map_err(|error| (500, error.to_string()))?
                .ok_or((404, "workspace is not initialized".to_string()))?;
            let issue = state
                .issues
                .into_iter()
                .find(|issue| issue.id == *id || issue.key == *id)
                .ok_or((404, "issue not found".to_string()))?;
            Ok((200, json!(issue)))
        }
        ("PATCH", ["v1", "issues", id]) => {
            let patch: api::IssuePatch = serde_json::from_str(&request.body)
                .map_err(|error| (400, format!("invalid patch: {error}")))?;
            let issue = api::update_issue(&mut connection, id, &patch)
                .map_err(|error| (400, error.to_string()))?
                .ok_or((404, "issue not found".to_string()))?;
            let _ = app.emit("axiom://state-changed", ());
            Ok((200, json!(issue)))
        }
        ("POST", ["v1", "issues"]) => {
            let draft: api::IssueDraft = serde_json::from_str(&request.body)
                .map_err(|error| (400, format!("invalid draft: {error}")))?;
            let issue = api::create_issue(&mut connection, &draft)
                .map_err(|error| (400, error.to_string()))?;
            let _ = app.emit("axiom://state-changed", ());
            Ok((201, json!(issue)))
        }

        //===> Machine Description <===//
        ("GET", ["v1", "openapi.json"]) => Ok((200, openapi())),
        ("GET", ["v1"]) | ("GET", []) => Ok((200, openapi())),
        _ => Err((404, format!("no route for {} {}", request.method, request.path))),
    }
}

fn openapi() -> Value {
    json!({
        "openapi": "3.0.0",
        "info": { "title": "Axiom Core local API", "version": "1" },
        "servers": [{ "url": format!("http://127.0.0.1:{}", STARTED_PORT.load(Ordering::SeqCst)) }],
        "paths": {
            "/v1/health": { "get": { "summary": "Unauthenticated health check" } },
            "/v1/snapshot": { "get": { "summary": "Full workspace snapshot" } },
            "/v1/projects": { "get": { "summary": "List projects" } },
            "/v1/projects/{id}": { "get": { "summary": "Project with its issues" } },
            "/v1/issues": {
                "get": { "summary": "List issues, filter with ?project=&status=" },
                "post": { "summary": "Create an issue" }
            },
            "/v1/issues/{id}": {
                "get": { "summary": "Read an issue by id or key" },
                "patch": { "summary": "Update an issue" }
            }
        }
    })
}
