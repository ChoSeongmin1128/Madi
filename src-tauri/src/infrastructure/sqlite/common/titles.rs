use super::*;

impl SqliteStore {
  fn normalize_document_title(title: Option<String>) -> String {
    let trimmed = title.unwrap_or_default().trim().to_string();
    if trimmed.is_empty() {
      return "Untitled".to_string();
    }

    trimmed
  }

  fn title_exists(&self, title: &str, excluded_document_id: Option<&str>) -> Result<bool, AppError> {
    let exists = match excluded_document_id {
      Some(document_id) => self
        .connection
        .query_row(
          "SELECT EXISTS(SELECT 1 FROM documents WHERE title = ?1 AND id != ?2 AND deleted_at IS NULL)",
          params![title, document_id],
          |row| row.get::<_, i64>(0),
        )?,
      None => self
        .connection
        .query_row(
          "SELECT EXISTS(SELECT 1 FROM documents WHERE title = ?1 AND deleted_at IS NULL)",
          params![title],
          |row| row.get::<_, i64>(0),
        )?,
    };

    Ok(exists > 0)
  }

  pub(crate) fn unique_document_title(
    &self,
    title: Option<String>,
    excluded_document_id: Option<&str>,
  ) -> Result<String, AppError> {
    let base = Self::normalize_document_title(title);
    if !self.title_exists(&base, excluded_document_id)? {
      return Ok(base);
    }

    let mut suffix = 1;
    loop {
      let candidate = format!("{base} ({suffix})");
      if !self.title_exists(&candidate, excluded_document_id)? {
        return Ok(candidate);
      }
      suffix += 1;
    }
  }
}
