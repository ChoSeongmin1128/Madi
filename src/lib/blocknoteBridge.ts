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

  doc.descendants((node: { isTextblock: boolean; nodeSize: number }, pos: number) => {
    if (!node.isTextblock) {
      return;
    }

    if (firstCursorPos === null) {
      firstCursorPos = pos + 1;
    }

    lastCursorPos = pos + node.nodeSize - 1;
  });

  if (firstCursorPos === null || lastCursorPos === null) {
    return null;
  }

  return {
    firstCursorPos,
    lastCursorPos,
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

export function focusBlockNote(editor: BlockNoteEditorLike, focusPlacement: 'start' | 'end') {
  const targetBlock = editor.document[focusPlacement === 'start' ? 0 : editor.document.length - 1];
  if (!targetBlock || typeof targetBlock !== 'object' || !('id' in targetBlock)) {
    return;
  }

  editor.focus();
  editor.setTextCursorPosition((targetBlock as { id: string }).id, focusPlacement);
}

export function clearBlockNoteContent(editor: BlockNoteEditorLike, createEmptyBlocks: () => unknown[]) {
  editor.replaceBlocks(editor.document, createEmptyBlocks());
}
