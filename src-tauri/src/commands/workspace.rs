use tauri::State;

use crate::application::dto::{BootstrapPayload, DocumentDto, DocumentSummaryDto, SearchResultDto};
use crate::application::services;
use crate::state::AppState;

use super::helpers::with_repository;

#[tauri::command]
pub fn bootstrap_app(state: State<'_, AppState>) -> Result<BootstrapPayload, String> {
  with_repository(state, services::bootstrap_app)
}

#[tauri::command]
pub fn list_documents(state: State<'_, AppState>) -> Result<Vec<DocumentSummaryDto>, String> {
  with_repository(state, services::list_documents)
}

#[tauri::command]
pub fn open_document(state: State<'_, AppState>, document_id: String) -> Result<DocumentDto, String> {
  with_repository(state, |repository| services::open_document(repository, &document_id))
}

#[tauri::command]
pub fn create_document(state: State<'_, AppState>) -> Result<DocumentDto, String> {
  with_repository(state, services::create_document)
}

#[tauri::command]
pub fn rename_document(
  state: State<'_, AppState>,
  document_id: String,
  title: Option<String>,
) -> Result<DocumentDto, String> {
  with_repository(state, |repository| services::rename_document(repository, &document_id, title))
}

#[tauri::command]
pub fn delete_document(state: State<'_, AppState>, document_id: String) -> Result<BootstrapPayload, String> {
  with_repository(state, |repository| services::delete_document(repository, &document_id))
}

#[tauri::command]
pub fn delete_all_documents(state: State<'_, AppState>) -> Result<BootstrapPayload, String> {
  with_repository(state, services::delete_all_documents)
}

#[tauri::command]
pub fn search_documents(state: State<'_, AppState>, query: String) -> Result<Vec<SearchResultDto>, String> {
  with_repository(state, |repository| services::search_documents(repository, &query))
}

#[tauri::command]
pub fn flush_document(state: State<'_, AppState>, document_id: String) -> Result<i64, String> {
  with_repository(state, |repository| services::flush_document(repository, &document_id))
}

#[tauri::command]
pub fn empty_trash(state: State<'_, AppState>) -> Result<(), String> {
  with_repository(state, services::empty_trash)
}

#[tauri::command]
pub fn restore_document_from_trash(
  state: State<'_, AppState>,
  document_id: String,
) -> Result<BootstrapPayload, String> {
  with_repository(state, |repository| {
    services::restore_document_from_trash(repository, &document_id)
  })
}
