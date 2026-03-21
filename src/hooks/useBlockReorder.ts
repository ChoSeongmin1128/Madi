import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { BlockVm } from '../adapters/documentAdapter';

interface DragState {
  activeId: string;
  targetSlotIndex: number | null;
  pointerX: number;
  pointerY: number;
}

interface DragPreview {
  blockId: string;
  width: number;
}

interface GripIntent {
  blockId: string;
  startX: number;
  startY: number;
}

const DRAG_THRESHOLD = 5;

interface UseBlockReorderParams {
  blocks: BlockVm[];
  onReorder: (blockId: string, targetPosition: number) => void;
  onDragStart?: () => void;
}

export function useBlockReorder({ blocks, onReorder, onDragStart }: UseBlockReorderParams) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const gripIntentRef = useRef<GripIntent | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const pointerSessionRef = useRef<AbortController | null>(null);
  const isDraggingRef = useRef(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);

  const resetDragSession = useCallback(() => {
    pointerSessionRef.current?.abort();
    pointerSessionRef.current = null;
    gripIntentRef.current = null;
    dragStateRef.current = null;
    isDraggingRef.current = false;
    document.body.classList.remove('is-block-dragging');
    setDragState(null);
    setDragPreview(null);
  }, []);

  const getTargetSlotFromPointer = useCallback((clientY: number) => {
    const slots = Array.from(surfaceRef.current?.querySelectorAll<HTMLElement>('[data-drop-slot-index]') ?? []);
    if (slots.length === 0) {
      return null;
    }

    let bestSlot: HTMLElement | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const slot of slots) {
      const rect = slot.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const distance = Math.abs(clientY - midpoint);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestSlot = slot;
      }
    }

    const value = bestSlot?.dataset.dropSlotIndex;
    if (value == null) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }, []);

  const handleWindowPointerMove = useCallback((event: PointerEvent) => {
    const intent = gripIntentRef.current;
    if (!intent) {
      return;
    }

    const distance = Math.hypot(event.clientX - intent.startX, event.clientY - intent.startY);
    if (!isDraggingRef.current) {
      if (distance < DRAG_THRESHOLD) {
        return;
      }

      isDraggingRef.current = true;
      onDragStart?.();
      document.body.classList.add('is-block-dragging');

      const activeNode = surfaceRef.current?.querySelector<HTMLElement>(`[data-block-card-id="${intent.blockId}"]`);
      if (activeNode) {
        setDragPreview({
          blockId: intent.blockId,
          width: Math.min(activeNode.getBoundingClientRect().width, 520),
        });
      }
    }

    event.preventDefault();
    const targetSlotIndex = getTargetSlotFromPointer(event.clientY);
    const nextState: DragState = {
      activeId: intent.blockId,
      targetSlotIndex,
      pointerX: event.clientX,
      pointerY: event.clientY,
    };

    dragStateRef.current = nextState;
    setDragState((current) => {
      if (
        current?.activeId === nextState.activeId &&
        current?.targetSlotIndex === nextState.targetSlotIndex &&
        current?.pointerX === nextState.pointerX &&
        current?.pointerY === nextState.pointerY
      ) {
        return current;
      }

      return nextState;
    });
  }, [getTargetSlotFromPointer, onDragStart]);

  const handleWindowPointerUp = useCallback((event: PointerEvent) => {
    const intent = gripIntentRef.current;
    const dragging = isDraggingRef.current;
    const latestDragState = dragStateRef.current;
    resetDragSession();

    if (!intent) {
      return;
    }

    if (!dragging) {
      return;
    }

    event.preventDefault();

    if (latestDragState?.targetSlotIndex == null) {
      return;
    }

    const sourceIndex = blocks.findIndex((block) => block.id === intent.blockId);
    if (sourceIndex < 0) {
      return;
    }

    let targetPosition = latestDragState.targetSlotIndex;
    if (targetPosition > sourceIndex) {
      targetPosition -= 1;
    }

    targetPosition = Math.max(0, Math.min(targetPosition, blocks.length - 1));
    if (targetPosition === sourceIndex) {
      return;
    }

    onReorder(intent.blockId, targetPosition);
  }, [blocks, onReorder, resetDragSession]);

  const handleWindowPointerCancel = useCallback(() => {
    resetDragSession();
  }, [resetDragSession]);

  useEffect(() => () => {
    resetDragSession();
  }, [resetDragSession]);

  const handleGripPointerDown = useCallback((blockId: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    gripIntentRef.current = {
      blockId,
      startX: event.clientX,
      startY: event.clientY,
    };
    dragStateRef.current = null;
    isDraggingRef.current = false;
    pointerSessionRef.current?.abort();
    pointerSessionRef.current = new AbortController();

    window.addEventListener('pointermove', handleWindowPointerMove, {
      signal: pointerSessionRef.current.signal,
    });
    window.addEventListener('pointerup', handleWindowPointerUp, {
      signal: pointerSessionRef.current.signal,
    });
    window.addEventListener('pointercancel', handleWindowPointerCancel, {
      signal: pointerSessionRef.current.signal,
    });
  }, [handleWindowPointerCancel, handleWindowPointerMove, handleWindowPointerUp]);

  return {
    surfaceRef,
    dragState,
    dragPreview,
    handleGripPointerDown,
    resetDragSession,
  };
}
