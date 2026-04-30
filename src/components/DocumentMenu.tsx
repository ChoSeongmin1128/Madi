import { MoreHorizontal, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useDocumentController } from '../app/controllers';
import { BlockTintPreview } from './BlockTintPreview';
import { BLOCK_TINT_PRESETS } from '../lib/blockTint';
import { DOCUMENT_SURFACE_TONE_PRESETS } from '../lib/documentSurfaceTone';
import { getVisibleDocumentTitle } from '../lib/documentTitle';
import { DocumentSurfacePreview } from './DocumentSurfacePreview';
import { SegmentedSelector } from './SegmentedSelector';
import { useDocumentSessionStore } from '../stores/documentSessionStore';
import { useUiStore } from '../stores/uiStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useDismissibleLayer } from '../hooks/useDismissibleLayer';

const DOCUMENT_TINT_MODE_OPTIONS = [
  { value: 'default', label: '기본값 사용' },
  { value: 'custom', label: '문서별 설정' },
] as const;

const DOCUMENT_TINT_OPTIONS = BLOCK_TINT_PRESETS.map((preset) => ({
  value: preset.id,
  label: preset.label,
}));

const DOCUMENT_SURFACE_TONE_OPTIONS = DOCUMENT_SURFACE_TONE_PRESETS.map((preset) => ({
  value: preset.id,
  label: preset.label,
}));

type DocumentStylePanel = 'block-tint' | 'surface-tone' | null;

export function DocumentMenu() {
  const {
    deleteDocument,
    setDocumentBlockTintOverride,
    setDocumentSurfaceToneOverride,
  } = useDocumentController();
  const showTrashNotice = useUiStore((state) => state.showTrashNotice);
  const currentDocument = useDocumentSessionStore((state) => state.currentDocument);
  const defaultBlockTintPreset = useWorkspaceStore((state) => state.defaultBlockTintPreset);
  const defaultDocumentSurfaceTonePreset = useWorkspaceStore((state) => state.defaultDocumentSurfaceTonePreset);
  const [isOpen, setIsOpen] = useState(false);
  const [activeStylePanel, setActiveStylePanel] = useState<DocumentStylePanel>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useDismissibleLayer({
    enabled: isOpen,
    layerRef: rootRef,
    onDismiss: () => {
      setIsOpen(false);
      setActiveStylePanel(null);
    },
  });

  if (!currentDocument) {
    return null;
  }

  const isFollowingDefault = currentDocument.blockTintOverride == null;
  const selectedPreset = currentDocument.blockTintOverride ?? defaultBlockTintPreset;
  const isFollowingDefaultSurfaceTone = currentDocument.documentSurfaceToneOverride == null;
  const selectedSurfaceTone = currentDocument.documentSurfaceToneOverride ?? defaultDocumentSurfaceTonePreset;
  const documentTitle = getVisibleDocumentTitle(currentDocument.title);
  const selectedPresetLabel = DOCUMENT_TINT_OPTIONS.find((option) => option.value === selectedPreset)?.label ?? selectedPreset;
  const selectedSurfaceToneLabel =
    DOCUMENT_SURFACE_TONE_OPTIONS.find((option) => option.value === selectedSurfaceTone)?.label ?? selectedSurfaceTone;

  return (
    <div className="document-menu" ref={rootRef}>
      <button
        className="icon-button"
        type="button"
        aria-label="문서 메뉴"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((value) => {
            if (value) {
              setActiveStylePanel(null);
            }
            return !value;
          });
        }}
      >
        <MoreHorizontal size={16} />
      </button>

      {isOpen ? (
        <div className="document-menu-popover" role="dialog" aria-label="문서 설정">
          <button
            className={`document-menu-option${activeStylePanel === 'block-tint' ? ' is-active' : ''}`}
            type="button"
            aria-expanded={activeStylePanel === 'block-tint'}
            onClick={() => {
              setActiveStylePanel((value) => (value === 'block-tint' ? null : 'block-tint'));
            }}
          >
            <BlockTintPreview
              className="tint-selector-preview"
              preset={selectedPreset}
              variant="swatches"
            />
            <span className="document-menu-option-copy">
              <span className="document-menu-option-title">문서 색상쌍</span>
              <span className="document-menu-status">
                {isFollowingDefault ? `기본값 · ${selectedPresetLabel}` : selectedPresetLabel}
              </span>
            </span>
          </button>

          {activeStylePanel === 'block-tint' ? (
            <div className="document-menu-section">
              <SegmentedSelector
                ariaLabel="문서 색상쌍 모드 선택"
                tone="popover"
                value={isFollowingDefault ? 'default' : 'custom'}
                options={DOCUMENT_TINT_MODE_OPTIONS}
                onChange={(nextValue) => {
                  if (nextValue === 'default') {
                    return setDocumentBlockTintOverride(null);
                  }

                  return setDocumentBlockTintOverride(defaultBlockTintPreset);
                }}
              />
              <SegmentedSelector
                ariaLabel="문서 색상쌍 선택"
                tone="popover"
                value={selectedPreset}
                layout="palette"
                columns={2}
                disabled={isFollowingDefault}
                options={DOCUMENT_TINT_OPTIONS}
                onChange={(nextValue) => setDocumentBlockTintOverride(nextValue)}
                renderOption={(option) => (
                  <span className="tint-selector-card">
                    <BlockTintPreview
                      className="tint-selector-preview"
                      preset={option.value}
                      variant="swatches"
                    />
                    <span className="tint-selector-label">{option.label}</span>
                  </span>
                )}
              />
            </div>
          ) : null}

          <button
            className={`document-menu-option${activeStylePanel === 'surface-tone' ? ' is-active' : ''}`}
            type="button"
            aria-expanded={activeStylePanel === 'surface-tone'}
            onClick={() => {
              setActiveStylePanel((value) => (value === 'surface-tone' ? null : 'surface-tone'));
            }}
          >
            <DocumentSurfacePreview
              className="surface-selector-preview"
              preset={selectedSurfaceTone}
              variant="surface"
            />
            <span className="document-menu-option-copy">
              <span className="document-menu-option-title">문서 배경 톤</span>
              <span className="document-menu-status">
                {isFollowingDefaultSurfaceTone ? `기본값 · ${selectedSurfaceToneLabel}` : selectedSurfaceToneLabel}
              </span>
            </span>
          </button>

          {activeStylePanel === 'surface-tone' ? (
            <div className="document-menu-section">
              <SegmentedSelector
                ariaLabel="문서 배경 톤 모드 선택"
                tone="popover"
                value={isFollowingDefaultSurfaceTone ? 'default' : 'custom'}
                options={DOCUMENT_TINT_MODE_OPTIONS}
                onChange={(nextValue) => {
                  if (nextValue === 'default') {
                    return setDocumentSurfaceToneOverride(null);
                  }

                  return setDocumentSurfaceToneOverride(
                    defaultDocumentSurfaceTonePreset === 'default'
                      ? 'paper'
                      : defaultDocumentSurfaceTonePreset,
                  );
                }}
              />
              <SegmentedSelector
                ariaLabel="문서 배경 톤 선택"
                tone="popover"
                value={selectedSurfaceTone}
                layout="palette"
                columns={2}
                disabled={isFollowingDefaultSurfaceTone}
                options={DOCUMENT_SURFACE_TONE_OPTIONS}
                onChange={(nextValue) => setDocumentSurfaceToneOverride(nextValue)}
                renderOption={(option) => (
                  <span className="tint-selector-card">
                    <DocumentSurfacePreview
                      className="surface-selector-preview"
                      preset={option.value}
                      variant="surface"
                    />
                    <span className="tint-selector-label">{option.label}</span>
                  </span>
                )}
              />
            </div>
          ) : null}

          <div className="document-menu-divider" role="separator" />

          <button
            className="document-menu-danger"
            type="button"
            onClick={() => {
              const documentId = currentDocument.id;
              setIsOpen(false);
              setActiveStylePanel(null);
              void deleteDocument(documentId).then((deleted) => {
                if (deleted) {
                  showTrashNotice(documentId, documentTitle);
                }
              });
            }}
          >
            <Trash2 size={14} />
            문서 삭제
          </button>
        </div>
      ) : null}
    </div>
  );
}
