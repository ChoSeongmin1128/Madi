/* eslint-disable @typescript-eslint/no-explicit-any */
export type BlockNoteEditorLike = {
  _tiptapEditor: any;
  document: any[];
  blocksToMarkdownLossy: (document?: any) => string;
  tryParseMarkdownToBlocks: (markdown: string) => any[];
  replaceBlocks: (blocks: any, replacement: any) => void;
  focus: () => void;
  setTextCursorPosition: (blockId: string, placement: 'start' | 'end') => void;
  getSelectedText: () => string;
  pasteMarkdown: (markdown: string) => void;
};

function getSelection(editor: BlockNoteEditorLike) {
  return editor._tiptapEditor.state.selection;
}

function dispatchTransaction(editor: BlockNoteEditorLike, transaction: unknown) {
  const dispatchable =
    transaction && typeof transaction === 'object' && 'scrollIntoView' in (transaction as Record<string, unknown>)
      ? (transaction as { scrollIntoView: () => unknown }).scrollIntoView()
      : transaction;
  editor._tiptapEditor.view.dispatch(dispatchable);
}

export function getBlockNoteMarkdown(editor: BlockNoteEditorLike) {
  return editor.blocksToMarkdownLossy(editor.document);
}

export function replaceBlockNoteMarkdown(editor: BlockNoteEditorLike, markdown: string, createEmptyBlocks: () => unknown[]) {
  const nextBlocks = markdown ? editor.tryParseMarkdownToBlocks(markdown) : createEmptyBlocks();
  editor.replaceBlocks(editor.document, nextBlocks);
}

export function hasBlockNoteSelection(editor: BlockNoteEditorLike) {
  const selection = getSelection(editor);
  return !selection.empty;
}

export function selectAllBlockNote(editor: BlockNoteEditorLike) {
  editor.focus();
  editor._tiptapEditor.commands.selectAll();
}

export function getBlockNoteTextBoundaries(editor: BlockNoteEditorLike) {
  const { selection, doc } = editor._tiptapEditor.state;
  if (!selection.empty) {
    return null;
  }

  let firstCursorPos: number | null = null;
  let lastCursorPos: number | null = null;
  let prevLastCursorPos: number | null = null;
  let lastNodeSize = 0;

  doc.descendants((node: { isTextblock: boolean; nodeSize: number; textContent: string }, pos: number) => {
    if (!node.isTextblock) {
      return;
    }

    if (firstCursorPos === null) {
      firstCursorPos = pos + 1;
    }

    prevLastCursorPos = lastCursorPos;
    lastCursorPos = pos + node.nodeSize - 1;
    lastNodeSize = node.nodeSize;
  });

  if (firstCursorPos === null || lastCursorPos === null) {
    return null;
  }

  // 마지막 textblock이 빈 trailing paragraph(nodeSize <= 2)이고 다른 블록이 있으면 건너뛰기
  const effectiveLastCursorPos =
    lastNodeSize <= 2 && prevLastCursorPos !== null ? prevLastCursorPos : lastCursorPos;

  return {
    firstCursorPos,
    lastCursorPos: effectiveLastCursorPos,
    selectionFrom: selection.from,
    selectionTo: selection.to,
  };
}

export function isAtBlockNoteBoundary(editor: BlockNoteEditorLike, direction: 'start' | 'end') {
  const boundaries = getBlockNoteTextBoundaries(editor);
  if (!boundaries) {
    return false;
  }

  return direction === 'start'
    ? boundaries.selectionFrom <= boundaries.firstCursorPos
    : boundaries.selectionTo >= boundaries.lastCursorPos;
}

export function replaceBlockNoteArrowShortcut(editor: BlockNoteEditorLike, shouldReplace: (text: string) => boolean) {
  const selection = getSelection(editor);
  if (!selection.empty) {
    return false;
  }

  const { $from } = selection;
  if (!$from.parent.isTextblock || $from.parentOffset < 1) {
    return false;
  }

  const beforeText = $from.parent.textBetween(0, $from.parentOffset, undefined, '\uFFFC');
  if (!shouldReplace(beforeText)) {
    return false;
  }

  const transaction = editor._tiptapEditor.state.tr.insertText('→', selection.from - 1, selection.from);
  dispatchTransaction(editor, transaction);
  return true;
}

export function isBlockNoteSelectionEmpty(editor: BlockNoteEditorLike) {
  return getSelection(editor).empty;
}

export function deleteBlockNoteSelection(editor: BlockNoteEditorLike) {
  const selection = getSelection(editor);
  if (selection.empty) {
    return false;
  }

  const transaction = editor._tiptapEditor.state.tr.deleteSelection();
  dispatchTransaction(editor, transaction);
  return true;
}

function isEmptyTrailingBlock(block: unknown): boolean {
  if (!block || typeof block !== 'object') return false;
  const b = block as Record<string, unknown>;
  if (b.type !== 'paragraph') return false;
  const content = b.content;
  if (!Array.isArray(content) || content.length === 0) return true;
  return content.every((item: unknown) => {
    if (!item || typeof item !== 'object') return true;
    const node = item as Record<string, unknown>;
    return node.type === 'text' && (typeof node.text === 'string' ? node.text.length === 0 : true);
  });
}

export function focusBlockNote(editor: BlockNoteEditorLike, focusPlacement: 'start' | 'end'): boolean {
  const view = editor._tiptapEditor?.view;
  if (!view?.dom?.isConnected) {
    return false;
  }

  let targetIndex = focusPlacement === 'start' ? 0 : editor.document.length - 1;

  // 'end' 배치 시 숨겨진 빈 trailing paragraph 건너뛰기
  if (focusPlacement === 'end' && targetIndex > 0 && isEmptyTrailingBlock(editor.document[targetIndex])) {
    targetIndex--;
  }

  const targetBlock = editor.document[targetIndex];
  if (!targetBlock || typeof targetBlock !== 'object' || !('id' in targetBlock)) {
    return false;
  }

  (view.dom as HTMLElement).focus();
  try {
    editor.setTextCursorPosition((targetBlock as { id: string }).id, focusPlacement);
  } catch {
    // setTextCursorPosition 실패 시에도 DOM focus는 유지
  }

  return view.hasFocus?.() ?? view.dom.contains(document.activeElement);
}

export function clearBlockNoteContent(editor: BlockNoteEditorLike, createEmptyBlocks: () => unknown[]) {
  editor.replaceBlocks(editor.document, createEmptyBlocks());
}
