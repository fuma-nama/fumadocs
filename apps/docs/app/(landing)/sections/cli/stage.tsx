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
 * The stage: the page's windows on the wall, the machine drawn in front of them. A phone stacks
 * them; from 1024px they share a grid, from 1280px in one screen.
 */
export function Stage({ children }: { children: ReactNode }) {
  return (
    <div
      ref={mount}
      className="relative flex flex-col px-(--lp-gutter) pt-14 pb-16 lg:grid lg:grid-cols-[minmax(0,1fr)_236px_40px_300px] lg:grid-rows-[auto_auto_1fr] lg:pt-10 lg:pb-12 lg:[--cli-top:112px] xl:h-[max(800px,min(816px,calc(100svh-var(--lp-menu-h)-var(--lp-status-h))))] xl:grid-cols-[340px_minmax(0,1fr)_236px_44px_minmax(0,30%)] xl:pb-0 xl:[--cli-top:120px]"
    >
      {children}
      <canvas aria-hidden className="pointer-events-none absolute inset-0 z-10 size-full" />
    </div>
  );
}
