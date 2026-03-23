import type { ClipboardPort } from '../application/ports/clipboardPort';
import { readBlocksFromClipboard, writeBlocksToClipboard } from '../services/clipboardService';

export const clipboardPort: ClipboardPort = {
  readBlocks() {
    return readBlocksFromClipboard();
  },
  writeBlocks(blocks) {
    return writeBlocksToClipboard(blocks);
  },
};
