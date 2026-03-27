import { useCallback, useState, type MouseEvent as ReactMouseEvent, type RefObject } from 'react';
import { useDocumentSessionStore } from '../../stores/documentSessionStore';

interface MarqueeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest('input, textarea, [contenteditable="true"], [contenteditable=""], .ProseMirror'),
  );
}

interface UseDocumentMarqueeSelectionParams {
  surfaceRef: RefObject<HTMLDivElement | null>;
  selectedBlockIdsLength: number;
  setSelectedBlockId: (blockId: string | null) => void;
}

export function useDocumentMarqueeSelection({
  surfaceRef,
  selectedBlockIdsLength,
  setSelectedBlockId,
}: UseDocumentMarqueeSelectionParams) {
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);

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

  const getBlockIdAtPoint = useCallback((x: number, y: number): string | null => {
    const surface = surfaceRef.current;
    if (!surface) return null;
    for (const card of surface.querySelectorAll<HTMLElement>('[data-block-card-id]')) {
      const rect = card.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom && x >= rect.left && x <= rect.right) {
        return card.getAttribute('data-block-card-id');
      }
    }
    return null;
  }, [surfaceRef]);

  const handleSurfaceMouseDown = useCallback((event: ReactMouseEvent) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest('.drag-handle, .block-actions, .code-language-anchor, .type-menu, .block-menu')) return;

    const startedInEditor = isEditableElement(event.target);
    const originBlockId = getBlockIdAtPoint(event.clientX, event.clientY);
    if (!originBlockId && selectedBlockIdsLength > 0) {
      setSelectedBlockId(null);
    }

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
    let lastScrollTop = canvas?.scrollTop ?? 0;

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

    const onCanvasScroll = () => {
      if (!canvas) return;
      const currentScrollTop = canvas.scrollTop;
      const delta = currentScrollTop - lastScrollTop;
      lastScrollTop = currentScrollTop;
      if (delta === 0) return;
      mq.startY -= delta;
      if (activated) {
        setMarquee({ ...mq });
        updateMarqueeSelection(mq);
      }
    };

    const onMouseMove = (nativeEvent: MouseEvent) => {
      if (nativeEvent.buttons === 0) {
        onMouseUp();
        return;
      }

      const dx = nativeEvent.clientX - mq.startX;
      const dy = nativeEvent.clientY - mq.startY;

      if (!activated) {
        if (Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;

        if (startedInEditor) {
          const currentBlockId = getBlockIdAtPoint(nativeEvent.clientX, nativeEvent.clientY);
          if (currentBlockId === originBlockId) return;
          const activeEl = document.activeElement;
          if (activeEl instanceof HTMLElement) activeEl.blur();
          window.getSelection()?.removeAllRanges();
        }

        activated = true;
      }

      mq.currentX = nativeEvent.clientX;
      mq.currentY = nativeEvent.clientY;
      setMarquee({ ...mq });
      updateMarqueeSelection(mq);

      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => autoScroll(nativeEvent.clientY));
    };

    const onMouseUp = () => {
      canvas?.removeEventListener('scroll', onCanvasScroll);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      cancelAnimationFrame(scrollFrame);
      setMarquee(null);
      if (!activated) {
        useDocumentSessionStore.getState().setSelectedBlockIds([]);
      }
    };

    canvas?.addEventListener('scroll', onCanvasScroll);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [getBlockIdAtPoint, selectedBlockIdsLength, setSelectedBlockId, surfaceRef, updateMarqueeSelection]);

  const marqueeStyle = marquee ? {
    left: Math.min(marquee.startX, marquee.currentX),
    top: Math.min(marquee.startY, marquee.currentY),
    width: Math.abs(marquee.currentX - marquee.startX),
    height: Math.abs(marquee.currentY - marquee.startY),
  } : null;

  return {
    marqueeStyle,
    handleSurfaceMouseDown,
  };
}
