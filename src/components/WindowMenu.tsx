import { SlidersHorizontal } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  MAX_WINDOW_OPACITY_PERCENT,
  MIN_WINDOW_OPACITY_PERCENT,
} from '../lib/globalShortcut';
import { useWindowOpacityControl } from '../hooks/useWindowOpacityControl';
import { useDismissibleLayer } from '../hooks/useDismissibleLayer';

export function WindowMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { draftOpacity, previewOpacity, commitOpacity } = useWindowOpacityControl();

  useDismissibleLayer({
    enabled: isOpen,
    layerRef: rootRef,
    onDismiss: () => setIsOpen(false),
  });

  return (
    <div className="window-menu" ref={rootRef}>
      <button
        className="icon-button"
        type="button"
        aria-label="창 투명도 메뉴"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      >
        <SlidersHorizontal size={16} />
      </button>

      {isOpen ? (
        <div className="window-menu-popover" role="dialog" aria-label="창 투명도">
          <div className="window-menu-slider">
            <div className="window-menu-slider-header">
              <div className="window-menu-slider-title-group">
                <span className="document-menu-label">투명도</span>
                <span className="document-menu-status">{draftOpacity}%</span>
              </div>
              <button
                className="ghost-button window-menu-inline-action"
                type="button"
                disabled={draftOpacity === MAX_WINDOW_OPACITY_PERCENT}
                onClick={() => {
                  void commitOpacity(MAX_WINDOW_OPACITY_PERCENT);
                }}
              >
                100%로 복원
              </button>
            </div>
            <input
              className="opacity-slider"
              type="range"
              min={MIN_WINDOW_OPACITY_PERCENT}
              max={MAX_WINDOW_OPACITY_PERCENT}
              step={1}
              value={draftOpacity}
              onInput={(event) => {
                void previewOpacity(Number(event.currentTarget.value));
              }}
              onPointerUp={(event) => {
                void commitOpacity(Number(event.currentTarget.value));
              }}
              onKeyUp={(event) => {
                void commitOpacity(Number(event.currentTarget.value));
              }}
              onBlur={(event) => {
                void commitOpacity(Number(event.currentTarget.value));
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
