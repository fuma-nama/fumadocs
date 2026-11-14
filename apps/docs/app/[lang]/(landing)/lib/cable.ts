import type { Rect } from './motion';

/**
 * The page's cable, one for every wire: a 4px double rail, ink round a paper core, run at right
 * angles with each corner cut by an 8px chamfer, a clip across it every 112px or so of straight run
 * and a 6px plug at its ends, all on whole px. A figure gives its waypoints from port to port; the
 * cable draws itself into an svg in a box of its own, wipes on a run at a time, and gives its centre
 * line to whatever rides it.
 */

export type Point = [number, number];

/** a port's classes: the window it's on draws it, centred on its cable's end */
export const PORT =
  'pointer-events-none absolute top-0 left-0 size-3 border border-lp-ink bg-lp-paper after:absolute after:inset-0.75 after:bg-lp-ink';

/** `port` centred on `p`, on the window whose box is `rect` */
export function plug(port: HTMLElement, rect: Rect, [x, y]: Point) {
  port.style.left = `${x - rect.x - 6}px`;
  port.style.top = `${y - rect.y - 6}px`;
}

export interface Cable {
  /** its centre line in its layer's px: the waypoints with each corner cut, end to end */
  line: Point[];
  /** the length along `line` to each of its points */
  lengths: number[];
  /** its box's corner in the layer */
  origin: Point;
  /** its clips' places along each run between its waypoints, as shares of the run */
  clips: number[][];
}

/** a cable's head as it draws on: steady, easing into its plug */
export const GROW = 'cubic-bezier(0.3, 0.5, 0.5, 1)';

const CHAMFER = 8;
const CLIP = 112;
/** px either side of the centre line a straight run's drawing reaches: half a clip, whole */
const REACH = 7;

function toward(from: Point, to: Point, d: number): Point {
  const l = Math.hypot(to[0] - from[0], to[1] - from[1]);
  return [from[0] + ((to[0] - from[0]) / l) * d, from[1] + ((to[1] - from[1]) / l) * d];
}

/** the clips' places on a straight run `l` px long: none near its ends, one in the middle of a
 * short run */
function clips(l: number): number[] {
  if (l < CLIP * 0.9) return l >= 56 ? [l / 2] : [];
  const n = Math.floor((l - 40) / CLIP);
  const at: number[] = [];
  for (let k = 0; k <= n; k++) at.push(20 + ((l - 40) * (k + 0.5)) / (n + 1));
  return at;
}

/**
 * A cable along orthogonal `points`, on whole px in its layer, drawn into `box`, an absolutely placed
 * element in that layer that it sizes to itself: an element, as the compositor wipes one but not an
 * svg. Between `ports` its plugs butt the port at each end;
 * without, it comes out from under a window's edge and ends in its plug. A run of no length is none,
 * and a corner between runs shorter than two chamfers is cut by half the shorter, so a run shrinking
 * to nothing straightens the cable without a jump. Its clips are spaced by each run's length, or put
 * at `places`, shares of each run as its `clips` gave them, so a moving cable keeps them riding.
 * `core` is its core's stroke class.
 */
export function cable(
  box: HTMLElement,
  waypoints: Point[],
  ports = true,
  places?: number[][],
  core = 'stroke-lp-paper',
): Cable {
  const points = waypoints.filter(
    (p, i) => i === 0 || p[0] !== waypoints[i - 1][0] || p[1] !== waypoints[i - 1][1],
  );
  const run = (i: number) =>
    Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
  const line: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const cut = Math.min(CHAMFER, run(i - 1) / 2, run(i) / 2);
    line.push(toward(points[i], points[i - 1], cut), toward(points[i], points[i + 1], cut));
  }
  if (points.length > 1) line.push(points[points.length - 1]);
  const lengths = [0];
  for (let i = 1; i < line.length; i++)
    lengths.push(
      lengths[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]),
    );

  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of line) {
    x0 = Math.min(x0, x - REACH);
    y0 = Math.min(y0, y - REACH);
    x1 = Math.max(x1, x + REACH);
    y1 = Math.max(y1, y + REACH);
  }
  box.style.left = `${x0}px`;
  box.style.top = `${y0}px`;
  box.style.width = `${x1 - x0}px`;
  box.style.height = `${y1 - y0}px`;

  const d = `M${line.map(([x, y]) => `${x - x0} ${y - y0}`).join('L')}`;
  const path = (tone: string, width: number) =>
    `<path d="${d}" class="${tone}" fill="none" stroke-width="${width}" stroke-linejoin="miter" shape-rendering="crispEdges"/>`;
  let fittings = '';
  const shares: number[][] = [];
  for (let i = 0; i + 1 < waypoints.length; i++) {
    const [a, b] = [waypoints[i], waypoints[i + 1]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const given = places?.[i];
    const at = given ? given.map((share) => share * l) : clips(l);
    shares.push(given ?? at.map((d) => d / l));
    if (!l) continue;
    const across = a[0] === b[0];
    for (const d of at) {
      const [cx, cy] = toward(a, b, d).map(Math.round);
      const [w, h] = across ? [13, 5] : [5, 13];
      fittings += `<rect x="${cx - x0 - w / 2}" y="${cy - y0 - h / 2}" width="${w}" height="${h}" class="fill-lp-paper stroke-lp-ink" stroke-width="1" shape-rendering="crispEdges"/>`;
    }
  }
  // a plug butting the 12px port centred on each end, or else at the last
  const ends: [Point, Point][] = [];
  if (points.length > 1) ends.push([points[points.length - 1], points[points.length - 2]]);
  if (ports && points.length > 1) ends.push([points[0], points[1]]);
  for (const [end, next] of ends) {
    const [px, py] = toward(end, next, ports ? 9 : 3);
    fittings += `<rect x="${px - x0 - 3}" y="${py - y0 - 3}" width="6" height="6" class="fill-lp-ink"/>`;
  }
  box.innerHTML = `<svg width="${x1 - x0}" height="${y1 - y0}" style="display:block">${path('stroke-lp-ink', 4) + path(core, 2) + fittings}</svg>`;
  return { line, lengths, origin: [x0, y0], clips: shares };
}

/**
 * Keyframes for its box's `clip-path` that draw `c` on from its first end, its head at an even pace
 * (ease the animation to ease the head). Each straight run shows from its start to the head, the
 * clip's edge across it, so it never jumps; a chamfer shows whole with the run it leads to.
 */
export function wipe(c: Cable): Keyframe[] {
  const { line, lengths, origin } = c;
  const local = line.map(([x, y]): Point => [x - origin[0], y - origin[1]]);
  const slanted = (j: number) => local[j][0] !== local[j + 1][0] && local[j][1] !== local[j + 1][1];
  /**
   * the box stretch `j` shows, at nothing or whole: a straight one's reach across it, from its start
   * to its end, a chamfer's hull; each wound the same way round, so where they overlap they add up
   */
  const box = (j: number, shown: boolean): Point[] => {
    const a = local[j];
    if (slanted(j) && !shown) return [a, a, a, a];
    const b = shown ? local[j + 1] : a;
    const [dx, dy] = slanted(j) ? [3, 3] : a[1] === local[j + 1][1] ? [0, REACH] : [REACH, 0];
    const [l, r] = [Math.min(a[0], b[0]) - dx, Math.max(a[0], b[0]) + dx];
    const [t, d] = [Math.min(a[1], b[1]) - dy, Math.max(a[1], b[1]) + dy];
    return [
      [l, t],
      [r, t],
      [r, d],
      [l, d],
    ];
  };
  /** every stretch drawn up to point `v`, the chamfer from it too if `lead`; the rest at nothing */
  const at = (v: number, lead: boolean): string => {
    const loops: Point[][] = [];
    for (let j = 0; j + 1 < local.length; j++) loops.push(box(j, j < v || (lead && j === v)));
    // each stretch round once, then back along the seams joining them, which hold no area
    const points: Point[] = [];
    for (const loop of loops) points.push(...loop, loop[0]);
    for (let j = loops.length - 2; j >= 0; j--) points.push(loops[j][0]);
    return `polygon(${points.map(([x, y]) => `${+x.toFixed(2)}px ${+y.toFixed(2)}px`).join(', ')})`;
  };
  const total = lengths[lengths.length - 1];
  const frames: Keyframe[] = [];
  if (!total) return frames;
  for (let v = 0; v < local.length; v++) {
    const offset = lengths[v] / total;
    frames.push({ offset, clipPath: at(v, false) });
    if (v + 1 < local.length && slanted(v)) frames.push({ offset, clipPath: at(v, true) });
  }
  return frames;
}
