'use client';
import type { ReactNode } from 'react';
import { createCli } from './engine';

function mount(root: HTMLDivElement | null) {
  if (!root) return;
  // the WebGL context and its shader wait until the figure is within a viewport of the screen
  let destroy: (() => void) | undefined;
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      destroy = createCli(root);
    },
    { rootMargin: '100% 0px' },
  );
  observer.observe(root);
  return () => {
    observer.disconnect();
    destroy?.();
  };
}

/**
 * The stage, a row of its own under the section's text: the page's windows on the wall, the
 * machine drawn in front of them. A phone stacks them, a tablet puts your project beside the editor
 * and the page; from 1024px the machine and your project stand on the left, the editor and the
 * page take the rest, in a stage of a fixed height, lower on a short screen so each act's parts are
 * on it together. Both runs' windows share their cells, so nothing changes size when you switch,
 * and your project's window never takes the size of its list.
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
