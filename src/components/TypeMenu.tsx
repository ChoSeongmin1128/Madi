import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BLOCK_KIND_OPTIONS } from '../lib/blockOptions';
import type { BlockKind } from '../lib/types';
import { useDismissibleLayer } from '../hooks/useDismissibleLayer';

interface TypeMenuProps {
  anchorRect: DOMRect | null;
  onSelect: (kind: BlockKind) => void;
  onClose: () => void;
}

export function TypeMenu({ anchorRect, onSelect, onClose }: TypeMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    const menu = rootRef.current;
    if (!menu || !anchorRect) return;

    const menuHeight = menu.offsetHeight;
    const spaceBelow = window.innerHeight - anchorRect.bottom - 8;
    const top = spaceBelow >= menuHeight
      ? anchorRect.bottom + 4
      : Math.max(8, anchorRect.top - menuHeight - 4);
    const left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - menu.offsetWidth - 8));
    setPosition({ top, left });
  }, [anchorRect]);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  useDismissibleLayer({
    enabled: true,
    layerRef: rootRef,
    onDismiss: onClose,
  });

  const selectedOption = useMemo(
    () => BLOCK_KIND_OPTIONS[selectedIndex] ?? BLOCK_KIND_OPTIONS[0],
    [selectedIndex],
  );

  return createPortal(
    <div
      ref={rootRef}
      className="type-menu"
      role="menu"
      aria-label="블록 형식 선택"
      tabIndex={-1}
      style={{ top: position.top, left: position.left }}
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
            role="menuitemradio"
            aria-checked={selectedIndex === index}
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
    </div>,
    document.body,
  );
}
