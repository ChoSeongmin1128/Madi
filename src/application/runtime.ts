import { backendPort } from '../adapters/backendPort';
import { clipboardPort } from '../adapters/clipboardPort';
import { documentSyncPort } from '../adapters/documentSyncPort';
import { historyGateway } from '../adapters/historyGateway';
import { schedulerPort } from '../adapters/schedulerPort';
import { sessionGateway } from '../adapters/sessionGateway';
import { syncEventPort } from '../adapters/syncEventPort';
import { syncMutationPort } from '../adapters/syncMutationPort';
import { workspaceGateway } from '../adapters/workspaceGateway';
import { createBlockUseCases } from './usecases/block/blockUseCases';
import { createDocumentUseCases } from './usecases/document/documentUseCases';
import { normalizeErrorMessage } from './usecases/shared/errors';
import { createWorkspaceUseCases } from './usecases/workspace/workspaceUseCases';

const documentUseCases = createDocumentUseCases({
  backend: backendPort,
  documentSync: documentSyncPort,
  history: historyGateway,
  session: sessionGateway,
  syncMutation: syncMutationPort,
  workspace: workspaceGateway,
});

const workspaceUseCases = createWorkspaceUseCases({
  backend: backendPort,
  documentSync: documentSyncPort,
  scheduler: schedulerPort,
  session: sessionGateway,
  syncMutation: syncMutationPort,
  workspace: workspaceGateway,
});

const blockUseCases = createBlockUseCases({
  backend: backendPort,
  clipboard: clipboardPort,
  documentSync: documentSyncPort,
  flushCurrentDocument: documentUseCases.flushCurrentDocument,
  history: historyGateway,
  session: sessionGateway,
  syncMutation: syncMutationPort,
  workspace: workspaceGateway,
});

documentSyncPort.setErrorHandler((error, context) => {
  const fallback =
    context.phase === 'autosave'
      ? '변경 내용을 자동 저장하지 못했습니다.'
      : '변경 내용을 저장하지 못했습니다.';
  workspaceGateway.setError(normalizeErrorMessage(error, fallback));
});

export const appUseCases = {
  ...documentUseCases,
  ...blockUseCases,
  ...workspaceUseCases,
};

export { syncEventPort };
