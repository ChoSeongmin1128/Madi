import type { ClipboardBlockData } from '../../lib/blockClipboardCodec';

export interface ClipboardPort {
  readBlocks(): Promise<ClipboardBlockData[] | null>;
  writeBlocks(blocks: ClipboardBlockData[]): Promise<void>;
}
