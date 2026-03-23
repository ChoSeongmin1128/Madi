export type BlockKind = 'markdown' | 'code' | 'text';
export type BlockCaretPlacement = 'start' | 'end';
export type BlockTintPreset =
  | 'mist'
  | 'sage-rose'
  | 'sky-amber'
  | 'mint-plum'
  | 'ocean-sand'
  | 'violet-lime';
export type ThemeMode = 'system' | 'light' | 'dark';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface BlockDto {
  id: string;
  documentId: string;
  kind: BlockKind;
  position: number;
  content: string;
  language: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentSummaryDto {
  id: string;
  title: string | null;
  blockTintOverride: BlockTintPreset | null;
  preview: string;
  updatedAt: number;
  lastOpenedAt: number;
  blockCount: number;
}

export interface DocumentDto extends DocumentSummaryDto {
  blocks: BlockDto[];
}

export interface BootstrapPayload {
  documents: DocumentSummaryDto[];
  trashDocuments: DocumentSummaryDto[];
  currentDocument: DocumentDto | null;
  themeMode: ThemeMode;
  defaultBlockTintPreset: BlockTintPreset;
  icloudSyncEnabled: boolean;
}

export interface SearchResultDto extends DocumentSummaryDto {
  score: number;
}

export interface BlockRestoreDto {
  id: string;
  kind: BlockKind;
  content: string;
  language: string | null;
  position: number;
}
