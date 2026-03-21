import { lazy } from 'react';
import type { BlockKind } from '../../lib/types';

const loadMarkdownBlockEditor = async () => import('./MarkdownBlockEditor');
const loadPlainTextBlockEditor = async () => import('./PlainTextBlockEditor');

export const MarkdownBlockEditor = lazy(async () => ({
  default: (await loadMarkdownBlockEditor()).MarkdownBlockEditor,
}));

export const PlainTextBlockEditor = lazy(async () => ({
  default: (await loadPlainTextBlockEditor()).PlainTextBlockEditor,
}));

export function preloadMarkdownBlockEditor() {
  return loadMarkdownBlockEditor();
}

export function preloadPlainTextBlockEditor() {
  return loadPlainTextBlockEditor();
}

export function preloadEditorForBlockKind(kind: BlockKind) {
  if (kind === 'markdown') {
    return preloadMarkdownBlockEditor();
  }

  return preloadPlainTextBlockEditor();
}
