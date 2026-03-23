import { serializeBlockToMarkdown } from './markdown';
import type { BlockKind } from './types';

const BLOCK_CLIPBOARD_PREFIX = '<!--minnote-block:';
const BLOCK_CLIPBOARD_SUFFIX = '-->';

export interface ClipboardBlockData {
  kind: BlockKind;
  content: string;
  language?: string | null;
}

export function encodeBlockClipboard(blocks: ClipboardBlockData[]): string {
  const meta = `${BLOCK_CLIPBOARD_PREFIX}${JSON.stringify(blocks)}${BLOCK_CLIPBOARD_SUFFIX}\n`;
  const text = blocks.map((block) => serializeBlockToMarkdown(block)).join('\n\n');
  return `${meta}${text}`;
}

export function parseBlockClipboardText(text: string): ClipboardBlockData[] | null {
  if (!text.startsWith(BLOCK_CLIPBOARD_PREFIX)) return null;

  const endIndex = text.indexOf(BLOCK_CLIPBOARD_SUFFIX);
  if (endIndex < 0) return null;

  try {
    return JSON.parse(text.slice(BLOCK_CLIPBOARD_PREFIX.length, endIndex));
  } catch {
    return null;
  }
}

export function isBlockClipboardText(text: string) {
  return parseBlockClipboardText(text) != null;
}
