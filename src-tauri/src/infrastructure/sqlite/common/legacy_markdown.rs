use super::*;

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

  pub(crate) fn markdown_plain_text(markdown: &str) -> String {
    markdown
      .lines()
      .map(|line| {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with("```") {
          return String::new();
        }

        let without_marker = if let Some(rest) = trimmed.strip_prefix("> ") {
          rest
        } else if let Some(rest) = trimmed.strip_prefix("- [ ] ") {
          rest
        } else if let Some(rest) = trimmed.strip_prefix("- [x] ") {
          rest
        } else if let Some(rest) = trimmed.strip_prefix("- [X] ") {
          rest
        } else if let Some(rest) = trimmed.strip_prefix("- ") {
          rest
        } else if let Some(rest) = trimmed.strip_prefix("* ") {
          rest
        } else if let Some(rest) = trimmed.strip_prefix("+ ") {
          rest
        } else {
          let bytes = trimmed.as_bytes();
          let mut index = 0;
          while index < bytes.len() && bytes[index].is_ascii_digit() {
            index += 1;
          }

          if index > 0 && index + 1 < bytes.len() && bytes[index] == b'.' && bytes[index + 1] == b' ' {
            &trimmed[(index + 2)..]
          } else {
            trimmed.trim_start_matches('#').trim()
          }
        };

        without_marker
          .replace("**", " ")
          .replace('*', " ")
          .replace("__", " ")
          .replace('_', " ")
          .replace("~~", " ")
          .replace('`', " ")
          .replace('[', " ")
          .replace(']', " ")
          .replace('(', " ")
          .replace(')', " ")
      })
      .flat_map(|line| line.split_whitespace().map(str::to_string).collect::<Vec<_>>())
      .collect::<Vec<_>>()
      .join(" ")
  }

  fn legacy_markdown_json_to_markdown(raw: &str) -> Option<String> {
    let value: Value = serde_json::from_str(raw).ok()?;
    let node_type = value
      .as_object()
      .and_then(|map| map.get("type"))
      .and_then(Value::as_str);

    if node_type != Some("doc") {
      return None;
    }

    Some(Self::serialize_legacy_markdown_node(&value, "").trim().to_string())
  }

  fn serialize_legacy_markdown_inline(node: &Value) -> String {
    match node {
      Value::String(text) => text.to_string(),
      Value::Object(map) => {
        let node_type = map.get("type").and_then(Value::as_str);

        if node_type == Some("text") {
          let mut text = map.get("text").and_then(Value::as_str).unwrap_or_default().to_string();

          if let Some(marks) = map.get("marks").and_then(Value::as_array) {
            for mark in marks {
              let mark_type = mark.get("type").and_then(Value::as_str);
              text = match mark_type {
                Some("bold") => format!("**{text}**"),
                Some("italic") => format!("*{text}*"),
                Some("strike") => format!("~~{text}~~"),
                Some("code") => format!("`{text}`"),
                _ => text,
              };
            }
          }

          return text;
        }

        if node_type == Some("hardBreak") {
          return "  \n".to_string();
        }

        map.get("content")
          .and_then(Value::as_array)
          .map(|content| content.iter().map(Self::serialize_legacy_markdown_inline).collect::<String>())
          .unwrap_or_default()
      }
      Value::Array(values) => values
        .iter()
        .map(Self::serialize_legacy_markdown_inline)
        .collect::<String>(),
      _ => String::new(),
    }
  }

  fn legacy_indent_lines(text: &str, indent: &str) -> String {
    text
      .lines()
      .map(|line| {
        if line.is_empty() {
          indent.trim_end().to_string()
        } else {
          format!("{indent}{line}")
        }
      })
      .collect::<Vec<_>>()
      .join("\n")
  }

  fn serialize_legacy_list_item_node(node: &Value, prefix: &str, indent: &str) -> String {
    let nested_indent = format!("{indent}  ");
    let parts = node
      .get("content")
      .and_then(Value::as_array)
      .map(|content| {
        content
          .iter()
          .enumerate()
          .map(|(index, child)| Self::serialize_legacy_markdown_node(child, if index == 0 { "" } else { &nested_indent }))
          .filter(|part| !part.trim().is_empty())
          .collect::<Vec<_>>()
      })
      .unwrap_or_default();

    if parts.is_empty() {
      return format!("{indent}{prefix}").trim_end().to_string();
    }

    let first = parts[0].clone();
    let rest = parts[1..].to_vec();
    let mut first_lines = first.lines();
    let head = format!("{indent}{prefix}{}", first_lines.next().unwrap_or_default());
    let mut lines = vec![head];
    lines.extend(first_lines.map(|line| format!("{nested_indent}{line}")));
    lines.extend(rest);
    lines.join("\n")
  }

  fn serialize_legacy_markdown_node(node: &Value, indent: &str) -> String {
    let Some(map) = node.as_object() else {
      return match node {
        Value::String(text) => text.to_string(),
        Value::Array(values) => values
          .iter()
          .map(|value| Self::serialize_legacy_markdown_node(value, indent))
          .filter(|part| !part.trim().is_empty())
          .collect::<Vec<_>>()
          .join("\n\n"),
        _ => String::new(),
      };
    };

    let node_type = map.get("type").and_then(Value::as_str);
    let content = map.get("content").and_then(Value::as_array).cloned().unwrap_or_default();

    match node_type {
      Some("doc") => content
        .iter()
        .map(|child| Self::serialize_legacy_markdown_node(child, indent))
        .filter(|part| !part.trim().is_empty())
        .collect::<Vec<_>>()
        .join("\n\n")
        .trim()
        .to_string(),
      Some("paragraph") => format!(
        "{indent}{}",
        content.iter().map(Self::serialize_legacy_markdown_inline).collect::<String>()
      )
      .trim_end()
      .to_string(),
      Some("heading") => {
        let level = map
          .get("attrs")
          .and_then(Value::as_object)
          .and_then(|attrs| attrs.get("level"))
          .and_then(Value::as_i64)
          .unwrap_or(1)
          .clamp(1, 6) as usize;

        format!(
          "{indent}{} {}",
          "#".repeat(level),
          content.iter().map(Self::serialize_legacy_markdown_inline).collect::<String>()
        )
        .trim_end()
        .to_string()
      }
      Some("bulletList") => content
        .iter()
        .map(|child| Self::serialize_legacy_list_item_node(child, "- ", indent))
        .collect::<Vec<_>>()
        .join("\n"),
      Some("orderedList") => {
        let start = map
          .get("attrs")
          .and_then(Value::as_object)
          .and_then(|attrs| attrs.get("start"))
          .and_then(Value::as_i64)
          .unwrap_or(1);

        content
          .iter()
          .enumerate()
          .map(|(index, child)| {
            Self::serialize_legacy_list_item_node(child, &format!("{}. ", start + index as i64), indent)
          })
          .collect::<Vec<_>>()
          .join("\n")
      }
      Some("taskList") => content
        .iter()
        .map(|child| {
          let checked = child
            .get("attrs")
            .and_then(Value::as_object)
            .and_then(|attrs| attrs.get("checked"))
            .and_then(Value::as_bool)
            .unwrap_or(false);

          Self::serialize_legacy_list_item_node(child, if checked { "- [x] " } else { "- [ ] " }, indent)
        })
        .collect::<Vec<_>>()
        .join("\n"),
      Some("listItem") | Some("taskItem") => Self::serialize_legacy_list_item_node(node, "- ", indent),
      Some("blockquote") => {
        let quoted = content
          .iter()
          .map(|child| Self::serialize_legacy_markdown_node(child, ""))
          .filter(|part| !part.trim().is_empty())
          .collect::<Vec<_>>()
          .join("\n\n");
        Self::legacy_indent_lines(&quoted, &format!("{indent}> "))
      }
      Some("codeBlock") => {
        let language = map
          .get("attrs")
          .and_then(Value::as_object)
          .and_then(|attrs| attrs.get("language"))
          .and_then(Value::as_str)
          .unwrap_or_default();
        let body = content
          .iter()
          .map(Self::serialize_legacy_markdown_inline)
          .collect::<String>()
          .trim_end_matches('\n')
          .to_string();
        format!("{indent}```{language}\n{body}\n{indent}```")
      }
      Some("horizontalRule") => format!("{indent}---"),
      _ => content
        .iter()
        .map(|child| Self::serialize_legacy_markdown_node(child, indent))
        .filter(|part| !part.trim().is_empty())
        .collect::<Vec<_>>()
        .join("\n\n"),
    }
  }
}
