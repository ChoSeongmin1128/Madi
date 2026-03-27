import type { BackendPort } from '../../ports/backendPort';
import type { ClipboardPort } from '../../ports/clipboardPort';
import type { EditorPersistencePort } from '../../ports/editorPersistencePort';
import type { HistoryGateway } from '../../ports/historyGateway';
import type { SessionGateway } from '../../ports/sessionGateway';
import type { WorkspaceGateway } from '../../ports/workspaceGateway';

export interface BlockUseCaseDeps {
  backend: BackendPort;
  clipboard: ClipboardPort;
  editorPersistence: EditorPersistencePort;
  flushCurrentDocument: () => Promise<void>;
  history: HistoryGateway;
  session: SessionGateway;
  workspace: WorkspaceGateway;
}
