import { TICK } from '../../lib/motion';

/** boot beats, in ticks from the start */
export const BEAT_AT = {
  orbits: 2,
  outline: 5,
  satellites: 6,
  glitch: 9,
  ready: 13,
} as const;

let start: number | null | undefined;

/**
 * Start of the hero's boot (`performance.now()` time), shared by its client parts. The first call
 * decides, whichever part makes it: the boot plays once per page load, only when motion is allowed
 * and the hero's figure around `element` is on screen. `null` means show the final state.
 */
export function bootStart(element: Element): number | null {
  if (start !== undefined) return start;
  const rect = (element.closest('[data-figure]') ?? element).getBoundingClientRect();
  const visible = rect.bottom > 0 && rect.top < window.innerHeight;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  start = visible && !reduced ? performance.now() : null;
  return start;
}

/** ms until a beat, negative once it passed */
export function untilBeat(start: number, tick: number): number {
  return start + tick * TICK - performance.now();
}
