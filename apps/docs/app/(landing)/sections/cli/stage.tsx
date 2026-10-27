'use client';
import type { ReactNode } from 'react';
import { whenSeen } from '../../lib/later';
import { createCli } from './engine';

function mount(root: HTMLDivElement) {
  // the WebGL context and its shader wait until the figure is within a viewport of the screen
  let destroy: (() => void) | undefined;
  const stop = whenSeen(
    root,
    () => {
      destroy = createCli(root);
    },
    { rootMargin: '100% 0px' },
  );
  return () => {
    stop();
    destroy?.();
  };
}

/**
 * The stage under the section's text: the windows on the wall, the machine drawn in front of them.
 * From 1280px, where its 16:9 window is tall enough for the riser, it takes the window's height.
 */
export function Stage({ children }: { children: ReactNode }) {
  return (
    <div
      ref={mount}
      className="relative grid grid-cols-[minmax(0,1fr)] px-(--lp-gutter) pb-16 md:grid-cols-[minmax(0,1fr)_240px] md:gap-x-6 xl:grid-cols-[260px_244px_44px_minmax(0,1fr)] xl:gap-x-0 xl:pb-8 xl:[--cli-top:96px]"
    >
      {children}
      <canvas aria-hidden className="pointer-events-none absolute inset-0 z-10 size-full" />
    </div>
  );
}
