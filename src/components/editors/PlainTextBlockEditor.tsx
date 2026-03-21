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
  onChange,
  onFocus,
  onCreateBelow,
  onNavigatePrevious,
  onNavigateNext,
  onDeleteIfEmpty,
}, ref) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const overlayRef = useRef<HTMLPreElement | null>(null);
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

  useLayoutEffect(() => {
    syncTextareaHeight(textareaRef.current);
  }, [value, mode]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !focusPlacement) {
      return;
    }

    const position = focusPlacement === 'start' ? 0 : value.length;
    textarea.focus();
    textarea.setSelectionRange(position, position);
  }, [focusPlacement, value.length]);

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

        const text = value.slice(selectionStart, selectionEnd);
        await navigator.clipboard.writeText(text);
        const nextValue = `${value.slice(0, selectionStart)}${value.slice(selectionEnd)}`;
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

        await navigator.clipboard.writeText(value.slice(selectionStart, selectionEnd));
        return true;
      },
      async paste() {
        const textarea = textareaRef.current;
        if (!textarea) {
          return false;
        }

        const text = await navigator.clipboard.readText();
        const { selectionStart, selectionEnd } = textarea;
        const nextValue = `${value.slice(0, selectionStart)}${text}${value.slice(selectionEnd)}`;
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
        textarea.setSelectionRange(0, value.length);
        return true;
      },
    }),
    [mode, onChange, resolvedLanguage, value],
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
          value={value}
          spellCheck={mode !== 'code'}
          autoCapitalize="off"
          autoCorrect="off"
          wrap={mode === 'code' ? 'off' : 'soft'}
          onFocus={onFocus}
          onScroll={syncOverlayScroll}
          onChange={(event) => {
            onChange(event.target.value, mode === 'code' ? resolvedLanguage : null);
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

            if (event.key === 'Backspace' && value.length === 0 && isCollapsed) {
              event.preventDefault();
              onDeleteIfEmpty();
              return;
            }

            if (event.key === 'ArrowUp' && isCollapsed && selectionStart === getLineStart(value, selectionStart) && getLineStart(value, selectionStart) === 0) {
              event.preventDefault();
              onNavigatePrevious('end');
              return;
            }

            if (
              event.key === 'ArrowDown' &&
              isCollapsed &&
              selectionStart === getLineEnd(value, selectionStart) &&
              getLineEnd(value, selectionStart) === value.length
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
