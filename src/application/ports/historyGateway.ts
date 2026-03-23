import type { DocumentVm } from '../models/document';

export interface HistoryGateway {
  clear(): void;
  pushUndo(document: DocumentVm): void;
  popUndo(): DocumentVm | null;
  pushRedo(document: DocumentVm): void;
  popRedo(): DocumentVm | null;
}
