import { DITHER_MASKS } from '../../lib/dither';
import {
  cableEnds,
  centre,
  createPose,
  FIRST_SLOT,
  hangRopes,
  type Hung,
  hubTransform,
  plugTransform,
  pose,
  ropePath,
  shadowLevel,
  shadowTransform,
  SLOTS,
  STEP,
  stepRopes,
  tieTransform,
  windowTransform,
} from './scene';

/** values chasing their targets with a stiffness and a damping per second, stepped at `STEP` */
export function createSprings(count: number, initial = 0) {
  return {
    value: new Float64Array(count).fill(initial),
    velocity: new Float64Array(count),
    target: new Float64Array(count).fill(initial),
  };
}

type Springs = ReturnType<typeof createSprings>;

/** one step; returns how far from rest the springs are */
export function stepSprings(s: Springs, stiffness: number, damping: number): number {
  let energy = 0;
  for (let i = 0; i < s.value.length; i++) {
    const a = -stiffness * (s.value[i] - s.target[i]) - damping * s.velocity[i];
    s.velocity[i] += a * STEP;
    s.value[i] += s.velocity[i] * STEP;
    energy = Math.max(energy, Math.abs(s.value[i] - s.target[i]), Math.abs(s.velocity[i]) * STEP);
  }
  return energy;
}

export function settleSprings(s: Springs) {
  s.value.set(s.target);
  s.velocity.fill(0);
}

/**
 * The fixed steps due at the frame time `now`, from the last frame's time (0 before the first)
 * and the time not stepped yet: a frame shorter than a step, on a 120 Hz screen, gets none.
 */
export function due(clock: { last: number; acc: number }, now: number): number {
  clock.acc += clock.last === 0 ? STEP : Math.min(0.05, (now - clock.last) / 1000);
  clock.last = now;
  let steps = 0;
  while (clock.acc >= STEP) {
    clock.acc -= STEP;
    steps++;
  }
  return steps;
}

/** underdamped: a window overshoots its new size and settles */
const STIFFNESS = 240;
const DAMPING = 17;
/** a cable pays out to its new length over about 60ms: let out at once, a taut one buckles */
const PAY = 1 - Math.exp(-STEP / 0.06);

/**
 * The desk as a physical thing: the windows and the hub ride springs, the cables are ropes between
 * live ports. A new choice grows its window toward the hub, past its size and back, its cable
 * pulls taut; the others step back, the hub steps out of its way, their cables sag.
 */
export function createDesk(board: HTMLElement, hung: Hung) {
  const windows = Array.from(board.querySelectorAll<HTMLElement>('[data-slot]'));
  const shadows = Array.from(board.querySelectorAll<HTMLElement>('[data-shadow]'));
  const captions = Array.from(board.querySelectorAll<HTMLElement>('[data-caption]'));
  /** two per cable: its sheath and its core */
  const cables = Array.from(board.querySelectorAll<SVGPathElement>('[data-cable]'));
  const ties = Array.from(board.querySelectorAll<SVGGElement>('[data-tie]'));
  /** two per cable: on the window and on the hub */
  const plugs = Array.from(board.querySelectorAll<SVGGElement>('[data-plug]'));
  const hub = board.querySelector<HTMLElement>('[data-hub]')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let current = FIRST_SLOT;
  const target = pose(current, createPose());
  // the scales and the hub share a spring, so every gap opens and closes in step
  const scale = createSprings(SLOTS.length, 1);
  const shift = createSprings(2);
  const lift = createSprings(SLOTS.length);
  let ropes = hangRopes(target, hung);
  const at = createPose();
  const levels = new Int8Array(SLOTS.length).fill(-1);
  sync(true);
  read();

  let raf = 0;
  const clock = { last: 0, acc: 0 };

  function sync(jump: boolean) {
    for (let i = 0; i < SLOTS.length; i++) {
      scale.target[i] = target.windows[i * 3 + 1];
      lift.target[i] = target.windows[i * 3 + 2];
    }
    shift.target[0] = target.hub[0];
    shift.target[1] = target.hub[1];
    if (jump) {
      settleSprings(scale);
      settleSprings(shift);
      settleSprings(lift);
      ropes.rest.set(target.length);
    }
  }

  /** the springs' values as a pose, and the cables' ends on it */
  function read() {
    for (let i = 0; i < SLOTS.length; i++) {
      at.windows[i * 3 + 1] = scale.value[i];
      at.windows[i * 3 + 2] = Math.max(0, lift.value[i]);
    }
    centre(at.windows);
    at.hub[0] = shift.value[0];
    at.hub[1] = shift.value[1];
    for (let i = 0; i < SLOTS.length; i++) cableEnds(i, at, ropes.ends, i * 4);
  }

  function write() {
    for (let i = 0; i < SLOTS.length; i++) {
      const s = at.windows[i * 3 + 1];
      const l = at.windows[i * 3 + 2];
      windows[i].style.transform = windowTransform(SLOTS[i], at.windows[i * 3], s, l);
      captions[i].style.transform = `scale(${(1 / s).toFixed(4)})`;
      const level = shadowLevel(l);
      if (level !== levels[i]) {
        levels[i] = level;
        shadows[i].hidden = level === 0;
        shadows[i].style.maskImage = DITHER_MASKS[level];
      }
      shadows[i].style.transform = shadowTransform(SLOTS[i], l);
      const d = ropePath(ropes, i);
      cables[i * 2].setAttribute('d', d);
      cables[i * 2 + 1].setAttribute('d', d);
      ties[i].setAttribute('transform', tieTransform(ropes, i));
      plugs[i * 2].setAttribute('transform', plugTransform(i, ropes.ends, 0));
      plugs[i * 2 + 1].setAttribute('transform', plugTransform(i, ropes.ends, 1));
    }
    hub.style.transform = hubTransform(at.hub[0], at.hub[1]);
  }

  function frame(now: number) {
    raf = 0;
    let energy = Infinity;
    let moved = Infinity;
    let paying = Infinity;
    for (let i = due(clock, now); i > 0; i--) {
      energy = Math.max(
        stepSprings(scale, STIFFNESS, DAMPING),
        stepSprings(shift, STIFFNESS, DAMPING),
        stepSprings(lift, 320, 26),
      );
      paying = 0;
      for (let c = 0; c < SLOTS.length; c++) {
        const left = target.length[c] - ropes.rest[c];
        ropes.rest[c] += left * PAY;
        paying = Math.max(paying, Math.abs(left));
      }
      read();
      moved = stepRopes(ropes);
    }
    write();
    // settled to the eye once no cable point moves a tenth of a unit in a step
    if (energy > 0.004 || moved > 0.1 || paying > 0.1) schedule();
    else clock.last = clock.acc = 0;
  }

  function schedule() {
    if (raf === 0) raf = requestAnimationFrame(frame);
  }

  return {
    /** `-1` unplugs every cable */
    select(index: number) {
      if (index === current) return;
      current = index;
      pose(current, target);
      if (reduce.matches) {
        sync(true);
        read();
        ropes = hangRopes(target);
        write();
        return;
      }
      sync(false);
      schedule();
    },
    destroy() {
      cancelAnimationFrame(raf);
    },
  };
}
