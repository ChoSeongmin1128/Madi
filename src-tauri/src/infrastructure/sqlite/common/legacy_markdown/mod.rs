use super::*;

mod plain_text;
mod serialization;

impl SqliteStore {
  pub(crate) fn normalize_markdown_storage(raw: &str) -> (String, String, bool) {
    let normalized_newlines = raw.replace("\r\n", "\n");
    if let Some(markdown) = Self::legacy_markdown_json_to_markdown(&normalized_newlines) {
      let search_text = Self::markdown_plain_text(&markdown);
      return (markdown, search_text, true);
    }

    let search_text = Self::markdown_plain_text(&normalized_newlines);
    (normalized_newlines, search_text, false)
  }
}
