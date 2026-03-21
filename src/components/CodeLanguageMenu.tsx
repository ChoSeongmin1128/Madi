import { Braces, Check, ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CODE_LANGUAGE_OPTIONS, normalizeCodeLanguage, type CodeLanguageId } from '../lib/blockOptions';

interface CodeLanguageMenuProps {
  value: string | null;
  onSelect: (language: CodeLanguageId) => void;
  onClose: () => void;
}

export function CodeLanguageMenu({ value, onSelect, onClose }: CodeLanguageMenuProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const currentLanguage = normalizeCodeLanguage(value);
  const initialIndex = Math.max(
    0,
    CODE_LANGUAGE_OPTIONS.findIndex((option) => option.id === currentLanguage),
  );
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [onClose]);

  const selectedOption = useMemo(
    () => CODE_LANGUAGE_OPTIONS[selectedIndex] ?? CODE_LANGUAGE_OPTIONS[0],
    [selectedIndex],
  );

  return (
    <div
      ref={rootRef}
      className="code-language-menu"
      role="menu"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
          return;
        }

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedIndex((index) => (index + 1) % CODE_LANGUAGE_OPTIONS.length);
          return;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedIndex((index) => (index - 1 + CODE_LANGUAGE_OPTIONS.length) % CODE_LANGUAGE_OPTIONS.length);
          return;
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          onSelect(selectedOption.id);
        }
      }}
    >
      {CODE_LANGUAGE_OPTIONS.map((option, index) => (
        <button
          key={option.id}
          type="button"
          className={selectedIndex === index ? 'is-active' : ''}
          onMouseEnter={() => setSelectedIndex(index)}
          onClick={() => onSelect(option.id)}
        >
          <span className="row">
            <Braces size={14} />
            <span>{option.label}</span>
          </span>
          {currentLanguage === option.id ? <Check size={14} /> : null}
        </button>
      ))}
    </div>
  );
}

interface CodeLanguageTriggerProps {
  value: string | null;
  isVisible: boolean;
  onSelect: (language: CodeLanguageId) => void;
}

export function CodeLanguageTrigger({ value, isVisible, onSelect }: CodeLanguageTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentLanguage = normalizeCodeLanguage(value);
  const label = CODE_LANGUAGE_OPTIONS.find((option) => option.id === currentLanguage)?.label ?? 'Plain Text';

  return (
    <div className={`code-language-anchor${isVisible ? ' is-visible' : ''}${isOpen ? ' is-open' : ''}`}>
      <button
        className="code-language-trigger"
        type="button"
        aria-label="코드 언어 선택"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((open) => !open);
        }}
      >
        <span>{label}</span>
        <ChevronDown size={14} />
      </button>
      {isOpen ? (
        <CodeLanguageMenu
          value={currentLanguage}
          onClose={() => setIsOpen(false)}
          onSelect={(language) => {
            setIsOpen(false);
            onSelect(language);
          }}
        />
      ) : null}
    </div>
  );
}
