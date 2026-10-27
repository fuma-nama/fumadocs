'use client';
import { type Key, type ReactNode, useCallback, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { ditherKeyframes } from '../lib/dither';
import { settleCss } from '../lib/motion';
import { cn } from '@/lib/cn';

interface Layer {
  key: Key;
  node: ReactNode;
}

interface DitherSwapProps {
  /** a new key dithers the new children in over the old ones */
  swapKey: Key;
  /** keep them static for a given key, the outgoing layer reuses them */
  children: ReactNode;
  /** size of a dither pixel in CSS px */
  cell?: number;
  duration?: number;
  /** both layers paint the paper, so the outgoing one never shows through the dither */
  opaque?: boolean;
  /** ms in which the height eases from the outgoing children's to the incoming ones' */
  resize?: number;
  className?: string;
}

/** crossfade through an ordered dither, both layers share one grid cell */
export function DitherSwap({
  swapKey,
  children,
  cell = 4,
  duration = 420,
  opaque = false,
  resize = 0,
  className,
}: DitherSwapProps) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState<Layer>({ key: swapKey, node: children });
  const [outgoing, setOutgoing] = useState<Layer | null>(null);
  if (shown.key !== swapKey) {
    setShown({ key: swapKey, node: children });
    if (!reduced) setOutgoing(shown);
  }
  const easing = useRef<Animation | undefined>(undefined);
  const ditherIn = useCallback(
    (incoming: HTMLDivElement) => {
      const animation = incoming.animate(ditherKeyframes(cell), { duration });
      animation.onfinish = () => setOutgoing(null);
      if (resize > 0) {
        easing.current?.cancel();
        // the outgoing layer is out of the flow, the box already has the incoming one's height
        const from = (incoming.previousElementSibling as HTMLElement).offsetHeight;
        const to = incoming.offsetHeight;
        if (from !== to) {
          easing.current = incoming.parentElement!.animate(
            [{ height: `${from}px` }, { height: `${to}px` }],
            { duration: resize, easing: settleCss },
          );
        }
      }
      return () => animation.cancel();
    },
    [cell, duration, resize],
  );
  const paper = opaque ? 'isolate bg-lp-paper' : undefined;

  return (
    <div
      className={cn(
        'grid *:col-start-1 *:row-start-1',
        resize > 0 && 'relative items-start',
        className,
      )}
    >
      {outgoing && (
        <div
          key={outgoing.key}
          aria-hidden
          inert
          className={resize > 0 ? cn('absolute inset-x-0 top-0', paper) : paper}
        >
          {outgoing.node}
        </div>
      )}
      <div key={swapKey} ref={outgoing ? ditherIn : undefined} className={paper}>
        {children}
      </div>
    </div>
  );
}
