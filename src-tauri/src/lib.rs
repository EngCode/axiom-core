/*======> Reference By Comment <======
 * ===> 01 - Imports & Constants
 * ===> 02 - Window Management
 * ===> 03 - Commands
 * ===> 04 - Application Setup
 * ===> 05 - Run Loop
 */

use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
};

use std::sync::atomic::{AtomicBool, Ordering};

pub mod data;
mod attachments;
mod backup;
mod http_api;
pub mod library_scan;

use data::api::{IssueDraft, IssuePatch};
use data::db;
use data::models::{
    AppState as PersistedState, Issue, LibrarySnapshot, MediaCopy, MediaItem, Note, Project, Volume,
};
use std::sync::Mutex;
use tauri::State;
use serde::Serialize;

pub struct Db(pub Mutex<rusqlite::Connection>);

const CORE_API_VERSION: u32 = 1;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectPayload {
    project: Project,
    issues: Vec<Issue>,
    notes: Vec<Note>,
}

const MAIN_WINDOW: &str = "main";
const CAPTURE_WINDOW: &str = "capture";
const TRAY_ID: &str = "axiom-tray";

static QUITTING: AtomicBool = AtomicBool::new(false);

fn env_value(primary: &str, legacy: &str) -> Option<String> {
    std::env::var(primary)
        .ok()
        .filter(|value| !value.is_empty())
        .or_else(|| std::env::var(legacy).ok().filter(|value| !value.is_empty()))
}
fn app_icon() -> Image<'static> {
    Image::from_bytes(include_bytes!("../icons/32x32.png")).expect("valid tray icon")
}

//=====> Window Management <=====//

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
        return;
    }

    let builder = WebviewWindowBuilder::new(app, MAIN_WINDOW, WebviewUrl::App("index.html".into()))
        .title("Axiom Core")
        .inner_size(1240.0, 860.0)
        .min_inner_size(900.0, 620.0)
        .center();

    let builder = match env_value("AXIOM_WEBVIEW_DATA_DIR", "ORBIT_WEBVIEW_DATA_DIR") {
        Some(dir) => builder.data_directory(std::path::PathBuf::from(dir)),
        None => builder,
    };

    if let Err(error) = builder.build() {
        eprintln!("failed to create the main window: {error}");
    }
}

fn schedule_main_window(app: &tauri::AppHandle) {
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || show_main_window(&handle));
}

fn schedule_capture(app: &tauri::AppHandle) {
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || toggle_capture_window(&handle));
}

fn toggle_capture_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window(CAPTURE_WINDOW) {
        let _ = window.close();
        return;
    }

    let builder =
        WebviewWindowBuilder::new(app, CAPTURE_WINDOW, WebviewUrl::App("index.html".into()))
            .title("Quick capture")
            .inner_size(560.0, 152.0)
            .decorations(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .resizable(false)
            .center();

    let builder = match env_value("AXIOM_WEBVIEW_DATA_DIR", "ORBIT_WEBVIEW_DATA_DIR") {
        Some(dir) => builder.data_directory(std::path::PathBuf::from(dir)),
        None => builder,
    };

    if let Err(error) = builder.build() {
        eprintln!("failed to create the capture window: {error}");
    }
}

//=====> Commands <=====//

#[tauri::command]
fn load_state(pool: State<'_, Db>) -> Result<Option<PersistedState>, String> {
    let connection = pool
        .0
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    db::load_state(&connection).map_err(|error| error.to_string())
}

//=====> Commands <=====//

#[tauri::command]
fn save_state(pool: State<'_, Db>, state: PersistedState) -> Result<(), String> {
    let mut connection = pool
        .0
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    db::save_state(&mut connection, &state).map_err(|error| error.to_string())
}

//=====> Commands <=====//

#[tauri::command]
fn load_library(pool: State<'_, Db>) -> Result<LibrarySnapshot, String> {
    let connection = pool
        .0
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    db::load_library(&connection).map_err(|error| error.to_string())
}

//=====> Commands <=====//

#[tauri::command]
fn save_media_item(pool: State<'_, Db>, item: MediaItem) -> Result<(), String> {
    let connection = pool
        .0
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    db::upsert_media_item(&connection, &item).map_err(|error| error.to_string())
}

//=====> Commands <=====//

#[tauri::command]
fn attach_media_copy(pool: State<'_, Db>, copy: MediaCopy) -> Result<(), String> {
    let connection = pool
        .0
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    db::attach_media_copy(&connection, &copy).map_err(|error| error.to_string())
}

//=====> Commands <=====//

#[tauri::command]
fn upsert_volume(pool: State<'_, Db>, volume: Volume) -> Result<(), String> {
    let connection = pool
        .0
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    db::upsert_volume(&connection, &volume).map_err(|error| error.to_string())
}

//=====> Commands <=====//

#[tauri::command]
fn set_window_title(app: tauri::AppHandle, title: String) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.set_title(&title);
    }
}

#[tauri::command]
fn sync_tray(app: tauri::AppHandle, app_name: String) -> Result<(), String> {
    //===> Resolve The Tray <===//
    let tray = app
        .tray_by_id(TRAY_ID)
        .ok_or_else(|| "tray not found".to_string())?;
    let label = if app_name.trim().is_empty() {
        "Axiom Core"
    } else {
        app_name.trim()
    };

    //===> Update Tooltip & Menu Labels <===//
    tray.set_tooltip(Some(format!("{label} — personal workspace")))
        .map_err(|error| error.to_string())?;

    let capture = MenuItem::with_id(&app, "capture", "Quick capture", true, None::<&str>)
        .map_err(|error| error.to_string())?;
    let open = MenuItem::with_id(&app, "open", format!("Open {label}"), true, None::<&str>)
        .map_err(|error| error.to_string())?;
    let quit = MenuItem::with_id(&app, "quit", format!("Quit {label}"), true, None::<&str>)
        .map_err(|error| error.to_string())?;
    let menu = Menu::with_items(&app, &[&capture, &open, &quit])
        .map_err(|error| error.to_string())?;

    tray.set_menu(Some(menu)).map_err(|error| error.to_string())?;
    Ok(())
}
//=====> Core API <=====//

fn persisted_state(pool: &State<'_, Db>) -> Result<Option<PersistedState>, String> {
    let connection = pool
        .0
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    db::load_state(&connection).map_err(|error| error.to_string())
}

#[tauri::command]
fn core_api_version() -> u32 {
    CORE_API_VERSION
}

#[tauri::command]
fn core_snapshot(pool: State<Db>) -> Result<Option<PersistedState>, String> {
    persisted_state(&pool)
}

#[tauri::command]
fn core_project(pool: State<Db>, project_id: String) -> Result<Option<ProjectPayload>, String> {
    let Some(state) = persisted_state(&pool)? else {
        return Ok(None);
    };

    let Some(project) = state.projects.into_iter().find(|item| item.id == project_id) else {
        return Ok(None);
    };

    let issues = state
        .issues
        .into_iter()
        .filter(|issue| issue.project_id.as_deref() == Some(project_id.as_str()))
        .collect();
    let notes = state
        .notes
        .into_iter()
        .filter(|note| note.project_id.as_deref() == Some(project_id.as_str()))
        .collect();

    Ok(Some(ProjectPayload {
        project,
        issues,
        notes,
    }))
}

#[tauri::command]
fn core_issue(pool: State<Db>, issue_id: String) -> Result<Option<Issue>, String> {
    let Some(state) = persisted_state(&pool)? else {
        return Ok(None);
    };

    Ok(state.issues.into_iter().find(|issue| issue.id == issue_id))
}
#[tauri::command]
fn core_issue_update(
    pool: State<Db>,
    issue_id: String,
    patch: IssuePatch,
) -> Result<Option<Issue>, String> {
    let mut connection = pool
        .0
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    data::api::update_issue(&mut connection, &issue_id, &patch)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn core_issue_create(pool: State<Db>, draft: IssueDraft) -> Result<Issue, String> {
    let mut connection = pool
        .0
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    data::api::create_issue(&mut connection, &draft).map_err(|error| error.to_string())
}
#[tauri::command]
fn pick_media_folder() -> Option<String> {
    library_scan::pick_folder()
}

#[tauri::command]
fn scan_media_folder(
    path: String,
    depth: u32,
    media_type: String,
) -> Result<Vec<library_scan::ScanCandidate>, String> {
    library_scan::scan(&path, depth, &media_type)
}
#[tauri::command]
fn pick_issue_attachment(
    app: tauri::AppHandle,
) -> Result<Option<attachments::AttachmentPayload>, String> {
    attachments::pick_and_copy(&app)
}

#[tauri::command]
fn open_issue_attachment(app: tauri::AppHandle, path: String) -> Result<(), String> {
    attachments::open(&app, &path)
}

#[tauri::command]
fn delete_issue_attachment(app: tauri::AppHandle, path: String) -> Result<(), String> {
    attachments::remove(&app, &path)
}
#[tauri::command]
fn pick_media_cover(app: tauri::AppHandle) -> Result<Option<String>, String> {
    attachments::pick_cover(&app)
}

#[tauri::command]
fn remove_media_cover(app: tauri::AppHandle, path: String) -> Result<(), String> {
    attachments::remove_cover(&app, &path)
}
#[tauri::command]
fn local_api_status(pool: State<'_, Db>) -> Result<http_api::ApiStatus, String> {
    let connection = pool.0.lock().map_err(|error| error.to_string())?;
    Ok(http_api::status(&connection))
}

#[tauri::command]
fn save_local_api_config(
    pool: State<'_, Db>,
    config: http_api::ApiConfig,
) -> Result<http_api::ApiStatus, String> {
    let connection = pool.0.lock().map_err(|error| error.to_string())?;
    http_api::save_config(&connection, &config)
}
#[tauri::command]
fn export_workspace_backup(app: tauri::AppHandle, pool: State<'_, Db>) -> Result<Option<String>, String> {
    backup::export(&app, &pool)
}

#[tauri::command]
fn import_workspace_backup(app: tauri::AppHandle) -> Result<Option<String>, String> {
    backup::stage_import(&app)
}

#[tauri::command]
fn restart_app(app: tauri::AppHandle) {
    app.restart();
}
//=====> Application Setup <=====//

pub fn run() {
    let capture_shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::Space);

    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_state,
            save_state,
            load_library,
            save_media_item,
            attach_media_copy,
            upsert_volume,
            set_window_title,
            sync_tray,
            core_api_version,
            core_snapshot,
            core_project,
            core_issue,
            core_issue_update,
            core_issue_create,
            pick_media_folder,
            scan_media_folder,
            pick_issue_attachment,
            pick_media_cover,
            remove_media_cover,
            local_api_status,
            save_local_api_config,
            export_workspace_backup,
            import_workspace_backup,
            restart_app,
            open_issue_attachment,
            delete_issue_attachment
        ])
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            schedule_main_window(app);
        }))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        schedule_capture(app);
                    }
                })
                .build(),
        )
        .setup(move |app| {
            let capture_item =
                MenuItem::with_id(app, "capture", "Quick capture", true, None::<&str>)?;
            let open_item = MenuItem::with_id(app, "open", "Open Axiom Core", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit Axiom Core", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&capture_item, &open_item, &quit_item])?;

            TrayIconBuilder::with_id(TRAY_ID)
                .icon(app_icon())
                .tooltip("Axiom Core — personal workspace")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "capture" => schedule_capture(app),
                    "open" => schedule_main_window(app),
                    "quit" => {
                        QUITTING.store(true, Ordering::SeqCst);
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        schedule_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            if let Err(error) = app.global_shortcut().register(capture_shortcut) {
                // Another app may already own Ctrl+Alt+Space; the tray still works.
                eprintln!("could not register the global shortcut: {error}");
            }

            let data_dir = match env_value("AXIOM_DATA_DIR", "ORBIT_DATA_DIR") {
                Some(dir) => std::path::PathBuf::from(dir),
                None => app.path().app_data_dir()?,
            };
            let database_path = data_dir.join("axiom.db");
            if let Err(error) = backup::apply_pending_import(&data_dir) {
                eprintln!("could not apply the staged backup: {error}");
            }
            let legacy_database = data_dir.join("orbit.db");

            //===> First Run: Adopt The Bundled Workspace Seed <===//
            if !database_path.exists() {
                if let Ok(resource_dir) = app.path().resource_dir() {
                    let seed = resource_dir.join("seed").join("axiom.db");
                    if seed.exists() {
                        let _ = std::fs::create_dir_all(&data_dir);
                        let _ = std::fs::copy(seed, &database_path);
                    }
                }
            }
            if !database_path.exists() && legacy_database.exists() {
                let _ = std::fs::rename(&legacy_database, &database_path);
                let _ = std::fs::rename(data_dir.join("orbit.db-wal"), data_dir.join("axiom.db-wal"));
                let _ = std::fs::rename(data_dir.join("orbit.db-shm"), data_dir.join("axiom.db-shm"));
            }
            let connection = db::open(&database_path)?;
            let api_config = http_api::ensure_config(&connection);
            app.manage(Db(Mutex::new(connection)));
            http_api::start(app.handle().clone(), api_config);

            // The first launch opens the app; AXIOM_START_HIDDEN=1 keeps the shell tray-only.
            if env_value("AXIOM_START_HIDDEN", "ORBIT_START_HIDDEN").unwrap_or_default() != "1" {
                show_main_window(app.handle());
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Axiom Core");

//=====> Run Loop <=====//

    app.run(|_app_handle, event| {
        if let tauri::RunEvent::ExitRequested { api, .. } = event {
            if !QUITTING.load(Ordering::SeqCst) {
                api.prevent_exit();
            }
        }
    });
}
