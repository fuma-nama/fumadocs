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
 * From 1024px its height follows the screen's, so each act's parts are on it together.
 */
export function Stage({ children }: { children: ReactNode }) {
  return (
    <div
      ref={mount}
      className="relative grid grid-cols-[minmax(0,1fr)] px-(--lp-gutter) pb-16 md:grid-cols-[minmax(0,1fr)_240px] md:gap-x-6 lg:h-[clamp(680px,calc(100svh_-_var(--lp-menu-h)_-_var(--lp-status-h)_+_32px),920px)] lg:grid-cols-[230px_240px_40px_minmax(0,1fr)] lg:gap-x-0 lg:pb-12 lg:[--cli-top:112px] xl:h-[clamp(640px,calc(100svh_-_var(--lp-menu-h)_-_var(--lp-status-h)_+_24px),810px)] xl:grid-cols-[260px_244px_44px_minmax(0,1fr)] xl:pb-10 xl:[--cli-top:120px]"
    >
      {children}
      <canvas aria-hidden className="pointer-events-none absolute inset-0 z-10 size-full" />
    </div>
  );
}
