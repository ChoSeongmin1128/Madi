import { MoonStar, MonitorCog, SunMedium, X } from 'lucide-react';
import { useState } from 'react';
import { usePreferencesController, useWorkspaceController } from '../app/controllers';
import { BLOCK_TINT_PRESETS } from '../lib/blockTint';
import { DOCUMENT_SURFACE_TONE_PRESETS } from '../lib/documentSurfaceTone';
import type { BlockKind, ThemeMode } from '../lib/types';
import { useWorkspaceStore } from '../stores/workspaceStore';
import {
  MAX_WINDOW_OPACITY_PERCENT,
  MIN_WINDOW_OPACITY_PERCENT,
} from '../lib/globalShortcut';
import { useWindowOpacityControl } from '../hooks/useWindowOpacityControl';
import { useUpdaterStore } from '../stores/updaterStore';
import { SettingsDangerZoneSection } from './settings/SettingsDangerZoneSection';
import { SettingsThemeDefaultsSection } from './settings/SettingsThemeDefaultsSection';
import { SettingsUpdateSection } from './settings/SettingsUpdateSection';
import { SettingsWindowSection } from './settings/SettingsWindowSection';

const THEME_OPTIONS: Array<{ id: ThemeMode; label: string; icon: typeof MonitorCog }> = [
  { id: 'system', label: '자동', icon: MonitorCog },
  { id: 'light', label: '라이트', icon: SunMedium },
  { id: 'dark', label: '다크', icon: MoonStar },
];

const BLOCK_KIND_OPTIONS: Array<{ id: BlockKind; label: string }> = [
  { id: 'markdown', label: '마크다운' },
  { id: 'text', label: '텍스트' },
  { id: 'code', label: '코드' },
];

const MENU_BAR_OPTIONS = [
  { value: 'off', label: '꺼짐' },
  { value: 'on', label: '켜짐' },
] as const;

const BLOCK_TINT_OPTIONS = BLOCK_TINT_PRESETS.map((preset) => ({
  value: preset.id,
  label: preset.label,
}));

const DOCUMENT_SURFACE_TONE_OPTIONS = DOCUMENT_SURFACE_TONE_PRESETS.map((preset) => ({
  value: preset.id,
  label: preset.label,
}));

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    setAlwaysOnTopEnabled,
    setDefaultBlockKind,
    setDefaultBlockTintPreset,
    setDefaultDocumentSurfaceTonePreset,
    setGlobalToggleShortcut,
    setMenuBarIconEnabled,
    setThemeMode,
  } = usePreferencesController();
  const { deleteAllDocuments } = useWorkspaceController();
  const themeMode = useWorkspaceStore((state) => state.themeMode);
  const defaultBlockTintPreset = useWorkspaceStore((state) => state.defaultBlockTintPreset);
  const defaultDocumentSurfaceTonePreset = useWorkspaceStore((state) => state.defaultDocumentSurfaceTonePreset);
  const defaultBlockKind = useWorkspaceStore((state) => state.defaultBlockKind);
  const menuBarIconEnabled = useWorkspaceStore((state) => state.menuBarIconEnabled);
  const alwaysOnTopEnabled = useWorkspaceStore((state) => state.alwaysOnTopEnabled);
  const globalToggleShortcut = useWorkspaceStore((state) => state.globalToggleShortcut);
  const globalShortcutError = useWorkspaceStore((state) => state.globalShortcutError);
  const appUpdateStatus = useUpdaterStore((state) => state.appUpdateStatus);
  const { draftOpacity, previewOpacity, commitOpacity } = useWindowOpacityControl();
  const [isConfirmOpen, setConfirmOpen] = useState(false);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <button className="modal-backdrop" type="button" aria-label="설정 닫기" onClick={onClose} />
      <section className="settings-modal" role="dialog" aria-modal="true" aria-label="전체 설정">
        <div className="settings-modal-header">
          <h2 className="settings-title">전체 설정</h2>
          <button className="icon-button" type="button" aria-label="설정 닫기" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <SettingsThemeDefaultsSection
          themeMode={themeMode}
          themeOptions={THEME_OPTIONS}
          defaultBlockKind={defaultBlockKind}
          blockKindOptions={BLOCK_KIND_OPTIONS}
          defaultBlockTintPreset={defaultBlockTintPreset}
          blockTintOptions={BLOCK_TINT_OPTIONS}
          defaultDocumentSurfaceTonePreset={defaultDocumentSurfaceTonePreset}
          documentSurfaceToneOptions={DOCUMENT_SURFACE_TONE_OPTIONS}
          onThemeModeChange={setThemeMode}
          onDefaultBlockKindChange={setDefaultBlockKind}
          onDefaultBlockTintPresetChange={setDefaultBlockTintPreset}
          onDefaultDocumentSurfaceTonePresetChange={setDefaultDocumentSurfaceTonePreset}
        />

        <SettingsWindowSection
          menuBarIconEnabled={menuBarIconEnabled}
          alwaysOnTopEnabled={alwaysOnTopEnabled}
          draftOpacity={draftOpacity}
          globalToggleShortcut={globalToggleShortcut}
          globalShortcutError={globalShortcutError}
          menuBarOptions={MENU_BAR_OPTIONS}
          minOpacityPercent={MIN_WINDOW_OPACITY_PERCENT}
          maxOpacityPercent={MAX_WINDOW_OPACITY_PERCENT}
          onMenuBarIconEnabledChange={setMenuBarIconEnabled}
          onAlwaysOnTopEnabledChange={setAlwaysOnTopEnabled}
          onPreviewOpacity={previewOpacity}
          onCommitOpacity={commitOpacity}
          onGlobalToggleShortcutCommit={setGlobalToggleShortcut}
        />

        <SettingsUpdateSection appUpdateStatus={appUpdateStatus} />

        <SettingsDangerZoneSection
          isConfirmOpen={isConfirmOpen}
          onOpenConfirm={() => setConfirmOpen(true)}
          onCloseConfirm={() => setConfirmOpen(false)}
          onDeleteAllDocuments={async () => {
            await deleteAllDocuments();
            setConfirmOpen(false);
          }}
        />
      </section>
    </>
  );
}
