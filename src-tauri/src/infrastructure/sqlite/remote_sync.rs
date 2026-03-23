use super::*;

impl RemoteSyncRepository for SqliteStore {
  fn upsert_document_from_remote(
    &mut self,
    id: &str,
    title: Option<String>,
    block_tint_override: Option<BlockTintPreset>,
    created_at: i64,
    updated_at: i64,
    deleted_at: Option<i64>,
  ) -> Result<Document, AppError> {
    let tint_str = block_tint_override.as_ref().map(|p| p.as_str().to_string());

    // last_opened_at은 로컬 값 유지 (없으면 updated_at 사용)
    let existing_opened_at = self
      .connection
      .query_row(
        "SELECT last_opened_at FROM documents WHERE id = ?1",
        params![id],
        |row| row.get::<_, i64>(0),
      )
      .optional()?;

    let last_opened_at = existing_opened_at.unwrap_or(updated_at);

    self.connection.execute(
      "INSERT INTO documents (id, title, block_tint_override, created_at, updated_at, last_opened_at, deleted_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         block_tint_override = excluded.block_tint_override,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at
       WHERE excluded.updated_at >= documents.updated_at",
      params![id, title, tint_str, created_at, updated_at, last_opened_at, deleted_at],
    )?;

    self
      .get_document(id)?
      .ok_or_else(|| AppError::validation("원격 문서를 찾을 수 없습니다."))
  }

  fn rebuild_search_index_for_document(&self, document_id: &str) -> Result<(), AppError> {
    self.rebuild_search_index(document_id)
  }
}
