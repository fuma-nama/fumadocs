'use client';
import { type ReactNode, useCallback } from 'react';
import { useReducedMotion } from 'motion/react';
import { BEAT } from '../lib/motion';
import { setStatus } from '../lib/status';
import { address, level, print, show } from '../ui/site-tile';

const runs = new Map<HTMLCanvasElement, number>();
/** the size and theme each print was made for */
const made = new WeakMap<HTMLCanvasElement, string>();

/** makes a screenshot's print, once per size and theme; false while the image isn't decoded */
export function prepare(canvas: HTMLCanvasElement, image: HTMLImageElement): boolean {
  if (!image.complete || image.naturalWidth === 0) return false;
  const box = canvas.parentElement!;
  const key = `${box.clientWidth}x${box.clientHeight} ${document.documentElement.classList.contains('dark')}`;
  if (made.get(canvas) !== key) {
    print(canvas, image);
    made.set(canvas, key);
  }
  return true;
}

export function isDithering(canvas: HTMLCanvasElement): boolean {
  return runs.has(canvas);
}

/**
 * Dither: crossfades a screenshot's 1-bit print from `from` to `to` of 16 levels in steps, `16` is
 * the full print over the screenshot, `0` the screenshot in colour (the canvas hides again).
 * `from` equal to `to` shows that level at once.
 */
export function dither(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  from: number,
  to: number,
  duration = BEAT,
) {
  cancelAnimationFrame(runs.get(canvas) ?? 0);
  runs.delete(canvas);
  if (!prepare(canvas, image)) return;
  show(canvas, from);
  canvas.style.visibility = 'visible';
  if (from === to) return;
  const start = performance.now();
  const tick = (now: number) => {
    const t = now - start;
    show(canvas, from + ((to - from) * level(t, duration)) / 16);
    if (t < duration) {
      runs.set(canvas, requestAnimationFrame(tick));
      return;
    }
    runs.delete(canvas);
    if (to === 0) canvas.style.visibility = '';
  };
  runs.set(canvas, requestAnimationFrame(tick));
}

/** ends a crossfade at once, in colour */
export function develop(canvas: HTMLCanvasElement) {
  cancelAnimationFrame(runs.get(canvas) ?? 0);
  runs.delete(canvas);
  show(canvas, 0);
  canvas.style.visibility = '';
}

/** Morph: sweeps a glyph through every pixel shape of Geist Pixel in a beat */
function morph(glyph: HTMLElement) {
  if (glyph.getAnimations().length > 0) return;
  glyph.animate([{ fontVariationSettings: "'ELSH' 0" }, { fontVariationSettings: "'ELSH' 100" }], {
    duration: BEAT,
    easing: 'steps(8, end)',
  });
}

/**
 * The tiles inside print their screenshot in 1-bit when pointed at and develop it back into colour
 * in a beat, while the status bar names where they lead. A print is made on a tile's first hover.
 */
export function Develop({ className, children }: { className?: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return;
      let current: HTMLAnchorElement | null = null;

      function enter(tile: HTMLAnchorElement) {
        current = tile;
        setStatus(`open ${address(tile.href)}`);
        if (reduced) return;
        const canvas = tile.querySelector('canvas');
        const image = tile.querySelector('img');
        if (canvas && image && !isDithering(canvas)) dither(canvas, image, 16, 0);
        const glyph = tile.querySelector<HTMLElement>('[data-glyph]');
        if (glyph) morph(glyph);
      }

      function leave() {
        current = null;
        const figure = element!.closest<HTMLElement>('[data-figure]');
        if (figure?.dataset.status) setStatus(figure.dataset.status);
      }

      const onPointerOver = (event: PointerEvent) => {
        const tile = (event.target as Element).closest('a');
        if (event.pointerType !== 'touch' && tile && tile !== current) enter(tile);
      };
      const onPointerLeave = (event: PointerEvent) => {
        if (event.pointerType !== 'touch') leave();
      };
      // keyboard focus only, a click focuses the tile it already developed
      const onFocusIn = (event: FocusEvent) => {
        const tile = (event.target as Element).closest('a');
        if (tile?.matches(':focus-visible')) enter(tile);
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
        for (const canvas of element.querySelectorAll('canvas')) develop(canvas);
      };
    },
    [reduced],
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
