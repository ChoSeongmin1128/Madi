import { ShortcutCaptureField } from '../ShortcutCaptureField';
import { SettingsSwitch } from './SettingsSwitch';

interface SettingsWindowSectionProps {
  menuBarIconEnabled: boolean;
  alwaysOnTopEnabled: boolean;
  draftOpacity: number;
  globalToggleShortcut: string | null;
  globalShortcutError: string | null;
  menuBarIconError: string | null;
  windowPreferenceError: string | null;
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
  menuBarIconError,
  windowPreferenceError,
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
        <SettingsSwitch
          id="settings-menu-bar-icon"
          checked={menuBarIconEnabled}
          label="메뉴바에서 열기"
          description="Madi를 닫아도 메뉴바에서 다시 열 수 있게 둡니다."
          onChange={onMenuBarIconEnabledChange}
        />
        {menuBarIconError ? <span className="shortcut-capture-error">{menuBarIconError}</span> : null}
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <span className="settings-section-title">창 제어</span>
        </div>

        <SettingsSwitch
          id="settings-always-on-top"
          checked={alwaysOnTopEnabled}
          label="항상 위에 고정"
          description="다른 앱으로 전환해도 Madi 창을 위에 유지합니다."
          onChange={(checked) => {
            void onAlwaysOnTopEnabledChange(checked);
          }}
        />

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
        {windowPreferenceError ? <span className="shortcut-capture-error">{windowPreferenceError}</span> : null}

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
