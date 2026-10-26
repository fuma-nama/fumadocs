import { STEP } from './spring';

/** points per cable, its two ends included */
const POINTS = 14;
const GRAVITY = 2600;
const DAMPING = 0.985;
const ITERATIONS = 10;

/**
 * Cables as verlet ropes in board units: points pulled down by gravity, held at their rest
 * length, the two ends pinned to their ports.
 */
export interface Ropes {
  count: number;
  x: Float64Array;
  y: Float64Array;
  px: Float64Array;
  py: Float64Array;
  /** `ax, ay, bx, by` of each cable's ends */
  ends: Float64Array;
  /** the length of each cable */
  rest: Float64Array;
}

export function createRopes(count: number): Ropes {
  const n = count * POINTS;
  return {
    count,
    x: new Float64Array(n),
    y: new Float64Array(n),
    px: new Float64Array(n),
    py: new Float64Array(n),
    ends: new Float64Array(count * 4),
    rest: new Float64Array(count),
  };
}

/** lay each cable straight between its ends, at rest */
function lay(r: Ropes) {
  for (let c = 0; c < r.count; c++) {
    const [ax, ay, bx, by] = r.ends.subarray(c * 4, c * 4 + 4);
    for (let i = 0; i < POINTS; i++) {
      const t = i / (POINTS - 1);
      const k = c * POINTS + i;
      r.x[k] = r.px[k] = ax + (bx - ax) * t;
      r.y[k] = r.py[k] = ay + (by - ay) * t;
    }
  }
}

/** one step: gravity, then the length of each segment; returns the largest move (units) */
export function stepRopes(r: Ropes): number {
  const g = GRAVITY * STEP * STEP;
  let moved = 0;
  for (let c = 0; c < r.count; c++) {
    const base = c * POINTS;
    for (let i = 1; i < POINTS - 1; i++) {
      const k = base + i;
      const vx = (r.x[k] - r.px[k]) * DAMPING;
      const vy = (r.y[k] - r.py[k]) * DAMPING;
      r.px[k] = r.x[k];
      r.py[k] = r.y[k];
      r.x[k] += vx;
      r.y[k] += vy + g;
    }
    const segment = r.rest[c] / (POINTS - 1);
    const last = base + POINTS - 1;
    for (let it = 0; it < ITERATIONS; it++) {
      r.x[base] = r.ends[c * 4];
      r.y[base] = r.ends[c * 4 + 1];
      r.x[last] = r.ends[c * 4 + 2];
      r.y[last] = r.ends[c * 4 + 3];
      for (let i = 0; i < POINTS - 1; i++) {
        const a = base + i;
        const b = a + 1;
        const dx = r.x[b] - r.x[a];
        const dy = r.y[b] - r.y[a];
        const d = Math.hypot(dx, dy) || 1e-6;
        const f = (d - segment) / d;
        // an end pinned to its port doesn't move, its neighbour takes the whole correction
        const fa = i === 0 ? 0 : i === POINTS - 2 ? f : f / 2;
        const fb = i === POINTS - 2 ? 0 : i === 0 ? f : f / 2;
        r.x[a] += dx * fa;
        r.y[a] += dy * fa;
        r.x[b] -= dx * fb;
        r.y[b] -= dy * fb;
      }
    }
    for (let i = 1; i < POINTS - 1; i++) {
      const k = base + i;
      moved = Math.max(moved, Math.abs(r.x[k] - r.px[k]), Math.abs(r.y[k] - r.py[k]));
    }
  }
  return moved;
}

/** from straight to hanging still: the rest shape both the server and the browser draw */
export function settleRopes(r: Ropes) {
  lay(r);
  for (let i = 0; i < 600; i++) if (stepRopes(r) < 1e-4 && i > 60) break;
  // at rest: no speed left
  r.px.set(r.x);
  r.py.set(r.y);
}

/** cable `c` as a smooth SVG path through its points, in board units */
export function ropePath(r: Ropes, c: number): string {
  const base = c * POINTS;
  const f = (v: number) => Math.round(v * 10) / 10;
  let d = `M${f(r.x[base])} ${f(r.y[base])}`;
  for (let i = 1; i < POINTS - 1; i++) {
    const k = base + i;
    const mx = (r.x[k] + r.x[k + 1]) / 2;
    const my = (r.y[k] + r.y[k + 1]) / 2;
    d += `Q${f(r.x[k])} ${f(r.y[k])} ${f(mx)} ${f(my)}`;
  }
  const end = base + POINTS - 1;
  d += `L${f(r.x[end])} ${f(r.y[end])}`;
  return d;
}

/** a cable tie's place on cable `c`: at its `point`, turned along the cable */
export function tieAt(r: Ropes, c: number, point: number): [x: number, y: number, deg: number] {
  const k = c * POINTS + point;
  const angle = Math.atan2(r.y[k + 1] - r.y[k - 1], r.x[k + 1] - r.x[k - 1]);
  return [r.x[k], r.y[k], (angle * 180) / Math.PI];
}
