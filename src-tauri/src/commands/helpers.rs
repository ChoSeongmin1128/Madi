use tauri::State;

use crate::app_runtime::{build_tray_icon, TRAY_ID};
use crate::application::services;
use crate::domain::models::AppSettings;
use crate::error::AppError;
use crate::ports::repositories::AppRepository;
use crate::state::AppState;
use crate::window_controls::{apply_window_preferences_with_settings, update_global_shortcut_registration};

pub(super) fn with_repository<T>(
  state: State<'_, AppState>,
  callback: impl FnOnce(&mut dyn AppRepository) -> Result<T, AppError>,
) -> Result<T, String> {
  let mut repository = state.repository.lock().map_err(|_| AppError::StateLock.to_string())?;
  callback(&mut *repository).map_err(|error| error.to_string())
}

pub(super) fn with_repository_and_settings<T>(
  state: State<'_, AppState>,
  callback: impl FnOnce(&mut dyn AppRepository) -> Result<T, AppError>,
) -> Result<(T, AppSettings), String> {
  with_repository(state, |repository| {
    let result = callback(repository)?;
    let settings = repository.get_app_settings()?;
    Ok((result, settings))
  })
}

pub(super) fn sync_tray_icon_enabled(
  app_handle: &tauri::AppHandle,
  enabled: bool,
) -> Result<(), String> {
  if enabled {
    if app_handle.tray_by_id(TRAY_ID).is_none() {
      build_tray_icon(app_handle).map_err(|error| error.to_string())?;
    }
  } else {
    let _ = app_handle.remove_tray_by_id(TRAY_ID);
  }

  Ok(())
}

pub(super) fn persist_window_setting<T>(
  state: State<'_, AppState>,
  app_handle: &tauri::AppHandle,
  callback: impl FnOnce(&mut dyn AppRepository) -> Result<T, AppError>,
) -> Result<T, String> {
  let (result, settings) = with_repository_and_settings(state, callback)?;
  apply_window_preferences_with_settings(app_handle, &settings)?;
  Ok(result)
}

pub(super) fn persist_global_shortcut(
  state: State<'_, AppState>,
  app_handle: &tauri::AppHandle,
  shortcut: Option<String>,
) -> Result<Option<String>, String> {
  let previous_shortcut = state.active_global_toggle_shortcut();
  let registered_shortcut = update_global_shortcut_registration(app_handle, shortcut.clone())?;

  match with_repository(state.clone(), |repository| {
    services::set_global_toggle_shortcut(repository, registered_shortcut.clone())
  }) {
    Ok(result) => {
      state.set_global_shortcut_error(None);
      Ok(result)
    }
    Err(error) => {
      let _ = update_global_shortcut_registration(app_handle, previous_shortcut);
      Err(error)
    }
  }
}
