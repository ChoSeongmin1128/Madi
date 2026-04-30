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

  const isBusy = status.state === 'installing';

  return (
    <button
      className={`update-pill${isBusy ? ' is-progress' : ' is-ready'}`}
      type="button"
      aria-label={label}
      title={label}
      disabled={isBusy}
      onClick={() => {
        if (!isBusy) {
          void applyPreparedUpdate();
        }
      }}
    >
      {isBusy ? <LoaderCircle className="spin" size={13} /> : <Download size={13} />}
      <span className="update-pill-label">{label}</span>
    </button>
  );
}
