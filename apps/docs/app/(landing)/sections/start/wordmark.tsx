'use client';
import { later } from '../../lib/later';
import { createSand } from './sand';

function mount(host: HTMLDivElement | null) {
  if (host) return later(() => createSand(host));
}

/** the footer wordmark, filled by falling glyphs */
export function Wordmark() {
  return (
    <div
      ref={mount}
      role="img"
      aria-label="Fumadocs"
      className="mx-(--lp-gutter) h-[clamp(96px,22vw,320px)] touch-pan-y overflow-hidden"
    >
      <canvas className="block" />
    </div>
  );
}
