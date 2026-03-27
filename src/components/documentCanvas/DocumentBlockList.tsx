import { AnimatePresence, motion } from 'framer-motion';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { BlockVm } from '../../application/models/document';
import { BlockCard } from '../BlockCard';

interface DocumentBlockListProps {
  blocks: BlockVm[];
  selectedBlockId: string | null;
  selectedBlockIds: string[];
  blockSelected: boolean;
  allBlocksSelected: boolean;
  activeDragId: string | null;
  activeTargetSlotIndex: number | null;
  openBlockMenuId: string | null;
  onGripPointerDown: (blockId: string, event: ReactPointerEvent<HTMLButtonElement>) => void;
  onToggleMenu: (blockId: string) => void;
}

export function DocumentBlockList({
  blocks,
  selectedBlockId,
  selectedBlockIds,
  blockSelected,
  allBlocksSelected,
  activeDragId,
  activeTargetSlotIndex,
  openBlockMenuId,
  onGripPointerDown,
  onToggleMenu,
}: DocumentBlockListProps) {
  return (
    <>
      <div
        className={`block-drop-slot${activeTargetSlotIndex === 0 ? ' is-active' : ''}`}
        data-drop-slot-index={0}
      />
      <AnimatePresence mode="popLayout">
        {blocks.map((block, index) => (
          <motion.div
            key={block.id}
            layout
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{
              layout: { duration: 0.2, ease: [0.2, 0.9, 0.3, 1] },
              opacity: { duration: 0.18 },
              scale: { duration: 0.18 },
            }}
          >
            <BlockCard
              block={block}
              isSelected={selectedBlockId === block.id}
              isBlockSelected={
                selectedBlockIds.includes(block.id)
                || (selectedBlockIds.length === 0 && blockSelected && selectedBlockId === block.id)
              }
              isAllSelected={allBlocksSelected}
              isAlternate={index % 2 === 1}
              isDragging={activeDragId === block.id}
              isMenuOpen={openBlockMenuId === block.id}
              onGripPointerDown={onGripPointerDown}
              onMenuClose={() => onToggleMenu(block.id)}
            />
            <div
              className={`block-drop-slot${activeTargetSlotIndex === index + 1 ? ' is-active' : ''}`}
              data-drop-slot-index={index + 1}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </>
  );
}
