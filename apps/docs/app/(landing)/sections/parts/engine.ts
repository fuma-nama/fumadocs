import { cubicBezier } from 'motion/react';
import { camera, TICK } from '../../lib/motion';
import {
  cameraAt,
  FLAT,
  mix,
  NARROW,
  type Pose,
  restOf,
  roomOf,
  type Scene,
  SHADOW,
  WIDE,
} from './geometry';
import { LAYERS, SWAPS, type SwapLayer } from './data';

const easeCamera = cubicBezier(...camera);
/** the camera's move from the page straight on to the stack, ms */
const INTRO = 1600;
/** how long a tray stays out once its pick has landed, ms */
const HOLD = 8 * TICK;

interface Tray {
  el: HTMLElement;
  /** the option picked, and the one the tray holds */
  want: number;
  shown: number;
  /** 0 in, 1 out */
  out: number;
  /** until when the latch stays up before the tray moves, and the tray stays out */
  unlatch: number;
  hold: number;
}

interface StackOptions {
  /** a tray is out: the pick for its layer lands */
  onLand: (layer: SwapLayer, option: number) => void;
}

export interface StackEngine {
  /** the reader picked an option: its tray unlatches, slides out, takes it and goes back in */
  want: (layer: SwapLayer, option: number) => void;
  destroy: () => void;
}

function setStyle(el: HTMLElement, property: string, value: string) {
  if (el.style.getPropertyValue(property) !== value) el.style.setProperty(property, value);
}

/**
 * The stack's motion, one loop for all of it: once, the camera turns from the page straight on to
 * the stack while its trays part (07's camera, on a timer); then each pick unlatches its tray,
 * slides it out, lands and slides it back. The first frame is the stack at rest, in CSS; a stack
 * still below the fold turns to the page first, so the move plays when it comes into view.
 */
export function createStack(root: HTMLElement, options: StackOptions): StackEngine {
  const canvas = root.querySelector<HTMLElement>('[data-canvas]')!;
  const cameraEl = root.querySelector<HTMLElement>('[data-camera]')!;
  const shadow = root.querySelector<HTMLElement>('[data-shadow]')!;
  const side = root.querySelector<HTMLElement>('[data-frame=side]')!;
  const front = root.querySelector<HTMLElement>('[data-frame=front]')!;
  const rails = root.querySelectorAll<HTMLElement>('[data-rail]');
  const order: HTMLElement[] = [];
  for (const layer of LAYERS) order.push(root.querySelector<HTMLElement>(`[data-tray=${layer}]`)!);
  const wide = matchMedia('(min-width: 640px)');
  /** the stack beside the panel, with room for a whole pull */
  const beside = matchMedia('(min-width: 1024px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const trays = new Map<SwapLayer, Tray>();
  for (const layer of SWAPS)
    trays.set(layer, {
      el: order[LAYERS.indexOf(layer)],
      want: 0,
      shown: 0,
      out: 0,
      unlatch: 0,
      hold: 0,
    });

  let scene: Scene = WIDE;
  let room = 1;
  let width = 0;
  let height = 0;
  /** the camera's move, 0 straight on to 1 at rest; -1 before it starts */
  let intro = 1;
  let introAt = 0;
  /** picks made while the camera moves, played once it is there */
  const queued = new Map<SwapLayer, number>();
  let visible = false;
  let raf = 0;
  let last = 0;

  function render() {
    const k = intro < 0 ? 0 : easeCamera(intro);
    const rest = restOf(scene, room);
    const pose: Pose = k >= 1 ? rest : mix(FLAT, rest, k);
    for (const tray of trays.values()) if (tray.out > pose.reach) pose.reach = tray.out;
    setStyle(cameraEl, 'transform', cameraAt(scene, pose, width, height));
    root.toggleAttribute('data-flat', k < 0.02);
    // the trays and their rails part as the camera turns, the frame stretches with them and the
    // shadow comes in as the stack stands up: transforms and opacity only, so nothing repaints
    const step = scene.tray + scene.gap * pose.spread;
    const bottom = -(order.length - 1) * step - scene.tray;
    const stretch = -bottom / (order.length * scene.tray + (order.length - 1) * scene.gap);
    setStyle(side, 'transform', `rotateY(-90deg) scaleX(${stretch})`);
    setStyle(front, 'transform', `rotateX(-90deg) scaleY(${stretch})`);
    setStyle(shadow, 'transform', `translate3d(${SHADOW.x}px, ${SHADOW.y}px, ${bottom - 1}px)`);
    setStyle(shadow, 'opacity', k >= 1 ? '' : String(Math.min(1, Math.max(0, (k - 0.25) / 0.5))));
    for (let i = 0; i < order.length; i++) {
      const out = trays.get(LAYERS[i] as SwapLayer)?.out ?? 0;
      setStyle(order[i], 'transform', `translate3d(0, ${out * scene.pull}px, ${-i * step}px)`);
      setStyle(rails[i], 'transform', `translate3d(0, 0, ${-i * step}px)`);
    }
  }

  /**
   * While the camera turns, its layers keep the raster scale they had when it started instead of
   * rasterizing again at each frame's; once it is still, they raster once at their own
   */
  function turning(on: boolean) {
    setStyle(cameraEl, 'will-change', on ? 'transform' : '');
  }

  function land(layer: SwapLayer, tray: Tray) {
    tray.shown = tray.want;
    options.onLand(layer, tray.shown);
  }

  function frameLoop(now: number) {
    raf = 0;
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    let moving = false;

    if (intro >= 0 && intro < 1) {
      // a frame's timestamp can precede the observer's call that started the turn
      intro = Math.min(1, Math.max(0, (now - introAt) / INTRO));
      if (intro < 1) moving = true;
      else {
        turning(false);
        for (const [layer, option] of queued) want(layer, option);
      }
    }

    for (const [layer, tray] of trays) {
      const swapping = tray.want !== tray.shown;
      if (swapping && !tray.el.hasAttribute('data-open')) {
        tray.el.toggleAttribute('data-open', true);
        tray.unlatch = now + TICK;
      }
      const out = swapping || now < tray.hold;
      const goal = out && now >= tray.unlatch ? 1 : 0;
      tray.out += (goal - tray.out) * (1 - Math.exp(-dt / (goal ? 0.07 : 0.1)));
      if (Math.abs(goal - tray.out) < 0.002) tray.out = goal;
      if (swapping && tray.out > 0.97) {
        land(layer, tray);
        tray.hold = now + HOLD;
      }
      if (!out && tray.out === 0 && tray.el.hasAttribute('data-open')) {
        tray.el.toggleAttribute('data-open', false);
      }
      if (out || tray.out !== goal) moving = true;
    }

    render();
    if (moving) raf = requestAnimationFrame(frameLoop);
  }

  function wake() {
    if (raf !== 0 || !visible || width === 0) return;
    last = performance.now();
    raf = requestAnimationFrame(frameLoop);
  }

  /** every pick lands and every tray goes in, at once; a move that has not started waits */
  function settle() {
    if (intro >= 0 && intro < 1) {
      intro = 1;
      turning(false);
    }
    if (intro === 1) {
      for (const [layer, option] of queued) trays.get(layer)!.want = option;
      queued.clear();
    }
    for (const [layer, tray] of trays) {
      if (tray.want !== tray.shown) land(layer, tray);
      tray.out = 0;
      tray.hold = 0;
      tray.el.toggleAttribute('data-open', false);
    }
    if (width > 0) render();
  }

  function want(layer: SwapLayer, option: number) {
    if (intro < 1) {
      queued.set(layer, option);
      return;
    }
    queued.delete(layer);
    trays.get(layer)!.want = option;
    if (visible && !reduce.matches) wake();
    else settle();
  }

  function layout() {
    const box = canvas.getBoundingClientRect();
    width = box.width;
    height = box.height;
    scene = wide.matches ? WIDE : NARROW;
    room = roomOf(beside.matches);
    if (width === 0) return;
    render();
  }

  // the canvas takes its size from CSS: the observer's first call lays the stack out once the
  // page has its own layout, and turns a stack below the fold to the page for its move
  let first = true;
  const resize = new ResizeObserver(() => {
    layout();
    if (!first || width === 0) return;
    first = false;
    const box = canvas.getBoundingClientRect();
    if (!reduce.matches && box.top > innerHeight) {
      intro = -1;
      render();
    }
  });
  const view = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) {
        cancelAnimationFrame(raf);
        raf = 0;
        settle();
        return;
      }
      // half of it in view, or half of a view shorter than it
      const half =
        entry.intersectionRatio >= 0.5 || entry.intersectionRect.height * 2 >= innerHeight;
      if (intro < 0 && half) {
        intro = 0;
        introAt = performance.now();
        turning(true);
      }
      wake();
    },
    { threshold: [0, 0.25, 0.5] },
  );
  resize.observe(canvas);
  view.observe(canvas);

  return {
    want,
    destroy() {
      cancelAnimationFrame(raf);
      resize.disconnect();
      view.disconnect();
    },
  };
}
