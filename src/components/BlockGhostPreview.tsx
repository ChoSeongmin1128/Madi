import type { BlockVm } from '../adapters/documentAdapter';
import { getCodeLanguageLabel } from '../lib/blockOptions';
import { getBlockPreviewText } from '../lib/markdown';
import type { BlockTintPreset } from '../lib/types';

interface BlockGhostPreviewProps {
  block: BlockVm;
  preset: BlockTintPreset;
}

export function BlockGhostPreview({ block, preset }: BlockGhostPreviewProps) {
  const previewText = getBlockPreviewText(block.kind, block.content).trim() || '빈 블록';

  return (
    <section
      className={`block-card drag-preview-card block-card-${block.kind}`}
      data-block-preset={preset}
    >
      {block.kind === 'code' ? (
        <div className="drag-preview-code-meta">
          <span className="drag-preview-language-chip">{getCodeLanguageLabel(block.language)}</span>
        </div>
      ) : null}
      <div className={`drag-preview-body ${block.kind === 'code' ? 'is-code' : ''}`}>
        {previewText}
      </div>
    </section>
  );
}
