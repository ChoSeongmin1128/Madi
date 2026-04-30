import {
  Cloud,
  Keyboard,
  Monitor,
  Palette,
  PencilLine,
  RefreshCw,
  Settings2,
} from 'lucide-react';

export type SettingsCategoryId =
  | 'general'
  | 'appearance'
  | 'editing'
  | 'window'
  | 'sync'
  | 'updates'
  | 'advanced';

export const SETTINGS_CATEGORIES = [
  {
    id: 'general',
    label: '일반',
    description: '기본 동작',
    icon: Settings2,
  },
  {
    id: 'appearance',
    label: '외형',
    description: '테마와 표면',
    icon: Palette,
  },
  {
    id: 'editing',
    label: '편집',
    description: '글꼴과 블록',
    icon: PencilLine,
  },
  {
    id: 'window',
    label: '창',
    description: '창과 단축키',
    icon: Monitor,
  },
  {
    id: 'sync',
    label: '동기화',
    description: 'iCloud 상태',
    icon: Cloud,
  },
  {
    id: 'updates',
    label: '업데이트',
    description: '버전 확인',
    icon: RefreshCw,
  },
  {
    id: 'advanced',
    label: '고급',
    description: '진단과 복구',
    icon: Keyboard,
  },
] as const satisfies ReadonlyArray<{
  id: SettingsCategoryId;
  label: string;
  description: string;
  icon: typeof Settings2;
}>;
