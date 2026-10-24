import type { LayoutId } from './data';
import { BOARD, HUB, hubPort, restRopes, SLOTS, WINDOW, windowPort } from './board';
import { ropePath, STEP, stepRopes } from './rope';
import { createSprings, settleSprings, stepSprings } from './spring';

export interface DeskEngine {
  setPinned: (id: LayoutId) => void;
  destroy: () => void;
}

/**
 * The hovered window grows into the free space, its neighbours squeeze away from it. It grows from
 * its outer edge, so its inner edge comes `GROW * WINDOW.w` closer to the hub: less than their gap.
 */
const GROW = 0.09;
const PINNED_GROW = 0.03;
const PRESS = 0.05;
const SQUEEZE = 0.93;
const SQUEEZE_FAR = 0.97;
/** a hovered window reels its cable in */
const TAUT = 0.97;
/** how far the hub moves away from a hovered window, in board units */
const SHIFT = 12;
/** the caption under a window, in px: it stays on the board too */
const CAPTION = 20;

/**
 * The desk as a physical thing: the windows ride springs (offset and scale), the cables are ropes
 * hanging from their ports. Hover or focus brings a window forward: it grows into the free space
 * of the desk, its neighbours squeeze away from it and its cable pulls taut. Nothing ever leaves
 * the board; the cables follow the windows' live positions each step.
 */
export function createDeskEngine(
  board: HTMLElement,
  pinned: LayoutId,
  onPreview: (id: LayoutId | null) => void,
): DeskEngine {
  const windows = SLOTS.map((slot) =>
    board.querySelector<HTMLElement>(`[data-slot="${slot.id}"]`)!,
  );
  const hub = board.querySelector<HTMLElement>('[data-hub]')!;
  const cables = SLOTS.map((slot) =>
    board.querySelector<SVGPathElement>(`[data-cable="${slot.id}"]`)!,
  );
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // per window: offset x, y (board units) and scale, from its top left corner; then the hub's offset
  const move = createSprings(SLOTS.length * 2 + 2);
  const size = createSprings(SLOTS.length, 1);
  const ropes = restRopes();
  /** the cables' lengths at rest */
  const slack = ropes.rest.slice();
  /** each window's port and its hub port, relative to its top left corner and absolute */
  const ports = SLOTS.map((slot) => {
    const [px, py] = windowPort(slot);
    const [qx, qy] = hubPort(slot);
    return [px - slot.x, py - slot.y, qx, qy];
  });
  /** where each window is drawn this frame, kept inside the board */
  const at = new Float64Array(SLOTS.length * 2);

  let hovered = -1;
  let pressed = -1;
  let current = SLOTS.findIndex((slot) => slot.id === pinned);
  let scale = 1;
  let raf = 0;
  let last = 0;
  let acc = 0;
  let onScreen = false;
  let leave = 0;

  /** the corner a window grows or shrinks from: its outer side, and the row's side away from `from` */
  function anchor(i: number, from: number): [x: number, y: number] {
    const slot = SLOTS[i];
    const x = slot.column === 0 ? 0 : WINDOW.w;
    const row = from >= 0 ? SLOTS[from].row : slot.row;
    let y = WINDOW.h / 2;
    if (i === from || from < 0) y = slot.row === 0 ? 0 : slot.row === 2 ? WINDOW.h : WINDOW.h / 2;
    else if (slot.row < row) y = 0;
    else if (slot.row > row) y = WINDOW.h;
    else y = slot.row === 0 ? 0 : slot.row === 2 ? WINDOW.h : WINDOW.h / 2;
    return [x, y];
  }

  function targets() {
    const h = hovered;
    for (let i = 0; i < SLOTS.length; i++) {
      let s = i === current ? 1 + PINNED_GROW : 1;
      if (i === h) s = 1 + (i === pressed ? PRESS : GROW);
      else if (h >= 0) s = SLOTS[i].column === SLOTS[h].column ? SQUEEZE : SQUEEZE_FAR;
      const [ax, ay] = anchor(i, h >= 0 ? h : i === current ? i : -1);
      move.target[i * 2] = ax * (1 - s);
      move.target[i * 2 + 1] = ay * (1 - s);
      size.target[i] = s;
      ropes.rest[i] = slack[i];
    }
    // the hub makes room too, it shifts away from the hovered window; their cable pulls taut
    const hx = SLOTS.length * 2;
    move.target[hx] = 0;
    move.target[hx + 1] = 0;
    if (h >= 0) {
      const slot = SLOTS[h];
      const dx = HUB.x + HUB.w / 2 - (slot.x + WINDOW.w / 2);
      const dy = HUB.y + HUB.h / 2 - (slot.y + WINDOW.h / 2);
      const d = Math.hypot(dx, dy);
      move.target[hx] = (dx / d) * SHIFT;
      move.target[hx + 1] = (dy / d) * SHIFT;
      const [px, py, qx, qy] = ports[h];
      const s = size.target[h];
      const ax = slot.x + move.target[h * 2] + px * s;
      const ay = slot.y + move.target[h * 2 + 1] + py * s;
      ropes.rest[h] = Math.hypot(qx + move.target[hx] - ax, qy + move.target[hx + 1] - ay) * TAUT;
    }
    for (let i = 0; i < SLOTS.length; i++) {
      const on = i === h || i === current;
      cables[i].setAttribute('stroke-dasharray', on ? 'none' : '4 3');
      cables[i].setAttribute('stroke-width', i === h ? '1.5' : '1');
      windows[i].style.zIndex = i === h ? '3' : i === current ? '2' : '';
    }
    if (reduce.matches) {
      // still: the windows stay in place, and so do the cables
      move.target.fill(0);
      size.target.fill(1);
      ropes.rest.set(slack);
      settleSprings(move);
      settleSprings(size);
      place();
      write();
      return;
    }
    schedule();
  }

  /** the windows' boxes this frame, held inside the board even when a spring overshoots */
  function place() {
    const caption = CAPTION / scale;
    for (let i = 0; i < SLOTS.length; i++) {
      const slot = SLOTS[i];
      const s = size.value[i];
      let x = slot.x + move.value[i * 2];
      let y = slot.y + move.value[i * 2 + 1];
      x = Math.min(Math.max(x, 0), BOARD.w - WINDOW.w * s);
      y = Math.min(Math.max(y, 0), BOARD.h - WINDOW.h * s - caption * s);
      at[i * 2] = x;
      at[i * 2 + 1] = y;
    }
  }

  /** the cables' ends from where the windows and the hub are now */
  function ends() {
    const hx = move.value[SLOTS.length * 2];
    const hy = move.value[SLOTS.length * 2 + 1];
    for (let i = 0; i < SLOTS.length; i++) {
      const [px, py, qx, qy] = ports[i];
      const s = size.value[i];
      ropes.ends[i * 4] = at[i * 2] + px * s;
      ropes.ends[i * 4 + 1] = at[i * 2 + 1] + py * s;
      ropes.ends[i * 4 + 2] = qx + hx;
      ropes.ends[i * 4 + 3] = qy + hy;
    }
  }

  function write() {
    for (let i = 0; i < SLOTS.length; i++) {
      const dx = (at[i * 2] - SLOTS[i].x) * scale;
      const dy = (at[i * 2 + 1] - SLOTS[i].y) * scale;
      windows[i].style.transform =
        `translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px) scale(${size.value[i].toFixed(4)})`;
      cables[i].setAttribute('d', ropePath(ropes, i));
    }
    const hx = move.value[SLOTS.length * 2] * scale;
    const hy = move.value[SLOTS.length * 2 + 1] * scale;
    hub.style.transform = `translate(${hx.toFixed(2)}px,${hy.toFixed(2)}px)`;
  }

  function frame(now: number) {
    raf = 0;
    const dt = last === 0 ? STEP : Math.min(0.05, (now - last) / 1000);
    last = now;
    acc += dt;
    let energy = 0;
    let moved = 0;
    while (acc >= STEP) {
      acc -= STEP;
      energy = Math.max(stepSprings(move, STEP, 200, 20), stepSprings(size, STEP, 260, 22));
      place();
      ends();
      moved = stepRopes(ropes);
    }
    write();
    if (energy > 0.005 || moved > 0.01) schedule();
    else {
      last = 0;
      acc = 0;
    }
  }

  function schedule() {
    if (raf === 0 && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function hover(index: number) {
    clearTimeout(leave);
    if (index === hovered) return;
    hovered = index;
    pressed = -1;
    onPreview(index >= 0 ? SLOTS[index].id : null);
    targets();
  }

  /** leaving one window for the gap or another window: wait a moment before letting go */
  function release() {
    clearTimeout(leave);
    leave = window.setTimeout(() => hover(-1), 90);
  }

  const cleanups: (() => void)[] = [];
  function on<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
  ) {
    target.addEventListener(type, listener);
    cleanups.push(() => target.removeEventListener(type, listener));
  }

  for (let i = 0; i < windows.length; i++) {
    const index = i;
    on(windows[i], 'pointerenter', () => hover(index));
    on(windows[i], 'pointerleave', release);
    // keyboard focus previews; a click or a tap focuses too, the pointer already did
    on(windows[i], 'focus', () => {
      if (windows[index].matches(':focus-visible')) hover(index);
    });
    on(windows[i], 'blur', release);
    on(windows[i], 'pointerdown', () => {
      pressed = index;
      targets();
    });
    on(windows[i], 'pointerup', () => {
      pressed = -1;
      targets();
    });
  }

  const resize = new ResizeObserver(() => {
    scale = board.clientWidth / BOARD.w || 1;
    place();
    write();
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
  scale = board.clientWidth / BOARD.w || 1;
  place();
  targets();

  return {
    setPinned(id) {
      current = SLOTS.findIndex((slot) => slot.id === id);
      targets();
    },
    destroy() {
      cancelAnimationFrame(raf);
      clearTimeout(leave);
      for (const cleanup of cleanups) cleanup();
      resize.disconnect();
      visibility.disconnect();
      document.removeEventListener('visibilitychange', schedule);
    },
  };
}
