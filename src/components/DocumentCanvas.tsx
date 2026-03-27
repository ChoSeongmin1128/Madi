import { useEffect, useMemo, useRef, useState } from 'react';
import { useBlockController } from '../app/controllers';
import { BlockGhostPreview } from './BlockGhostPreview';
import { useDocumentSessionStore } from '../stores/documentSessionStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useBlockReorder } from '../hooks/useBlockReorder';
import { DocumentBlockList } from './documentCanvas/DocumentBlockList';
import { DocumentTitleInput } from './documentCanvas/DocumentTitleInput';
import { useDocumentMarqueeSelection } from './documentCanvas/useDocumentMarqueeSelection';

export function DocumentCanvas() {
  const { moveBlock } = useBlockController();
  const currentDocument = useDocumentSessionStore((state) => state.currentDocument);
  const selectedBlockId = useDocumentSessionStore((state) => state.selectedBlockId);
  const selectedBlockIds = useDocumentSessionStore((state) => state.selectedBlockIds);
  const blockSelected = useDocumentSessionStore((state) => state.blockSelected);
  const allBlocksSelected = useDocumentSessionStore((state) => state.allBlocksSelected);
  const setSelectedBlockId = useDocumentSessionStore((state) => state.setSelectedBlockId);
  const defaultBlockTintPreset = useWorkspaceStore((state) => state.defaultBlockTintPreset);
  const blocksSelectionRef = useRef<HTMLDivElement | null>(null);

  const blocks = useMemo(() => currentDocument?.blocks ?? [], [currentDocument?.blocks]);
  const blockTintPreset = currentDocument?.blockTintOverride ?? defaultBlockTintPreset;
  const [openBlockMenuId, setOpenBlockMenuId] = useState<string | null>(null);
  const { surfaceRef, dragState, dragPreview, handleGripPointerDown } = useBlockReorder({
    blocks,
    onReorder: (blockId, targetPosition) => void moveBlock(blockId, targetPosition),
    onDragStart: () => setOpenBlockMenuId(null),
  });
  const activePreviewBlock =
    dragPreview == null ? null : blocks.find((block) => block.id === dragPreview.blockId) ?? null;
  const { marqueeStyle, handleSurfaceMouseDown } = useDocumentMarqueeSelection({
    surfaceRef,
    selectedBlockIdsLength: selectedBlockIds.length,
    setSelectedBlockId,
  });

  useEffect(() => {
    if (!allBlocksSelected && !blockSelected && selectedBlockIds.length === 0) {
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement.closest('.document-surface')) {
      activeElement.blur();
    }
    window.getSelection()?.removeAllRanges();
  }, [allBlocksSelected, blockSelected, selectedBlockIds.length, currentDocument?.id]);

  if (!currentDocument) {
    return (
      <section className="empty-state">
        <span>빈 문서입니다.</span>
        <p>문서를 만들거나 사이드바에서 기존 문서를 선택해 주세요.</p>
      </section>
    );
  }

  return (
    <section className="document-canvas">
      <div
        ref={surfaceRef}
        className="document-surface"
        data-block-preset={blockTintPreset}
        onMouseDown={handleSurfaceMouseDown}
      >
        <div className="document-head">
          <DocumentTitleInput key={`${currentDocument.id}:${currentDocument.title ?? ''}`} title={currentDocument.title} />
        </div>

        <div ref={blocksSelectionRef}>
          <DocumentBlockList
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            selectedBlockIds={selectedBlockIds}
            blockSelected={blockSelected}
            allBlocksSelected={allBlocksSelected}
            activeDragId={dragState?.activeId ?? null}
            activeTargetSlotIndex={dragState?.targetSlotIndex ?? null}
            openBlockMenuId={openBlockMenuId}
            onGripPointerDown={handleGripPointerDown}
            onToggleMenu={(blockId) => {
              setOpenBlockMenuId((current) => (current === blockId ? null : current));
            }}
          />
        </div>
      </div>

      {marqueeStyle ? (
        <div className="marquee-selection" style={marqueeStyle} />
      ) : null}

      {dragState && dragPreview && activePreviewBlock ? (
        <div
          className="drag-preview"
          style={{
            width: `${dragPreview.width}px`,
            transform: `translate(${dragState.pointerX + 14}px, ${dragState.pointerY + 14}px)`,
          }}
        >
          <BlockGhostPreview block={activePreviewBlock} preset={blockTintPreset} />
        </div>
      ) : null}
    </section>
  );
}
