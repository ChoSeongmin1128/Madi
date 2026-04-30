import type { LucideIcon } from 'lucide-react';
import { BlockTintPreview } from '../BlockTintPreview';
import { DocumentSurfacePreview } from '../DocumentSurfacePreview';
import { SegmentedSelector } from '../SegmentedSelector';
import type { BlockKind, BlockTintPreset, DocumentSurfaceTonePreset, ThemeMode } from '../../lib/types';

interface ThemeOption {
  id: ThemeMode;
  label: string;
  icon: LucideIcon;
}

interface BlockKindOption {
  id: BlockKind;
  label: string;
}

interface BlockTintOption {
  value: BlockTintPreset;
  label: string;
}

interface DocumentSurfaceToneOption {
  value: DocumentSurfaceTonePreset;
  label: string;
}

type SettingsThemeDefaultsGroup = 'theme' | 'block-kind' | 'block-tint' | 'surface-tone';

interface SettingsThemeDefaultsSectionProps {
  themeMode: ThemeMode;
  themeOptions: ThemeOption[];
  defaultBlockKind: BlockKind;
  blockKindOptions: BlockKindOption[];
  defaultBlockTintPreset: BlockTintPreset;
  blockTintOptions: BlockTintOption[];
  defaultDocumentSurfaceTonePreset: DocumentSurfaceTonePreset;
  documentSurfaceToneOptions: DocumentSurfaceToneOption[];
  groups?: readonly SettingsThemeDefaultsGroup[];
  onThemeModeChange: (value: ThemeMode) => void;
  onDefaultBlockKindChange: (value: BlockKind) => void;
  onDefaultBlockTintPresetChange: (value: BlockTintPreset) => void;
  onDefaultDocumentSurfaceTonePresetChange: (value: DocumentSurfaceTonePreset) => void;
}

export function SettingsThemeDefaultsSection({
  themeMode,
  themeOptions,
  defaultBlockKind,
  blockKindOptions,
  defaultBlockTintPreset,
  blockTintOptions,
  defaultDocumentSurfaceTonePreset,
  documentSurfaceToneOptions,
  groups = ['theme', 'block-kind', 'block-tint', 'surface-tone'],
  onThemeModeChange,
  onDefaultBlockKindChange,
  onDefaultBlockTintPresetChange,
  onDefaultDocumentSurfaceTonePresetChange,
}: SettingsThemeDefaultsSectionProps) {
  const visibleGroups = new Set(groups);

  return (
    <>
      {visibleGroups.has('theme') ? (
      <div className="settings-section">
        <div className="settings-section-header">
          <span className="settings-section-title">테마</span>
        </div>
        <SegmentedSelector
          ariaLabel="테마 선택"
          tone="settings"
          value={themeMode}
          options={themeOptions.map((option) => ({
            value: option.id,
            label: option.label,
            icon: option.icon,
          }))}
          onChange={onThemeModeChange}
        />
      </div>
      ) : null}

      {visibleGroups.has('block-kind') ? (
      <div className="settings-section">
        <div className="settings-section-header">
          <span className="settings-section-title">기본 블록 종류</span>
        </div>
        <SegmentedSelector
          ariaLabel="기본 블록 종류 선택"
          tone="settings"
          value={defaultBlockKind}
          options={blockKindOptions.map((option) => ({
            value: option.id,
            label: option.label,
          }))}
          onChange={onDefaultBlockKindChange}
        />
      </div>
      ) : null}

      {visibleGroups.has('block-tint') ? (
      <div className="settings-section">
        <div className="settings-section-header">
          <span className="settings-section-title">기본 블록 색상쌍</span>
        </div>
        <SegmentedSelector
          ariaLabel="기본 블록 색상쌍 선택"
          tone="settings"
          value={defaultBlockTintPreset}
          layout="palette"
          columns={3}
          options={blockTintOptions}
          onChange={onDefaultBlockTintPresetChange}
          renderOption={(option) => (
            <span className="tint-selector-card">
              <BlockTintPreview className="tint-selector-preview" preset={option.value} />
              <span className="tint-selector-label">{option.label}</span>
            </span>
          )}
        />
      </div>
      ) : null}

      {visibleGroups.has('surface-tone') ? (
      <div className="settings-section">
        <div className="settings-section-header">
          <span className="settings-section-title">기본 문서 배경 톤</span>
        </div>
        <SegmentedSelector
          ariaLabel="기본 문서 배경 톤 선택"
          tone="settings"
          value={defaultDocumentSurfaceTonePreset}
          layout="palette"
          columns={3}
          options={documentSurfaceToneOptions}
          onChange={onDefaultDocumentSurfaceTonePresetChange}
          renderOption={(option) => (
            <span className="tint-selector-card">
              <DocumentSurfacePreview className="surface-selector-preview" preset={option.value} />
              <span className="tint-selector-label">{option.label}</span>
            </span>
          )}
        />
      </div>
      ) : null}
    </>
  );
}
