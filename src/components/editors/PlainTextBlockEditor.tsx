import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { scheduleBlockDeletion } from '../../lib/backspaceHoldState';
import {
  highlightCodeToHtml,
  loadCodeLanguageRegistration,
  normalizeCodeLanguage,
  type CodeLanguageId,
} from '../../lib/blockOptions';
import type { BlockEditorHandle } from '../../lib/editorHandle';
import type { BlockCaretPlacement } from '../../lib/types';
import { getLineEnd, getLineStart, syncTextareaHeight } from './plainTextEditorUtils';
import { usePlainTextEditorHandle } from './usePlainTextEditorHandle';

interface PlainTextBlockEditorProps {
  mode: 'code' | 'text';
  value: string;
  language?: CodeLanguageId | null;
  focusPlacement: BlockCaretPlacement | null;
  focusNonce: number;
  onChange: (value: string, language: CodeLanguageId | null) => void;
  onFocus: () => void;
  onCreateBelow: () => void;
  onNavigatePrevious: (caret: BlockCaretPlacement) => void;
  onNavigateNext: (caret: BlockCaretPlacement) => void;
  onDeleteIfEmpty: () => void;
}

export const PlainTextBlockEditor = forwardRef<BlockEditorHandle, PlainTextBlockEditorProps>(function PlainTextBlockEditor({
  mode,
  value,
  language,
  focusPlacement,
  focusNonce,
  onChange,
  onFocus,
  onCreateBelow,
  onNavigatePrevious,
  onNavigateNext,
  onDeleteIfEmpty,
}, ref) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const overlayRef = useRef<HTMLPreElement | null>(null);
  const currentValueRef = useRef(value);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const [loadedLanguage, setLoadedLanguage] = useState<{ id: CodeLanguageId; key: string | null } | null>(null);

  const resolvedLanguage = mode === 'code' ? normalizeCodeLanguage(language ?? 'plaintext') : 'plaintext';
  const activeLanguageKey = mode === 'code' && loadedLanguage?.id === resolvedLanguage ? loadedLanguage.key : null;

  useEffect(() => {
    let cancelled = false;

    if (mode !== 'code') {
      return;
    }

    void loadCodeLanguageRegistration(resolvedLanguage).then((registration) => {
      if (!cancelled) {
        setLoadedLanguage(registration);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [mode, resolvedLanguage]);

  // 외부에서 value가 변경된 경우만 textarea DOM을 직접 업데이트
  useEffect(() => {
    if (value !== currentValueRef.current) {
      undoStackRef.current = [];
      redoStackRef.current = [];
      currentValueRef.current = value;
      if (textareaRef.current) {
        textareaRef.current.value = value;
        syncTextareaHeight(textareaRef.current);
      }
    }
  }, [value]);

  useLayoutEffect(() => {
    syncTextareaHeight(textareaRef.current);
  }, [mode, value]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !focusPlacement) {
      return;
    }

    const position = focusPlacement === 'start' ? 0 : textarea.value.length;
    textarea.focus();
    textarea.setSelectionRange(position, position);
  }, [focusPlacement, focusNonce]);

  const highlightedHtml = useMemo(() => {
    if (mode !== 'code') {
      return '';
    }

    return highlightCodeToHtml(activeLanguageKey, value);
  }, [activeLanguageKey, mode, value]);

  const syncOverlayScroll = () => {
    const textarea = textareaRef.current;
    const overlay = overlayRef.current;
    if (!textarea || !overlay) {
      return;
    }

    overlay.scrollTop = textarea.scrollTop;
    overlay.scrollLeft = textarea.scrollLeft;
  };

  const emitChange = useCallback((nextValue: string, skipHistory = false) => {
    if (!skipHistory && nextValue !== currentValueRef.current) {
      undoStackRef.current.push(currentValueRef.current);
      if (undoStackRef.current.length > 50) undoStackRef.current.shift();
      redoStackRef.current = [];
    }
    currentValueRef.current = nextValue;
    onChange(nextValue, mode === 'code' ? resolvedLanguage : null);
  }, [mode, onChange, resolvedLanguage]);

  const getVal = useCallback(() => textareaRef.current?.value ?? currentValueRef.current, []);

  usePlainTextEditorHandle({
    ref,
    textareaRef,
    emitChange,
    getValue: getVal,
    undoStackRef,
    redoStackRef,
  });

  return (
    <div className={`block-editor block-editor-shell ${mode === 'code' ? 'is-code' : 'is-text'}`}>
      <div className={`plain-editor${mode === 'code' ? ' is-code' : ' is-text'}`}>
        {mode === 'code' ? (
          <pre ref={overlayRef} className="plain-editor-highlight" aria-hidden="true">
            <code
              className="hljs"
              dangerouslySetInnerHTML={{ __html: `${highlightedHtml || ''}\n` }}
            />
          </pre>
        ) : null}
        <textarea
          ref={textareaRef}
          className={`plain-editor-input${mode === 'code' ? ' is-code' : ' is-text'}`}
          defaultValue={value}
          spellCheck={mode !== 'code'}
          autoCapitalize="off"
          autoCorrect="off"
          wrap={mode === 'code' ? 'off' : 'soft'}
          onFocus={onFocus}
          onBlur={(event) => {
            if (mode === 'code') {
              event.currentTarget.setSelectionRange(0, 0);
            }
          }}
          onScroll={syncOverlayScroll}
          onInput={(event) => {
            const textarea = event.currentTarget;
            emitChange(textarea.value);
            syncTextareaHeight(textarea);
          }}
          onKeyDown={(event) => {
            const textarea = event.currentTarget;
            const { selectionStart, selectionEnd } = textarea;
            const isCollapsed = selectionStart === selectionEnd;
            const val = textarea.value;

            if ((event.metaKey || event.ctrlKey) && event.key === 'ArrowUp') {
              event.preventDefault();
              onNavigatePrevious('end');
              return;
            }

            if ((event.metaKey || event.ctrlKey) && event.key === 'ArrowDown') {
              event.preventDefault();
              onNavigateNext('start');
              return;
            }

            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              event.stopPropagation();
              onCreateBelow();
              return;
            }

            if (event.key === 'Tab') {
              event.preventDefault();
              const TAB = '    ';
              const lineStart = getLineStart(val, selectionStart);
              if (event.shiftKey) {
                const linePrefix = val.slice(lineStart, lineStart + TAB.length);
                const removeCount = Math.min(TAB.length, linePrefix.length - linePrefix.trimStart().length);
                if (removeCount > 0) {
                  const nextValue = `${val.slice(0, lineStart)}${val.slice(lineStart + removeCount)}`;
                  textarea.value = nextValue;
                  textarea.setSelectionRange(selectionStart - removeCount, selectionEnd - removeCount);
                  emitChange(nextValue);
                  syncTextareaHeight(textarea);
                }
              } else {
                const nextValue = `${val.slice(0, lineStart)}${TAB}${val.slice(lineStart)}`;
                textarea.value = nextValue;
                textarea.setSelectionRange(selectionStart + TAB.length, selectionEnd + TAB.length);
                emitChange(nextValue);
                syncTextareaHeight(textarea);
              }
              return;
            }

            if (event.key === 'Backspace' && val.length === 0 && isCollapsed) {
              event.preventDefault();
              if (!event.repeat) {
                onDeleteIfEmpty();
              } else {
                scheduleBlockDeletion(onDeleteIfEmpty);
              }
              return;
            }

            if (event.key === 'ArrowUp' && isCollapsed && selectionStart === getLineStart(val, selectionStart) && getLineStart(val, selectionStart) === 0) {
              event.preventDefault();
              onNavigatePrevious('end');
              return;
            }

            if (
              event.key === 'ArrowDown' &&
              isCollapsed &&
              selectionStart === getLineEnd(val, selectionStart) &&
              getLineEnd(val, selectionStart) === val.length
            ) {
              event.preventDefault();
              onNavigateNext('start');
            }
          }}
        />
      </div>
    </div>
  );
});
