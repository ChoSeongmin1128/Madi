use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
  #[error("database error: {0}")]
  Database(#[from] rusqlite::Error),
  #[error("serialization error: {0}")]
  Serialization(#[from] serde_json::Error),
  #[error("io error: {0}")]
  Io(#[from] std::io::Error),
  #[error("state lock failed")]
  StateLock,
  #[error("{0}")]
  Validation(String),
}

impl AppError {
  pub fn validation(message: impl Into<String>) -> Self {
    Self::Validation(message.into())
  }
}
