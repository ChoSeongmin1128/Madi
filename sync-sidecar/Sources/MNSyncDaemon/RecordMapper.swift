import CloudKit
import Foundation

struct BlockJson: Codable {
  let id: String
  let kind: String
  let content: String
  let language: String?
  let position: Int
  let createdAt: Int64
  let updatedAt: Int64
}

enum RecordMapper {
  static let recordType = "MNDocument"
  static let zoneName = "MNDocuments"
  static let zoneID = CKRecordZone.ID(zoneName: zoneName, ownerName: CKCurrentUserDefaultName)

  static func toRecord(document: DocumentRow, blocks: [BlockRow]) -> CKRecord {
    let recordID = CKRecord.ID(recordName: document.id, zoneID: zoneID)
    let record = CKRecord(recordType: recordType, recordID: recordID)

    record["title"] = document.title as CKRecordValue?
    record["blockTintOverride"] = document.blockTintOverride as CKRecordValue?
    record["createdAt"] = NSNumber(value: document.createdAt)
    record["updatedAt"] = NSNumber(value: document.updatedAt)
    if let deletedAt = document.deletedAt {
      record["deletedAt"] = NSNumber(value: deletedAt)
    }

    let blockJsons = blocks.map { b in
      BlockJson(
        id: b.id,
        kind: b.kind,
        content: b.content,
        language: b.language,
        position: Int(b.position),
        createdAt: b.createdAt,
        updatedAt: b.updatedAt
      )
    }
    if let data = try? JSONEncoder().encode(blockJsons),
       let json = String(data: data, encoding: .utf8) {
      record["blocksJson"] = json as CKRecordValue
    }

    return record
  }

  static func toRemoteDocument(record: CKRecord) -> RemoteDocument? {
    guard let blocksJson = record["blocksJson"] as? String else { return nil }
    let createdAt = (record["createdAt"] as? NSNumber)?.int64Value
      ?? Int64((record.creationDate?.timeIntervalSince1970 ?? 0) * 1000)
    let updatedAt = (record["updatedAt"] as? NSNumber)?.int64Value
      ?? Int64((record.modificationDate?.timeIntervalSince1970 ?? 0) * 1000)

    return RemoteDocument(
      id: record.recordID.recordName,
      title: record["title"] as? String,
      blockTintOverride: record["blockTintOverride"] as? String,
      blocksJson: blocksJson,
      createdAt: createdAt,
      updatedAt: updatedAt,
      deletedAt: (record["deletedAt"] as? NSNumber)?.int64Value
    )
  }
}
