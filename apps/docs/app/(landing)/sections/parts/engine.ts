import { cubicBezier } from 'motion/react';
import { createShaderCanvas, cssRgb } from '../../lib/gl';
import { clamp, type Rect, rectIn } from '../../lib/math';
import { camera, settleCss, TICK } from '../../lib/motion';
import { isDark, onTheme } from '../../lib/theme';
import { LAYERS, SWAPS, type SwapLayer } from './data';
import {
  aim,
  boundsOf,
  createCamera,
  fitView,
  focalOf,
  fragment,
  project,
  quadMatrix,
  type Vec3,
  type View,
  viewAt,
} from './scene';

const easeCamera = cubicBezier(...camera);
/** the tilt's own curve: it leaves overhead with the first px of scroll, so the depth reads at once */
const easeTilt = cubicBezier(0.3, 0.1, 0.3, 1);
const DEG = Math.PI / 180;
const LIGHT: Vec3 = [0.44, 0.83, 0.34];
/** the gap the layers part to, in layer thicknesses */
const GAP = 1.15;
/** how far a tray slides out, a part of the page's depth */
const PULL = 0.2;
/** how long a tray stays out once its pick has landed, ms */
const HOLD = 8 * TICK;
/** how long the camera stays still before the faces raster again at their own scale, ms */
const STILL = 150;
/** once in, the header and the panel only leave near the page straight on: below these parts of the run */
const HEAD_LEAVES = 0.08;
const PANEL_LEAVES = 0.15;
const UNIFORM_MIN = ['uMin[0]', 'uMin[1]', 'uMin[2]', 'uMin[3]'];
const UNIFORM_MAX = ['uMax[0]', 'uMax[1]', 'uMax[2]', 'uMax[3]'];

/**
 * How the figure lays out, from its CSS:
 * - `stage`: the whole stage pins, the header and the panel come in on it once the camera clears them;
 * - `column`: the canvas pins across the sheet, the header and the panel pass over its right part;
 * - `band`: the canvas pins as a band on top, the header and the panel pass beneath it;
 * - `still`: reduced motion, no pin, the stack at rest.
 */
type Mode = 'stage' | 'column' | 'band' | 'still';

interface Tray {
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
  /** a pick lands in its tray */
  onLand: (layer: SwapLayer, option: number) => void;
}

export interface StackEngine {
  /** the reader picked an option: its tray unlatches, slides out, takes it and goes back in */
  want: (layer: SwapLayer, option: number) => void;
  destroy: () => void;
}

/**
 * The stack's scene, one frame loop for all of it. The camera follows the scroll over the run the
 * figure pins for: the page straight on, the camera lifting off it and orbiting down, the layers
 * parting, the stack at rest. The real page and the layers' fronts are DOM, laid on their faces by
 * the same camera. Each pick unlatches its tray, slides it out, lands and slides it back.
 */
export function createStack(root: HTMLElement, { onLand }: StackOptions): StackEngine {
  const find = (name: string) => root.querySelector<HTMLElement>(`[data-${name}]`)!;
  const cell = find('cell');
  const page = find('page');
  const fronts = root.querySelectorAll<HTMLElement>('[data-front]');
  const head = find('head');
  const panel = find('panel');
  const slot = find('slot');
  const spacer = find('run');
  const code = find('window');
  const headItems = head.querySelectorAll<HTMLElement>('[data-rise]');
  const panelItems = panel.querySelectorAll<HTMLElement>('[data-rise]');

  const trays = new Map<SwapLayer, Tray>();
  for (const layer of SWAPS) trays.set(layer, { want: 0, shown: 0, out: 0, unlatch: 0, hold: 0 });

  function settle() {
    for (const [layer, tray] of trays) {
      if (tray.want !== tray.shown) {
        tray.shown = tray.want;
        onLand(layer, tray.shown);
      }
      tray.out = 0;
      tray.hold = 0;
    }
  }

  const shader = createShaderCanvas(cell.querySelector('canvas')!, { fragment, onFrame });
  if (!shader) {
    // no WebGL: the still layout with the page straight on, and picks land at once
    root.toggleAttribute('data-flat', true);
    return {
      want(layer, option) {
        trays.get(layer)!.want = option;
        settle();
      },
      destroy() {},
    };
  }

  const full = matchMedia('(min-width: 1348px) and (min-height: 884px)');
  const wide = matchMedia('(min-width: 1024px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let mode: Mode = 'still';
  let width = 0;
  let height = 0;
  /** the page in world units, a layer's thickness and a tray's travel */
  let W = 1;
  let D = 1;
  let T = 1;
  let pull = 0;
  /** where the CSS lays the page out in the canvas, which its transform starts from */
  let pageX = 0;
  let pageY = 0;
  /** a front's own size, in CSS px */
  let frontW = 1;
  let frontH = 1;
  let headFoot = 0;
  let panelLeft = 0;
  let runFrom = 0;
  let runTo = 1;
  const from: View = {
    target: [0, 0, 0],
    dist: 1,
    elev: Math.PI / 2,
    yaw: 0,
    focal: 1,
    shift: [0, 0],
  };
  let to = from;
  const view: View = { target: [0, 0, 0], dist: 1, elev: 0, yaw: 0, focal: 1, shift: [0, 0] };
  const cam = createCamera();
  const point = [0, 0, 0];
  const quad = [0, 0, 0, 0, 0, 0, 0, 0];
  const lo: Vec3 = [0, 0, 0];
  const hi: Vec3 = [0, 0, 0];
  const centre: [number, number] = [0, 0];
  const grid: Vec3 = [0, 0, 0];
  const length = Math.hypot(LIGHT[0], LIGHT[1], LIGHT[2]);
  /** what each face was last given: the page's transform, then each front's, its z-index, whether it shows */
  const written: string[] = ['', '', '', '', ''];
  const raised: boolean[] = [false, false, false, false];
  const facing: boolean[] = [false, false, false, false];

  let target = 0;
  let progress = 0;
  let last = 0;
  let still = 0;
  let headShown = true;
  let panelShown = true;
  /** the next reveal happens at once: the first frame after a layout */
  let instant = true;
  /** the stack is on the screen: a pick plays */
  let seen = false;
  /** the reader is in the panel: it stays */
  let pointerIn = false;
  let focusIn = false;

  function colours() {
    const style = getComputedStyle(document.documentElement);
    const night = isDark();
    const paper = cssRgb(style.getPropertyValue('--lp-paper'));
    const ink = cssRgb(style.getPropertyValue('--lp-ink'));
    shader!.set('uLit', night ? ink : paper);
    shader!.set('uShade', night ? paper : ink);
    shader!.set('uNight', night ? 1 : 0);
    shader!.invalidate();
  }

  /** sizes, the two views and the run, read where the layout is fresh, never per frame */
  function measure() {
    width = cell.clientWidth;
    height = cell.clientHeight;
    W = page.offsetWidth;
    D = page.offsetHeight;
    if (width === 0 || height === 0 || W === 0) return;
    mode = reduce.matches ? 'still' : full.matches ? 'stage' : wide.matches ? 'column' : 'band';
    frontW = fronts[0].offsetWidth;
    frontH = fronts[0].offsetHeight;
    T = (W * frontH) / frontW;
    pull = PULL * D;
    const style = getComputedStyle(root);
    const menu = Number.parseFloat(style.getPropertyValue('--lp-menu-h')) || 0;
    const gutter = Number.parseFloat(style.getPropertyValue('--lp-gutter')) || 16;
    const origin = cell.getBoundingClientRect();
    const scroll = window.scrollY;
    const headBox = rectIn(head, origin);
    const panelBox = rectIn(panel, origin);
    headFoot = headBox.y + headBox.h;
    panelLeft = panelBox.x;

    let rest: Rect;
    if (mode === 'stage') rest = rectIn(slot, origin);
    else if (mode === 'column')
      rest = { x: gutter, y: gutter, w: panelLeft - 48 - gutter, h: height - 2 * gutter };
    else if (mode === 'band') rest = { x: 12, y: 12, w: width - 24, h: height - 24 };
    else rest = { x: 0, y: 0, w: width, h: height };

    // straight on: the page's face at 1:1, where the CSS lays it out
    const focal = focalOf(height);
    from.target[1] = 4 * T;
    from.dist = focal;
    from.focal = focal;
    pageX = page.offsetLeft;
    pageY = page.offsetTop;
    from.shift[0] = pageX + W / 2 - width / 2;
    from.shift[1] = pageY + D / 2 - height / 2;
    const top = 4 * T + 3 * GAP * T;
    const band = mode === 'band';
    lo[0] = -W / 2;
    lo[1] = 0;
    lo[2] = -D / 2;
    hi[0] = W / 2;
    hi[1] = top;
    hi[2] = D / 2 + pull;
    to = fitView(
      {
        target: [0, top / 2, pull / 2],
        elev: (band ? 30 : 27) * DEG,
        yaw: (band ? -22 : -27) * DEG,
        focal,
      },
      lo,
      hi,
      width,
      height,
      rest,
    );

    // it pins from the figure's top (never read from what is stuck): the stage for its spacer, the
    // canvas until the header has risen into it, or the code window reaches the band's foot
    runFrom = root.getBoundingClientRect().top + scroll - menu;
    if (mode === 'stage') runTo = runFrom + spacer.offsetHeight;
    else if (mode === 'column') runTo = runFrom + 1.2 * height;
    else runTo = code.getBoundingClientRect().top + scroll - menu - height;
    shader!.set('uCell', 2);
    shader!.set('uPost', [W / 2 - 0.05 * W, D / 2 - 0.07 * D, Math.max(3, 0.006 * W)]);
    shader!.set('uLight', [LIGHT[0] / length, LIGHT[1] / length, LIGHT[2] / length]);
    // the floor stops short of the panel's column, where the header and the panel stand
    shader!.set('uFloor', [
      0,
      0,
      mode === 'stage' || mode === 'column' ? panelLeft - 12 : width,
      height,
    ]);
    // on the stage they wait for the camera, which the frame below decides at once
    instant = true;
    show(head, headItems, mode !== 'stage');
    show(panel, panelItems, mode !== 'stage');
    scrolled();
    progress = target;
    shader!.draw();
  }

  function scrolled() {
    target =
      mode === 'still' ? 1 : clamp((window.scrollY - runFrom) / Math.max(1, runTo - runFrom));
    shader!.invalidate();
  }

  /**
   * The corners of a face into `quad`, its top left, top right, bottom right and bottom left, on
   * the canvas less where its element already sits (`dx`, `dy`)
   */
  function corners(
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    dx = 0,
    dy = 0,
  ) {
    const ys = [y0, y0, y1, y1];
    const zs = [z0, z0, z1, z1];
    for (let i = 0; i < 4; i++) {
      project(cam, i === 0 || i === 3 ? x0 : x1, ys[i], zs[i], point);
      quad[2 * i] = point[0] - dx;
      quad[2 * i + 1] = point[1] - dy;
    }
    return quad;
  }

  function write(i: number, el: HTMLElement, transform: string): boolean {
    if (written[i] === transform) return false;
    written[i] = transform;
    el.style.transform = transform;
    return true;
  }

  function onFrame() {
    if (width === 0) return;
    // the page's clock, which picks set their times by
    const now = performance.now();
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    let moving = false;

    progress += (target - progress) * (1 - Math.exp(-dt / 0.07));
    if (Math.abs(target - progress) < 1e-4) progress = target;
    else moving = true;

    let picking = false;
    for (const [layer, tray] of trays) {
      const swapping = tray.want !== tray.shown;
      const out = swapping || now < tray.hold;
      const goal = out && now >= tray.unlatch ? 1 : 0;
      tray.out += (goal - tray.out) * (1 - Math.exp(-dt / (goal ? 0.07 : 0.1)));
      if (Math.abs(goal - tray.out) < 0.002) tray.out = goal;
      if (swapping && tray.out > 0.97) {
        tray.shown = tray.want;
        tray.hold = now + HOLD;
        onLand(layer, tray.shown);
      }
      const front = fronts[LAYERS.indexOf(layer)];
      if (out !== front.hasAttribute('data-open')) front.toggleAttribute('data-open', out);
      if (out || tray.out > 0) picking = true;
      if (out || tray.out !== goal) moving = true;
    }

    const dolly = 1 - (1 - clamp(progress / 0.6)) ** 1.6;
    const tilt = easeTilt(clamp(progress / 0.7));
    const swing = easeCamera(clamp((progress - 0.05) / 0.55));
    const part = easeCamera(clamp((progress - 0.4) / 0.4));
    viewAt(view, from, to, dolly, tilt, swing);
    aim(cam, view, width, height);
    shader!.set('uEye', cam.eye);
    shader!.set('uRight', cam.right);
    shader!.set('uUp', cam.up);
    shader!.set('uFwd', cam.fwd);
    shader!.set('uFocal', cam.focal);
    centre[0] = cam.cx;
    centre[1] = cam.cy;
    shader!.set('uCentre', centre);

    // the layers top down, parted by `part`, each slid out by its tray; the real faces on them
    const step = T + GAP * T * part;
    let reach = 0;
    for (let i = 0; i < 4; i++) {
      const out = trays.get(LAYERS[i] as SwapLayer)?.out ?? 0;
      const dz = out * pull;
      const y = (3 - i) * step;
      const z = D / 2 + dz;
      reach = Math.max(reach, dz);
      lo[0] = -W / 2;
      lo[1] = y;
      lo[2] = -D / 2 + dz;
      hi[0] = W / 2;
      hi[1] = y + T;
      hi[2] = z;
      shader!.set(UNIFORM_MIN[i], lo);
      shader!.set(UNIFORM_MAX[i], hi);
      if (i === 0)
        write(
          0,
          page,
          quadMatrix(corners(-W / 2, y + T, -D / 2 + dz, W / 2, y + T, z, pageX, pageY), W, D),
        );
      // a front shows once the eye is in front of it, and the tray out sits over the ones below
      const front = fronts[i];
      const faces = cam.eye[2] > z + 1;
      if (faces !== facing[i]) {
        facing[i] = faces;
        front.style.visibility = faces ? 'visible' : 'hidden';
      }
      if (faces)
        write(i + 1, front, quadMatrix(corners(-W / 2, y + T, z, W / 2, y, z), frontW, frontH));
      if (out > 0 !== raised[i]) {
        raised[i] = out > 0;
        front.style.zIndex = raised[i] ? '1' : '';
      }
    }
    lo[0] = -W / 2;
    lo[1] = 0;
    lo[2] = -D / 2;
    hi[0] = W / 2;
    hi[1] = 3 * step + T;
    hi[2] = D / 2 + reach;
    shader!.set('uBoundMin', lo);
    shader!.set('uBoundMax', hi);
    // the floor's shadow and grid come in once the camera has left overhead, so the page starts flat
    const world = clamp((84 - view.elev / DEG) / 18);
    shader!.set('uShadow', 0.28 * world);
    grid[0] = mode === 'band' ? 24 : 48;
    grid[1] = 0.14 * world;
    grid[2] = 0.8 * Math.max(W, D);
    shader!.set('uGrid', grid);

    if (moving) {
      page.style.willChange = 'transform';
      for (const front of fronts) front.style.willChange = 'transform';
      clearTimeout(still);
      still = window.setTimeout(() => {
        page.style.willChange = '';
        for (const front of fronts) front.style.willChange = '';
      }, STILL);
    }

    // the header and the panel come in as soon as the camera has cleared their place, and stay:
    // they leave only near the page straight on, the panel never while the reader is in it or a
    // tray is out
    if (mode === 'stage') {
      hi[2] = D / 2;
      const box = boundsOf(cam, lo, hi);
      if (!headShown && box.y >= headFoot + 16) show(head, headItems, true);
      else if (headShown && progress < HEAD_LEAVES) show(head, headItems, false);
      if (!panelShown && box.x + box.w <= panelLeft - 24) show(panel, panelItems, true);
      else if (panelShown && progress < PANEL_LEAVES && !pointerIn && !focusIn && !picking)
        show(panel, panelItems, false);
    }
    instant = false;
    if (moving) shader!.invalidate();
  }

  function show(container: HTMLElement, items: NodeListOf<HTMLElement>, next: boolean) {
    if (container === head) headShown = next;
    else panelShown = next;
    container.toggleAttribute('data-shown', next);
    reveal(items, next, instant);
  }

  /**
   * The header rises on ticks with the lead's pixels morphing in, as Start's does; the panel's keys
   * rise layer by layer and our window Opens from a 1px line, in about 300ms. Hidden at once, and
   * inert to the pointer while hidden.
   */
  function reveal(items: NodeListOf<HTMLElement>, next: boolean, now = false) {
    const quick = items === panelItems;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      item.style.pointerEvents = next ? 'auto' : 'none';
      for (const animation of item.getAnimations()) animation.cancel();
      const opens = item === code;
      const hidden = opens
        ? { clipPath: 'inset(calc(50% - 0.5px) 0 calc(50% - 0.5px) 0)' }
        : { transform: 'translateY(24px)', clipPath: 'inset(0 0 24px 0)' };
      const shown = opens
        ? { clipPath: 'inset(0 0 0 0)' }
        : { transform: 'none', clipPath: 'inset(0 0 0 0)' };
      if (now || !next) {
        item.animate([next ? shown : hidden, next ? shown : hidden], {
          duration: 1,
          fill: 'forwards',
        });
        item.animate([{ opacity: next ? 1 : 0 }, { opacity: next ? 1 : 0 }], {
          duration: now ? 1 : 120,
          fill: 'forwards',
        });
        continue;
      }
      // a layer's keys come in a pair with its label
      const delay = quick ? (opens ? 70 : Math.floor(i / 2) * 35) : i * TICK;
      if (opens)
        item.animate([hidden, shown], {
          duration: 200,
          delay,
          easing: 'steps(4, end)',
          fill: 'both',
        });
      else
        item.animate([hidden, shown], {
          duration: quick ? 220 : 700,
          delay,
          easing: settleCss,
          fill: 'both',
        });
      item.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: quick ? 80 : 120,
        delay,
        fill: 'both',
      });
      if (i === 0 && items === headItems)
        item.animate(
          [{ fontVariationSettings: "'ELSH' 100" }, { fontVariationSettings: "'ELSH' 0" }],
          {
            duration: 4 * TICK,
            delay,
            easing: 'steps(4, end)',
            fill: 'both',
          },
        );
    }
  }

  function want(layer: SwapLayer, option: number) {
    const tray = trays.get(layer)!;
    tray.want = option;
    // a tray slides where it has room: the layers parted and the stack on the screen
    if (!seen || mode === 'still' || progress < 0.8) settle();
    else if (tray.out === 0) tray.unlatch = performance.now() + TICK;
    shader!.invalidate();
  }

  function onFocusIn() {
    focusIn = true;
    // keyboard focus reaches the panel before the camera has cleared it: finish the move first
    if (mode === 'stage' && !panelShown) window.scrollTo({ top: runTo, behavior: 'instant' });
  }

  function onFocusOut(event: FocusEvent) {
    focusIn = panel.contains(event.relatedTarget as Node | null);
    shader!.invalidate();
  }

  function onPointer(event: PointerEvent) {
    pointerIn = event.type === 'pointerenter';
    shader!.invalidate();
  }

  const resize = new ResizeObserver(measure);
  const visibility = new IntersectionObserver(([entry]) => {
    seen = entry.isIntersecting;
    if (!seen) settle();
  });
  const stopTheme = onTheme(colours);
  resize.observe(cell);
  resize.observe(root);
  visibility.observe(cell);
  window.addEventListener('scroll', scrolled, { passive: true });
  full.addEventListener('change', measure);
  wide.addEventListener('change', measure);
  reduce.addEventListener('change', measure);
  panel.addEventListener('focusin', onFocusIn);
  panel.addEventListener('focusout', onFocusOut);
  panel.addEventListener('pointerenter', onPointer);
  panel.addEventListener('pointerleave', onPointer);
  colours();
  measure();

  return {
    want,
    destroy() {
      clearTimeout(still);
      resize.disconnect();
      visibility.disconnect();
      stopTheme();
      window.removeEventListener('scroll', scrolled);
      full.removeEventListener('change', measure);
      wide.removeEventListener('change', measure);
      reduce.removeEventListener('change', measure);
      panel.removeEventListener('focusin', onFocusIn);
      panel.removeEventListener('focusout', onFocusOut);
      panel.removeEventListener('pointerenter', onPointer);
      panel.removeEventListener('pointerleave', onPointer);
      shader.destroy();
    },
  };
}
