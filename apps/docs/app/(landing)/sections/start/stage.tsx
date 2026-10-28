'use client';
import type { ReactNode } from 'react';
import { whenSeen } from '../../lib/later';
import { createStart } from './engine';

function mount(pin: HTMLDivElement) {
  // the WebGL context and its shader wait until the figure is within a viewport of the screen
  let destroy: (() => void) | undefined;
  const stop = whenSeen(pin, () => (destroy = createStart(pin)), { rootMargin: '100% 0px' });
  return () => {
    stop();
    destroy?.();
  };
}

/** the pinned stage: a toon 3D terminal the camera pulls out of, with the call to action beside it */
export function Stage({ children }: { children: ReactNode }) {
  return (
    <div ref={mount} className="relative md:h-[230svh] md:motion-reduce:h-auto">
      <div
        data-stage
        className="relative flex flex-col bg-lp-paper md:sticky md:top-(--lp-menu-h) md:min-h-[calc(100svh-var(--lp-menu-h)-var(--lp-status-h))]"
      >
        <canvas aria-hidden className="absolute inset-0 size-full" />
        <div className="relative grid flex-1 gap-10 px-(--lp-gutter) pt-8 pb-12 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-8 md:pt-[10svh] md:pb-[14svh]">
          <div data-slot aria-hidden className="aspect-4/3 md:aspect-auto" />
          {/* hidden while the camera is in the glass, never while it holds the keyboard's focus */}
          <div
            data-cta
            className="relative flex flex-col justify-center gap-8 transition-opacity duration-250 data-hidden:not-focus-within:pointer-events-none data-hidden:not-focus-within:opacity-0 data-hidden:not-focus-within:transition-none"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
