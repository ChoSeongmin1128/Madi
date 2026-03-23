mod application;
mod commands;
mod domain;
mod error;
mod infrastructure;
mod ports;
mod state;
mod sync;

use std::fs;

use crate::ports::repositories::AppStateRepository;
use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      let app_dir = app.path().app_data_dir().expect("failed to resolve app data directory");
      fs::create_dir_all(&app_dir).expect("failed to create app data directory");

      let database_path = app_dir.join("minnote.sqlite3");
      let app_state = AppState::new(&database_path).expect("failed to initialize app state");

      // iCloud 동기화가 활성화된 경우 sidecar 자동 시작
      let icloud_enabled = app_state
        .repository
        .lock()
        .ok()
        .and_then(|repo| repo.get_app_settings().ok())
        .map(|settings| settings.icloud_sync_enabled)
        .unwrap_or(false);

      app.manage(app_state);

      if icloud_enabled {
        if let Some(managed_state) = app.try_state::<AppState>() {
          let db_path = database_path.to_str().unwrap_or_default().to_string();
          let state_path = database_path
            .parent()
            .unwrap_or(&database_path)
            .join("sync-engine-state.json")
            .to_str()
            .unwrap_or_default()
            .to_string();

          let app_handle = app.handle().clone();
          if let Ok(mut sync) = managed_state.sync_manager.lock() {
            let _ = sync.start(&app_handle, &db_path, &state_path);
          }
        }
      }

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::bootstrap_app,
      commands::list_documents,
      commands::open_document,
      commands::create_document,
      commands::rename_document,
      commands::delete_document,
      commands::delete_all_documents,
      commands::search_documents,
      commands::create_block_below,
      commands::change_block_kind,
      commands::move_block,
      commands::delete_block,
      commands::update_markdown_block,
      commands::update_code_block,
      commands::update_text_block,
      commands::flush_document,
      commands::set_theme_mode,
      commands::set_default_block_tint_preset,
      commands::set_document_block_tint_override,
      commands::restore_document_blocks,
      commands::empty_trash,
      commands::restore_document_from_trash,
      commands::set_icloud_sync_enabled,
      commands::apply_remote_documents,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
