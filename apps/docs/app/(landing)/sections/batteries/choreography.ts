import { DITHER_MASKS } from '../../lib/bayer';
import { TICK } from '../../lib/motion';
import { CELL } from './px';

/** hold `css` from `tick` on, or with `steps`, move to the next pose in that many steps */
export type Pose = readonly [tick: number, css: string, steps?: number];

export interface Track {
  /** the key pose, kept with reduced motion */
  base?: string;
  poses?: readonly Pose[];
  /** a longer cycle for this track, e.g. a flap that changes once per loop */
  ticks?: number;
}

export interface Choreography<K extends string = string> {
  name: string;
  /** loop length in ms */
  dur: number;
  css: string;
  /** class name of each track */
  cls: Record<K, string>;
}

/**
 * Keyframes of a mechanism on the tick grid: every track loops over `ticks` ticks of 125 ms,
 * poses hold until the next one (`steps(1, end)` from `.bt-a`).
 */
export function choreograph<T extends Record<string, Track>>(
  name: string,
  ticks: number,
  tracks: T,
): Choreography<keyof T & string> {
  let css = '';
  const cls = {} as Record<keyof T & string, string>;
  for (const key in tracks) {
    const id = `bt-${name}-${key}`;
    const { base = '', poses, ticks: length = ticks } = tracks[key];
    cls[key] = poses ? `bt-a ${id}` : id;
    let rule = base;
    if (poses) rule += `;animation-name:${id}`;
    if (length !== ticks) rule += `;--bt-dur:${length * TICK}ms`;
    css += `.${id}{${rule}}`;
    if (!poses) continue;
    css += `@keyframes ${id}{`;
    for (const [tick, decl, steps] of poses) {
      const timing = steps ? `;animation-timing-function:steps(${steps},end)` : '';
      css += `${+((tick / length) * 100).toFixed(4)}%{${decl}${timing}}`;
    }
    css += '}';
  }
  return { name, dur: ticks * TICK, css, cls };
}

/** visible from tick `from` until tick `to` */
export function show(from: number, to: number): Pose[] {
  const poses: Pose[] = [
    [from, 'opacity:1'],
    [to, 'opacity:0'],
  ];
  if (from > 0) poses.unshift([0, 'opacity:0']);
  return poses;
}

/** an ordered dither mask keeping `level` of 16 cells, on the pixel grid */
function mask(level: number): string {
  return `mask-image:${DITHER_MASKS[level]};mask-size:${4 * CELL}px ${4 * CELL}px`;
}

/** like `show`, the first tick through a 50% ordered dither */
export function pop(from: number, to: number): Pose[] {
  const poses: Pose[] = [
    [from, `opacity:1;${mask(8)}`],
    [from + 1, 'mask-image:none'],
    [to, 'opacity:0'],
  ];
  if (from > 0) poses.unshift([0, 'opacity:0']);
  return poses;
}

/** like `show`, developing through the ordered dither a quarter per tick */
export function develop(from: number, to: number): Pose[] {
  return [
    [0, 'opacity:0'],
    [from, `opacity:1;${mask(4)}`],
    [from + 1, mask(8)],
    [from + 2, mask(12)],
    [from + 3, 'mask-image:none'],
    [to, 'opacity:0'],
  ];
}

/** moves a strip up by `cells` */
export function up(cells: number): string {
  return `transform:translateY(${-cells * CELL}px)`;
}

/**
 * a strip of `count` rows `h` cells tall plus a copy of the first, rolling to the next row
 * every `every` ticks with one half-way frame
 */
export function cycle(h: number, every: number, count: number): Track {
  const poses: Pose[] = [];
  for (let i = 0; i < count; i++) {
    poses.push([i * every, up((i === 0 ? count : i) * h - h / 2)]);
    poses.push([i * every + 1, up(i * h)]);
  }
  return { poses, ticks: every * count };
}
