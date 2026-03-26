use super::*;
use crate::ports::models::{RemoteDocumentApplyOutcome, RemoteRestoreBlockInput};

impl RemoteSyncRepository for SqliteStore {
  fn upsert_document_from_remote(
    &mut self,
    id: &str,
    title: Option<String>,
    block_tint_override: Option<BlockTintPreset>,
    document_surface_tone_override: Option<DocumentSurfaceTonePreset>,
    created_at: i64,
    updated_at: i64,
    deleted_at: Option<i64>,
  ) -> Result<RemoteDocumentApplyOutcome, AppError> {
    let tint_str = block_tint_override.as_ref().map(|p| p.as_str().to_string());
    let surface_tone_str = document_surface_tone_override.as_ref().map(|p| p.as_str().to_string());
    let existing = self
      .connection
      .query_row(
        "SELECT updated_at, deleted_at, last_opened_at FROM documents WHERE id = ?1",
        params![id],
        |row| {
          Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, Option<i64>>(1)?,
            row.get::<_, i64>(2)?,
          ))
        },
      )
      .optional()?;
    let pending_local_version = self
      .connection
      .query_row(
        "SELECT version_at_enqueue
         FROM sync_outbox
         WHERE document_id = ?1 AND acknowledged_at IS NULL",
        params![id],
        |row| row.get::<_, i64>(0),
      )
      .optional()?;
    let existing_updated_at = existing.as_ref().map(|(current, _, _)| *current);
    let existing_deleted_at = existing.as_ref().and_then(|(_, deleted_at, _)| *deleted_at);
    let last_opened_at = existing
      .as_ref()
      .map(|(_, _, last_opened_at)| *last_opened_at)
      .unwrap_or(updated_at);

    let local_pending_wins = pending_local_version.is_some_and(|version| version >= updated_at);
    let applied = if local_pending_wins {
      false
    } else {
      match existing_updated_at {
        None => true,
        Some(current) if updated_at > current => true,
        Some(current) if updated_at < current => false,
        Some(_) => deleted_at.is_some() && existing_deleted_at.is_none(),
      }
    };

    if applied {
      self.connection.execute(
        "INSERT INTO documents (id, title, block_tint_override, document_surface_tone_override, created_at, updated_at, last_opened_at, deleted_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           block_tint_override = excluded.block_tint_override,
           document_surface_tone_override = excluded.document_surface_tone_override,
           created_at = excluded.created_at,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at",
        params![id, title, tint_str, surface_tone_str, created_at, updated_at, last_opened_at, deleted_at],
      )?;
    }

    let document = self
      .get_document(id)?
      .ok_or_else(|| AppError::validation("원격 문서를 찾을 수 없습니다."))?;

    Ok(RemoteDocumentApplyOutcome { document, applied })
  }

  fn restore_blocks_from_remote(
    &mut self,
    document_id: &str,
    blocks: &[RemoteRestoreBlockInput],
    document_updated_at: i64,
  ) -> Result<Vec<Block>, AppError> {
    let transaction = self.connection.transaction()?;

    transaction.execute("DELETE FROM blocks WHERE document_id = ?1", params![document_id])?;

    if blocks.is_empty() {
      Self::insert_empty_block_with_timestamps(
        &transaction,
        document_id,
        0,
        BlockKind::Markdown,
        document_updated_at,
        document_updated_at,
      )?;
    } else {
      let mut ordered: Vec<_> = blocks.iter().collect();
      ordered.sort_by_key(|b| b.position);

      for (i, block) in ordered.iter().enumerate() {
        let (content, search_text) = match block.kind {
          BlockKind::Markdown => {
            let (content, search_text, _) = Self::normalize_markdown_storage(&block.content);
            (content, search_text)
          }
          BlockKind::Code | BlockKind::Text => (block.content.clone(), block.content.clone()),
        };

        transaction.execute(
          "INSERT INTO blocks (id, document_id, kind, position, content, search_text, language, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
          params![
            block.id,
            document_id,
            block.kind.as_str(),
            i as i64,
            content,
            search_text,
            block.language,
            block.created_at,
            block.updated_at,
          ],
        )?;
      }
    }

    transaction.commit()?;

    self.rebuild_search_index(document_id)?;
    self.list_blocks(document_id)
  }
}
