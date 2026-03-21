import type { BlockTintPreset } from '../lib/types';

interface BlockTintPreviewProps {
  preset: BlockTintPreset;
  className?: string;
}

export function BlockTintPreview({ preset, className }: BlockTintPreviewProps) {
  return (
    <span className={`document-menu-option-preview${className ? ` ${className}` : ''}`} data-preset={preset} aria-hidden="true">
      <span className="document-menu-option-preview-row" />
      <span className="document-menu-option-preview-row is-alt" />
    </span>
  );
}
