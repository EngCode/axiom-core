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

mod data;

use data::db;
use data::models::{
    AppState as PersistedState, LibrarySnapshot, MediaCopy, MediaItem, Volume,
};
use std::sync::Mutex;
use tauri::State;

struct Db(Mutex<rusqlite::Connection>);

const MAIN_WINDOW: &str = "main";
const CAPTURE_WINDOW: &str = "capture";
const TRAY_ID: &str = "orbit-tray";

static QUITTING: AtomicBool = AtomicBool::new(false);

fn app_icon() -> Image<'static> {
    Image::from_bytes(include_bytes!("../icons/32x32.png")).expect("valid tray icon")
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
        return;
    }

    let builder = WebviewWindowBuilder::new(app, MAIN_WINDOW, WebviewUrl::App("index.html".into()))
        .title("Orbit")
        .inner_size(1240.0, 860.0)
        .min_inner_size(900.0, 620.0)
        .center();

    let builder = match std::env::var("ORBIT_WEBVIEW_DATA_DIR") {
        Ok(dir) if !dir.is_empty() => builder.data_directory(std::path::PathBuf::from(dir)),
        _ => builder,
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

    let builder = match std::env::var("ORBIT_WEBVIEW_DATA_DIR") {
        Ok(dir) if !dir.is_empty() => builder.data_directory(std::path::PathBuf::from(dir)),
        _ => builder,
    };

    if let Err(error) = builder.build() {
        eprintln!("failed to create the capture window: {error}");
    }
}

#[tauri::command]
fn load_state(pool: State<'_, Db>) -> Result<Option<PersistedState>, String> {
    let connection = pool
        .0
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    db::load_state(&connection).map_err(|error| error.to_string())
}

#[tauri::command]
fn save_state(pool: State<'_, Db>, state: PersistedState) -> Result<(), String> {
    let mut connection = pool
        .0
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    db::save_state(&mut connection, &state).map_err(|error| error.to_string())
}

#[tauri::command]
fn load_library(pool: State<'_, Db>) -> Result<LibrarySnapshot, String> {
    let connection = pool
        .0
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    db::load_library(&connection).map_err(|error| error.to_string())
}

#[tauri::command]
fn save_media_item(pool: State<'_, Db>, item: MediaItem) -> Result<(), String> {
    let connection = pool
        .0
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    db::upsert_media_item(&connection, &item).map_err(|error| error.to_string())
}

#[tauri::command]
fn attach_media_copy(pool: State<'_, Db>, copy: MediaCopy) -> Result<(), String> {
    let connection = pool
        .0
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    db::attach_media_copy(&connection, &copy).map_err(|error| error.to_string())
}

#[tauri::command]
fn upsert_volume(pool: State<'_, Db>, volume: Volume) -> Result<(), String> {
    let connection = pool
        .0
        .lock()
        .map_err(|_| "database lock poisoned".to_string())?;
    db::upsert_volume(&connection, &volume).map_err(|error| error.to_string())
}

pub fn run() {
    let capture_shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::Space);

    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_state,
            save_state,
            load_library,
            save_media_item,
            attach_media_copy,
            upsert_volume
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
            let open_item = MenuItem::with_id(app, "open", "Open Orbit", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit Orbit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&capture_item, &open_item, &quit_item])?;

            TrayIconBuilder::with_id(TRAY_ID)
                .icon(app_icon())
                .tooltip("Orbit — personal workspace")
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

            let data_dir = match std::env::var("ORBIT_DATA_DIR") {
                Ok(dir) if !dir.is_empty() => std::path::PathBuf::from(dir),
                _ => app.path().app_data_dir()?,
            };
            let connection = db::open(&data_dir.join("orbit.db"))?;
            app.manage(Db(Mutex::new(connection)));

            // The first launch opens the app; ORBIT_START_HIDDEN=1 keeps the shell tray-only.
            if std::env::var("ORBIT_START_HIDDEN").unwrap_or_default() != "1" {
                show_main_window(app.handle());
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Orbit");

    app.run(|_app_handle, event| {
        if let tauri::RunEvent::ExitRequested { api, .. } = event {
            if !QUITTING.load(Ordering::SeqCst) {
                api.prevent_exit();
            }
        }
    });
}
