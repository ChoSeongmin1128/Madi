import { describe, expect, it, vi } from 'vitest';
import type { DocumentVm } from '../../../adapters/documentAdapter';
import { createWorkspaceUseCases } from './workspaceUseCases';
import type { BootstrapPayload } from '../../../lib/types';

function createPayload(defaultBlockKind: BootstrapPayload['defaultBlockKind']): BootstrapPayload {
  return {
    documents: [],
    trashDocuments: [],
    currentDocument: null,
    themeMode: 'dark',
    defaultBlockTintPreset: 'ocean-sand',
    defaultBlockKind,
    icloudSyncEnabled: true,
    menuBarIconEnabled: true,
  };
}

function createSessionGateway(currentDocument: DocumentVm | null = null) {
  let current = currentDocument;

  return {
    getCurrentDocument: vi.fn(() => current),
    getSelectionState: vi.fn(() => ({
      selectedBlockId: null,
      selectedBlockIds: [],
      blockSelected: false,
      allBlocksSelected: false,
    })),
    setCurrentDocument: vi.fn((document) => {
      current = document;
    }),
    setCurrentDocumentState: vi.fn(),
    setDocumentWithFocus: vi.fn(),
    clearBlockSelection: vi.fn(),
    requestBlockFocus: vi.fn(),
    clearActiveEditorRef: vi.fn(),
    setIsFlushing: vi.fn(),
  };
}

function createWorkspaceGateway() {
  return {
    setDocuments: vi.fn(),
    setTrashDocuments: vi.fn(),
    upsertDocumentSummary: vi.fn(),
    setSearchResults: vi.fn(),
    setSearchQuery: vi.fn(),
    setIsBootstrapping: vi.fn(),
    clearError: vi.fn(),
    setError: vi.fn(),
    setDefaultBlockTintPreset: vi.fn(),
    setDefaultBlockKind: vi.fn(),
    setThemeMode: vi.fn(),
    setIcloudSyncEnabled: vi.fn(),
    getIcloudSyncStatus: vi.fn(() => ({ state: 'idle' as const, lastSyncAt: 10, errorMessage: null })),
    setIcloudSyncStatus: vi.fn(),
    setMenuBarIconEnabled: vi.fn(),
    setSettingsOpen: vi.fn(),
  };
}

describe('workspace usecases', () => {
  it('applies default block kind during bootstrap', async () => {
    const workspace = createWorkspaceGateway();
    const session = createSessionGateway();
    const payload = createPayload('code');
    const useCases = createWorkspaceUseCases({
      backend: {
        bootstrapApp: vi.fn(async () => payload),
        searchDocuments: vi.fn(),
        setThemeMode: vi.fn(),
        setDefaultBlockTintPreset: vi.fn(),
        setIcloudSyncEnabled: vi.fn(),
        setDefaultBlockKind: vi.fn(),
        setMenuBarIconEnabled: vi.fn(),
        deleteAllDocuments: vi.fn(),
        applyRemoteDocuments: vi.fn(),
      } as never,
      documentSync: { clearAllDocumentSync: vi.fn() } as never,
      scheduler: { setTimeout: vi.fn(), clearTimeout: vi.fn() },
      session,
      syncMutation: { enqueue: vi.fn() },
      workspace,
    });

    await useCases.bootstrapApp();

    expect(workspace.setDefaultBlockKind).toHaveBeenCalledWith('code');
    expect(workspace.setSearchResults).toHaveBeenCalledWith([]);
    expect(workspace.setSearchQuery).toHaveBeenCalledWith('');
  });

  it('keeps default block kind in deleteAllDocuments payload sync', async () => {
    const workspace = createWorkspaceGateway();
    const session = createSessionGateway();
    const payload = createPayload('text');
    const syncMutation = { enqueue: vi.fn() };
    const useCases = createWorkspaceUseCases({
      backend: {
        bootstrapApp: vi.fn(),
        searchDocuments: vi.fn(),
        setThemeMode: vi.fn(),
        setDefaultBlockTintPreset: vi.fn(),
        setIcloudSyncEnabled: vi.fn(),
        setDefaultBlockKind: vi.fn(),
        setMenuBarIconEnabled: vi.fn(),
        deleteAllDocuments: vi.fn(async () => payload),
        applyRemoteDocuments: vi.fn(),
      } as never,
      documentSync: { clearAllDocumentSync: vi.fn() } as never,
      scheduler: { setTimeout: vi.fn(), clearTimeout: vi.fn() },
      session,
      syncMutation,
      workspace,
    });

    await useCases.deleteAllDocuments();

    expect(workspace.setDefaultBlockKind).toHaveBeenCalledWith('text');
    expect(workspace.setSettingsOpen).toHaveBeenCalledWith(false);
    expect(syncMutation.enqueue).toHaveBeenCalledWith({ kind: 'documents-reset' });
  });
});
