use tauri::State;

use crate::application::dto::WindowControlRuntimeStateDto;
use crate::state::AppState;
use crate::window_controls::preview_window_opacity;

#[tauri::command]
pub fn get_window_control_runtime_state(
  state: State<'_, AppState>,
) -> Result<WindowControlRuntimeStateDto, String> {
  Ok(WindowControlRuntimeStateDto {
    global_shortcut_error: state.global_shortcut_error(),
    menu_bar_icon_error: state.menu_bar_icon_error(),
    window_preference_error: state.window_preference_error(),
  })
}

#[tauri::command]
pub fn confirm_app_shutdown(
  state: State<'_, AppState>,
  app_handle: tauri::AppHandle,
) -> Result<(), String> {
  state.set_shutdown_confirmed(true);
  app_handle.exit(0);
  Ok(())
}

#[tauri::command]
pub fn preview_window_opacity_percent(
  app_handle: tauri::AppHandle,
  percent: u8,
) -> Result<u8, String> {
  preview_window_opacity(&app_handle, percent)
}
