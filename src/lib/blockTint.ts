import type { BlockTintPreset } from './types';

export const BLOCK_TINT_PRESETS: Array<{
  id: BlockTintPreset;
  label: string;
  description: string;
}> = [
  {
    id: 'mist',
    label: 'Mist',
    description: '중립적인 회청 톤',
  },
  {
    id: 'sage-rose',
    label: 'Sage / Rose',
    description: '녹색과 분홍의 약한 대비',
  },
  {
    id: 'sky-amber',
    label: 'Sky / Amber',
    description: '차가운 하늘색과 따뜻한 호박색',
  },
  {
    id: 'mint-plum',
    label: 'Mint / Plum',
    description: '민트와 자두색의 부드러운 대비',
  },
  {
    id: 'ocean-sand',
    label: 'Ocean / Sand',
    description: '바다색과 모래색 기반',
  },
  {
    id: 'violet-lime',
    label: 'Violet / Lime',
    description: '보라와 라임의 연한 보색 대비',
  },
];

export const DEFAULT_BLOCK_TINT_PRESET: BlockTintPreset = 'mist';
