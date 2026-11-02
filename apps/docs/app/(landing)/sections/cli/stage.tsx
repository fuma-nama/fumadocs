'use client';
import type { ReactNode } from 'react';
import { mount } from '../../lib/script';
import { createCli } from './engine';

const play = mount(createCli);

/**
 * The stage under the section's text: the windows on the wall, the machine drawn in front of them.
 * From 1280px, where its 16:9 window is tall enough for the riser, it takes the window's height.
 */
export function Stage({ children }: { children: ReactNode }) {
  return (
    <div
      ref={play}
      className="relative grid grid-cols-1 px-(--lp-gutter) pb-(--lp-section) md:grid-cols-[minmax(0,1fr)_240px] md:gap-x-6 xl:grid-cols-[260px_244px_44px_minmax(0,1fr)] xl:gap-x-0 xl:[--cli-top:96px]"
    >
      {children}
      <canvas aria-hidden className="pointer-events-none absolute inset-0 z-10 size-full" />
    </div>
  );
}
