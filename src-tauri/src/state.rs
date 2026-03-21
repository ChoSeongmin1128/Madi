use std::path::Path;
use std::sync::Mutex;

use crate::error::AppError;
use crate::infrastructure::sqlite::SqliteStore;

pub struct AppState {
  pub repository: Mutex<SqliteStore>,
}

impl AppState {
  pub fn new(path: &Path) -> Result<Self, AppError> {
    let repository = SqliteStore::new(path)?;
    Ok(Self {
      repository: Mutex::new(repository),
    })
  }
}
