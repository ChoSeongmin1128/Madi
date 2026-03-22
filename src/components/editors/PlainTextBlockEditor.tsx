import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  highlightCodeToHtml,
  loadCodeLanguageRegistration,
  normalizeCodeLanguage,
  type CodeLanguageId,
} from '../../lib/blockOptions';
import type { BlockEditorHandle } from '../../lib/editorHandle';
import type { BlockCaretPlacement } from '../../lib/types';

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

function getLineStart(value: string, position: number) {
  return value.lastIndexOf('\n', Math.max(position - 1, 0)) + 1;
}

function getLineEnd(value: string, position: number) {
  const nextBreak = value.indexOf('\n', position);
  return nextBreak === -1 ? value.length : nextBreak;
}

function syncTextareaHeight(textarea: HTMLTextAreaElement | null) {
  if (!textarea) {
    return;
  }

  textarea.style.height = '0px';
  textarea.style.height = `${Math.max(textarea.scrollHeight, 36)}px`;
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
  const isComposingRef = useRef(false);
  const lastEmittedValueRef = useRef(value);
  const [localValue, setLocalValue] = useState(value);
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

  // 외부에서 value가 변경된 경우만 동기화 (자체 입력은 제외)
  useEffect(() => {
    if (value !== lastEmittedValueRef.current) {
      setLocalValue(value);
      lastEmittedValueRef.current = value;
    }
  }, [value]);

  useLayoutEffect(() => {
    syncTextareaHeight(textareaRef.current);
  }, [localValue, mode]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !focusPlacement) {
      return;
    }

    const position = focusPlacement === 'start' ? 0 : localValue.length;
    textarea.focus();
    textarea.setSelectionRange(position, position);
  }, [focusPlacement, focusNonce, localValue.length]);

  const highlightedHtml = useMemo(() => {
    if (mode !== 'code') {
      return '';
    }

    return highlightCodeToHtml(activeLanguageKey, localValue);
  }, [activeLanguageKey, mode, localValue]);

  const syncOverlayScroll = () => {
    const textarea = textareaRef.current;
    const overlay = overlayRef.current;
    if (!textarea || !overlay) {
      return;
    }

    overlay.scrollTop = textarea.scrollTop;
    overlay.scrollLeft = textarea.scrollLeft;
  };

  useImperativeHandle(
    ref,
    () => ({
      async cut() {
        const textarea = textareaRef.current;
        if (!textarea) {
          return false;
        }

        const { selectionStart, selectionEnd } = textarea;
        if (selectionStart === selectionEnd) {
          return false;
        }

        const text = localValue.slice(selectionStart, selectionEnd);
        await navigator.clipboard.writeText(text);
        const nextValue = `${localValue.slice(0, selectionStart)}${localValue.slice(selectionEnd)}`;
        onChange(nextValue, mode === 'code' ? resolvedLanguage : null);
        requestAnimationFrame(() => {
          const nextTextarea = textareaRef.current;
          if (!nextTextarea) {
            return;
          }
          nextTextarea.focus();
          nextTextarea.setSelectionRange(selectionStart, selectionStart);
        });
        return true;
      },
      async copy() {
        const textarea = textareaRef.current;
        if (!textarea) {
          return false;
        }

        const { selectionStart, selectionEnd } = textarea;
        if (selectionStart === selectionEnd) {
          return false;
        }

        await navigator.clipboard.writeText(localValue.slice(selectionStart, selectionEnd));
        return true;
      },
      async paste() {
        const textarea = textareaRef.current;
        if (!textarea) {
          return false;
        }

        const text = await navigator.clipboard.readText();
        const { selectionStart, selectionEnd } = textarea;
        const nextValue = `${localValue.slice(0, selectionStart)}${text}${localValue.slice(selectionEnd)}`;
        const nextCaret = selectionStart + text.length;
        onChange(nextValue, mode === 'code' ? resolvedLanguage : null);
        requestAnimationFrame(() => {
          const nextTextarea = textareaRef.current;
          if (!nextTextarea) {
            return;
          }
          nextTextarea.focus();
          nextTextarea.setSelectionRange(nextCaret, nextCaret);
        });
        return true;
      },
      selectAll() {
        const textarea = textareaRef.current;
        if (!textarea) {
          return false;
        }

        textarea.focus();
        textarea.setSelectionRange(0, localValue.length);
        return true;
      },
    }),
    [mode, onChange, resolvedLanguage, localValue],
  );

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
          value={localValue}
          spellCheck={mode !== 'code'}
          autoCapitalize="off"
          autoCorrect="off"
          wrap={mode === 'code' ? 'off' : 'soft'}
          onFocus={onFocus}
          onScroll={syncOverlayScroll}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={(event) => {
            isComposingRef.current = false;
            const nextValue = event.currentTarget.value;
            setLocalValue(nextValue);
            lastEmittedValueRef.current = nextValue;
            onChange(nextValue, mode === 'code' ? resolvedLanguage : null);
          }}
          onChange={(event) => {
            if (isComposingRef.current) return;
            const nextValue = event.target.value;
            setLocalValue(nextValue);
            lastEmittedValueRef.current = nextValue;
            onChange(nextValue, mode === 'code' ? resolvedLanguage : null);
          }}
          onKeyDown={(event) => {
            const textarea = event.currentTarget;
            const { selectionStart, selectionEnd } = textarea;
            const isCollapsed = selectionStart === selectionEnd;

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

            if (event.key === 'Backspace' && localValue.length === 0 && isCollapsed) {
              event.preventDefault();
              onDeleteIfEmpty();
              return;
            }

            if (event.key === 'ArrowUp' && isCollapsed && selectionStart === getLineStart(localValue, selectionStart) && getLineStart(localValue, selectionStart) === 0) {
              event.preventDefault();
              onNavigatePrevious('end');
              return;
            }

            if (
              event.key === 'ArrowDown' &&
              isCollapsed &&
              selectionStart === getLineEnd(localValue, selectionStart) &&
              getLineEnd(localValue, selectionStart) === localValue.length
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
