use tauri::State;

use crate::application::dto::{BlockDto, BlockRestoreDto, DocumentDto};
use crate::application::services;
use crate::domain::models::BlockKind;
use crate::state::AppState;

use super::helpers::with_repository;

#[tauri::command]
pub fn create_block_below(
  state: State<'_, AppState>,
  document_id: String,
  after_block_id: Option<String>,
  kind: BlockKind,
) -> Result<DocumentDto, String> {
  with_repository(state, |repository| {
    services::create_block_below(repository, &document_id, after_block_id.as_deref(), kind)
  })
}

#[tauri::command]
pub fn change_block_kind(
  state: State<'_, AppState>,
  block_id: String,
  kind: BlockKind,
) -> Result<BlockDto, String> {
  with_repository(state, |repository| services::change_block_kind(repository, &block_id, kind))
}

#[tauri::command]
pub fn move_block(
  state: State<'_, AppState>,
  document_id: String,
  block_id: String,
  target_position: i64,
) -> Result<DocumentDto, String> {
  with_repository(state, |repository| {
    services::move_block(repository, &document_id, &block_id, target_position)
  })
}

#[tauri::command]
pub fn delete_block(state: State<'_, AppState>, block_id: String) -> Result<DocumentDto, String> {
  with_repository(state, |repository| services::delete_block(repository, &block_id))
}

#[tauri::command]
pub fn update_markdown_block(
  state: State<'_, AppState>,
  block_id: String,
  content: String,
) -> Result<BlockDto, String> {
  with_repository(state, |repository| services::update_markdown_block(repository, &block_id, content))
}

#[tauri::command]
pub fn update_code_block(
  state: State<'_, AppState>,
  block_id: String,
  content: String,
  language: Option<String>,
) -> Result<BlockDto, String> {
  with_repository(state, |repository| {
    services::update_code_block(repository, &block_id, content, language)
  })
}

#[tauri::command]
pub fn update_text_block(
  state: State<'_, AppState>,
  block_id: String,
  content: String,
) -> Result<BlockDto, String> {
  with_repository(state, |repository| services::update_text_block(repository, &block_id, content))
}

#[tauri::command]
pub fn restore_document_blocks(
  state: State<'_, AppState>,
  document_id: String,
  blocks: Vec<BlockRestoreDto>,
) -> Result<DocumentDto, String> {
  with_repository(state, |repository| {
    services::restore_document_blocks(repository, &document_id, blocks)
  })
}
