import { ShortcutCaptureField } from '../ShortcutCaptureField';
import { SegmentedSelector } from '../SegmentedSelector';

interface SettingsWindowSectionProps {
  menuBarIconEnabled: boolean;
  alwaysOnTopEnabled: boolean;
  draftOpacity: number;
  globalToggleShortcut: string | null;
  globalShortcutError: string | null;
  menuBarOptions: ReadonlyArray<{ value: 'off' | 'on'; label: string }>;
  minOpacityPercent: number;
  maxOpacityPercent: number;
  onMenuBarIconEnabledChange: (enabled: boolean) => void;
  onAlwaysOnTopEnabledChange: (enabled: boolean) => void;
  onPreviewOpacity: (value: number) => Promise<unknown>;
  onCommitOpacity: (value: number) => Promise<unknown>;
  onGlobalToggleShortcutCommit: (shortcut: string | null) => Promise<unknown>;
}

export function SettingsWindowSection({
  menuBarIconEnabled,
  alwaysOnTopEnabled,
  draftOpacity,
  globalToggleShortcut,
  globalShortcutError,
  menuBarOptions,
  minOpacityPercent,
  maxOpacityPercent,
  onMenuBarIconEnabledChange,
  onAlwaysOnTopEnabledChange,
  onPreviewOpacity,
  onCommitOpacity,
  onGlobalToggleShortcutCommit,
}: SettingsWindowSectionProps) {
  return (
    <>
      <div className="settings-section">
        <div className="settings-section-header">
          <span className="settings-section-title">메뉴바 아이콘</span>
        </div>
        <SegmentedSelector
          ariaLabel="메뉴바 아이콘 선택"
          tone="settings"
          value={menuBarIconEnabled ? 'on' : 'off'}
          options={menuBarOptions}
          onChange={(nextValue) => onMenuBarIconEnabledChange(nextValue === 'on')}
        />
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <span className="settings-section-title">창 제어</span>
        </div>

        <label className="settings-toggle-row" htmlFor="settings-always-on-top">
          <span className="settings-toggle-copy">
            <span className="settings-toggle-title">항상 위에 고정</span>
            <span className="document-menu-option-description">
              다른 앱으로 전환해도 MinNote 창을 위에 유지합니다.
            </span>
          </span>
          <input
            id="settings-always-on-top"
            type="checkbox"
            checked={alwaysOnTopEnabled}
            onChange={(event) => {
              void onAlwaysOnTopEnabledChange(event.target.checked);
            }}
          />
        </label>

        <div className="settings-range-group">
          <div className="settings-range-header">
            <div className="settings-range-title-group">
              <span className="settings-section-title">투명도</span>
              <span className="settings-inline-stat">{draftOpacity}%</span>
            </div>
            <button
              className="ghost-button settings-inline-action"
              type="button"
              disabled={draftOpacity === maxOpacityPercent}
              onClick={() => {
                void onCommitOpacity(maxOpacityPercent);
              }}
            >
              100%로 복원
            </button>
          </div>
          <input
            className="opacity-slider"
            type="range"
            min={minOpacityPercent}
            max={maxOpacityPercent}
            step={1}
            value={draftOpacity}
            onInput={(event) => {
              void onPreviewOpacity(Number(event.currentTarget.value));
            }}
            onPointerUp={(event) => {
              void onCommitOpacity(Number(event.currentTarget.value));
            }}
            onKeyUp={(event) => {
              void onCommitOpacity(Number(event.currentTarget.value));
            }}
            onBlur={(event) => {
              void onCommitOpacity(Number(event.currentTarget.value));
            }}
          />
        </div>

        <div className="settings-shortcut-group">
          <div className="settings-section-header">
            <span className="settings-section-title">전역 단축키</span>
          </div>
          <ShortcutCaptureField
            value={globalToggleShortcut}
            error={globalShortcutError}
            onCommit={onGlobalToggleShortcutCommit}
          />
        </div>
      </div>
    </>
  );
}
