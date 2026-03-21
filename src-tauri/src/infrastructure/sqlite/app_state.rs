use super::*;

impl AppStateRepository for SqliteStore {
  fn get_last_opened_document_id(&self) -> Result<Option<String>, AppError> {
    self.get_state_value("last_opened_document_id")
  }

  fn set_last_opened_document_id(&mut self, document_id: &str) -> Result<(), AppError> {
    self.set_state_value("last_opened_document_id", document_id)?;
    Ok(())
  }

  fn get_app_settings(&self) -> Result<AppSettings, AppError> {
    let theme_mode = self
      .get_state_value("theme_mode")?
      .map(|value| ThemeMode::from_str(&value))
      .unwrap_or(ThemeMode::System);
    let default_block_tint_preset = self
      .get_state_value("default_block_tint_preset")?
      .map(|value| BlockTintPreset::from_str(&value))
      .unwrap_or(BlockTintPreset::Mist);
    let icloud_sync_enabled = self
      .get_state_value("icloud_sync_enabled")?
      .map(|value| value == "true")
      .unwrap_or(false);

    Ok(AppSettings {
      theme_mode,
      default_block_tint_preset,
      icloud_sync_enabled,
    })
  }

  fn set_theme_mode(&mut self, theme_mode: ThemeMode) -> Result<(), AppError> {
    self.set_state_value("theme_mode", theme_mode.as_str())?;
    Ok(())
  }

  fn set_default_block_tint_preset(&mut self, preset: BlockTintPreset) -> Result<(), AppError> {
    self.set_state_value("default_block_tint_preset", preset.as_str())?;
    Ok(())
  }
}
