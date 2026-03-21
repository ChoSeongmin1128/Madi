use super::*;

impl SqliteStore {
  pub(crate) fn rebuild_search_index(&self, document_id: &str) -> Result<(), AppError> {
    let title = self
      .connection
      .query_row(
        "SELECT coalesce(title, '') FROM documents WHERE id = ?1",
        params![document_id],
        |row| row.get::<_, String>(0),
      )
      .optional()?
      .unwrap_or_default();

    let content = self
      .connection
      .query_row(
        "SELECT coalesce(group_concat(search_text, ' '), '') FROM blocks WHERE document_id = ?1 ORDER BY position",
        params![document_id],
        |row| row.get::<_, String>(0),
      )
      .optional()?
      .unwrap_or_default();

    self.connection.execute(
      &format!("DELETE FROM {SEARCH_INDEX_TABLE} WHERE document_id = ?1"),
      params![document_id],
    )?;
    self.connection.execute(
      &format!("INSERT INTO {SEARCH_INDEX_TABLE} (document_id, title, content) VALUES (?1, ?2, ?3)"),
      params![document_id, title, content],
    )?;

    Ok(())
  }
}
