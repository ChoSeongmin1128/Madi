import { CheckCircle2, Download, RefreshCw, AlertTriangle, type LucideIcon } from 'lucide-react';
import { applyPreparedUpdate, formatUpdateStatusMessage, runUpdateCheckFrom } from '../../lib/appUpdater';
import type { AppUpdateStatus } from '../../lib/types';

interface AppUpdatePresentation {
  label: string;
  tone: 'progress' | 'ready' | 'error';
  icon: LucideIcon;
  spin: boolean;
}

function getAppUpdatePresentation(
  status: Pick<AppUpdateStatus, 'state' | 'message' | 'version' | 'percent' | 'lastCheckedAt'>,
): AppUpdatePresentation | null {
  const label = formatUpdateStatusMessage(status) ?? '';

  if (status.state === 'checking') {
    return { label, tone: 'progress', icon: RefreshCw, spin: true };
  }

  if (status.state === 'available_downloading') {
    return { label, tone: 'progress', icon: Download, spin: false };
  }

  if (status.state === 'ready_to_install') {
    return { label, tone: 'ready', icon: CheckCircle2, spin: false };
  }

  if (status.state === 'installing') {
    return { label, tone: 'progress', icon: RefreshCw, spin: true };
  }

  if (status.state === 'error') {
    return { label, tone: 'error', icon: AlertTriangle, spin: false };
  }

  if (label) {
    return { label, tone: 'ready', icon: CheckCircle2, spin: false };
  }

  return null;
}

interface SettingsUpdateSectionProps {
  appUpdateStatus: AppUpdateStatus;
}

export function SettingsUpdateSection({ appUpdateStatus }: SettingsUpdateSectionProps) {
  const appUpdatePresentation = getAppUpdatePresentation(appUpdateStatus);
  const AppUpdateIcon = appUpdatePresentation?.icon;

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <span className="settings-section-title">업데이트</span>
        {appUpdatePresentation && AppUpdateIcon && (
          <span className={`settings-status-chip is-${appUpdatePresentation.tone}`}>
            <AppUpdateIcon className={appUpdatePresentation.spin ? 'spin' : undefined} size={14} />
            <span>{appUpdatePresentation.label}</span>
          </span>
        )}
      </div>
      <div className="settings-update-actions">
        <button
          className="ghost-button"
          type="button"
          disabled={
            appUpdateStatus.state === 'checking'
            || appUpdateStatus.state === 'available_downloading'
            || appUpdateStatus.state === 'installing'
          }
          onClick={() => {
            void runUpdateCheckFrom('settings-manual');
          }}
        >
          <RefreshCw size={14} />
          업데이트 확인
        </button>
        {appUpdateStatus.state === 'ready_to_install' && (
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              void applyPreparedUpdate();
            }}
          >
            재시작하여 적용
          </button>
        )}
      </div>
    </div>
  );
}
