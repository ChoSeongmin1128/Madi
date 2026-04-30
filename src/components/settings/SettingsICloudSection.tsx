import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CloudOff,
  Download,
  RefreshCw,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import type { ICloudSyncDebugInfoDto, ICloudSyncStatus } from '../../lib/types';
import { SettingsSwitch } from './SettingsSwitch';

type ICloudRecoveryAction = 'force-upload' | 'force-redownload';

interface ICloudPresentation {
  label: string;
  tone: 'progress' | 'ready' | 'error';
  icon: LucideIcon;
  spin: boolean;
}

function formatTimestamp(value: number | null) {
  if (!value) {
    return '동기화 기록 없음';
  }

  return `최근 동기화 ${new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))}`;
}

function formatDebugTimestamp(value: number | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function getPresentation(status: ICloudSyncStatus): ICloudPresentation {
  if (!status.enabled) {
    return {
      label: '꺼짐',
      tone: 'ready',
      icon: CloudOff,
      spin: false,
    };
  }

  if (status.state === 'offline') {
    return {
      label: '오프라인',
      tone: 'error',
      icon: CloudOff,
      spin: false,
    };
  }

  if (status.state === 'checking') {
    return { label: '확인 중', tone: 'progress', icon: RefreshCw, spin: true };
  }

  if (status.state === 'syncing') {
    return { label: '동기화 중', tone: 'progress', icon: RefreshCw, spin: true };
  }

  if (status.state === 'error') {
    return {
      label: status.lastErrorMessage ? '오류' : '동기화 오류',
      tone: 'error',
      icon: AlertTriangle,
      spin: false,
    };
  }

  if (status.state === 'pending') {
    return {
      label: `업로드 대기 ${status.pendingOperationCount}건`,
      tone: 'progress',
      icon: Cloud,
      spin: false,
    };
  }

  if (status.lastSyncSucceededAtMs) {
    return {
      label: formatTimestamp(status.lastSyncSucceededAtMs),
      tone: 'ready',
      icon: CheckCircle2,
      spin: false,
    };
  }

  return {
    label: '동기화 기록 없음',
    tone: 'ready',
    icon: Cloud,
    spin: false,
  };
}

const RECOVERY_ACTION_COPY: Record<
  ICloudRecoveryAction,
  { title: string; description: string; confirmLabel: string }
> = {
  'force-upload': {
    title: 'Madi 클라우드 다시 올리기',
    description: '현재 Mac의 문서 상태를 기준으로 Madi 클라우드 내용을 다시 씁니다.',
    confirmLabel: '다시 올리기 실행',
  },
  'force-redownload': {
    title: 'Madi 클라우드 다시 받기',
    description: '이 Mac의 로컬 문서를 비우고 Madi 클라우드 기준으로 다시 받습니다.',
    confirmLabel: '다시 받기 실행',
  },
};

interface SettingsICloudSectionProps {
  mode?: 'sync' | 'advanced';
  status: ICloudSyncStatus;
  debugInfo: ICloudSyncDebugInfoDto | null;
  debugError: string | null;
  debugLoading: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onRunSync: () => void;
  onRefreshDebug: () => void;
  onResetCheckpoint: () => void;
  onForceUpload: () => void;
  onForceRedownload: () => void;
}

export function SettingsICloudSection({
  mode = 'sync',
  status,
  debugInfo,
  debugError,
  debugLoading,
  onEnabledChange,
  onRunSync,
  onRefreshDebug,
  onResetCheckpoint,
  onForceUpload,
  onForceRedownload,
}: SettingsICloudSectionProps) {
  const [pendingRecoveryAction, setPendingRecoveryAction] = useState<ICloudRecoveryAction | null>(null);
  const presentation = getPresentation(status);
  const Icon = presentation.icon;
  const isBusy = status.state === 'checking' || status.state === 'syncing';
  const isAdvanced = mode === 'advanced';
  const pendingRecoveryCopy = pendingRecoveryAction
    ? RECOVERY_ACTION_COPY[pendingRecoveryAction]
    : null;

  const confirmRecoveryAction = () => {
    if (pendingRecoveryAction === 'force-upload') {
      onForceUpload();
    }
    if (pendingRecoveryAction === 'force-redownload') {
      onForceRedownload();
    }
    setPendingRecoveryAction(null);
  };

  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <div className="settings-title-stack">
          <span className="settings-section-title">
            {isAdvanced ? '동기화 진단과 복구' : 'iCloud 동기화'}
          </span>
        </div>
        <span className={`settings-status-chip is-${presentation.tone}`}>
          <Icon className={presentation.spin ? 'spin' : undefined} size={14} />
          <span>{presentation.label}</span>
        </span>
      </div>
      {!isAdvanced ? (
        <>
          <p className="settings-description">
            이 Mac에 먼저 저장한 뒤 iCloud로 백그라운드 동기화합니다. 오프라인이어도 작성 내용은 로컬에 유지됩니다.
          </p>
          <SettingsSwitch
            id="settings-icloud-sync"
            checked={status.enabled}
            disabled={isBusy}
            label="iCloud로 동기화"
            description="같은 Apple 계정의 Mac 사이에서 문서를 이어서 사용합니다."
            onChange={onEnabledChange}
          />
          <div className="settings-update-actions">
            <button
              className="ghost-button"
              type="button"
              disabled={!status.enabled || isBusy}
              onClick={onRunSync}
            >
              <RefreshCw size={14} />
              지금 동기화
            </button>
          </div>
        </>
      ) : (
        <div className="settings-advanced-panel">
          <div className="settings-advanced-content">
            <div className="settings-icloud-debug">
              <div className="settings-section-header">
                <span className="settings-section-title">진단 정보</span>
                <button
                  className="ghost-button settings-inline-action"
                  type="button"
                  disabled={debugLoading}
                  onClick={onRefreshDebug}
                >
                  <RefreshCw className={debugLoading ? 'spin' : undefined} size={14} />
                  새로고침
                </button>
              </div>
              {debugInfo ? (
                <div className="settings-debug-grid">
                  <span>브리지</span>
                  <span>{debugInfo.bridgeAvailable ? '사용 가능' : '없음'}</span>
                  <span>구역</span>
                  <span>{debugInfo.zoneName}</span>
                  <span>변경 토큰</span>
                  <span>{debugInfo.serverChangeTokenPresent ? '있음' : '없음'}</span>
                  <span>업로드 대기</span>
                  <span>{debugInfo.pendingOperationCount}</span>
                  <span>현재 처리</span>
                  <span>{debugInfo.processingOperationCount}</span>
                  <span>실패</span>
                  <span>{debugInfo.failedOperationCount}</span>
                  <span>합쳐진 변경</span>
                  <span>{debugInfo.coalescedIntentCount}</span>
                  <span>삭제 기록</span>
                  <span>{debugInfo.tombstoneCount}</span>
                  <span>실행 상태</span>
                  <span>{debugInfo.runtimePhase}</span>
                  <span>재시도 횟수</span>
                  <span>{debugInfo.backoffAttempt}</span>
                  <span>다음 재시도</span>
                  <span>{formatDebugTimestamp(debugInfo.nextRetryAtMs)}</span>
                  <span>기기</span>
                  <span>{debugInfo.deviceIdSuffix}</span>
                </div>
              ) : null}
              {debugInfo?.bridgeError ? (
                <p className="settings-field-hint">{debugInfo.bridgeError}</p>
              ) : null}
              {debugError ? <p className="settings-field-hint">{debugError}</p> : null}
            </div>
            <div className="settings-update-actions">
              <button className="ghost-button" type="button" disabled={isBusy} onClick={onResetCheckpoint}>
                <RefreshCw size={14} />
                동기화 상태 초기화
              </button>
              <button
                className="ghost-button"
                type="button"
                disabled={isBusy}
                onClick={() => setPendingRecoveryAction('force-upload')}
              >
                <Upload size={14} />
                Madi 클라우드로 다시 올리기
              </button>
              <button
                className="ghost-button"
                type="button"
                disabled={isBusy}
                onClick={() => setPendingRecoveryAction('force-redownload')}
              >
                <Download size={14} />
                Madi 클라우드에서 다시 받기
              </button>
            </div>
            {pendingRecoveryCopy ? (
              <div className="danger-confirm settings-recovery-confirm" role="group" aria-label={pendingRecoveryCopy.title}>
                <div className="settings-title-stack">
                  <AlertTriangle size={14} />
                  <span className="settings-section-title">{pendingRecoveryCopy.title}</span>
                </div>
                <p className="settings-field-hint">{pendingRecoveryCopy.description}</p>
                <div className="danger-confirm-actions">
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => setPendingRecoveryAction(null)}
                  >
                    취소
                  </button>
                  <button
                    className="document-menu-danger"
                    type="button"
                    disabled={isBusy}
                    onClick={confirmRecoveryAction}
                  >
                    {pendingRecoveryCopy.confirmLabel}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
      {status.lastErrorMessage && (
        <p className="settings-field-hint">{status.lastErrorMessage}</p>
      )}
    </div>
  );
}
