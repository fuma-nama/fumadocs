'use client';
import { type Key, type ReactNode, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { DITHER_MASKS } from '../lib/bayer';
import { cn } from '@/lib/cn';

/** WAAPI keyframes that dither an element in, `cell` CSS px per dither pixel */
export function ditherKeyframes(cell: number): Keyframe[] {
  const size = `${cell * 4}px ${cell * 4}px`;
  const frames: Keyframe[] = [];
  for (let i = 0; i <= 16; i++) frames.push({ maskImage: DITHER_MASKS[i], maskSize: size });
  return frames;
}

interface DitherSwapProps {
  /** a new key dithers the new children in over the old ones */
  swapKey: Key;
  /** keep them static for a given key, the outgoing layer reuses them */
  children: ReactNode;
  /** size of a dither pixel in CSS px */
  cell?: number;
  duration?: number;
  className?: string;
}

/** crossfade through an ordered dither, both layers share one grid cell */
export function DitherSwap({
  swapKey,
  children,
  cell = 4,
  duration = 420,
  className,
}: DitherSwapProps) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState<{ key: Key; node: ReactNode }>({
    key: swapKey,
    node: children,
  });
  const [outgoing, setOutgoing] = useState<{ key: Key; node: ReactNode } | null>(null);
  if (shown.key !== swapKey) {
    setShown({ key: swapKey, node: children });
    if (!reduced) setOutgoing(shown);
  }

  return (
    <div className={cn('grid *:col-start-1 *:row-start-1', className)}>
      {outgoing && (
        <div key={outgoing.key} aria-hidden inert>
          {outgoing.node}
        </div>
      )}
      <Incoming
        key={swapKey}
        animate={outgoing !== null}
        cell={cell}
        duration={duration}
        onDone={() => setOutgoing(null)}
      >
        {children}
      </Incoming>
    </div>
  );
}

function Incoming({
  animate,
  cell,
  duration,
  onDone,
  children,
}: {
  animate: boolean;
  cell: number;
  duration: number;
  onDone: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const done = useEffectEvent(onDone);

  useLayoutEffect(() => {
    if (!animate) return;
    const animation = ref.current!.animate(ditherKeyframes(cell), { duration });
    animation.onfinish = () => done();
    return () => animation.cancel();
  }, [animate, cell, duration]);

  return <div ref={ref}>{children}</div>;
}
