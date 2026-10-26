import { cubicBezier } from 'motion/react';
import { camera, TICK } from '../../lib/motion';
import {
  cameraAt,
  fitOf,
  type Pose,
  NARROW,
  restOf,
  roomOf,
  type Scene,
  SHADOW,
  WIDE,
} from './geometry';
import { LAYERS, SWAPS, type SwapLayer } from './data';

const easeCamera = cubicBezier(...camera);
/**
 * The turn's own curve: soft at both ends and close to even between, so the camera changes its
 * angle with the scroll rather than in one swing, no 100px of scroll at a laptop's size carrying
 * more than 30% of the pitch
 */
const easeTurn = cubicBezier(0.15, 0, 0.85, 1);
/**
 * The beats over the run, as parts of it: the page straight on until the turn, the trays parting
 * as it ends, the stack at rest after
 */
const TURN = [0.15, 0.55] as const;
const PART = [0.5, 0.75] as const;
/** how long the camera stays still before its layers raster again at their own scale, ms */
const STILL = 150;
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
 * The stack's motion, one loop for all of it. The camera follows the scroll over the run the
 * figure pins for: the page straight on, the turn, the trays parting, the stack at rest;
 * scrolling back turns it back. Each pick unlatches its tray, slides it out, lands and slides it
 * back, at whatever pose the scroll has the camera in.
 */
export function createStack(root: HTMLElement, options: StackOptions): StackEngine {
  const canvas = root.querySelector<HTMLElement>('[data-canvas]')!;
  const cameraEl = root.querySelector<HTMLElement>('[data-camera]')!;
  const shadow = root.querySelector<HTMLElement>('[data-shadow]')!;
  const cap = root.querySelector<HTMLElement>('[data-frame=cap]')!;
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

  const runs = root.querySelectorAll<HTMLElement>('[data-run]');
  const keys = root.querySelector<HTMLElement>('[data-keys]')!;

  let scene: Scene = WIDE;
  let room = 1;
  let width = 0;
  let height = 0;
  /** the room above and below the flat page, centred in the canvas */
  let flatMargin = 0;
  /** the band the figure is seen in, between the navbar and the status bar */
  let seenFrom = 0;
  let seenTo = 0;
  /** the run the beats play over, as the page's scroll */
  let runFrom = 0;
  let runTo = 1;
  /** where the scroll has the run, 0 to 1 */
  let at = 0;
  /** the camera's transform as last written */
  let cam = '';
  let still = 0;
  /** the canvas within a viewport of the screen: the scroll moves the camera */
  let near = false;
  /** the canvas on the screen, pinned or not: a pick plays */
  let seen = false;
  let raf = 0;
  let last = 0;

  function runAt(scroll: number): number {
    if (reduce.matches) return 1;
    return Math.min(1, Math.max(0, (scroll - runFrom) / (runTo - runFrom)));
  }

  function beat([from, to]: readonly [number, number], ease: (t: number) => number) {
    return ease(Math.min(1, Math.max(0, (at - from) / (to - from))));
  }

  /** a moving camera's layers keep the raster scale they had; a still one's raster at their own */
  function moved() {
    setStyle(cameraEl, 'will-change', 'transform');
    clearTimeout(still);
    still = window.setTimeout(() => setStyle(cameraEl, 'will-change', ''), STILL);
  }

  function render() {
    const rest = restOf(scene, room);
    // the page tips back with the trays together, then the trays part
    const turn = beat(TURN, easeTurn);
    const part = beat(PART, easeCamera);
    const pose: Pose = {
      pitch: rest.pitch * turn,
      yaw: rest.yaw * turn,
      spread: part,
      reach: rest.reach * part,
    };
    const scrollReach = pose.reach;
    for (const tray of trays.values()) if (tray.out > pose.reach) pose.reach = tray.out;
    const fit = fitOf(scene, pose, width, height);
    // the flat page sits centred and the stack ends with its top on the canvas' top: the room
    // above it shrinks as the camera turns, never growing back, so the page only ever moves up,
    // and a tray out only takes room the stack needs, so a pick doesn't move the page
    const held =
      pose.reach > scrollReach
        ? fitOf(scene, { ...pose, reach: scrollReach }, width, height).box.height
        : fit.box.height;
    const above = Math.min((height - held * fit.scale) / 2, flatMargin);
    const top = Math.min((1 - turn) * above, height - fit.box.height * fit.scale);
    const next = cameraAt(scene, pose, fit, width, top);
    if (next !== cam) {
      if (cam !== '') moved();
      cam = next;
      cameraEl.style.transform = next;
    }
    // the trays and their rails part, the frame stretches with them, and the shadow and the frame's
    // cap come in as the stack stands up: transforms and opacity only, so nothing repaints; straight
    // on, every side face is edge on and draws nothing
    const step = scene.tray + scene.gap * pose.spread;
    const bottom = -(order.length - 1) * step - scene.tray;
    const stretch = -bottom / (order.length * scene.tray + (order.length - 1) * scene.gap);
    setStyle(side, 'transform', `rotateY(-90deg) scaleX(${stretch})`);
    setStyle(front, 'transform', `rotateX(-90deg) scaleY(${stretch})`);
    setStyle(shadow, 'transform', `translate3d(${SHADOW.x}px, ${SHADOW.y}px, ${bottom - 1}px)`);
    setStyle(shadow, 'opacity', String(Math.min(1, Math.max(0, (turn - 0.25) / 0.5))));
    setStyle(cap, 'opacity', String(Math.min(1, turn * 4)));
    for (let i = 0; i < order.length; i++) {
      const out = trays.get(LAYERS[i] as SwapLayer)?.out ?? 0;
      setStyle(order[i], 'transform', `translate3d(0, ${out * scene.pull}px, ${-i * step}px)`);
      setStyle(rails[i], 'transform', `translate3d(0, 0, ${-i * step}px)`);
    }
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
    if (raf !== 0 || width === 0) return;
    last = performance.now();
    raf = requestAnimationFrame(frameLoop);
  }

  /** every pick lands and every tray goes in, at once */
  function settle() {
    for (const [layer, tray] of trays) {
      if (tray.want !== tray.shown) land(layer, tray);
      tray.out = 0;
      tray.hold = 0;
      tray.el.toggleAttribute('data-open', false);
    }
    if (width > 0) render();
  }

  function want(layer: SwapLayer, option: number) {
    trays.get(layer)!.want = option;
    if (seen && !reduce.matches) wake();
    else settle();
  }

  /** one read of the scroll, before anything in the frame writes; the loop writes the pose */
  function scrolled() {
    const next = runAt(scrollY);
    if (next === at) return;
    at = next;
    wake();
  }

  /** sizes and offsets, read where the layout is fresh, never per scroll */
  function measure() {
    const box = canvas.getBoundingClientRect();
    width = box.width;
    height = box.height;
    if (width === 0) return;
    const scroll = scrollY;
    scene = wide.matches ? WIDE : NARROW;
    room = roomOf(beside.matches);
    flatMargin = (height - scene.height * Math.min(width / scene.width, height / scene.height)) / 2;
    const style = getComputedStyle(root);
    seenFrom = Number.parseFloat(style.getPropertyValue('--lp-menu-h')) || 0;
    // the root's height, which a phone's URL bar showing or hiding leaves alone
    seenTo =
      document.documentElement.clientHeight -
      (Number.parseFloat(style.getPropertyValue('--lp-status-h')) || 0);
    let run: HTMLElement | undefined;
    for (const el of runs) if (el.offsetHeight > 0) run = el;
    if (run) {
      // the run follows what pins: it holds from where that reaches the navbar for the run's length
      const sticky = run.previousElementSibling!.getBoundingClientRect().height;
      runFrom = run.getBoundingClientRect().top + scroll - sticky - seenFrom;
      runTo = runFrom + run.offsetHeight;
    } else {
      // the keys pass beneath the pinned stack: the run is their way from the band's foot to
      // where they go under it
      const passing = keys.getBoundingClientRect();
      runFrom = passing.top + scroll - seenTo;
      runTo =
        passing.bottom + scroll - seenFrom - canvas.parentElement!.getBoundingClientRect().height;
    }
    at = runAt(scroll);
    render();
  }

  // the canvas takes its size from CSS, and the content above it can move it
  const resize = new ResizeObserver(measure);
  const gate = new IntersectionObserver(
    (entries) => {
      near = entries[entries.length - 1].isIntersecting;
      if (near) {
        addEventListener('scroll', scrolled, { passive: true });
        scrolled();
        return;
      }
      removeEventListener('scroll', scrolled);
      cancelAnimationFrame(raf);
      raf = 0;
      settle();
    },
    // a viewport ahead, so the pose is in place before the canvas shows
    { rootMargin: '100% 0px' },
  );
  const view = new IntersectionObserver((entries) => {
    seen = entries[entries.length - 1].isIntersecting;
  });
  resize.observe(canvas);
  resize.observe(document.documentElement);
  gate.observe(canvas);
  view.observe(canvas);

  return {
    want,
    destroy() {
      cancelAnimationFrame(raf);
      clearTimeout(still);
      removeEventListener('scroll', scrolled);
      resize.disconnect();
      gate.disconnect();
      view.disconnect();
    },
  };
}
