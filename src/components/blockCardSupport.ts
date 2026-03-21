import type { BlockVm } from '../adapters/documentAdapter';
import {
  CODE_LANGUAGE_OPTIONS,
  getCodeLanguageLabel,
  type CodeLanguageId,
} from '../lib/blockOptions';
import { isMarkdownContentEmpty } from '../lib/markdown';
import type { BlockKind } from '../lib/types';
import type { ContextMenuItem } from './ContextMenu';
import { preloadEditorForBlockKind } from './editors/editorLoaders';

export function isEffectivelyEmpty(block: BlockVm) {
  if (block.kind === 'markdown') {
    return isMarkdownContentEmpty(block.content);
  }

  return block.content.trim().length === 0;
}

export function preloadBlockCardEditor(kind: BlockKind) {
  return preloadEditorForBlockKind(kind);
}

export function buildBlockContextMenuItems(block: BlockVm, isEmpty: boolean): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    {
      id: 'cut',
      label: '잘라내기',
    },
    {
      id: 'copy',
      label: '복사',
    },
    {
      id: 'paste',
      label: '붙여넣기',
    },
    {
      id: 'select-all',
      label: '전체 선택',
    },
  ];

  if (isEmpty) {
    items.push({ type: 'separator', id: 'separator-kind' });
    for (const option of ['markdown', 'text'] as const) {
      items.push({
        id: `kind-${option}`,
        label: option === 'markdown' ? 'Markdown로 전환' : 'Text로 전환',
        checked: block.kind === option,
      });
    }
  }

  if (block.kind === 'code') {
    items.push({ type: 'separator', id: 'separator-language' });
    items.push(
      ...CODE_LANGUAGE_OPTIONS.map((option) => ({
        id: `language-${option.id}`,
        label: `${getCodeLanguageLabel(option.id)} 언어 사용`,
        checked: block.language === option.id,
      })),
    );
  }

  items.push({ type: 'separator', id: 'separator-delete' });
  items.push({
    id: 'delete-block',
    label: '블록 삭제',
    danger: true,
  });

  return items;
}

interface BlockContextActionHandlers {
  onCut: () => Promise<void>;
  onCopy: () => Promise<void>;
  onPaste: () => Promise<void>;
  onSelectAll: () => Promise<void>;
  onDelete: () => void;
  onSelectKind: (kind: BlockKind) => Promise<void>;
  onSelectLanguage: (language: CodeLanguageId) => void;
}

export async function handleBlockContextAction(
  actionId: string,
  handlers: BlockContextActionHandlers,
) {
  if (actionId === 'cut') {
    await handlers.onCut();
    return;
  }

  if (actionId === 'copy') {
    await handlers.onCopy();
    return;
  }

  if (actionId === 'paste') {
    await handlers.onPaste();
    return;
  }

  if (actionId === 'select-all') {
    await handlers.onSelectAll();
    return;
  }

  if (actionId === 'delete-block') {
    handlers.onDelete();
    return;
  }

  if (actionId.startsWith('kind-')) {
    await handlers.onSelectKind(actionId.replace('kind-', '') as BlockKind);
    return;
  }

  if (actionId.startsWith('language-')) {
    handlers.onSelectLanguage(actionId.replace('language-', '') as CodeLanguageId);
  }
}
