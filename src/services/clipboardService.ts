import {
  encodeBlockClipboard,
  parseBlockClipboardText,
  isBlockClipboardText,
  type ClipboardBlockData,
} from '../lib/blockClipboardCodec';

export { parseBlockClipboardText, isBlockClipboardText };
export type { ClipboardBlockData };

export async function writeBlocksToClipboard(blocks: ClipboardBlockData[]) {
  await navigator.clipboard.writeText(encodeBlockClipboard(blocks));
}

export async function readBlocksFromClipboard(): Promise<ClipboardBlockData[] | null> {
  const text = await navigator.clipboard.readText();
  if (!text.trim()) return null;
  return parseBlockClipboardText(text);
}
