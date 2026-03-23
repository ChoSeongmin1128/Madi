import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { BlockCard } from './BlockCard';
import { BlockGhostPreview } from './BlockGhostPreview';
import { DocumentMenu } from './DocumentMenu';
import { getEditableDocumentTitle } from '../lib/documentTitle';
import { commitDocumentTitle, moveBlock } from '../controllers/appController';
import { useDocumentSessionStore } from '../stores/documentSessionStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useBlockReorder } from '../hooks/useBlockReorder';

function DocumentTitleInput({ title }: { title: string | null }) {
  const [draft, setDraft] = useState(getEditableDocumentTitle(title));

  return (
    <input
      className="document-title-input"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => void commitDocumentTitle(draft)}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          void commitDocumentTitle(draft);
          event.currentTarget.blur();
        }
      }}
      placeholder="Untitled"
    />
  );
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest('input, textarea, [contenteditable="true"], [contenteditable=""], .ProseMirror'),
  );
}

interface MarqueeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export function DocumentCanvas() {
  const currentDocument = useDocumentSessionStore((state) => state.currentDocument);
  const selectedBlockId = useDocumentSessionStore((state) => state.selectedBlockId);
  const selectedBlockIds = useDocumentSessionStore((state) => state.selectedBlockIds);
  const blockSelected = useDocumentSessionStore((state) => state.blockSelected);
  const allBlocksSelected = useDocumentSessionStore((state) => state.allBlocksSelected);
  const defaultBlockTintPreset = useWorkspaceStore((state) => state.defaultBlockTintPreset);
  const blocksSelectionRef = useRef<HTMLDivElement | null>(null);
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);

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

  // Marquee 선택: 블록과 교차하는 영역 계산
  const updateMarqueeSelection = useCallback((mq: MarqueeState) => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const left = Math.min(mq.startX, mq.currentX);
    const top = Math.min(mq.startY, mq.currentY);
    const right = Math.max(mq.startX, mq.currentX);
    const bottom = Math.max(mq.startY, mq.currentY);

    const ids: string[] = [];
    for (const card of surface.querySelectorAll<HTMLElement>('[data-block-card-id]')) {
      const rect = card.getBoundingClientRect();
      const intersects = rect.bottom > top && rect.top < bottom && rect.right > left && rect.left < right;
      if (intersects) {
        const id = card.getAttribute('data-block-card-id');
        if (id) ids.push(id);
      }
    }

    useDocumentSessionStore.getState().setSelectedBlockIds(ids);
  }, [surfaceRef]);

  const handleSurfaceMouseDown = useCallback((event: ReactMouseEvent) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest('.drag-handle, .block-actions, .code-language-anchor, .type-menu, .block-menu')) return;

    const startedInEditor = isEditableElement(event.target);
    const originBlockId = getBlockIdFromEvent(event.target);

    const mq: MarqueeState = {
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
    };

    const DRAG_THRESHOLD = 8;
    let activated = false;
    let scrollFrame = 0;

    const canvas = surfaceRef.current?.closest('.document-canvas') as HTMLElement | null;

    const autoScroll = (mouseY: number) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const EDGE = 40;
      if (mouseY < rect.top + EDGE) {
        canvas.scrollTop -= Math.max(1, (EDGE - (mouseY - rect.top)) / 5);
      } else if (mouseY > rect.bottom - EDGE) {
        canvas.scrollTop += Math.max(1, (EDGE - (rect.bottom - mouseY)) / 5);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - mq.startX;
      const dy = e.clientY - mq.startY;

      if (!activated) {
        if (Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;

        // 에디터 내부에서 시작했으면 블록 경계를 넘었는지 확인
        if (startedInEditor) {
          const currentBlockId = getBlockIdFromEvent(e.target);
          if (!currentBlockId || currentBlockId === originBlockId) return;
          // 블록 경계를 넘음 → marquee 활성화
          const activeEl = document.activeElement;
          if (activeEl instanceof HTMLElement) activeEl.blur();
          window.getSelection()?.removeAllRanges();
        }

        activated = true;
      }

      mq.currentX = e.clientX;
      mq.currentY = e.clientY;
      setMarquee({ ...mq });
      updateMarqueeSelection(mq);

      // 자동 스크롤
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => autoScroll(e.clientY));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      cancelAnimationFrame(scrollFrame);
      setMarquee(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [updateMarqueeSelection, surfaceRef]);

  if (!currentDocument) {
    return (
      <section className="empty-state">
        <span>빈 문서입니다.</span>
        <p>문서를 만들거나 사이드바에서 기존 문서를 선택해 주세요.</p>
      </section>
    );
  }

  const marqueeStyle = marquee ? {
    left: Math.min(marquee.startX, marquee.currentX),
    top: Math.min(marquee.startY, marquee.currentY),
    width: Math.abs(marquee.currentX - marquee.startX),
    height: Math.abs(marquee.currentY - marquee.startY),
  } : null;

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
          <DocumentMenu />
        </div>

        <div ref={blocksSelectionRef}>
          <div
            className={`block-drop-slot${dragState?.targetSlotIndex === 0 ? ' is-active' : ''}`}
            data-drop-slot-index={0}
          />
          {blocks.map((block, index) => (
            <Fragment key={block.id}>
              <BlockCard
                block={block}
                isSelected={selectedBlockId === block.id}
                isBlockSelected={(blockSelected && selectedBlockId === block.id) || selectedBlockIds.includes(block.id)}
                isAllSelected={allBlocksSelected}
                isAlternate={index % 2 === 1}
                isDragging={dragState?.activeId === block.id}
                isMenuOpen={openBlockMenuId === block.id}
                onGripPointerDown={handleGripPointerDown}
                onMenuClose={() =>
                  setOpenBlockMenuId((current) => (current === block.id ? null : current))
                }
              />
              <div
                className={`block-drop-slot${dragState?.targetSlotIndex === index + 1 ? ' is-active' : ''}`}
                data-drop-slot-index={index + 1}
              />
            </Fragment>
          ))}
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
