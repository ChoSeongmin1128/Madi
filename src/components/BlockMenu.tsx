import { Check, Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { BlockVm } from '../application/models/document';
import { BLOCK_KIND_OPTIONS } from '../lib/blockOptions';
import type { BlockKind } from '../lib/types';

interface BlockMenuProps {
  block: BlockVm;
  isEmpty: boolean;
  onClose: () => void;
  onDelete: () => void;
  onSelectKind: (kind: BlockKind) => void;
}

export function BlockMenu({
  block,
  isEmpty,
  onClose,
  onDelete,
  onSelectKind,
}: BlockMenuProps) {
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

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div ref={rootRef} className="block-menu" role="menu" tabIndex={-1}>
      {isEmpty ? (
        <div className="block-menu-section">
          <span className="block-menu-label">형식</span>
          <div className="block-menu-options">
            {BLOCK_KIND_OPTIONS.map((option) => {
              const Icon = option.icon;

              return (
                <button
                  key={option.kind}
                  type="button"
                  className={`block-menu-option${block.kind === option.kind ? ' is-active' : ''}`}
                  onClick={() => onSelectKind(option.kind)}
                >
                  <span className="row">
                    <Icon size={14} />
                    <span>{option.label}</span>
                  </span>
                  {block.kind === option.kind ? <Check size={14} /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="block-menu-divider" />

      <button className="block-menu-danger" type="button" onClick={onDelete}>
        <Trash2 size={14} />
        블록 삭제
      </button>
    </div>
  );
}
