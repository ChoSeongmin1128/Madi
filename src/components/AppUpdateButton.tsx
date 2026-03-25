import { Download, LoaderCircle } from 'lucide-react';
import { applyPreparedUpdate, getHeaderUpdateActionLabel } from '../lib/appUpdater';
import type { AppUpdateStatus } from '../lib/types';

interface AppUpdateButtonProps {
  status: AppUpdateStatus;
}

export function AppUpdateButton({ status }: AppUpdateButtonProps) {
  const label = getHeaderUpdateActionLabel(status);

  if (!label) {
    return null;
  }

  const isDownloading = status.state === 'available_downloading';

  return (
    <button
      className={`update-pill${isDownloading ? ' is-progress' : ' is-ready'}`}
      type="button"
      disabled={isDownloading}
      onClick={() => {
        if (!isDownloading) {
          void applyPreparedUpdate();
        }
      }}
    >
      {isDownloading ? <LoaderCircle className="spin" size={13} /> : <Download size={13} />}
      <span>{label}</span>
    </button>
  );
}
