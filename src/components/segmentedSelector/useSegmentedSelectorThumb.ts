import {
  animate,
  useMotionValue,
  type AnimationPlaybackControls,
} from 'framer-motion';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import type { ThumbRect } from './shared';

interface UseSegmentedSelectorThumbOptions<T extends string> {
  groupRef: React.RefObject<HTMLDivElement | null>;
  optionRefs: React.RefObject<Map<T, HTMLButtonElement>>;
  selectedValue: T;
  columns: number;
  layout: 'inline' | 'palette';
  options: readonly { value: T }[];
}

export function useSegmentedSelectorThumb<T extends string>({
  groupRef,
  optionRefs,
  selectedValue,
  columns,
  layout,
  options,
}: UseSegmentedSelectorThumbOptions<T>) {
  const controlsRef = useRef<AnimationPlaybackControls[]>([]);
  const isAnimatingRef = useRef(false);
  const [hasThumb, setHasThumb] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [transformOrigin, setTransformOrigin] = useState('center center');

  const thumbX = useMotionValue(0);
  const thumbY = useMotionValue(0);
  const thumbWidth = useMotionValue(0);
  const thumbHeight = useMotionValue(0);
  const optionElements = optionRefs.current;

  const stopAnimations = useCallback(() => {
    controlsRef.current.forEach((control) => control.stop());
    controlsRef.current = [];
  }, []);

  const applyThumbRect = useCallback((rect: ThumbRect) => {
    thumbX.set(rect.x);
    thumbY.set(rect.y);
    thumbWidth.set(rect.width);
    thumbHeight.set(rect.height);
    setHasThumb(true);
  }, [thumbHeight, thumbWidth, thumbX, thumbY]);

  const measureOptionRect = useCallback((optionValue: T) => {
    const groupElement = groupRef.current;
    const optionElement = optionElements.get(optionValue);

    if (!groupElement || !optionElement) {
      return null;
    }

    const groupRect = groupElement.getBoundingClientRect();
    const optionRect = optionElement.getBoundingClientRect();

    return {
      x: optionRect.left - groupRect.left,
      y: optionRect.top - groupRect.top,
      width: optionRect.width,
      height: optionRect.height,
    };
  }, [groupRef, optionElements]);

  const animateThumb = useCallback((fromRect: ThumbRect | null, toRect: ThumbRect | null) => {
    if (!toRect) {
      return;
    }

    stopAnimations();

    if (!fromRect) {
      applyThumbRect(toRect);
      setIsAnimating(false);
      isAnimatingRef.current = false;
      return;
    }

    setHasThumb(true);
    setTransformOrigin(toRect.x >= fromRect.x ? 'left center' : 'right center');
    setIsAnimating(true);
    isAnimatingRef.current = true;

    controlsRef.current = [
      animate(thumbX, toRect.x, { type: 'spring', stiffness: 420, damping: 34, mass: 0.88 }),
      animate(thumbY, toRect.y, { type: 'spring', stiffness: 420, damping: 34, mass: 0.88 }),
      animate(thumbWidth, toRect.width, { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }),
      animate(thumbHeight, toRect.height, { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }),
      animate(0, 1, {
        duration: 0.22,
        ease: [0.22, 1, 0.36, 1],
        onComplete: () => {
          setIsAnimating(false);
          isAnimatingRef.current = false;
        },
      }),
    ];
  }, [applyThumbRect, stopAnimations, thumbHeight, thumbWidth, thumbX, thumbY]);

  useLayoutEffect(() => {
    const frameId = requestAnimationFrame(() => {
      const rect = measureOptionRect(selectedValue);
      if (!rect || isAnimatingRef.current) {
        return;
      }
      applyThumbRect(rect);
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [applyThumbRect, columns, layout, measureOptionRect, options, selectedValue]);

  useEffect(() => {
    let frameId = 0;

    const syncRect = () => {
      const rect = measureOptionRect(selectedValue);
      if (!rect || isAnimatingRef.current) {
        return;
      }
      applyThumbRect(rect);
    };

    const scheduleSync = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(syncRect);
    };

    scheduleSync();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', scheduleSync);
      return () => {
        cancelAnimationFrame(frameId);
        window.removeEventListener('resize', scheduleSync);
      };
    }

    const observer = new ResizeObserver(scheduleSync);
    const groupElement = groupRef.current;

    if (groupElement) {
      observer.observe(groupElement);
    }

    optionElements.forEach((optionElement) => {
      observer.observe(optionElement);
    });

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [applyThumbRect, groupRef, measureOptionRect, optionElements, options, selectedValue]);

  useEffect(() => () => {
    stopAnimations();
  }, [stopAnimations]);

  const thumbStyle = {
    x: thumbX,
    y: thumbY,
    width: thumbWidth,
    height: thumbHeight,
    transformOrigin,
  } as unknown as CSSProperties;

  return {
    animateThumb,
    hasThumb,
    isAnimating,
    measureOptionRect,
    thumbStyle,
  };
}
