import { DITHER_MASKS } from '../../lib/bayer';
import { ropePath, type Ropes, stepRopes, tensionOf, tieAt } from './rope';
import { createSprings, due, settleSprings, STEP, stepSprings } from './spring';
import {
  cableEnds,
  centre,
  createPose,
  hangRopes,
  type Hung,
  hubTransform,
  plugTransform,
  pose,
  shadowLevel,
  shadowTransform,
  SLOTS,
  windowTransform,
} from './board';

export interface DeskEngine {
  /** the selection changed; `-1` unplugs every cable */
  select: (index: number) => void;
  destroy: () => void;
}

/** the rope point a cable's tie holds, counted from the window */
const TIE = 4;
/** the pose's spring, per second: underdamped, so a window overshoots its new size and settles */
const STIFFNESS = 240;
const DAMPING = 17;
/**
 * The share of the way a cable's length goes toward its new pose's in a step, about 60ms in all:
 * let out at once, a taut cable has nowhere to put the slack and buckles.
 */
const PAY = 1 - Math.exp(-STEP / 0.06);

function tieTransform(ropes: Ropes, cable: number): string {
  const [x, y, deg] = tieAt(ropes, cable, TIE);
  return `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg.toFixed(1)})`;
}

/**
 * The desk as a physical thing: the windows and the hub ride springs, the cables are ropes between
 * live ports. A new choice grows its window toward the hub, past its size and back, its cable
 * pulls taut; the others step back, the hub steps out of its way, their cables sag.
 */
export function createDeskEngine(
  board: HTMLElement,
  selected: number,
  /** the cables hanging still in that pose, as the server settled them */
  hung: Hung,
  /** how taut the chosen cable is, 0 to 1, for the gauge */
  onTension: (tension: number) => void,
): DeskEngine {
  const windows: HTMLElement[] = [];
  const shadows: HTMLElement[] = [];
  const captions: HTMLElement[] = [];
  /** each cable's paths: its sheath and its core */
  const cables: SVGPathElement[][] = [];
  const ties: SVGGElement[] = [];
  /** each cable's plugs, on the window and on the hub */
  const plugs: SVGGElement[] = [];
  for (const slot of SLOTS) {
    const element = board.querySelector<HTMLElement>(`[data-slot="${slot.id}"]`)!;
    windows.push(element);
    shadows.push(element.querySelector<HTMLElement>('[data-shadow]')!);
    captions.push(element.querySelector<HTMLElement>('[data-caption]')!);
    cables.push(Array.from(board.querySelectorAll<SVGPathElement>(`[data-cable="${slot.id}"]`)));
    ties.push(board.querySelector<SVGGElement>(`[data-tie="${slot.id}"]`)!);
    for (const plug of board.querySelectorAll<SVGGElement>(`[data-plug="${slot.id}"]`))
      plugs.push(plug);
  }
  const hub = board.querySelector<HTMLElement>('[data-hub]')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let current = selected;
  const target = pose(current, createPose());
  /** the windows' scales and the hub's `x, y` share a spring, so every gap opens and closes in step */
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
  let onScreen = false;

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
    for (let i = 0; i < SLOTS.length; i++) cableEnds(i, at.windows, at.hub, ropes.ends, i * 4);
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
      for (const path of cables[i]) path.setAttribute('d', d);
      ties[i].setAttribute('transform', tieTransform(ropes, i));
      plugs[i * 2].setAttribute('transform', plugTransform(i, ropes.ends, 0));
      plugs[i * 2 + 1].setAttribute('transform', plugTransform(i, ropes.ends, 1));
    }
    hub.style.transform = hubTransform(at.hub[0], at.hub[1]);
    onTension(current < 0 ? 0 : tensionOf(ropes, current));
  }

  function frame(now: number) {
    raf = 0;
    let energy = Infinity;
    let moved = Infinity;
    let paying = Infinity;
    for (let i = due(clock, now); i > 0; i--) {
      energy = Math.max(
        stepSprings(scale, STEP, STIFFNESS, DAMPING),
        stepSprings(shift, STEP, STIFFNESS, DAMPING),
        stepSprings(lift, STEP, 320, 26),
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
    if (energy > 0.004 || moved > 0.01 || paying > 0.01) schedule();
    else clock.last = clock.acc = 0;
  }

  function schedule() {
    if (raf === 0 && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
  }

  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) schedule();
    else {
      cancelAnimationFrame(raf);
      raf = 0;
      clock.last = 0;
    }
  });
  visibility.observe(board);
  document.addEventListener('visibilitychange', schedule);

  return {
    select(index) {
      if (index === current) return;
      current = index;
      pose(current, target);
      if (reduce.matches) {
        sync(true);
        read();
        // still: the cables hang in their new pose at once
        ropes = hangRopes(target);
        write();
        return;
      }
      sync(false);
      schedule();
    },
    destroy() {
      cancelAnimationFrame(raf);
      visibility.disconnect();
      document.removeEventListener('visibilitychange', schedule);
    },
  };
}
