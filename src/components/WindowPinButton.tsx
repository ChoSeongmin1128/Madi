import { Pin } from 'lucide-react';
import { usePreferencesController } from '../app/controllers';
import { useWorkspaceStore } from '../stores/workspaceStore';

export function WindowPinButton() {
  const { setAlwaysOnTopEnabled } = usePreferencesController();
  const alwaysOnTopEnabled = useWorkspaceStore((state) => state.alwaysOnTopEnabled);
  const label = alwaysOnTopEnabled ? '창 항상 위 고정 해제' : '창을 항상 위에 고정';

  return (
    <button
      className={`icon-button window-pin-button${alwaysOnTopEnabled ? ' is-active' : ''}`}
      type="button"
      aria-label={label}
      aria-pressed={alwaysOnTopEnabled}
      title={label}
      onClick={() => {
        void setAlwaysOnTopEnabled(!alwaysOnTopEnabled);
      }}
    >
      <Pin size={16} />
    </button>
  );
}
