import Foundation
import SQLite3

struct DocumentRow {
  let id: String
  let title: String?
  let blockTintOverride: String?
  let documentSurfaceToneOverride: String?
  let createdAt: Int64
  let updatedAt: Int64
  let deletedAt: Int64?
}

struct BlockRow {
  let id: String
  let kind: String
  let content: String
  let language: String?
  let position: Int64
  let createdAt: Int64
  let updatedAt: Int64
}

// actor로 선언하여 concurrent access 방지
actor LocalDatabase {
  private var db: OpaquePointer?

  init(path: String) throws {
    var pointer: OpaquePointer?
    let flags = SQLITE_OPEN_READONLY | SQLITE_OPEN_FULLMUTEX
    let result = sqlite3_open_v2(path, &pointer, flags, nil)
    guard result == SQLITE_OK, let p = pointer else {
      throw NSError(
        domain: "LocalDatabase",
        code: Int(result),
        userInfo: [NSLocalizedDescriptionKey: "SQLite open failed: \(result)"]
      )
    }
    db = p
    sqlite3_exec(db, "PRAGMA journal_mode=WAL;", nil, nil, nil)
  }

  deinit {
    sqlite3_close(db)
  }

  func fetchAllDocumentIds() -> [String] {
    var ids: [String] = []
    var stmt: OpaquePointer?
    guard sqlite3_prepare_v2(db, "SELECT id FROM documents WHERE deleted_at IS NULL", -1, &stmt, nil) == SQLITE_OK else {
      return ids
    }
    while sqlite3_step(stmt) == SQLITE_ROW {
      if let cstr = sqlite3_column_text(stmt, 0) {
        ids.append(String(cString: cstr))
      }
    }
    sqlite3_finalize(stmt)
    return ids
  }

  func fetchDocument(id: String) -> DocumentRow? {
    var stmt: OpaquePointer?
    let sql = "SELECT id, title, block_tint_override, document_surface_tone_override, created_at, updated_at, deleted_at FROM documents WHERE id = ?"
    guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return nil }
    defer { sqlite3_finalize(stmt) }

    sqlite3_bind_text(stmt, 1, id, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
    guard sqlite3_step(stmt) == SQLITE_ROW else { return nil }

    return DocumentRow(
      id: String(cString: sqlite3_column_text(stmt, 0)),
      title: sqlite3_column_type(stmt, 1) == SQLITE_NULL ? nil : String(cString: sqlite3_column_text(stmt, 1)),
      blockTintOverride: sqlite3_column_type(stmt, 2) == SQLITE_NULL ? nil : String(cString: sqlite3_column_text(stmt, 2)),
      documentSurfaceToneOverride: sqlite3_column_type(stmt, 3) == SQLITE_NULL ? nil : String(cString: sqlite3_column_text(stmt, 3)),
      createdAt: sqlite3_column_int64(stmt, 4),
      updatedAt: sqlite3_column_int64(stmt, 5),
      deletedAt: sqlite3_column_type(stmt, 6) == SQLITE_NULL ? nil : sqlite3_column_int64(stmt, 6)
    )
  }

  func fetchBlocks(documentId: String) -> [BlockRow] {
    var blocks: [BlockRow] = []
    var stmt: OpaquePointer?
    let sql = "SELECT id, kind, content, language, position, created_at, updated_at FROM blocks WHERE document_id = ? ORDER BY position"
    guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return blocks }
    defer { sqlite3_finalize(stmt) }

    sqlite3_bind_text(stmt, 1, documentId, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
    while sqlite3_step(stmt) == SQLITE_ROW {
      blocks.append(BlockRow(
        id: String(cString: sqlite3_column_text(stmt, 0)),
        kind: String(cString: sqlite3_column_text(stmt, 1)),
        content: sqlite3_column_type(stmt, 2) == SQLITE_NULL ? "" : String(cString: sqlite3_column_text(stmt, 2)),
        language: sqlite3_column_type(stmt, 3) == SQLITE_NULL ? nil : String(cString: sqlite3_column_text(stmt, 3)),
        position: sqlite3_column_int64(stmt, 4),
        createdAt: sqlite3_column_int64(stmt, 5),
        updatedAt: sqlite3_column_int64(stmt, 6)
      ))
    }
    return blocks
  }
}
