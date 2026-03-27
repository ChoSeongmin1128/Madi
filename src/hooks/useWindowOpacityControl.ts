import { useCallback, useEffect, useState } from 'react';
import { usePreferencesController } from '../app/controllers';
import { useWorkspaceStore } from '../stores/workspaceStore';

export function useWindowOpacityControl() {
  const { previewWindowOpacityPercent, setWindowOpacityPercent } = usePreferencesController();
  const persistedOpacity = useWorkspaceStore((state) => state.windowOpacityPercent);
  const [draftOpacity, setDraftOpacity] = useState(persistedOpacity);

  useEffect(() => {
    setDraftOpacity(persistedOpacity);
  }, [persistedOpacity]);

  const previewOpacity = useCallback(async (percent: number) => {
    setDraftOpacity(percent);

    try {
      await previewWindowOpacityPercent(percent);
    } catch {
      setDraftOpacity(persistedOpacity);
    }
  }, [persistedOpacity, previewWindowOpacityPercent]);

  const commitOpacity = useCallback(async (percent: number) => {
    const nextPercent = Math.round(percent);
    if (nextPercent === persistedOpacity) {
      setDraftOpacity(nextPercent);
      return nextPercent;
    }

    try {
      const result = await setWindowOpacityPercent(nextPercent);
      setDraftOpacity(result);
      return result;
    } catch {
      setDraftOpacity(persistedOpacity);
      return persistedOpacity;
    }
  }, [persistedOpacity, setWindowOpacityPercent]);

  return {
    draftOpacity,
    persistedOpacity,
    setDraftOpacity,
    previewOpacity,
    commitOpacity,
  };
}
