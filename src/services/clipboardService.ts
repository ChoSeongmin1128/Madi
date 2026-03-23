import { serializeBlockToMarkdown } from '../lib/markdown';
import type { BlockKind } from '../lib/types';

const BLOCK_CLIPBOARD_PREFIX = '<!--minnote-block:';
const BLOCK_CLIPBOARD_SUFFIX = '-->';

let hasBlockData = false;

export interface ClipboardBlockData {
  kind: BlockKind;
  content: string;
  language?: string | null;
}

function encodeBlockClipboard(blocks: ClipboardBlockData[]): string {
  const meta = `${BLOCK_CLIPBOARD_PREFIX}${JSON.stringify(blocks)}${BLOCK_CLIPBOARD_SUFFIX}\n`;
  const text = blocks.map((b) => serializeBlockToMarkdown(b)).join('\n\n');
  return `${meta}${text}`;
}

function decodeBlockClipboard(text: string): ClipboardBlockData[] | null {
  if (!text.startsWith(BLOCK_CLIPBOARD_PREFIX)) return null;
  const endIndex = text.indexOf(BLOCK_CLIPBOARD_SUFFIX);
  if (endIndex < 0) return null;
  try {
    return JSON.parse(text.slice(BLOCK_CLIPBOARD_PREFIX.length, endIndex));
  } catch {
    return null;
  }
}

export function hasBlockDataInClipboard() {
  return hasBlockData;
}

export function clearBlockClipboard() {
  hasBlockData = false;
}

export async function writeBlocksToClipboard(blocks: ClipboardBlockData[]) {
  hasBlockData = true;
  await navigator.clipboard.writeText(encodeBlockClipboard(blocks));
}

export async function readBlocksFromClipboard(): Promise<ClipboardBlockData[] | null> {
  const text = await navigator.clipboard.readText();
  if (!text.trim()) return null;
  return decodeBlockClipboard(text) ?? [{ kind: 'markdown', content: text }];
}
