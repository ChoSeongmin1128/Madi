import { Suspense } from 'react';
import type { RefObject } from 'react';
import type { BlockVm } from '../../application/models/document';
import type { BlockEditorHandle } from '../../lib/editorHandle';
import type { CodeLanguageId } from '../../lib/codeLanguageRegistry';
import type { BlockCaretPlacement } from '../../lib/types';
import {
  MarkdownBlockEditor,
  PlainTextBlockEditor,
} from '../editors/editorLoaders';

interface BlockCardEditorProps {
  block: BlockVm;
  editorRef: RefObject<BlockEditorHandle | null>;
  isSelected: boolean;
  focusPlacement: BlockCaretPlacement | null;
  focusNonce: number;
  onFocus: () => void;
  onSelectionVisualChange: (state: { hasSelection: boolean; isWholeBlockSelected: boolean }) => void;
  onCreateBelow: () => Promise<void>;
  onNavigatePrevious: (caret: 'start' | 'end') => void;
  onNavigateNext: (caret: 'start' | 'end') => void;
  onDeleteIfEmpty: () => void;
  onMarkdownChange: (content: string) => void;
  onTextChange: (content: string) => void;
  onCodeChange: (content: string, language: CodeLanguageId | null) => void;
}

function EditorFallback() {
  return <div className="block-editor-loading" aria-hidden="true" />;
}

export function BlockCardEditor({
  block,
  editorRef,
  isSelected,
  focusPlacement,
  focusNonce,
  onFocus,
  onSelectionVisualChange,
  onCreateBelow,
  onNavigatePrevious,
  onNavigateNext,
  onDeleteIfEmpty,
  onMarkdownChange,
  onTextChange,
  onCodeChange,
}: BlockCardEditorProps) {
  return (
    <Suspense fallback={<EditorFallback />}>
      {block.kind === 'markdown' ? (
        <MarkdownBlockEditor
          ref={editorRef}
          blockId={block.id}
          content={block.content}
          isSelected={isSelected}
          focusPlacement={focusPlacement}
          focusNonce={focusNonce}
          onFocus={onFocus}
          onSelectionVisualChange={onSelectionVisualChange}
          onCreateBelow={onCreateBelow}
          onNavigatePrevious={onNavigatePrevious}
          onNavigateNext={onNavigateNext}
          onDeleteIfEmpty={onDeleteIfEmpty}
          onChange={onMarkdownChange}
        />
      ) : null}

      {block.kind === 'code' ? (
        <PlainTextBlockEditor
          ref={editorRef}
          mode="code"
          value={block.content}
          language={block.language}
          focusPlacement={focusPlacement}
          focusNonce={focusNonce}
          onFocus={onFocus}
          onCreateBelow={onCreateBelow}
          onNavigatePrevious={onNavigatePrevious}
          onNavigateNext={onNavigateNext}
          onDeleteIfEmpty={onDeleteIfEmpty}
          onChange={onCodeChange}
        />
      ) : null}

      {block.kind === 'text' ? (
        <PlainTextBlockEditor
          ref={editorRef}
          mode="text"
          value={block.content}
          focusPlacement={focusPlacement}
          focusNonce={focusNonce}
          onFocus={onFocus}
          onCreateBelow={onCreateBelow}
          onNavigatePrevious={onNavigatePrevious}
          onNavigateNext={onNavigateNext}
          onDeleteIfEmpty={onDeleteIfEmpty}
          onChange={onTextChange}
        />
      ) : null}
    </Suspense>
  );
}
