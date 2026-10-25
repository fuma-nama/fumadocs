import { DITHER_MASKS } from '../../lib/bayer';
import { createIntent } from './intent';
import { ropePath, STEP, stepRopes } from './rope';
import { createSprings, settleSprings, stepSprings } from './spring';
import {
  BOARD,
  cableEnds,
  createPose,
  hangRopes,
  hubTransform,
  pose,
  shadowLevel,
  shadowTransform,
  shiftX,
  shiftY,
  SLOTS,
  WINDOW,
  windowTransform,
} from './board';

export interface DeskEngine {
  /** the selection changed, from here or from React */
  select: (index: number) => void;
  destroy: () => void;
}

/** the caption by a window, in px: the hover target reaches out to it */
const CAPTION = 28;

/**
 * The desk as a physical thing: the windows ride springs (slide, scale, lift), the cables are
 * ropes between live ports. The window under the pointer lifts at once; held there, it is chosen:
 * it grows toward the hub, its cable pulls taut and the hub leans to it, its neighbours make room.
 * Hover targets are the windows' resting places in the current pose, never their moving boxes.
 */
export function createDeskEngine(
  board: HTMLElement,
  selected: number,
  onSelect: (index: number) => void,
): DeskEngine {
  const windows: HTMLElement[] = [];
  const shadows: HTMLElement[] = [];
  const captions: HTMLElement[] = [];
  const cables: SVGPathElement[] = [];
  for (const slot of SLOTS) {
    const element = board.querySelector<HTMLElement>(`[data-slot="${slot.id}"]`)!;
    windows.push(element);
    shadows.push(element.querySelector<HTMLElement>('[data-shadow]')!);
    captions.push(element.querySelector<HTMLElement>('[data-caption]')!);
    cables.push(board.querySelector<SVGPathElement>(`[data-cable="${slot.id}"]`)!);
  }
  const hub = board.querySelector<HTMLElement>('[data-hub]')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let current = selected;
  let hovered = -1;
  const target = pose(current, hovered, createPose());
  /** slides and the hub, scales, lifts */
  const move = createSprings(SLOTS.length + 2);
  const size = createSprings(SLOTS.length, 1);
  const lift = createSprings(SLOTS.length);
  const ropes = hangRopes(target);
  const at = createPose();
  const levels = new Int8Array(SLOTS.length).fill(-1);
  sync(true);

  let scale = board.clientWidth / BOARD.w || 1;
  let raf = 0;
  let last = 0;
  let acc = 0;
  let onScreen = false;
  /** where the pointer was last, a move to the same point is the page scrolling under it */
  let px = -1;
  let py = -1;

  function sync(jump: boolean) {
    for (let i = 0; i < SLOTS.length; i++) {
      move.target[i] = target.windows[i * 3];
      size.target[i] = target.windows[i * 3 + 1];
      lift.target[i] = target.windows[i * 3 + 2];
      ropes.rest[i] = target.length[i];
    }
    move.target[SLOTS.length] = target.hub[0];
    move.target[SLOTS.length + 1] = target.hub[1];
    if (jump) {
      settleSprings(move);
      settleSprings(size);
      settleSprings(lift);
    }
  }

  /** the springs' values as a pose, for the cables' ends */
  function read() {
    for (let i = 0; i < SLOTS.length; i++) {
      at.windows[i * 3] = move.value[i];
      at.windows[i * 3 + 1] = size.value[i];
      at.windows[i * 3 + 2] = Math.max(0, lift.value[i]);
    }
    at.hub[0] = move.value[SLOTS.length];
    at.hub[1] = move.value[SLOTS.length + 1];
  }

  function ends() {
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
      cables[i].setAttribute('d', ropePath(ropes, i));
    }
    hub.style.transform = hubTransform(at.hub[0], at.hub[1]);
  }

  function frame(now: number) {
    raf = 0;
    const dt = last === 0 ? STEP : Math.min(0.05, (now - last) / 1000);
    last = now;
    acc += dt;
    // a frame shorter than a step (a 120 Hz screen) steps nothing: it settles nothing either
    let energy = Infinity;
    let moved = Infinity;
    while (acc >= STEP) {
      acc -= STEP;
      energy = Math.max(
        stepSprings(move, STEP, 220, 22),
        stepSprings(size, STEP, 260, 22),
        stepSprings(lift, STEP, 320, 26),
      );
      read();
      ends();
      moved = stepRopes(ropes);
    }
    write();
    if (energy > 0.004 || moved > 0.01) schedule();
    else last = acc = 0;
  }

  function schedule() {
    if (raf === 0 && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function update() {
    pose(current, hovered, target);
    if (reduce.matches) {
      sync(true);
      read();
      ends();
      // still: the cables hang in their new pose at once
      const still = hangRopes(target);
      ropes.x.set(still.x);
      ropes.y.set(still.y);
      ropes.px.set(still.px);
      ropes.py.set(still.py);
      write();
      return;
    }
    sync(false);
    schedule();
  }

  /** the window whose resting place in the current pose holds the point, with its caption */
  function hit(clientX: number, clientY: number): number {
    const box = board.getBoundingClientRect();
    const x = (clientX - box.left) / scale;
    const y = (clientY - box.top) / scale;
    const caption = CAPTION / scale;
    for (let i = 0; i < SLOTS.length; i++) {
      const s = target.windows[i * 3 + 1];
      const left = SLOTS[i].x + shiftX(SLOTS[i], target.windows[i * 3], s);
      const top = SLOTS[i].y + shiftY(SLOTS[i], s, 0);
      const above = SLOTS[i].row === 0 ? caption : 0;
      const below = SLOTS[i].row === 1 ? caption : 0;
      if (
        x >= left &&
        x <= left + WINDOW.w * s &&
        y >= top - above &&
        y <= top + WINDOW.h * s + below
      )
        return i;
    }
    return -1;
  }

  function hover(index: number) {
    if (index === hovered) return;
    hovered = index;
    update();
  }

  const intent = createIntent<number>((index) => {
    if (index !== current) onSelect(index);
  });

  function onMove(event: PointerEvent) {
    if (event.pointerType === 'touch') return;
    const index = hit(event.clientX, event.clientY);
    hover(index);
    // the page scrolled under a still pointer: it lifts what is there, it chooses nothing
    if (event.clientX === px && event.clientY === py) return;
    px = event.clientX;
    py = event.clientY;
    intent.move(index >= 0 && index !== current ? index : null);
  }

  function onOver(event: PointerEvent) {
    if (event.pointerType !== 'touch') hover(hit(event.clientX, event.clientY));
  }

  function onLeave() {
    intent.cancel();
    px = py = -1;
    hover(-1);
  }

  board.addEventListener('pointermove', onMove);
  board.addEventListener('pointerover', onOver);
  board.addEventListener('pointerleave', onLeave);

  const resize = new ResizeObserver(() => {
    scale = board.clientWidth / BOARD.w || 1;
  });
  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) schedule();
    else {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    }
  });
  resize.observe(board);
  visibility.observe(board);
  document.addEventListener('visibilitychange', schedule);
  read();

  return {
    select(index) {
      if (index === current) return;
      current = index;
      intent.cancel();
      update();
    },
    destroy() {
      cancelAnimationFrame(raf);
      intent.cancel();
      board.removeEventListener('pointermove', onMove);
      board.removeEventListener('pointerover', onOver);
      board.removeEventListener('pointerleave', onLeave);
      resize.disconnect();
      visibility.disconnect();
      document.removeEventListener('visibilitychange', schedule);
    },
  };
}
