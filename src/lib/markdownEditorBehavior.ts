export type MarkdownListShortcut =
  | { kind: 'bullet' }
  | { kind: 'task' }
  | { kind: 'ordered'; start: number };

export function detectMarkdownListShortcut(text: string): MarkdownListShortcut | null {
  const normalized = text.trim();

  if (normalized === '-' || normalized === '*') {
    return { kind: 'bullet' };
  }

  if (normalized === '[]' || normalized === '[ ]') {
    return { kind: 'task' };
  }

  const ordered = normalized.match(/^(\d+)\.$/);
  if (!ordered) {
    return null;
  }

  return {
    kind: 'ordered',
    start: Number.parseInt(ordered[1] ?? '1', 10) || 1,
  };
}

export function shouldReplaceMarkdownArrow(beforeText: string) {
  return beforeText.endsWith('-');
}
