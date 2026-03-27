use super::*;

impl SqliteStore {
  pub(crate) fn get_state_value(&self, key: &str) -> Result<Option<String>, AppError> {
    self.connection
      .query_row(
        "SELECT value FROM app_state WHERE key = ?1",
        params![key],
        |row| row.get::<_, String>(0),
      )
      .optional()
      .map_err(AppError::from)
  }

  pub(crate) fn set_state_value(&self, key: &str, value: &str) -> Result<(), AppError> {
    self.connection.execute(
      "INSERT INTO app_state (key, value) VALUES (?1, ?2)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      params![key, value],
    )?;
    Ok(())
  }
}
