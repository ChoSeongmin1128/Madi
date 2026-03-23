import type {
  BlockDto,
  BlockKind,
  BlockRestoreDto,
  BlockTintPreset,
  BootstrapPayload,
  DocumentDto,
  DocumentSummaryDto,
  RemoteDocumentDto,
  SearchResultDto,
  ThemeMode,
} from '../../lib/types';

export interface BackendPort {
  bootstrapApp(): Promise<BootstrapPayload>;
  listDocuments(): Promise<DocumentSummaryDto[]>;
  searchDocuments(query: string): Promise<SearchResultDto[]>;
  openDocument(documentId: string): Promise<DocumentDto>;
  createDocument(): Promise<DocumentDto>;
  renameDocument(documentId: string, title: string | null): Promise<DocumentDto>;
  deleteDocument(documentId: string): Promise<BootstrapPayload>;
  deleteAllDocuments(): Promise<BootstrapPayload>;
  createBlockBelow(documentId: string, afterBlockId: string | null, kind?: BlockKind): Promise<DocumentDto>;
  changeBlockKind(blockId: string, kind: BlockKind): Promise<BlockDto>;
  moveBlock(documentId: string, blockId: string, targetPosition: number): Promise<DocumentDto>;
  deleteBlock(blockId: string): Promise<DocumentDto>;
  updateMarkdownBlock(blockId: string, content: string): Promise<BlockDto>;
  updateCodeBlock(blockId: string, content: string, language: string | null): Promise<BlockDto>;
  updateTextBlock(blockId: string, content: string): Promise<BlockDto>;
  flushDocument(documentId: string): Promise<number>;
  setThemeMode(themeMode: ThemeMode): Promise<ThemeMode>;
  setDefaultBlockTintPreset(preset: BlockTintPreset): Promise<BlockTintPreset>;
  setDocumentBlockTintOverride(documentId: string, blockTintOverride: BlockTintPreset | null): Promise<DocumentDto>;
  restoreDocumentBlocks(documentId: string, blocks: BlockRestoreDto[]): Promise<DocumentDto>;
  emptyTrash(): Promise<void>;
  restoreDocumentFromTrash(documentId: string): Promise<BootstrapPayload>;
  setIcloudSyncEnabled(enabled: boolean): Promise<boolean>;
  setMenuBarIconEnabled(enabled: boolean): Promise<boolean>;
  setDefaultBlockKind(kind: BlockKind): Promise<BlockKind>;
  applyRemoteDocuments(documents: RemoteDocumentDto[]): Promise<BootstrapPayload>;
}
