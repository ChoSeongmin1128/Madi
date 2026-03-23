import type { BlockKind, BlockTintPreset, ThemeMode } from '../../lib/types';
import type { DocumentSummaryVm, DocumentVm } from './document';

export interface WorkspaceBootstrapState {
  documents: DocumentSummaryVm[];
  trashDocuments: DocumentSummaryVm[];
  currentDocument: DocumentVm | null;
  themeMode: ThemeMode;
  defaultBlockTintPreset: BlockTintPreset;
  defaultBlockKind: BlockKind;
  icloudSyncEnabled: boolean;
  menuBarIconEnabled: boolean;
}
