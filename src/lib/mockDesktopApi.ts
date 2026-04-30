import type {
  AppUpdateStatus,
  BlockDto,
  BlockKind,
  BlockRestoreDto,
  BlockTintPreset,
  BootstrapPayload,
  BodyFontFamily,
  CodeFontFamily,
  DocumentDto,
  DocumentSurfaceTonePreset,
  DocumentSummaryDto,
  ICloudSyncDebugInfoDto,
  ICloudSyncStatus,
  SearchResultDto,
  ThemeMode,
  WindowControlRuntimeStateDto,
} from './types';
import type { DesktopApi } from './desktopApi';

let idCounter = 10;
let themeMode: ThemeMode = 'system';
let defaultBlockTintPreset: BlockTintPreset = 'mist';
let defaultDocumentSurfaceTonePreset: DocumentSurfaceTonePreset = 'default';
let defaultBlockKind: BlockKind = 'markdown';
let bodyFontFamily: BodyFontFamily = 'system-sans';
let codeFontFamily: CodeFontFamily = 'system-mono';
let bodyFontSizePx = 16;
let codeFontSizePx = 14;
let menuBarIconEnabled = false;
let alwaysOnTopEnabled = false;
let windowOpacityPercent = 100;
let globalToggleShortcut: string | null = 'Option+M';
let icloudSyncStatus: ICloudSyncStatus = {
  enabled: false,
  state: 'disabled',
  accountStatus: 'unknown',
  pendingOperationCount: 0,
  lastSyncStartedAtMs: null,
  lastSyncSucceededAtMs: null,
  lastErrorCode: null,
  lastErrorMessage: null,
};

const now = Date.now();
let documents: DocumentDto[] = [
  {
    id: 'mock-doc-madi',
    title: 'Madi 디자인 점검',
    blockTintOverride: null,
    documentSurfaceToneOverride: null,
    preview: '',
    updatedAt: now,
    lastOpenedAt: now,
    blockCount: 3,
    blocks: [
      {
        id: 'mock-block-identity',
        documentId: 'mock-doc-madi',
        kind: 'markdown',
        position: 0,
        content:
          '## 컴팩트한 macOS 블록 노트\n\n설정은 카테고리형으로 나뉘고, 블록 구분은 은은한 틴트와 명확한 포커스로 유지합니다.',
        language: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'mock-block-code',
        documentId: 'mock-doc-madi',
        kind: 'code',
        position: 1,
        content: 'const productName = "Madi";',
        language: 'typescript',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'mock-block-text',
        documentId: 'mock-doc-madi',
        kind: 'text',
        position: 2,
        content: '브라우저 mock runtime은 Tauri 없이 디자인 확인을 하기 위한 개발 전용 경로입니다.',
        language: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
  },
];
let trashDocuments: DocumentSummaryDto[] = [];

function nextId(prefix: string) {
  idCounter += 1;
  return `mock-${prefix}-${idCounter}`;
}

function touch(document: DocumentDto): DocumentDto {
  const updatedAt = Date.now();
  return {
    ...document,
    updatedAt,
    lastOpenedAt: updatedAt,
    blockCount: document.blocks.length,
    preview: summarizePreview(document.blocks),
  };
}

function summarizePreview(blocks: BlockDto[]) {
  return blocks.map((block) => block.content.trim()).find(Boolean) ?? '';
}

function summarizeDocument(document: DocumentDto): DocumentSummaryDto {
  return {
    id: document.id,
    title: document.title,
    blockTintOverride: document.blockTintOverride,
    documentSurfaceToneOverride: document.documentSurfaceToneOverride,
    preview: summarizePreview(document.blocks),
    updatedAt: document.updatedAt,
    lastOpenedAt: document.lastOpenedAt,
    blockCount: document.blocks.length,
  };
}

function bootstrapPayload(currentDocument: DocumentDto | null = documents[0] ?? null): BootstrapPayload {
  return {
    documents: documents.map(summarizeDocument),
    trashDocuments,
    currentDocument,
    icloudSyncStatus,
    themeMode,
    defaultBlockTintPreset,
    defaultDocumentSurfaceTonePreset,
    defaultBlockKind,
    bodyFontFamily,
    bodyFontSizePx,
    codeFontFamily,
    codeFontSizePx,
    menuBarIconEnabled,
    alwaysOnTopEnabled,
    windowOpacityPercent,
    globalToggleShortcut,
    globalShortcutError: null,
    menuBarIconError: null,
    windowPreferenceError: null,
  };
}

function findDocument(documentId: string) {
  const document = documents.find((entry) => entry.id === documentId);
  if (!document) {
    throw new Error('문서를 찾지 못했습니다.');
  }
  return document;
}

function replaceDocument(nextDocument: DocumentDto) {
  documents = documents.map((entry) => (entry.id === nextDocument.id ? touch(nextDocument) : entry));
  return findDocument(nextDocument.id);
}

function findBlockOwner(blockId: string) {
  const document = documents.find((entry) => entry.blocks.some((block) => block.id === blockId));
  if (!document) {
    throw new Error('블록을 찾지 못했습니다.');
  }
  return document;
}

export const mockDesktopApi: DesktopApi = {
  async bootstrapApp() {
    return bootstrapPayload();
  },
  async getWindowControlRuntimeState(): Promise<WindowControlRuntimeStateDto> {
    return {
      globalShortcutError: null,
      menuBarIconError: null,
      windowPreferenceError: null,
    };
  },
  async listDocuments() {
    return documents.map(summarizeDocument);
  },
  async listTrashDocuments() {
    return trashDocuments;
  },
  async searchDocuments(query: string): Promise<SearchResultDto[]> {
    const normalizedQuery = query.trim().toLowerCase();
    return documents
      .map(summarizeDocument)
      .filter((document) => {
        const haystack = `${document.title ?? ''} ${document.preview}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .map((document) => ({ ...document, score: 1 }));
  },
  async openDocument(documentId: string) {
    return findDocument(documentId);
  },
  async createDocument() {
    const createdAt = Date.now();
    const documentId = nextId('doc');
    const document: DocumentDto = {
      id: documentId,
      title: null,
      blockTintOverride: null,
      documentSurfaceToneOverride: null,
      preview: '',
      updatedAt: createdAt,
      lastOpenedAt: createdAt,
      blockCount: 1,
      blocks: [
        {
          id: nextId('block'),
          documentId,
          kind: defaultBlockKind,
          position: 0,
          content: '',
          language: defaultBlockKind === 'code' ? 'plain' : null,
          createdAt,
          updatedAt: createdAt,
        },
      ],
    };
    documents = [document, ...documents];
    return document;
  },
  async renameDocument(documentId: string, title: string | null) {
    return replaceDocument({
      ...findDocument(documentId),
      title,
    });
  },
  async deleteDocument(documentId: string) {
    const document = findDocument(documentId);
    documents = documents.filter((entry) => entry.id !== documentId);
    trashDocuments = [summarizeDocument(document), ...trashDocuments];
    return bootstrapPayload(documents[0] ?? null);
  },
  async deleteAllDocuments() {
    documents = [];
    trashDocuments = [];
    return bootstrapPayload(null);
  },
  async createBlockBelow(documentId: string, afterBlockId: string | null, kind: BlockKind = defaultBlockKind) {
    const document = findDocument(documentId);
    const afterIndex = afterBlockId
      ? Math.max(0, document.blocks.findIndex((block) => block.id === afterBlockId))
      : -1;
    const createdAt = Date.now();
    const block: BlockDto = {
      id: nextId('block'),
      documentId,
      kind,
      position: afterIndex + 1,
      content: '',
      language: kind === 'code' ? 'plain' : null,
      createdAt,
      updatedAt: createdAt,
    };
    const nextBlocks = [...document.blocks];
    nextBlocks.splice(afterIndex + 1, 0, block);
    return replaceDocument({
      ...document,
      blocks: nextBlocks.map((entry, position) => ({ ...entry, position })),
    });
  },
  async changeBlockKind(blockId: string, kind: BlockKind) {
    const document = findBlockOwner(blockId);
    let nextBlock: BlockDto | null = null;
    replaceDocument({
      ...document,
      blocks: document.blocks.map((block) => {
        if (block.id !== blockId) {
          return block;
        }
        nextBlock = {
          ...block,
          kind,
          language: kind === 'code' ? 'plain' : null,
          updatedAt: Date.now(),
        };
        return nextBlock;
      }),
    });
    return nextBlock!;
  },
  async moveBlock(documentId: string, blockId: string, targetPosition: number) {
    const document = findDocument(documentId);
    const blocks = [...document.blocks];
    const sourceIndex = blocks.findIndex((block) => block.id === blockId);
    if (sourceIndex < 0) {
      return document;
    }
    const [moved] = blocks.splice(sourceIndex, 1);
    blocks.splice(targetPosition, 0, moved);
    return replaceDocument({
      ...document,
      blocks: blocks.map((block, position) => ({ ...block, position })),
    });
  },
  async deleteBlock(blockId: string) {
    const document = findBlockOwner(blockId);
    return replaceDocument({
      ...document,
      blocks: document.blocks
        .filter((block) => block.id !== blockId)
        .map((block, position) => ({ ...block, position })),
    });
  },
  async updateMarkdownBlock(blockId: string, content: string) {
    return mockDesktopApi.updateTextBlock(blockId, content);
  },
  async updateCodeBlock(blockId: string, content: string, language: string | null) {
    const document = findBlockOwner(blockId);
    let nextBlock: BlockDto | null = null;
    replaceDocument({
      ...document,
      blocks: document.blocks.map((block) => {
        if (block.id !== blockId) {
          return block;
        }
        nextBlock = { ...block, content, language, updatedAt: Date.now() };
        return nextBlock;
      }),
    });
    return nextBlock!;
  },
  async updateTextBlock(blockId: string, content: string) {
    const document = findBlockOwner(blockId);
    let nextBlock: BlockDto | null = null;
    replaceDocument({
      ...document,
      blocks: document.blocks.map((block) => {
        if (block.id !== blockId) {
          return block;
        }
        nextBlock = { ...block, content, updatedAt: Date.now() };
        return nextBlock;
      }),
    });
    return nextBlock!;
  },
  async flushDocument() {
    return Date.now();
  },
  async setThemeMode(nextThemeMode: ThemeMode) {
    themeMode = nextThemeMode;
    return themeMode;
  },
  async setDefaultBlockTintPreset(preset: BlockTintPreset) {
    defaultBlockTintPreset = preset;
    return defaultBlockTintPreset;
  },
  async setDefaultDocumentSurfaceTonePreset(preset: DocumentSurfaceTonePreset) {
    defaultDocumentSurfaceTonePreset = preset;
    return defaultDocumentSurfaceTonePreset;
  },
  async setBodyFontFamily(fontFamily: BodyFontFamily) {
    bodyFontFamily = fontFamily;
    return bodyFontFamily;
  },
  async setBodyFontSizePx(size: number) {
    bodyFontSizePx = size;
    return bodyFontSizePx;
  },
  async setCodeFontFamily(fontFamily: CodeFontFamily) {
    codeFontFamily = fontFamily;
    return codeFontFamily;
  },
  async setCodeFontSizePx(size: number) {
    codeFontSizePx = size;
    return codeFontSizePx;
  },
  async setDocumentBlockTintOverride(documentId: string, blockTintOverride: BlockTintPreset | null) {
    return replaceDocument({ ...findDocument(documentId), blockTintOverride });
  },
  async setDocumentSurfaceToneOverride(
    documentId: string,
    documentSurfaceToneOverride: DocumentSurfaceTonePreset | null,
  ) {
    return replaceDocument({ ...findDocument(documentId), documentSurfaceToneOverride });
  },
  async restoreDocumentBlocks(documentId: string, blocks: BlockRestoreDto[]) {
    const document = findDocument(documentId);
    return replaceDocument({
      ...document,
      blocks: blocks.map((block, position) => ({
        ...block,
        documentId,
        position,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })),
    });
  },
  async emptyTrash() {
    trashDocuments = [];
  },
  async restoreDocumentFromTrash(documentId: string) {
    trashDocuments = trashDocuments.filter((document) => document.id !== documentId);
    return bootstrapPayload();
  },
  async confirmAppShutdown() {},
  async getICloudSyncStatus() {
    return icloudSyncStatus;
  },
  async getICloudSyncDebugInfo(): Promise<ICloudSyncDebugInfoDto> {
    return {
      bridgeAvailable: false,
      bridgeError: '브라우저 mock runtime에서는 CloudKit bridge를 실행하지 않습니다.',
      zoneName: 'MadiZone',
      serverChangeTokenPresent: false,
      pendingOperationCount: 0,
      processingOperationCount: 0,
      failedOperationCount: 0,
      coalescedIntentCount: 0,
      tombstoneCount: 0,
      runtimePhase: 'mock',
      backoffAttempt: 0,
      nextRetryAtMs: null,
      deviceIdSuffix: 'browser',
    };
  },
  async setICloudSyncEnabled(enabled: boolean) {
    icloudSyncStatus = {
      ...icloudSyncStatus,
      enabled,
      state: enabled ? 'idle' : 'disabled',
      lastErrorCode: null,
      lastErrorMessage: null,
    };
    return icloudSyncStatus;
  },
  async runICloudSync() {
    icloudSyncStatus = {
      ...icloudSyncStatus,
      state: icloudSyncStatus.enabled ? 'idle' : 'disabled',
      lastSyncStartedAtMs: Date.now(),
      lastSyncSucceededAtMs: icloudSyncStatus.enabled ? Date.now() : icloudSyncStatus.lastSyncSucceededAtMs,
    };
    return icloudSyncStatus;
  },
  async resetICloudSyncCheckpoint() {
    return icloudSyncStatus;
  },
  async forceUploadAllDocuments() {
    return icloudSyncStatus;
  },
  async forceRedownloadFromCloud() {
    return icloudSyncStatus;
  },
  async setMenuBarIconEnabled(enabled: boolean) {
    menuBarIconEnabled = enabled;
    return menuBarIconEnabled;
  },
  async setDefaultBlockKind(kind: BlockKind) {
    defaultBlockKind = kind;
    return defaultBlockKind;
  },
  async setAlwaysOnTopEnabled(enabled: boolean) {
    alwaysOnTopEnabled = enabled;
    return alwaysOnTopEnabled;
  },
  async previewWindowOpacityPercent(percent: number) {
    windowOpacityPercent = percent;
    return windowOpacityPercent;
  },
  async setWindowOpacityPercent(percent: number) {
    windowOpacityPercent = percent;
    return windowOpacityPercent;
  },
  async setGlobalToggleShortcut(shortcut: string | null) {
    globalToggleShortcut = shortcut;
    return globalToggleShortcut;
  },
};

export const mockAppUpdateStatus: AppUpdateStatus = {
  state: 'idle',
  version: null,
  percent: null,
  message: '브라우저 미리보기',
  lastCheckedAt: null,
};
