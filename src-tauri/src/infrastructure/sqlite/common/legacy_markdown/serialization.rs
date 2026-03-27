use super::*;

impl SqliteStore {
  pub(super) fn legacy_markdown_json_to_markdown(raw: &str) -> Option<String> {
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

        Self::legacy_indent_lines(&quoted, "> ")
      }
      Some("codeBlock") => {
        let language = map
          .get("attrs")
          .and_then(Value::as_object)
          .and_then(|attrs| attrs.get("language"))
          .and_then(Value::as_str)
          .unwrap_or_default();
        let code = content.iter().map(Self::serialize_legacy_markdown_inline).collect::<String>();

        if language.is_empty() {
          format!("{indent}```\n{code}\n{indent}```")
        } else {
          format!("{indent}```{language}\n{code}\n{indent}```")
        }
      }
      Some("horizontalRule") => format!("{indent}---"),
      _ => content
        .iter()
        .map(Self::serialize_legacy_markdown_inline)
        .collect::<String>(),
    }
  }
}
