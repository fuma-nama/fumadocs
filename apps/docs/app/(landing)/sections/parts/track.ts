import { cubicBezier } from 'motion/react';
import { camera, settleCss, TICK } from '../../lib/motion';
import {
  blockBounds,
  blockPose,
  cameraTransform,
  DRAWERS,
  drawerZ,
  mixPose,
  planPose,
  type Pose,
  PULL,
  type Size,
} from './camera';
import type { SwapLayer } from './swap';
import { placeLabels, type Rect, RECTS } from './plan';

const easeCamera = cubicBezier(...camera);

/** the pinned track, in fractions of its scroll */
export const TRACK = {
  /** the labels leave one after another, before the camera turns */
  labels: [0.08, 0.13],
  /** the camera swings from the plan round to the block */
  camera: [0.14, 0.52],
  /** then makes room for the keys and the code, which rise in once it is there */
  reframe: [0.66, 0.8],
  /** where each beat starts */
  beats: [0, 0.28, 0.66],
  /** viewports of scroll the stage stays pinned for */
  length: 1.5,
} as const;

/** where each beat holds still: the header's lines link there */
export const HOLDS = [0, 0.59, 1];

/** how long a drawer stays out once its pick has landed, ms */
const HOLD = 6 * TICK;
/** from the block to the code window and to the keys */
const GAP = 40;

interface Drawer {
  el: HTMLElement;
  z: number;
  /** the option picked, and the one the drawer holds */
  want: number;
  shown: number;
  /** 0 in, 1 out */
  x: number;
  /** until when it stays out */
  hold: number;
}

interface TrackOptions {
  onBeat: (beat: number) => void;
  /** a drawer is out: the pick for its layer lands */
  onLand: (layer: SwapLayer, option: number) => void;
  /** back above the swap: the plan shows the page in Fumadocs UI again */
  onBack: () => void;
}

export interface Track {
  /** the reader picked an option: its drawer comes out, the pick lands, it goes back in */
  want: (layer: SwapLayer, option: number) => void;
  /** a drawer holds `option` at once, in place */
  reset: (layer: SwapLayer, option: number) => void;
  destroy: () => void;
}

function seg(t: number, [a, b]: readonly [number, number]) {
  return t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a);
}

function setStyle(el: HTMLElement | SVGElement, property: string, value: string) {
  if (el.style.getPropertyValue(property) !== value) el.style.setProperty(property, value);
}

/** an element's box inside `root`, in its untransformed layout */
function offsetIn(el: HTMLElement, root: HTMLElement): Rect {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return [x, y, el.offsetWidth, el.offsetHeight];
}

/**
 * The stage as a function of the pinned scroll and the reader's picks: the camera from the plan to
 * the block, the labels and the panel on the way, the drawers that play each pick. One loop
 * writes every style the motion changes; the scroll position eases toward its target, so a flick
 * plays the motion instead of skipping it. Nothing runs while the stage is off screen or still.
 */
export function createTrack(root: HTMLElement, options: TrackOptions): Track {
  const q = (selector: string) => root.querySelector<HTMLElement>(selector)!;
  const all = <T extends Element = HTMLElement>(selector: string) =>
    Array.from(root.querySelectorAll<T>(selector));
  const stage = q('[data-stage]');
  const canvas = q('[data-canvas]');
  const cameraEl = q('[data-camera]');
  const face = q('[data-drawer=ui] > :first-child');
  const code = q('[data-code]');
  const keys = q('[data-keys]');
  const panel = [keys, code];
  const solids = all('[data-solid]');
  const labels = all('[data-label]');
  const leaders = all<SVGPathElement>('[data-leader]');
  const dots = all<SVGCircleElement>('[data-dot]');

  const drawers = new Map<string, Drawer>();
  for (let i = 0; i < DRAWERS.length; i++) {
    drawers.set(DRAWERS[i], {
      el: q(`[data-drawer=${DRAWERS[i]}]`),
      z: drawerZ(i),
      want: 0,
      shown: 0,
      x: 0,
      hold: 0,
    });
  }

  const size: Size = { width: 0, height: 0 };
  let plan: Pose = planPose(size);
  let block: Pose = plan;
  let swap: Pose = plan;
  let top = 0;
  let sticky = 0;
  let range = 1;
  let target = 0;
  let progress = 0;
  let beat = -1;
  let swapping = false;
  let measured = false;
  /** the stage is hidden on small screens and with reduced motion: nothing to pin, nothing to draw */
  let shown = false;
  let visible = false;
  let raf = 0;
  let last = 0;

  /** the labels and their leaders follow the parts as the page renders them */
  function placeParts() {
    const rects: Record<string, Rect> = { ...RECTS };
    for (const el of face.querySelectorAll<HTMLElement>('[data-part]'))
      rects[el.dataset.part!] = offsetIn(el, face);
    const placements = placeLabels(rects);
    for (let i = 0; i < placements.length; i++) {
      const { label, leader, dot } = placements[i];
      setStyle(labels[i], 'left', `${label[0]}px`);
      setStyle(labels[i], 'top', `${label[1]}px`);
      leaders[i].setAttribute('d', leader);
      dots[i].setAttribute('cx', String(dot[0]));
      dots[i].setAttribute('cy', String(dot[1]));
    }
  }

  function layout() {
    shown = root.offsetHeight > 0;
    if (!shown) return;
    size.width = canvas.clientWidth;
    size.height = canvas.clientHeight;
    plan = planPose(size);
    block = blockPose(size, { x: 2, y: 2, width: size.width - 4, height: size.height - 4 });
    swap = blockPose(
      size,
      { x: 2, y: 2, width: code.offsetLeft - GAP - 2, height: keys.offsetTop - GAP - 2 },
      62,
    );
    // the code window's top on the block's
    setStyle(code, 'top', `${blockBounds(size, swap)[1]}px`);
    const box = root.getBoundingClientRect();
    top = box.top + window.scrollY;
    sticky = Number.parseFloat(getComputedStyle(stage).top) || 0;
    range = Math.max(1, root.offsetHeight - stage.offsetHeight);
    placeParts();
    onScroll();
    // the first frame lands where the page already is
    if (!measured) progress = target;
    measured = true;
    render(true);
  }

  /** the keys and the code: out of view they still take focus and stay in the accessibility tree */
  function reveal(next: boolean, instant: boolean) {
    swapping = next;
    for (let i = 0; i < panel.length; i++) {
      const el = panel[i];
      for (const animation of el.getAnimations()) animation.cancel();
      setStyle(el, 'opacity', next ? '1' : '');
      setStyle(el, 'pointer-events', next ? 'auto' : '');
      if (!next || instant) continue;
      // Rise, one after the other on ticks
      el.animate([{ transform: 'translateY(16px)', clipPath: 'inset(0 0 16px 0)' }, {}], {
        duration: 600,
        delay: i * TICK,
        easing: settleCss,
        fill: 'backwards',
      });
    }
  }

  function render(instant = false) {
    const t = progress;
    const pose =
      t < TRACK.reframe[0]
        ? mixPose(plan, block, easeCamera(seg(t, TRACK.camera)))
        : mixPose(block, swap, easeCamera(seg(t, TRACK.reframe)));
    setStyle(cameraEl, 'transform', cameraTransform(pose));

    // straight on, the sides are edge on: they show once the camera tilts
    const tilted = pose.pitch > 0.5;
    for (const solid of solids) setStyle(solid, 'visibility', tilted ? 'visible' : '');

    const step = (TRACK.labels[1] - TRACK.labels[0]) / Math.max(1, labels.length - 1);
    for (let i = 0; i < labels.length; i++) {
      const on = t < TRACK.labels[0] + i * step;
      setStyle(labels[i], 'opacity', on ? '' : '0');
      setStyle(leaders[i], 'visibility', on ? '' : 'hidden');
      setStyle(dots[i], 'visibility', on ? '' : 'hidden');
    }

    for (const drawer of drawers.values())
      setStyle(drawer.el, 'transform', `translate3d(0, ${drawer.x * PULL}px, ${drawer.z}px)`);

    const next = t >= TRACK.reframe[1];
    if (next !== swapping) {
      reveal(next, instant);
      if (!next) options.onBack();
    }

    let current = 0;
    for (let i = 0; i < TRACK.beats.length; i++) if (t >= TRACK.beats[i]) current = i;
    if (current !== beat) {
      beat = current;
      options.onBeat(beat);
    }
  }

  /** every pick lands and every drawer goes in, at once */
  function settle() {
    for (const [layer, drawer] of drawers) {
      if (drawer.want !== drawer.shown) {
        drawer.shown = drawer.want;
        options.onLand(layer as SwapLayer, drawer.shown);
      }
      drawer.x = 0;
      drawer.hold = 0;
    }
    if (shown) render(true);
  }

  function frame(now: number) {
    raf = 0;
    // a frame's timestamp can precede the wake that asked for it
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    let moving = false;

    progress += (target - progress) * (1 - Math.exp(-dt / 0.07));
    if (Math.abs(target - progress) < 0.0005) progress = target;
    else moving = true;

    for (const [layer, drawer] of drawers) {
      const out = drawer.want !== drawer.shown || now < drawer.hold;
      const goal = out ? 1 : 0;
      drawer.x += (goal - drawer.x) * (1 - Math.exp(-dt / (out ? 0.05 : 0.09)));
      if (Math.abs(goal - drawer.x) < 0.002) drawer.x = goal;
      if (drawer.want !== drawer.shown && drawer.x > 0.96) {
        drawer.shown = drawer.want;
        drawer.hold = now + HOLD;
        options.onLand(layer as SwapLayer, drawer.shown);
      }
      if (out || drawer.x !== goal) moving = true;
    }

    render();
    if (moving) raf = requestAnimationFrame(frame);
  }

  function wake() {
    if (raf !== 0 || !visible || !shown) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function onScroll() {
    target = Math.min(1, Math.max(0, (window.scrollY + sticky - top) / range));
    wake();
  }

  /** focus on a key out of view: finish the camera move first */
  function onFocus() {
    if (target < TRACK.reframe[1])
      window.scrollTo({ top: top - sticky + range, behavior: 'instant' });
  }

  // the observer's first call lays the stage out once the page has its own layout, not while
  // React commits
  const resize = new ResizeObserver(layout);
  const view = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) return wake();
    cancelAnimationFrame(raf);
    raf = 0;
    settle();
  });
  resize.observe(root);
  resize.observe(canvas);
  // the parts change size as the fonts load: the labels follow
  for (const el of face.querySelectorAll('[data-part]')) resize.observe(el);
  view.observe(root);
  window.addEventListener('scroll', onScroll, { passive: true });
  for (const el of panel) el.addEventListener('focusin', onFocus);

  return {
    want(layer, option) {
      drawers.get(layer)!.want = option;
      if (visible) wake();
      else settle();
    },
    reset(layer, option) {
      const drawer = drawers.get(layer)!;
      drawer.want = option;
      drawer.shown = option;
      drawer.x = 0;
      drawer.hold = 0;
      render(true);
    },
    destroy() {
      cancelAnimationFrame(raf);
      resize.disconnect();
      view.disconnect();
      window.removeEventListener('scroll', onScroll);
      for (const el of panel) el.removeEventListener('focusin', onFocus);
    },
  };
}
