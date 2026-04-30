import { useEffect, type RefObject } from 'react';

interface UseDismissibleLayerOptions {
  enabled: boolean;
  layerRef: RefObject<HTMLElement | null>;
  onDismiss: () => void;
}

export function useDismissibleLayer({
  enabled,
  layerRef,
  onDismiss,
}: UseDismissibleLayerOptions) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!layerRef.current?.contains(event.target as Node)) {
        onDismiss();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, layerRef, onDismiss]);
}
