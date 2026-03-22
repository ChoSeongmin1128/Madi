import { useEffect, useMemo, useRef, useState } from 'react';
import { BLOCK_KIND_OPTIONS } from '../lib/blockOptions';
import type { BlockKind } from '../lib/types';

interface TypeMenuProps {
  onSelect: (kind: BlockKind) => void;
  onClose: () => void;
}

export function TypeMenu({ onSelect, onClose }: TypeMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

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
    () => BLOCK_KIND_OPTIONS[selectedIndex] ?? BLOCK_KIND_OPTIONS[0],
    [selectedIndex],
  );

  return (
    <div
      ref={rootRef}
      className="type-menu"
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
          setSelectedIndex((index) => (index + 1) % BLOCK_KIND_OPTIONS.length);
          return;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedIndex((index) => (index - 1 + BLOCK_KIND_OPTIONS.length) % BLOCK_KIND_OPTIONS.length);
          return;
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          onSelect(selectedOption.kind);
        }
      }}
    >
      {BLOCK_KIND_OPTIONS.map((option, index) => {
        const Icon = option.icon;

        return (
          <button
            key={option.kind}
            type="button"
            className={selectedIndex === index ? 'is-active' : ''}
            onMouseEnter={() => setSelectedIndex(index)}
            onClick={() => onSelect(option.kind)}
          >
            <span className="row">
              <Icon size={16} />
              <span>{option.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
