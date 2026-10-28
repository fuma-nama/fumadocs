/** 120 bpm, graphic beats (pops, flashes, stagger) snap to sixteenths */
export const BEAT = 500;
export const TICK = BEAT / 4;

/** the one easing for things that move: a long exponential settle */
export const settle = [0.16, 1, 0.3, 1] as const;
export const settleCss = `cubic-bezier(${settle.join(', ')})`;

/** symmetric curve for camera moves (stage pans and zooms) */
export const camera = [0.65, 0, 0.35, 1] as const;

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(a: number, b: number, t: number): number {
  const x = clamp((t - a) / (b - a));
  return x * x * (3 - 2 * x);
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** `el`'s box from `origin`'s top left */
export function rectIn(el: Element, origin: DOMRect): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height };
}

/**
 * Lets a script steer `el` by its `transform` each frame as cheaply as an animation, till the
 * returned release: Chrome lays the whole page out in layers again for each change, unless an
 * animation is current on it, as this paused one that adds nothing stays. It then takes `el` to
 * cover anything painted after it, so a clip round it keeps that to the clip.
 */
export function steer(el: Element): () => void {
  const animation = el.animate({ transform: ['none', 'none'] }, { duration: 1, composite: 'add' });
  animation.pause();
  return () => animation.cancel();
}
