use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

use crate::ports::repositories::AppStateRepository;
use crate::state::AppState;
use super::toggle_main_window;

pub(crate) trait ShortcutRegistrar {
  fn register(&self, shortcut: &str) -> Result<(), String>;
  fn unregister(&self, shortcut: &str) -> Result<(), String>;
}

pub(crate) struct TauriShortcutRegistrar<'a> {
  pub(crate) app: &'a AppHandle,
}

impl ShortcutRegistrar for TauriShortcutRegistrar<'_> {
  fn register(&self, shortcut: &str) -> Result<(), String> {
    self
      .app
      .global_shortcut()
      .on_shortcut(shortcut, |app, _shortcut, event| {
        if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
          let _ = toggle_main_window(app);
        }
      })
      .map_err(|error| format!("전역 단축키를 등록하지 못했습니다: {error}"))
  }

  fn unregister(&self, shortcut: &str) -> Result<(), String> {
    self
      .app
      .global_shortcut()
      .unregister(shortcut)
      .map_err(|error| format!("기존 전역 단축키를 해제하지 못했습니다: {error}"))
  }
}

pub(crate) fn register_saved_global_shortcut(app: &AppHandle) {
  let state = app.state::<AppState>();
  let settings = match state.repository.lock() {
    Ok(repository) => match repository.get_app_settings() {
      Ok(settings) => settings,
      Err(error) => {
        state.set_global_shortcut_error(Some(error.to_string()));
        return;
      }
    },
    Err(_) => {
      state.set_global_shortcut_error(Some("설정 저장소를 잠글 수 없습니다.".to_string()));
      return;
    }
  };

  if let Err(error) = update_global_shortcut_registration(app, settings.global_toggle_shortcut.clone()) {
    state.set_global_shortcut_error(Some(error));
  } else {
    state.set_global_shortcut_error(None);
  }
}

pub(crate) fn update_global_shortcut_registration(
  app: &AppHandle,
  next_shortcut: Option<String>,
) -> Result<Option<String>, String> {
  let state = app.state::<AppState>();
  let current_shortcut = state.active_global_toggle_shortcut();
  let normalized_next = next_shortcut
    .map(|shortcut| shortcut.trim().to_string())
    .filter(|shortcut| !shortcut.is_empty());

  let registrar = TauriShortcutRegistrar { app };
  let next_active_shortcut = replace_shortcut_registration(
    &registrar,
    current_shortcut.as_deref(),
    normalized_next.as_deref(),
  )?;

  state.set_active_global_toggle_shortcut(next_active_shortcut.clone());
  state.set_global_shortcut_error(None);

  Ok(next_active_shortcut)
}

fn replace_shortcut_registration(
  registrar: &impl ShortcutRegistrar,
  current_shortcut: Option<&str>,
  next_shortcut: Option<&str>,
) -> Result<Option<String>, String> {
  if current_shortcut == next_shortcut {
    return Ok(next_shortcut.map(ToOwned::to_owned));
  }

  match (current_shortcut, next_shortcut) {
    (None, None) => Ok(None),
    (Some(current), None) => {
      registrar.unregister(current)?;
      Ok(None)
    }
    (None, Some(next)) => {
      registrar.register(next)?;
      Ok(Some(next.to_string()))
    }
    (Some(current), Some(next)) => {
      registrar.register(next)?;

      if let Err(error) = registrar.unregister(current) {
        let rollback_error = registrar.unregister(next).err();
        if let Some(rollback_error) = rollback_error {
          return Err(format!("{error} (롤백 실패: {rollback_error})"));
        }

        return Err(error);
      }

      Ok(Some(next.to_string()))
    }
  }
}

#[cfg(test)]
mod tests {
  use super::replace_shortcut_registration;
  use std::cell::RefCell;

  #[derive(Default)]
  struct MockShortcutRegistrar {
    log: RefCell<Vec<String>>,
    fail_register: Option<String>,
    fail_unregister: Option<String>,
  }

  impl super::ShortcutRegistrar for MockShortcutRegistrar {
    fn register(&self, shortcut: &str) -> Result<(), String> {
      self.log.borrow_mut().push(format!("register:{shortcut}"));
      if self.fail_register.as_deref() == Some(shortcut) {
        return Err(format!("전역 단축키를 등록하지 못했습니다: {shortcut}"));
      }
      Ok(())
    }

    fn unregister(&self, shortcut: &str) -> Result<(), String> {
      self.log.borrow_mut().push(format!("unregister:{shortcut}"));
      if self.fail_unregister.as_deref() == Some(shortcut) {
        return Err(format!("기존 전역 단축키를 해제하지 못했습니다: {shortcut}"));
      }
      Ok(())
    }
  }

  #[test]
  fn keeps_current_shortcut_when_registering_next_fails() {
    let registrar = MockShortcutRegistrar {
      fail_register: Some("Cmd+Shift+K".to_string()),
      ..Default::default()
    };

    let result = replace_shortcut_registration(
      &registrar,
      Some("Option+M"),
      Some("Cmd+Shift+K"),
    );

    assert!(result.is_err());
    assert_eq!(registrar.log.borrow().as_slice(), ["register:Cmd+Shift+K"]);
  }

  #[test]
  fn rolls_back_next_shortcut_when_unregistering_current_fails() {
    let registrar = MockShortcutRegistrar {
      fail_unregister: Some("Option+M".to_string()),
      ..Default::default()
    };

    let result = replace_shortcut_registration(
      &registrar,
      Some("Option+M"),
      Some("Cmd+Shift+K"),
    );

    assert!(result.is_err());
    assert_eq!(
      registrar.log.borrow().as_slice(),
      [
        "register:Cmd+Shift+K",
        "unregister:Option+M",
        "unregister:Cmd+Shift+K",
      ],
    );
  }

  #[test]
  fn unregisters_current_shortcut_when_disabling() {
    let registrar = MockShortcutRegistrar::default();

    let result = replace_shortcut_registration(&registrar, Some("Option+M"), None)
      .expect("disable should succeed");

    assert_eq!(result, None);
    assert_eq!(registrar.log.borrow().as_slice(), ["unregister:Option+M"]);
  }
}
