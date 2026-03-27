import { Copy, GripVertical, Trash2 } from 'lucide-react';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface BlockCardActionsProps {
  blockId: string;
  shouldActOnSelectedSet: boolean;
  isMenuOpen: boolean;
  onGripPointerDown: (blockId: string, event: ReactPointerEvent<HTMLButtonElement>) => void;
  onCopySelectedBlocks: () => Promise<void>;
  onCopySingleBlock: (blockId: string) => Promise<void>;
  onDeleteBlock: () => void;
}

export function BlockCardActions({
  blockId,
  shouldActOnSelectedSet,
  isMenuOpen,
  onGripPointerDown,
  onCopySelectedBlocks,
  onCopySingleBlock,
  onDeleteBlock,
}: BlockCardActionsProps) {
  return (
    <>
      <div className="block-header">
        <div className="block-meta-row">
          <button
            className="drag-handle"
            type="button"
            aria-label="블록 이동"
            aria-expanded={isMenuOpen}
            onPointerDown={(event) => onGripPointerDown(blockId, event)}
          >
            <GripVertical size={14} />
          </button>
        </div>
      </div>

      <div className="block-actions">
        <button
          type="button"
          aria-label="블록 복사"
          onClick={(event) => {
            event.stopPropagation();
            if (shouldActOnSelectedSet) {
              void onCopySelectedBlocks();
              return;
            }
            void onCopySingleBlock(blockId);
          }}
        >
          <Copy size={14} />
        </button>
        <button
          type="button"
          className="is-danger"
          aria-label="블록 삭제"
          onClick={(event) => {
            event.stopPropagation();
            onDeleteBlock();
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </>
  );
}
