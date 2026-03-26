use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex, mpsc};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use rusqlite::{Connection, OpenFlags, OptionalExtension, params};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

#[cfg(target_os = "macos")]
use block2::RcBlock;
#[cfg(target_os = "macos")]
use objc2::rc::Retained;
#[cfg(target_os = "macos")]
use objc2::runtime::{AnyObject, NSObjectProtocol, ProtocolObject};
#[cfg(target_os = "macos")]
use objc2::{AnyThread, ClassType, DefinedClass, define_class, msg_send};
#[cfg(target_os = "macos")]
use objc2_cloud_kit::{
  CKContainer,
  CKCurrentUserDefaultName,
  CKDatabase,
  CKErrorCode,
  CKRecord,
  CKRecordID,
  CKRecordValue,
  CKRecordZone,
  CKRecordZoneID,
  CKSyncEngine,
  CKSyncEngineConfiguration,
  CKSyncEngineDelegate,
  CKSyncEngineEvent,
  CKSyncEngineEventType,
  CKSyncEnginePendingRecordZoneChange,
  CKSyncEnginePendingRecordZoneChangeType,
  CKSyncEngineRecordZoneChangeBatch,
  CKSyncEngineSendChangesContext,
  CKSyncEngineStateSerialization,
};
#[cfg(target_os = "macos")]
use objc2_foundation::{NSArray, NSData, NSDate, NSError, NSKeyedUnarchiver, NSNumber, NSObject, NSString};

const CONTAINER_IDENTIFIER: &str = "iCloud.com.seongmin.minnote";
const RECORD_TYPE: &str = "MNDocument";
const ZONE_NAME: &str = "MNDocuments";
#[derive(Debug, Serialize)]
struct SyncStatusEvent {
  #[serde(rename = "type")]
  event_type: &'static str,
  state: String,
  #[serde(rename = "connectionMode")]
  connection_mode: &'static str,
  #[serde(rename = "lastSyncAt")]
  last_sync_at: Option<i64>,
  #[serde(rename = "lastFetchAt")]
  last_fetch_at: Option<i64>,
  #[serde(rename = "lastSendAt")]
  last_send_at: Option<i64>,
  #[serde(rename = "initialFetchCompleted")]
  initial_fetch_completed: bool,
  #[serde(rename = "hasPendingWrites")]
  has_pending_writes: bool,
  #[serde(rename = "pendingChangeCount")]
  pending_change_count: usize,
}

#[derive(Debug, Serialize)]
struct SyncErrorEvent {
  #[serde(rename = "type")]
  event_type: &'static str,
  message: String,
}

#[derive(Debug, Serialize)]
struct RemoteChangedEvent {
  #[serde(rename = "type")]
  event_type: &'static str,
  documents: Vec<RemoteDocumentPayload>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct RemoteDocumentPayload {
  id: String,
  title: Option<String>,
  block_tint_override: Option<String>,
  document_surface_tone_override: Option<String>,
  blocks_json: String,
  created_at: i64,
  updated_at: i64,
  deleted_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct BlockJsonPayload {
  id: String,
  kind: String,
  content: String,
  language: Option<String>,
  position: i64,
  created_at: i64,
  updated_at: i64,
}

#[derive(Debug, Clone, Default)]
struct SyncTimestamps {
  last_sync_at: Option<i64>,
  last_fetch_at: Option<i64>,
  last_send_at: Option<i64>,
  initial_fetch_completed: bool,
}

#[derive(Debug, Clone)]
struct DocumentRow {
  id: String,
  title: Option<String>,
  block_tint_override: Option<String>,
  document_surface_tone_override: Option<String>,
  created_at: i64,
  updated_at: i64,
  deleted_at: Option<i64>,
}

#[derive(Debug, Clone)]
struct BlockRow {
  id: String,
  kind: String,
  content: String,
  language: Option<String>,
  position: i64,
  created_at: i64,
  updated_at: i64,
}

#[derive(Debug, Clone)]
struct ErrorInfo {
  code: isize,
  domain: String,
  description: String,
}

#[derive(Debug, Clone)]
struct SyncOutboxRow {
  document_id: String,
}

impl ErrorInfo {
  fn message(&self) -> String {
    if self.code == 0 && self.domain.is_empty() {
      return self.description.clone();
    }

    format!("{} ({}, code={})", self.description, self.domain, self.code)
  }
}

#[cfg(target_os = "macos")]
#[derive(Debug)]
struct SyncShared {
  app_handle: AppHandle,
  db_path: String,
  state_path: String,
  database: Retained<CKDatabase>,
  engine: Mutex<Option<Retained<CKSyncEngine>>>,
  timestamps: Mutex<SyncTimestamps>,
  initialized: AtomicBool,
  send_token: AtomicU64,
}

#[cfg(target_os = "macos")]
#[derive(Debug)]
struct SyncDelegateIvars {
  shared: Arc<SyncShared>,
}

#[cfg(target_os = "macos")]
define_class!(
  #[unsafe(super = NSObject)]
  #[derive(Debug)]
  #[thread_kind = AnyThread]
  #[ivars = SyncDelegateIvars]
  struct SyncDelegate;

  unsafe impl NSObjectProtocol for SyncDelegate {}

  unsafe impl CKSyncEngineDelegate for SyncDelegate {
    #[unsafe(method(syncEngine:handleEvent:))]
    fn sync_engine_handle_event(&self, sync_engine: &CKSyncEngine, event: &CKSyncEngineEvent) {
      self.ivars().shared.handle_event(sync_engine, event);
    }

    #[unsafe(method_id(syncEngine:nextRecordZoneChangeBatchForContext:))]
    fn sync_engine_next_record_zone_change_batch_for_context(
      &self,
      sync_engine: &CKSyncEngine,
      context: &CKSyncEngineSendChangesContext,
    ) -> Option<Retained<CKSyncEngineRecordZoneChangeBatch>> {
      self.ivars().shared.next_record_zone_change_batch(sync_engine, context)
    }
  }
);

#[cfg(target_os = "macos")]
impl SyncDelegate {
  fn new(shared: Arc<SyncShared>) -> Retained<Self> {
    let this = Self::alloc().set_ivars(SyncDelegateIvars { shared });
    unsafe { msg_send![super(this), init] }
  }
}

#[cfg(target_os = "macos")]
#[derive(Debug)]
struct CloudKitRuntime {
  shared: Arc<SyncShared>,
  _delegate: Retained<SyncDelegate>,
}

#[derive(Debug, Default)]
pub struct SyncManager {
  #[cfg(target_os = "macos")]
  runtime: Option<CloudKitRuntime>,
  app_handle: Option<AppHandle>,
  db_path: Option<String>,
  state_path: Option<String>,
}

impl SyncManager {
  pub fn new() -> Self {
    Self::default()
  }

  pub fn start(
    &mut self,
    app_handle: &AppHandle,
    db_path: &str,
    state_path: &str,
  ) -> Result<(), String> {
    self.remember_runtime(app_handle, db_path, state_path);

    #[cfg(target_os = "macos")]
    {
      if self.runtime.is_some() {
        return Ok(());
      }

      let runtime = CloudKitRuntime::new(app_handle.clone(), db_path.to_string(), state_path.to_string())?;
      runtime.start_initial_sync();
      self.runtime = Some(runtime);
      return Ok(());
    }

    #[cfg(not(target_os = "macos"))]
    {
      Err("macOS에서만 iCloud 동기화를 지원합니다.".to_string())
    }
  }

  pub fn stop(&mut self) {
    #[cfg(target_os = "macos")]
    {
      if let Some(runtime) = self.runtime.take() {
        runtime.stop();
      }
    }
  }

  pub fn notify_changed(&mut self, document_id: &str) {
    #[cfg(target_os = "macos")]
    {
      if let Some(runtime) = &self.runtime {
        runtime.notify_changed(document_id);
      }
    }
  }

  pub fn notify_deleted(&mut self, document_id: &str) {
    #[cfg(target_os = "macos")]
    {
      if let Some(runtime) = &self.runtime {
        runtime.notify_deleted(document_id);
      }
    }
  }

  pub fn notify_reset(&mut self) {
    #[cfg(target_os = "macos")]
    {
      if let Some(runtime) = self.runtime.take() {
        if let Err(error) = runtime.delete_zone_and_state() {
          self.emit_sync_error(format!("동기화 전체 초기화 실패: {error}"));
        }
      } else if let Some(state_path) = &self.state_path {
        let _ = fs::remove_file(state_path);
      }

      let Some(app_handle) = self.app_handle.clone() else {
        return;
      };
      let Some(db_path) = self.db_path.clone() else {
        return;
      };
      let Some(state_path) = self.state_path.clone() else {
        return;
      };

      match CloudKitRuntime::new(app_handle, db_path, state_path) {
        Ok(runtime) => {
          runtime.start_initial_sync();
          self.runtime = Some(runtime);
        }
        Err(error) => self.emit_sync_error(format!("동기화 엔진 재시작 실패: {error}")),
      }
    }
  }

  pub fn refresh(
    &mut self,
    app_handle: &AppHandle,
    db_path: &str,
    state_path: &str,
  ) -> Result<(), String> {
    self.remember_runtime(app_handle, db_path, state_path);

    #[cfg(target_os = "macos")]
    {
      if self.runtime.is_none() {
        self.start(app_handle, db_path, state_path)?;
      }

      if let Some(runtime) = &self.runtime {
        runtime.refresh();
      }
      return Ok(());
    }

    #[cfg(not(target_os = "macos"))]
    {
      Err("macOS에서만 iCloud 동기화를 지원합니다.".to_string())
    }
  }

  fn remember_runtime(
    &mut self,
    app_handle: &AppHandle,
    db_path: &str,
    state_path: &str,
  ) {
    self.app_handle = Some(app_handle.clone());
    self.db_path = Some(db_path.to_string());
    self.state_path = Some(state_path.to_string());
  }

  fn emit_sync_error(&self, message: String) {
    let Some(app_handle) = &self.app_handle else {
      return;
    };

      let _ = app_handle.emit(
        "icloud-sync-event",
        &SyncErrorEvent {
          event_type: "error",
          message,
        },
      );
  }
}

#[cfg(target_os = "macos")]
impl CloudKitRuntime {
  fn new(app_handle: AppHandle, db_path: String, state_path: String) -> Result<Self, String> {
    log::info!("icloud runtime init:start");

    let container_identifier = NSString::from_str(CONTAINER_IDENTIFIER);
    let container = unsafe { CKContainer::containerWithIdentifier(&container_identifier) };
    let database = unsafe { container.privateCloudDatabase() };
    let shared = Arc::new(SyncShared {
      app_handle,
      db_path,
      state_path,
      database,
      engine: Mutex::new(None),
      timestamps: Mutex::new(SyncTimestamps::default()),
      initialized: AtomicBool::new(false),
      send_token: AtomicU64::new(0),
    });
    let delegate = SyncDelegate::new(shared.clone());
    let serialization = shared.load_persisted_state();
    let configuration = unsafe {
      CKSyncEngineConfiguration::initWithDatabase_stateSerialization_delegate(
        CKSyncEngineConfiguration::alloc(),
        &shared.database,
        serialization.as_deref(),
        ProtocolObject::from_ref(&*delegate),
      )
    };
    let engine = unsafe { CKSyncEngine::initWithConfiguration(CKSyncEngine::alloc(), &configuration) };

    {
      let mut guard = shared.engine.lock().map_err(|_| "sync engine lock failed".to_string())?;
      *guard = Some(engine);
    }

    log::info!("icloud runtime init:done");
    Ok(Self {
      shared,
      _delegate: delegate,
    })
  }

  fn start_initial_sync(&self) {
    let shared = self.shared.clone();
    thread::spawn(move || {
      shared.initialize();
    });
  }

  fn refresh(&self) {
    let shared = self.shared.clone();
    thread::spawn(move || {
      shared.refresh_now();
    });
  }

  fn notify_changed(&self, document_id: &str) {
    let shared = self.shared.clone();
    let document_id = document_id.to_string();
    let token = shared.send_token.fetch_add(1, Ordering::SeqCst) + 1;
    thread::spawn(move || {
      shared.queue_record_save(document_id, token);
    });
  }

  fn notify_deleted(&self, document_id: &str) {
    self.notify_changed(document_id);
  }

  fn delete_zone_and_state(&self) -> Result<(), String> {
    self.shared.delete_zone()?;
    let _ = fs::remove_file(&self.shared.state_path);
    Ok(())
  }

  fn stop(&self) {
    self.shared.initialized.store(false, Ordering::SeqCst);
    if let Ok(mut engine) = self.shared.engine.lock() {
      *engine = None;
    }
  }
}

#[cfg(target_os = "macos")]
impl SyncShared {
  fn initialize(&self) {
    log::info!("icloud initialize:start");
    self.emit_status("syncing");

    if let Err(error) = self.ensure_zone_exists() {
      self.emit_cloudkit_failure("동기화 시작 실패", error);
      return;
    }

    self.initialized.store(true, Ordering::SeqCst);
    self.restore_pending_changes();
    log::info!("icloud initialize:zone-ready");
    self.fetch_changes("initial");
  }

  fn refresh_now(&self) {
    log::info!("icloud fetch:requested");
    self.emit_status("syncing");

    if let Err(error) = self.ensure_zone_exists() {
      self.emit_cloudkit_failure("동기화 새로고침 실패", error);
      return;
    }

    self.initialized.store(true, Ordering::SeqCst);
    self.restore_pending_changes();
    self.fetch_changes("manual");
  }

  fn fetch_changes(&self, reason: &str) {
    log::info!("icloud fetch:start reason={reason}");
    let result = self.with_engine_info(|engine| wait_for_engine_completion(|block| unsafe {
      engine.fetchChangesWithCompletionHandler(Some(block));
    }));

    match result {
      Ok(()) => {
        log::info!("icloud fetch:requested-to-engine reason={reason}");
      }
      Err(error) => {
        self.emit_cloudkit_failure("동기화 새로고침 실패", error);
      }
    }
  }

  fn send_changes_now(&self, reason: &'static str) {
    if !self.initialized.load(Ordering::SeqCst) {
      log::info!("icloud send:queued-before-init reason={reason}");
      return;
    }

    log::info!("icloud send:start reason={reason}");
    let result = self.with_engine_info(|engine| wait_for_engine_completion(|block| unsafe {
      engine.sendChangesWithCompletionHandler(Some(block));
    }));

    if let Err(error) = result {
      self.emit_cloudkit_failure("업로드 실패", error);
    }
  }

  fn queue_record_save(&self, document_id: String, token: u64) {
    if !pending_outbox_entry_exists(&self.db_path, &document_id) {
      return;
    }

    if let Err(error) = self.with_engine(|engine| {
      let record_id = record_id(&document_id);
      let change = unsafe {
        CKSyncEnginePendingRecordZoneChange::initWithRecordID_type(
          CKSyncEnginePendingRecordZoneChange::alloc(),
          &record_id,
          CKSyncEnginePendingRecordZoneChangeType::SaveRecord,
        )
      };
      let changes = NSArray::from_retained_slice(&[change]);
      unsafe {
        engine.state().addPendingRecordZoneChanges(&changes);
      }
      Ok(())
    }) {
      self.emit_error(format!("동기화 변경 알림 실패: {error}"));
      return;
    }

    thread::sleep(Duration::from_millis(300));
    if self.send_token.load(Ordering::SeqCst) != token {
      return;
    }
    self.send_changes_now("pending-change");
  }

  fn restore_pending_changes(&self) {
    let pending_rows = load_pending_sync_outbox(&self.db_path).unwrap_or_default();
    if pending_rows.is_empty() {
      return;
    }

    let _ = self.with_engine(|engine| {
      let changes = pending_rows
        .iter()
        .map(|row| unsafe {
          CKSyncEnginePendingRecordZoneChange::initWithRecordID_type(
            CKSyncEnginePendingRecordZoneChange::alloc(),
            &record_id(&row.document_id),
            CKSyncEnginePendingRecordZoneChangeType::SaveRecord,
          )
        })
        .collect::<Vec<_>>();
      let changes = NSArray::from_retained_slice(&changes);
      unsafe {
        engine.state().addPendingRecordZoneChanges(&changes);
      }
      Ok(())
    });
  }

  fn ensure_zone_exists(&self) -> Result<(), ErrorInfo> {
    log::info!("icloud zone:ensure:start");
    let zone_id = zone_id();

    match wait_for_zone_fetch(&self.database, &zone_id) {
      Ok(()) => {
        log::info!("icloud zone:exists");
        Ok(())
      }
      Err(error) if error.domain == "CKErrorDomain" && error.code == CKErrorCode::ZoneNotFound.0 as isize => {
        log::info!("icloud zone:create");
        let zone = unsafe { CKRecordZone::initWithZoneID(CKRecordZone::alloc(), &zone_id) };
        wait_for_zone_save(&self.database, &zone).map(|_| ())
      }
      Err(error) => Err(error),
    }
  }

  fn delete_zone(&self) -> Result<(), String> {
    log::info!("icloud zone:delete:start");
    wait_for_zone_delete(&self.database, &zone_id())
      .or_else(|error| {
        if error.domain == "CKErrorDomain" && error.code == CKErrorCode::ZoneNotFound.0 as isize {
          Ok(())
        } else {
          Err(error)
        }
      })
      .map_err(|error| error.message())
  }

  fn load_persisted_state(&self) -> Option<Retained<CKSyncEngineStateSerialization>> {
    let data = fs::read(&self.state_path).ok()?;
    let data = NSData::from_vec(data);
    let object = unsafe {
      NSKeyedUnarchiver::unarchivedObjectOfClass_fromData_error(
        CKSyncEngineStateSerialization::class(),
        &data,
      )
    }
    .ok()?;

    object.downcast::<CKSyncEngineStateSerialization>().ok()
  }

  fn persist_state(&self, state: &CKSyncEngineStateSerialization) {
    match unsafe {
      objc2_foundation::NSKeyedArchiver::archivedDataWithRootObject_requiringSecureCoding_error(
        state,
        true,
      )
    } {
      Ok(data) => {
        if let Err(error) = fs::write(&self.state_path, data.to_vec()) {
          log::warn!("failed to persist sync state: {error}");
        }
      }
      Err(error) => {
        log::warn!("failed to archive sync state: {}", error.localizedDescription().to_string());
      }
    }
  }

  fn handle_event(&self, _sync_engine: &CKSyncEngine, event: &CKSyncEngineEvent) {
    let event_type = unsafe { event.r#type() };
    match event_type {
      CKSyncEngineEventType::StateUpdate => {
        let state_update = unsafe { event.stateUpdateEvent() };
        let serialization = unsafe { state_update.stateSerialization() };
        self.persist_state(&serialization);
      }
      CKSyncEngineEventType::AccountChange => {
        let account_change = unsafe { event.accountChangeEvent() };
        let change_type = unsafe { account_change.changeType() };
        log::info!("icloud account-change:type={}", change_type.0);
        if change_type.0 != 0 {
          self.emit_error("iCloud 계정 상태가 변경되었습니다.".to_string());
          self.emit_status("error");
        }
      }
      CKSyncEngineEventType::WillFetchChanges => {
        log::info!("icloud fetch:event-will");
        self.emit_status("syncing");
      }
      CKSyncEngineEventType::FetchedRecordZoneChanges => {
        log::info!("icloud fetch:event-record-zone");
        let fetched = unsafe { event.fetchedRecordZoneChangesEvent() };
        let modifications = unsafe { fetched.modifications() };
        let deletions = unsafe { fetched.deletions() };
        let mut documents = Vec::new();
        for record in modifications.iter() {
          if let Some(document) = remote_document_from_record(&record) {
            documents.push(document);
          }
        }
        for deletion in deletions.iter() {
          documents.push(remote_deleted_document_from_deletion(&deletion));
        }

        if !documents.is_empty() {
          let _ = self.app_handle.emit(
            "icloud-sync-event",
            &RemoteChangedEvent {
              event_type: "remote-changed",
              documents,
            },
          );
        }
      }
      CKSyncEngineEventType::DidFetchChanges => {
        log::info!("icloud fetch:event-did");
        if let Ok(mut state) = self.timestamps.lock() {
          let now = now_ms();
          state.last_sync_at = Some(now);
          state.last_fetch_at = Some(now);
          state.initial_fetch_completed = true;
        }
        self.emit_status("idle");
      }
      CKSyncEngineEventType::WillSendChanges => {
        log::info!("icloud send:event-will");
        self.emit_status("syncing");
      }
      CKSyncEngineEventType::SentRecordZoneChanges => {
        let sent = unsafe { event.sentRecordZoneChangesEvent() };
        let saved_records = unsafe { sent.savedRecords() };
        let failed_saves = unsafe { sent.failedRecordSaves() };
        let deleted_record_ids = unsafe { sent.deletedRecordIDs() };
        let failed_deletes = unsafe { sent.failedRecordDeletes() };
        log::info!(
          "icloud send:event-record-zone saved={} deleted={} failed={} failed_delete={}",
          saved_records.len(),
          deleted_record_ids.len(),
          failed_saves.len(),
          failed_deletes.len()
        );

        if saved_records.len() > 0 || deleted_record_ids.len() > 0 {
          let now = now_ms();
          for record in saved_records.iter() {
            let document_id = unsafe { record.recordID().recordName() }.to_string();
            let _ = acknowledge_sync_outbox_entry(&self.db_path, &document_id, now);
          }
          for record_id in deleted_record_ids.iter() {
            let document_id = unsafe { record_id.recordName() }.to_string();
            let _ = acknowledge_sync_outbox_entry(&self.db_path, &document_id, now);
          }
          if let Ok(mut state) = self.timestamps.lock() {
            state.last_sync_at = Some(now);
            state.last_send_at = Some(now);
          }
          self.emit_status("idle");
        }

        if let Some(failed) = failed_saves.iter().next() {
          let error = unsafe { failed.error() };
          let document_id = unsafe { failed.record().recordID().recordName() }.to_string();
          let _ = mark_sync_outbox_failed(
            &self.db_path,
            &document_id,
            &error.localizedDescription().to_string(),
            now_ms(),
          );
          self.emit_error(format!(
            "업로드 실패: {}",
            error.localizedDescription().to_string(),
          ));
          self.emit_status("error");
        }

        if failed_deletes.len() > 0 {
          self.emit_error(format!(
            "업로드 실패: 삭제 요청 일부가 실패했습니다.",
          ));
          self.emit_status("error");
        }
      }
      CKSyncEngineEventType::DidSendChanges => {
        log::info!("icloud send:event-did");
        self.emit_status("idle");
      }
      _ => {}
    }
  }

  fn next_record_zone_change_batch(
    &self,
    sync_engine: &CKSyncEngine,
    _context: &CKSyncEngineSendChangesContext,
  ) -> Option<Retained<CKSyncEngineRecordZoneChangeBatch>> {
    let pending_changes = unsafe { sync_engine.state().pendingRecordZoneChanges() };
    if pending_changes.is_empty() {
      return None;
    }

    let db_path = self.db_path.clone();
    let record_provider = RcBlock::new(move |record_id: std::ptr::NonNull<CKRecordID>| -> *mut CKRecord {
      let document_id = unsafe { record_id.as_ref().recordName() }.to_string();

      match load_document_snapshot(&db_path, &document_id) {
        Ok(Some((document, blocks))) => {
          let record = record_from_snapshot(&document, &blocks);
          Retained::into_raw(record)
        }
        Ok(None) => std::ptr::null_mut(),
        Err(error) => {
          log::warn!("failed to load local snapshot for sync: {error}");
          std::ptr::null_mut()
        }
      }
    });

    let pending_changes_vec = pending_changes.iter().collect::<Vec<_>>();
    unsafe {
      CKSyncEngineRecordZoneChangeBatch::initWithPendingChanges_recordProvider(
        CKSyncEngineRecordZoneChangeBatch::alloc(),
        &NSArray::from_retained_slice(&pending_changes_vec),
        &record_provider,
      )
    }
  }

  fn emit_status(&self, state: &str) {
    let snapshot = self.timestamps.lock().map(|value| value.clone()).unwrap_or_default();
    let pending_change_count = count_pending_sync_outbox(&self.db_path).unwrap_or(0);
    let _ = self.app_handle.emit(
      "icloud-sync-event",
      &SyncStatusEvent {
        event_type: "status",
        state: state.to_string(),
        connection_mode: "connected",
        last_sync_at: snapshot.last_sync_at,
        last_fetch_at: snapshot.last_fetch_at,
        last_send_at: snapshot.last_send_at,
        initial_fetch_completed: snapshot.initial_fetch_completed,
        has_pending_writes: pending_change_count > 0,
        pending_change_count,
      },
    );
  }

  fn emit_error(&self, message: String) {
    let _ = self.app_handle.emit(
      "icloud-sync-event",
      &SyncErrorEvent {
        event_type: "error",
        message,
      },
    );
  }

  fn emit_cloudkit_failure(&self, context: &str, error: ErrorInfo) {
    self.emit_error(format!("{context}: {}", error.message()));
    self.emit_status(classify_runtime_state(&error));
  }

  fn with_engine<T>(
    &self,
    callback: impl FnOnce(&CKSyncEngine) -> Result<T, String>,
  ) -> Result<T, String> {
    let engine = self.engine.lock().map_err(|_| "sync engine lock failed".to_string())?;
    let Some(engine) = engine.as_ref() else {
      return Err("sync engine unavailable".to_string());
    };

    callback(engine)
  }

  fn with_engine_info<T>(
    &self,
    callback: impl FnOnce(&CKSyncEngine) -> Result<T, ErrorInfo>,
  ) -> Result<T, ErrorInfo> {
    let engine = self.engine.lock().map_err(|_| ErrorInfo {
      code: 0,
      domain: "sync".to_string(),
      description: "sync engine lock failed".to_string(),
    })?;
    let Some(engine) = engine.as_ref() else {
      return Err(ErrorInfo {
        code: 0,
        domain: "sync".to_string(),
        description: "sync engine unavailable".to_string(),
      });
    };

    callback(engine)
  }
}

#[cfg(target_os = "macos")]
fn wait_for_engine_completion(
  invoker: impl FnOnce(&block2::DynBlock<dyn Fn(*mut NSError)>),
) -> Result<(), ErrorInfo> {
  let (sender, receiver) = mpsc::channel::<Result<(), ErrorInfo>>();
  let block = RcBlock::new(move |error: *mut NSError| {
    let result = if error.is_null() {
      Ok(())
    } else {
      Err(error_info_from_ptr(error))
    };
    let _ = sender.send(result);
  });

  invoker(&block);
  receiver
    .recv()
    .map_err(|_| ErrorInfo {
      code: 0,
      domain: "sync".to_string(),
      description: "sync completion channel disconnected".to_string(),
    })?
}

#[cfg(target_os = "macos")]
fn wait_for_zone_fetch(database: &CKDatabase, zone_id: &CKRecordZoneID) -> Result<(), ErrorInfo> {
  let (sender, receiver) = mpsc::channel::<Result<(), ErrorInfo>>();
  let block = RcBlock::new(move |_zone: *mut CKRecordZone, error: *mut NSError| {
    let result = if error.is_null() {
      Ok(())
    } else {
      Err(error_info_from_ptr(error))
    };
    let _ = sender.send(result);
  });

  unsafe {
    database.fetchRecordZoneWithID_completionHandler(zone_id, &block);
  }

  receiver.recv().map_err(|_| ErrorInfo {
    code: 0,
    domain: "sync".to_string(),
    description: "zone fetch completion channel disconnected".to_string(),
  })?
}

#[cfg(target_os = "macos")]
fn wait_for_zone_save(database: &CKDatabase, zone: &CKRecordZone) -> Result<(), ErrorInfo> {
  let (sender, receiver) = mpsc::channel::<Result<(), ErrorInfo>>();
  let block = RcBlock::new(move |_zone: *mut CKRecordZone, error: *mut NSError| {
    let result = if error.is_null() {
      Ok(())
    } else {
      Err(error_info_from_ptr(error))
    };
    let _ = sender.send(result);
  });

  unsafe {
    database.saveRecordZone_completionHandler(zone, &block);
  }

  receiver.recv().map_err(|_| ErrorInfo {
    code: 0,
    domain: "sync".to_string(),
    description: "zone save completion channel disconnected".to_string(),
  })?
}

#[cfg(target_os = "macos")]
fn wait_for_zone_delete(database: &CKDatabase, zone_id: &CKRecordZoneID) -> Result<(), ErrorInfo> {
  let (sender, receiver) = mpsc::channel::<Result<(), ErrorInfo>>();
  let block = RcBlock::new(move |_zone_id: *mut CKRecordZoneID, error: *mut NSError| {
    let result = if error.is_null() {
      Ok(())
    } else {
      Err(error_info_from_ptr(error))
    };
    let _ = sender.send(result);
  });

  unsafe {
    database.deleteRecordZoneWithID_completionHandler(zone_id, &block);
  }

  receiver.recv().map_err(|_| ErrorInfo {
    code: 0,
    domain: "sync".to_string(),
    description: "zone delete completion channel disconnected".to_string(),
  })?
}

#[cfg(target_os = "macos")]
fn error_info_from_ptr(ptr: *mut NSError) -> ErrorInfo {
  if ptr.is_null() {
    return ErrorInfo {
      code: 0,
      domain: String::new(),
      description: "알 수 없는 CloudKit 오류".to_string(),
    };
  }

  let error = unsafe { &*ptr };
  ErrorInfo {
    code: error.code() as isize,
    domain: error.domain().to_string(),
    description: error.localizedDescription().to_string(),
  }
}

#[cfg(target_os = "macos")]
fn record_id(document_id: &str) -> Retained<CKRecordID> {
  let document_id = NSString::from_str(document_id);
  unsafe {
    CKRecordID::initWithRecordName_zoneID(
      CKRecordID::alloc(),
      &document_id,
      &zone_id(),
    )
  }
}

#[cfg(target_os = "macos")]
fn zone_id() -> Retained<CKRecordZoneID> {
  let zone_name = NSString::from_str(ZONE_NAME);
  unsafe {
    CKRecordZoneID::initWithZoneName_ownerName(
      CKRecordZoneID::alloc(),
      &zone_name,
      CKCurrentUserDefaultName,
    )
  }
}

#[cfg(target_os = "macos")]
fn record_from_snapshot(document: &DocumentRow, blocks: &[BlockRow]) -> Retained<CKRecord> {
  let record_type = NSString::from_str(RECORD_TYPE);
  let record_id = record_id(&document.id);
  let record = unsafe {
    CKRecord::initWithRecordType_recordID(
      CKRecord::alloc(),
      &record_type,
      &record_id,
    )
  };

  set_record_string(&record, "title", document.title.as_deref());
  set_record_string(&record, "blockTintOverride", document.block_tint_override.as_deref());
  set_record_string(
    &record,
    "documentSurfaceToneOverride",
    document.document_surface_tone_override.as_deref(),
  );
  set_record_i64(&record, "createdAt", Some(document.created_at));
  set_record_i64(&record, "updatedAt", Some(document.updated_at));
  set_record_i64(&record, "deletedAt", document.deleted_at);

  let blocks_json = blocks
    .iter()
    .map(|block| BlockJsonPayload {
      id: block.id.clone(),
      kind: block.kind.clone(),
      content: block.content.clone(),
      language: block.language.clone(),
      position: block.position,
      created_at: block.created_at,
      updated_at: block.updated_at,
    })
    .collect::<Vec<_>>();
  let blocks_json = serde_json::to_string(&blocks_json).unwrap_or_else(|_| "[]".to_string());
  set_record_string(&record, "blocksJson", Some(&blocks_json));

  record
}

#[cfg(target_os = "macos")]
fn set_record_string(record: &CKRecord, key: &str, value: Option<&str>) {
  let key = NSString::from_str(key);
  let value = value.map(NSString::from_str);
  unsafe {
    record.setObject_forKeyedSubscript(
      value.as_ref().map(|value| ProtocolObject::<dyn CKRecordValue>::from_ref(&**value)),
      &key,
    );
  }
}

#[cfg(target_os = "macos")]
fn set_record_i64(record: &CKRecord, key: &str, value: Option<i64>) {
  let key = NSString::from_str(key);
  let value = value.map(NSNumber::new_i64);
  unsafe {
    record.setObject_forKeyedSubscript(
      value.as_ref().map(|value| ProtocolObject::<dyn CKRecordValue>::from_ref(&**value)),
      &key,
    );
  }
}

#[cfg(target_os = "macos")]
fn remote_document_from_record(record: &CKRecord) -> Option<RemoteDocumentPayload> {
  let blocks_json = record_string(record, "blocksJson")?;
  let created_at = record_i64(record, "createdAt")
    .or_else(|| unsafe { record.creationDate() }.map(|date| date_to_ms(&date)))
    .unwrap_or_else(now_ms);
  let updated_at = record_i64(record, "updatedAt")
    .or_else(|| unsafe { record.modificationDate() }.map(|date| date_to_ms(&date)))
    .unwrap_or(created_at);

  Some(RemoteDocumentPayload {
    id: unsafe { record.recordID().recordName() }.to_string(),
    title: record_string(record, "title"),
    block_tint_override: record_string(record, "blockTintOverride"),
    document_surface_tone_override: record_string(record, "documentSurfaceToneOverride"),
    blocks_json,
    created_at,
    updated_at,
    deleted_at: record_i64(record, "deletedAt"),
  })
}

#[cfg(target_os = "macos")]
fn remote_deleted_document_from_deletion(
  deletion: &objc2_cloud_kit::CKSyncEngineFetchedRecordDeletion,
) -> RemoteDocumentPayload {
  let now = now_ms();
  RemoteDocumentPayload {
    id: unsafe { deletion.recordID().recordName() }.to_string(),
    title: None,
    block_tint_override: None,
    document_surface_tone_override: None,
    blocks_json: "[]".to_string(),
    created_at: now,
    updated_at: now,
    deleted_at: Some(now),
  }
}

#[cfg(target_os = "macos")]
fn record_string(record: &CKRecord, key: &str) -> Option<String> {
  let key = NSString::from_str(key);
  let value = unsafe { record.objectForKeyedSubscript(&key) }?;
  let value_obj: &AnyObject = AsRef::<AnyObject>::as_ref(&*value);
  value_obj.downcast_ref::<NSString>().map(|value| value.to_string())
}

#[cfg(target_os = "macos")]
fn record_i64(record: &CKRecord, key: &str) -> Option<i64> {
  let key = NSString::from_str(key);
  let value = unsafe { record.objectForKeyedSubscript(&key) }?;
  let value_obj: &AnyObject = AsRef::<AnyObject>::as_ref(&*value);
  value_obj.downcast_ref::<NSNumber>().map(|value| value.as_i64())
}

#[cfg(target_os = "macos")]
fn date_to_ms(date: &NSDate) -> i64 {
  (date.timeIntervalSince1970() * 1000.0) as i64
}

fn now_ms() -> i64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|duration| duration.as_millis() as i64)
    .unwrap_or(0)
}

fn load_document_snapshot(
  db_path: &str,
  document_id: &str,
) -> Result<Option<(DocumentRow, Vec<BlockRow>)>, String> {
  let connection = open_readonly_connection(db_path)?;

  let document = connection
    .query_row(
      "SELECT id, title, block_tint_override, document_surface_tone_override, created_at, updated_at, deleted_at
       FROM documents
       WHERE id = ?1",
      params![document_id],
      |row| {
        Ok(DocumentRow {
          id: row.get(0)?,
          title: row.get(1)?,
          block_tint_override: row.get(2)?,
          document_surface_tone_override: row.get(3)?,
          created_at: row.get(4)?,
          updated_at: row.get(5)?,
          deleted_at: row.get(6)?,
        })
      },
    )
    .optional()
    .map_err(|error| error.to_string())?;

  let Some(document) = document else {
    return Ok(None);
  };

  let mut statement = connection
    .prepare(
      "SELECT id, kind, content, language, position, created_at, updated_at
       FROM blocks
       WHERE document_id = ?1
       ORDER BY position ASC",
    )
    .map_err(|error| error.to_string())?;

  let blocks = statement
    .query_map(params![document_id], |row| {
      Ok(BlockRow {
        id: row.get(0)?,
        kind: row.get(1)?,
        content: row.get(2)?,
        language: row.get(3)?,
        position: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
      })
    })
    .map_err(|error| error.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|error| error.to_string())?;

  Ok(Some((document, blocks)))
}

fn load_pending_sync_outbox(db_path: &str) -> Result<Vec<SyncOutboxRow>, String> {
  let connection = open_readonly_connection(db_path)?;
  let mut statement = connection
    .prepare(
      "SELECT document_id
       FROM sync_outbox
       WHERE acknowledged_at IS NULL
       ORDER BY enqueued_at ASC",
    )
    .map_err(|error| error.to_string())?;
  let rows = statement
    .query_map([], |row| {
      Ok(SyncOutboxRow {
        document_id: row.get(0)?,
      })
    })
    .map_err(|error| error.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|error| error.to_string())?;
  drop(statement);
  drop(connection);
  Ok(rows)
}

fn count_pending_sync_outbox(db_path: &str) -> Result<usize, String> {
  let connection = open_readonly_connection(db_path)?;
  let count = connection
    .query_row(
      "SELECT COUNT(*) FROM sync_outbox WHERE acknowledged_at IS NULL",
      [],
      |row| row.get::<_, i64>(0),
    )
    .map_err(|error| error.to_string())?;
  Ok(count as usize)
}

fn pending_outbox_entry_exists(db_path: &str, document_id: &str) -> bool {
  let Ok(connection) = Connection::open_with_flags(
    Path::new(db_path),
    OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
  ) else {
    return false;
  };

  connection
    .query_row(
      "SELECT 1 FROM sync_outbox WHERE document_id = ?1 AND acknowledged_at IS NULL",
      params![document_id],
      |row| row.get::<_, i64>(0),
    )
    .optional()
    .ok()
    .flatten()
    .is_some()
}

fn acknowledge_sync_outbox_entry(db_path: &str, document_id: &str, acknowledged_at: i64) -> Result<(), String> {
  let connection = Connection::open(db_path).map_err(|error| error.to_string())?;
  connection
    .execute(
      "UPDATE sync_outbox
       SET acknowledged_at = ?2, last_attempt_at = ?2, last_error = NULL
       WHERE document_id = ?1",
      params![document_id, acknowledged_at],
    )
    .map_err(|error| error.to_string())?;
  Ok(())
}

fn mark_sync_outbox_failed(
  db_path: &str,
  document_id: &str,
  message: &str,
  attempted_at: i64,
) -> Result<(), String> {
  let connection = Connection::open(db_path).map_err(|error| error.to_string())?;
  connection
    .execute(
      "UPDATE sync_outbox
       SET last_attempt_at = ?2, last_error = ?3
       WHERE document_id = ?1",
      params![document_id, attempted_at, message],
    )
    .map_err(|error| error.to_string())?;
  Ok(())
}

fn classify_runtime_state(error: &ErrorInfo) -> &'static str {
  if error.domain == "CKErrorDomain"
    && matches!(
      error.code as isize,
      code if code == CKErrorCode::NetworkUnavailable.0 as isize
        || code == CKErrorCode::NetworkFailure.0 as isize
        || code == CKErrorCode::ServiceUnavailable.0 as isize
        || code == CKErrorCode::RequestRateLimited.0 as isize
        || code == CKErrorCode::ZoneBusy.0 as isize
    )
  {
    "offline"
  } else {
    "error"
  }
}

fn open_readonly_connection(db_path: &str) -> Result<Connection, String> {
  Connection::open_with_flags(
    Path::new(db_path),
    OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
  )
  .map_err(|error| error.to_string())
}
