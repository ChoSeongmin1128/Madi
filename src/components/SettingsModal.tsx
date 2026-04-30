import { MoonStar, MonitorCog, SunMedium, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePreferencesController, useWorkspaceController } from '../app/controllers';
import { useEditorTypographyControl } from '../hooks/useEditorTypographyControl';
import { useICloudSyncDebugInfo } from '../hooks/useICloudSyncDebugInfo';
import { BLOCK_TINT_PRESETS } from '../lib/blockTint';
import { DOCUMENT_SURFACE_TONE_PRESETS } from '../lib/documentSurfaceTone';
import {
  BODY_FONT_OPTIONS,
  CODE_FONT_OPTIONS,
  MAX_BODY_FONT_SIZE_PX,
  MAX_CODE_FONT_SIZE_PX,
  MIN_BODY_FONT_SIZE_PX,
  MIN_CODE_FONT_SIZE_PX,
} from '../lib/editorTypography';
import type { BlockKind, ThemeMode } from '../lib/types';
import { useWorkspaceStore } from '../stores/workspaceStore';
import {
  MAX_WINDOW_OPACITY_PERCENT,
  MIN_WINDOW_OPACITY_PERCENT,
} from '../lib/globalShortcut';
import { useWindowOpacityControl } from '../hooks/useWindowOpacityControl';
import { useUpdaterStore } from '../stores/updaterStore';
import { SettingsDangerZoneSection } from './settings/SettingsDangerZoneSection';
import { SettingsFontSection } from './settings/SettingsFontSection';
import { SettingsICloudSection } from './settings/SettingsICloudSection';
import { SettingsThemeDefaultsSection } from './settings/SettingsThemeDefaultsSection';
import { SettingsUpdateSection } from './settings/SettingsUpdateSection';
import { SettingsWindowSection } from './settings/SettingsWindowSection';
import { SETTINGS_CATEGORIES, type SettingsCategoryId } from './settings/settingsCategories';

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
    setBodyFontFamily,
    setCodeFontFamily,
    setICloudSyncEnabled,
    setMenuBarIconEnabled,
    resetICloudSyncCheckpoint,
    runICloudSync,
    forceUploadAllDocuments,
    forceRedownloadFromCloud,
    setThemeMode,
  } = usePreferencesController();
  const { deleteAllDocuments } = useWorkspaceController();
  const themeMode = useWorkspaceStore((state) => state.themeMode);
  const defaultBlockTintPreset = useWorkspaceStore((state) => state.defaultBlockTintPreset);
  const defaultDocumentSurfaceTonePreset = useWorkspaceStore((state) => state.defaultDocumentSurfaceTonePreset);
  const defaultBlockKind = useWorkspaceStore((state) => state.defaultBlockKind);
  const bodyFontFamily = useWorkspaceStore((state) => state.bodyFontFamily);
  const codeFontFamily = useWorkspaceStore((state) => state.codeFontFamily);
  const menuBarIconEnabled = useWorkspaceStore((state) => state.menuBarIconEnabled);
  const alwaysOnTopEnabled = useWorkspaceStore((state) => state.alwaysOnTopEnabled);
  const globalToggleShortcut = useWorkspaceStore((state) => state.globalToggleShortcut);
  const globalShortcutError = useWorkspaceStore((state) => state.globalShortcutError);
  const menuBarIconError = useWorkspaceStore((state) => state.menuBarIconError);
  const windowPreferenceError = useWorkspaceStore((state) => state.windowPreferenceError);
  const icloudSyncStatus = useWorkspaceStore((state) => state.icloudSyncStatus);
  const appUpdateStatus = useUpdaterStore((state) => state.appUpdateStatus);
  const { draftOpacity, previewOpacity, commitOpacity } = useWindowOpacityControl();
  const {
    draftBodyFontSizePx,
    draftCodeFontSizePx,
    previewBodyFontSizePx,
    commitBodyFontSizePx,
    previewCodeFontSizePx,
    commitCodeFontSizePx,
  } = useEditorTypographyControl();
  const {
    debugInfo: icloudDebugInfo,
    error: icloudDebugError,
    isLoading: isIcloudDebugLoading,
    refresh: refreshIcloudDebugInfo,
  } = useICloudSyncDebugInfo(isOpen);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<SettingsCategoryId>('general');
  const activeCategoryMeta =
    SETTINGS_CATEGORIES.find((category) => category.id === activeCategory)
    ?? SETTINGS_CATEGORIES[0];

  const themeDefaultsProps = {
    themeMode,
    themeOptions: THEME_OPTIONS,
    defaultBlockKind,
    blockKindOptions: BLOCK_KIND_OPTIONS,
    defaultBlockTintPreset,
    blockTintOptions: BLOCK_TINT_OPTIONS,
    defaultDocumentSurfaceTonePreset,
    documentSurfaceToneOptions: DOCUMENT_SURFACE_TONE_OPTIONS,
    onThemeModeChange: setThemeMode,
    onDefaultBlockKindChange: setDefaultBlockKind,
    onDefaultBlockTintPresetChange: setDefaultBlockTintPreset,
    onDefaultDocumentSurfaceTonePresetChange: setDefaultDocumentSurfaceTonePreset,
  };

  const iCloudSectionProps = {
    status: icloudSyncStatus,
    debugInfo: icloudDebugInfo,
    debugError: icloudDebugError,
    debugLoading: isIcloudDebugLoading,
    onEnabledChange: (enabled: boolean) => {
      void setICloudSyncEnabled(enabled);
    },
    onRunSync: () => {
      void runICloudSync();
    },
    onRefreshDebug: () => {
      void refreshIcloudDebugInfo();
    },
    onResetCheckpoint: () => {
      void resetICloudSyncCheckpoint();
    },
    onForceUpload: () => {
      void forceUploadAllDocuments();
    },
    onForceRedownload: () => {
      void forceRedownloadFromCloud();
    },
  };

  const settingsContent = (() => {
    switch (activeCategory) {
      case 'general':
        return (
          <SettingsThemeDefaultsSection
            {...themeDefaultsProps}
            groups={['block-kind']}
          />
        );
      case 'appearance':
        return (
          <>
            <SettingsThemeDefaultsSection
              {...themeDefaultsProps}
              groups={['theme', 'block-tint', 'surface-tone']}
            />
          </>
        );
      case 'editing':
        return (
          <SettingsFontSection
            bodyFontFamily={bodyFontFamily}
            bodyFontSizePx={draftBodyFontSizePx}
            codeFontFamily={codeFontFamily}
            codeFontSizePx={draftCodeFontSizePx}
            bodyFontOptions={BODY_FONT_OPTIONS}
            codeFontOptions={CODE_FONT_OPTIONS}
            minBodyFontSizePx={MIN_BODY_FONT_SIZE_PX}
            maxBodyFontSizePx={MAX_BODY_FONT_SIZE_PX}
            minCodeFontSizePx={MIN_CODE_FONT_SIZE_PX}
            maxCodeFontSizePx={MAX_CODE_FONT_SIZE_PX}
            onBodyFontFamilyChange={setBodyFontFamily}
            onPreviewBodyFontSizePx={previewBodyFontSizePx}
            onCommitBodyFontSizePx={commitBodyFontSizePx}
            onCodeFontFamilyChange={setCodeFontFamily}
            onPreviewCodeFontSizePx={previewCodeFontSizePx}
            onCommitCodeFontSizePx={commitCodeFontSizePx}
          />
        );
      case 'window':
        return (
          <SettingsWindowSection
            menuBarIconEnabled={menuBarIconEnabled}
            alwaysOnTopEnabled={alwaysOnTopEnabled}
            draftOpacity={draftOpacity}
            globalToggleShortcut={globalToggleShortcut}
            globalShortcutError={globalShortcutError}
            menuBarIconError={menuBarIconError}
            windowPreferenceError={windowPreferenceError}
            minOpacityPercent={MIN_WINDOW_OPACITY_PERCENT}
            maxOpacityPercent={MAX_WINDOW_OPACITY_PERCENT}
            onMenuBarIconEnabledChange={setMenuBarIconEnabled}
            onAlwaysOnTopEnabledChange={setAlwaysOnTopEnabled}
            onPreviewOpacity={previewOpacity}
            onCommitOpacity={commitOpacity}
            onGlobalToggleShortcutCommit={setGlobalToggleShortcut}
          />
        );
      case 'sync':
        return <SettingsICloudSection {...iCloudSectionProps} mode="sync" />;
      case 'updates':
        return <SettingsUpdateSection appUpdateStatus={appUpdateStatus} />;
      case 'advanced':
        return (
          <>
            <SettingsICloudSection {...iCloudSectionProps} mode="advanced" />
            <SettingsDangerZoneSection
              isConfirmOpen={isConfirmOpen}
              onOpenConfirm={() => setConfirmOpen(true)}
              onCloseConfirm={() => setConfirmOpen(false)}
              onDeleteAllDocuments={async () => {
                await deleteAllDocuments();
                setConfirmOpen(false);
              }}
            />
          </>
        );
      default:
        return null;
    }
  })();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <button className="modal-backdrop" type="button" aria-label="설정 닫기" onClick={onClose} />
      <section className="settings-modal" role="dialog" aria-modal="true" aria-label="전체 설정">
        <div className="settings-modal-header">
          <h2 className="settings-title">설정</h2>
          <button className="icon-button" type="button" aria-label="설정 닫기" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="settings-window-body">
          <nav className="settings-sidebar" aria-label="설정 카테고리">
            {SETTINGS_CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  className={`settings-category-button${isActive ? ' is-active' : ''}`}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setActiveCategory(category.id)}
                >
                  <Icon size={16} />
                  <span className="settings-category-copy">
                    <span className="settings-category-label">{category.label}</span>
                    <span className="settings-category-description">{category.description}</span>
                  </span>
                </button>
              );
            })}
          </nav>
          <div className="settings-detail-panel">
            <div className="settings-detail-header">
              <span className="settings-detail-title">{activeCategoryMeta.label}</span>
              <span className="settings-detail-description">{activeCategoryMeta.description}</span>
            </div>
            <div className="settings-detail-content">
              {settingsContent}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
