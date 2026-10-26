'use client';
import { type ReactNode, useCallback } from 'react';
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
 * The status bar names where a pointed or focused link inside leads; a site without a screenshot
 * morphs its initial.
 */
export function Peek({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return;
      let current: HTMLAnchorElement | null = null;

      function enter(link: HTMLAnchorElement) {
        current = link;
        setStatus(`open ${address(link.href)}`);
        const glyph = link.querySelector<HTMLElement>('[data-glyph]');
        if (glyph && !reduced) morph(glyph);
      }

      function leave() {
        current = null;
        restore();
      }

      const onPointerOver = (event: PointerEvent) => {
        const link = (event.target as Element).closest('a');
        if (event.pointerType !== 'touch' && link && link !== current) enter(link);
      };
      const onPointerLeave = (event: PointerEvent) => {
        if (event.pointerType !== 'touch') leave();
      };
      const onFocusIn = (event: FocusEvent) => {
        const link = (event.target as Element).closest('a');
        if (link?.matches(':focus-visible')) enter(link);
      };
      const onFocusOut = (event: FocusEvent) => {
        if (!element.contains(event.relatedTarget as Node | null)) leave();
      };

      element.addEventListener('pointerover', onPointerOver);
      element.addEventListener('pointerleave', onPointerLeave);
      element.addEventListener('focusin', onFocusIn);
      element.addEventListener('focusout', onFocusOut);
      return () => {
        element.removeEventListener('pointerover', onPointerOver);
        element.removeEventListener('pointerleave', onPointerLeave);
        element.removeEventListener('focusin', onFocusIn);
        element.removeEventListener('focusout', onFocusOut);
      };
    },
    [reduced],
  );

  return <div ref={ref}>{children}</div>;
}
