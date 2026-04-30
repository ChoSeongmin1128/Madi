import { AlertTriangle } from 'lucide-react';

interface SettingsDangerZoneSectionProps {
  isConfirmOpen: boolean;
  onOpenConfirm: () => void;
  onCloseConfirm: () => void;
  onDeleteAllDocuments: () => Promise<void>;
}

export function SettingsDangerZoneSection({
  isConfirmOpen,
  onOpenConfirm,
  onCloseConfirm,
  onDeleteAllDocuments,
}: SettingsDangerZoneSectionProps) {
  return (
    <div className="settings-section danger-zone">
      <div className="settings-section-header">
        <span className="settings-section-title">위험 작업</span>
      </div>
      {!isConfirmOpen ? (
        <button className="document-menu-danger" type="button" onClick={onOpenConfirm}>
          <AlertTriangle size={14} />
          전체 문서 삭제
        </button>
      ) : (
        <div className="danger-confirm-actions">
          <button className="ghost-button" type="button" onClick={onCloseConfirm}>
            취소
          </button>
          <button
            className="document-menu-danger"
            type="button"
            onClick={() => {
              void onDeleteAllDocuments();
            }}
          >
            전체 문서 삭제 실행
          </button>
        </div>
      )}
    </div>
  );
}
