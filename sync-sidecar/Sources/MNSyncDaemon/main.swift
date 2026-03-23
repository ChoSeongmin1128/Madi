import Foundation

@MainActor
final class SyncCoordinator {
  private var syncEngine: SyncEngine?

  func run() async {
    // stdin을 한 줄씩 읽어 메시지 처리
    let stdin = FileHandle.standardInput
    for await line in stdin.bytes.lines {
      guard let data = line.data(using: .utf8),
            let message = try? JSONDecoder().decode(IncomingMessage.self, from: data)
      else {
        fputs("warn: unrecognized message: \(line)\n", stderr)
        continue
      }

      switch message {
      case .start(let payload):
        await handleStart(payload)

      case .notifyChanged(let payload):
        syncEngine?.notifyChanged(documentId: payload.documentId)

      case .notifyDeleted(let payload):
        syncEngine?.notifyDeleted(documentId: payload.documentId)

      case .notifyReset:
        await syncEngine?.notifyReset()

      case .stop:
        return
      }
    }
  }

  private func handleStart(_ payload: IncomingMessage.StartPayload) async {
    do {
      syncEngine = try SyncEngine(
        containerIdentifier: payload.containerIdentifier,
        dbPath: payload.dbPath,
        statePath: payload.statePath
      )
      await syncEngine?.start()
    } catch {
      emitMessage(ErrorMessage(message: "초기화 실패: \(error.localizedDescription)"))
    }
  }
}

// 메인 엔트리포인트
let coordinator = SyncCoordinator()
Task { @MainActor in
  await coordinator.run()
}
RunLoop.main.run()
