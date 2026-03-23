import type { HistoryGateway } from '../application/ports/historyGateway';
import { useBlockHistoryStore } from '../stores/blockHistoryStore';

export const historyGateway: HistoryGateway = {
  clear() {
    useBlockHistoryStore.getState().clear();
  },
  pushUndo(document) {
    useBlockHistoryStore.getState().pushUndo(document);
  },
  popUndo() {
    return useBlockHistoryStore.getState().popUndo();
  },
  pushRedo(document) {
    useBlockHistoryStore.getState().pushRedo(document);
  },
  popRedo() {
    return useBlockHistoryStore.getState().popRedo();
  },
};
