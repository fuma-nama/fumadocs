'use client';
import { type ReactNode, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { BEAT } from '../lib/motion';
import { restore, setStatus } from '../lib/status';
import { address } from '../ui/site-tile';

/** Morph: sweeps a glyph through every pixel shape of Geist Pixel in a beat */
function morph(glyph: HTMLElement) {
  if (glyph.getAnimations().length > 0) return;
  glyph.animate([{ fontVariationSettings: "'ELSH' 0" }, { fontVariationSettings: "'ELSH' 100" }], {
    duration: BEAT,
    easing: 'steps(8, end)',
  });
}

/**
 * A list whose links show where they lead in the status bar while pointed at or focused; a site
 * without a screenshot morphs its initial.
 */
export function Peek({ className, children }: { className: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  const peeked = useRef<HTMLAnchorElement | null>(null);

  function enter(link: HTMLAnchorElement) {
    peeked.current = link;
    setStatus(`open ${address(link.href)}`);
    const glyph = link.querySelector<HTMLElement>('[data-glyph]');
    if (glyph && !reduced) morph(glyph);
  }

  function leave() {
    peeked.current = null;
    restore();
  }

  return (
    <ul
      className={className}
      onPointerOver={(event) => {
        const link = (event.target as Element).closest('a');
        if (event.pointerType !== 'touch' && link && link !== peeked.current) enter(link);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'touch') leave();
      }}
      onFocus={(event) => {
        const link = event.target.closest('a');
        if (link?.matches(':focus-visible')) enter(link);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) leave();
      }}
    >
      {children}
    </ul>
  );
}
