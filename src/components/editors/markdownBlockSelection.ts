import { hasBlockNoteSelection, type BlockNoteEditorLike, getBlockNoteMarkdown } from '../../lib/blocknoteBridge';
import { normalizeMarkdownContent } from '../../lib/markdown';

interface SelectionVisualState {
  hasSelection: boolean;
  isWholeBlockSelected: boolean;
}

export function emitSelectionVisualStateForEditor(
  editor: BlockNoteEditorLike,
  isWholeBlockSelected: boolean,
  onSelectionVisualChange?: (state: SelectionVisualState) => void,
) {
  const hasSelection = hasBlockNoteSelection(editor) || isWholeBlockSelected;
  onSelectionVisualChange?.({
    hasSelection,
    isWholeBlockSelected,
  });
}

export function createCurrentMarkdownReader(editor: BlockNoteEditorLike) {
  return () => normalizeMarkdownContent(getBlockNoteMarkdown(editor));
}
