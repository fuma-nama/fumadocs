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
