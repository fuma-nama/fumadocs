import { cubicBezier } from 'motion/react';
import { createShaderCanvas, cssRgb } from '../../lib/gl';
import {
  camera,
  clamp,
  type Rect,
  rectIn,
  settle as settleCurve,
  settleCss,
  TICK,
} from '../../lib/motion';
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
/** the framing's: it leaves the page's place at once, so the header and the keys come in early */
const easeSwing = cubicBezier(...settleCurve);
const DEG = Math.PI / 180;
const LIGHT: Vec3 = [0.44, 0.83, 0.34];
/** the gap the layers part to, in layer thicknesses */
const GAP = 1.15;
/** a phone's, so its fronts fill a short stage */
const PHONE_GAP = 0.6;
/** how far a tray slides out, a part of the page's depth */
const PULL = 0.2;
/** how long a tray stays out once its pick has landed, ms */
const HOLD = 8 * TICK;
/** how long the camera stays still before the faces raster again at their own scale, ms */
const STILL = 150;
/** the least time the whole move takes, s: a snap or a flick plays at Start's pace, while a slow
 * drag stays on the finger */
const MOVE = 0.9;
const UNIFORM_MIN = ['uMin[0]', 'uMin[1]', 'uMin[2]', 'uMin[3]'];
const UNIFORM_MAX = ['uMax[0]', 'uMax[1]', 'uMax[2]', 'uMax[3]'];
/** how long a keyboard scroll stays still before it counts as ended, ms, and how long after the
 * key it is watched for */
const KEY_QUIET = 120;
const KEY_WATCH = 1000;
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End']);
/** the least of the run the camera moves before the full step, and the margin the step keeps */
const STEP = 0.1;
const STEP_MARGIN = 0.05;

/**
 * The layouts of `parts.css`; `still` is reduced motion and landscape phones too small to pin: no
 * pin, the stack at rest
 */
type Mode = 'stage' | 'column' | 'phone' | 'still';

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

export interface StackEngine {
  /** the reader picked an option: its tray unlatches, slides out, takes it and goes back in */
  want: (layer: SwapLayer, option: number) => void;
  destroy: () => void;
}

/**
 * The stack's scene in one frame loop: the camera follows the scroll over the run the figure pins
 * for and lays the real page and the layers' fronts, which are DOM, on their faces.
 */
export function createStack(
  root: HTMLElement,
  onLand: (layer: SwapLayer, option: number) => void,
): StackEngine {
  const find = (name: string) => root.querySelector<HTMLElement>(`[data-${name}]`)!;
  const cell = find('cell');
  const page = find('page');
  const fronts = root.querySelectorAll<HTMLElement>('[data-front]');
  const faces = [page, ...fronts];
  const head = find('head');
  const panel = find('panel');
  const slot = find('slot');
  const spacer = find('run');
  const code = find('window');
  const headItems = head.querySelectorAll<HTMLElement>('[data-rise-group] > *');
  const panelItems = panel.querySelectorAll<HTMLElement>('[data-rise]');

  const trays = new Map<SwapLayer, Tray>();
  for (const layer of SWAPS) trays.set(layer, { want: 0, shown: 0, out: 0, unlatch: 0, hold: 0 });

  /** every pick lands now; `stow` puts the trays in at once, else they ease back in */
  function settle(stow = true) {
    for (const [layer, tray] of trays) {
      if (tray.want !== tray.shown) {
        tray.shown = tray.want;
        onLand(layer, tray.shown);
      }
      if (stow) tray.out = 0;
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
  const cramped = matchMedia('(max-width: 759px) and (max-height: 639px)');

  let mode: Mode = 'still';
  let width = 0;
  let height = 0;
  /** the page in world units, a layer's thickness and a tray's travel */
  let W = 1;
  let D = 1;
  let T = 1;
  let pull = 0;
  let gap = GAP;
  /** where the CSS lays the page out in the canvas, which its transform starts from */
  let pageX = 0;
  let pageY = 0;
  /** a front's own size, in CSS px */
  let frontW = 1;
  let frontH = 1;
  let panelLeft = 0;
  let runFrom = 0;
  let runTo = 1;
  let menu = 0;
  /** the sizes and the mode the views were last made for */
  let laidOut = '';
  /** where in the run the full step starts, and whether the page is still zoomed in */
  let fullFrom = STEP;
  let zoomed = true;
  /** the scroll's last place and way, and when a key last went down */
  let lastY = 0;
  let way = 0;
  let keyAt = -Infinity;
  let keyQuiet = 0;
  /** the page straight on, and the stack at rest */
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
  const point = [0, 0];
  const quad = [0, 0, 0, 0, 0, 0, 0, 0];
  const lo: Vec3 = [0, 0, 0];
  const hi: Vec3 = [0, 0, 0];
  const grid: Vec3 = [0, 0, 0];
  const length = Math.hypot(LIGHT[0], LIGHT[1], LIGHT[2]);
  /** what each face was last given: its transform, and for a front whether it shows and is raised */
  const written: string[] = ['', '', '', '', ''];
  const facing: boolean[] = [false, false, false, false];
  const raised: boolean[] = [false, false, false, false];

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
    mode =
      reduce.matches || cramped.matches
        ? 'still'
        : full.matches
          ? 'stage'
          : wide.matches
            ? 'column'
            : 'phone';
    // the page's height changing around the figure, as a code window grows after a pick, only moves
    // the run: the camera and the header and keys carry on as they are
    const layout = `${mode} ${width} ${height} ${W} ${D}`;
    if (layout === laidOut) {
      run();
      scrolled();
      return;
    }
    laidOut = layout;
    frontW = fronts[0].offsetWidth;
    frontH = fronts[0].offsetHeight;
    T = (W * frontH) / frontW;
    pull = PULL * D;
    const style = getComputedStyle(root);
    menu = Number.parseFloat(style.getPropertyValue('--lp-menu-h')) || 0;
    const gutter = Number.parseFloat(style.getPropertyValue('--lp-gutter')) || 16;
    const origin = cell.getBoundingClientRect();
    const headBox = rectIn(head, origin);
    const headFoot = headBox.y + headBox.h;
    const panelBox = rectIn(panel, origin);
    panelLeft = panelBox.x;
    // a phone's keys stand over the canvas' foot, a landscape phone's beside it
    const keysTop = mode === 'phone' && panelLeft < width / 2 ? panelBox.y : height;

    let rest: Rect;
    if (mode === 'stage') rest = rectIn(slot, origin);
    else if (mode === 'column')
      rest = { x: gutter, y: gutter, w: panelLeft - 48 - gutter, h: height - 2 * gutter };
    else if (mode === 'phone') rest = { x: 12, y: 12, w: width - 24, h: keysTop - 24 };
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
    const phone = mode === 'phone';
    gap = phone ? PHONE_GAP : GAP;
    const top = 4 * T + 3 * gap * T;
    // where a phone's stage leaves the stack a short place, its rest frames the four fronts, where
    // the picks play; elsewhere the whole stack
    const near = phone && rest.w > 1.4 * rest.h;
    box(0, top, near ? D / 2 : -D / 2, D / 2 + pull);
    to = fitView(
      {
        target: [0, top / 2, near ? D / 2 + pull / 2 : pull / 2],
        elev: (phone ? 30 : 27) * DEG,
        yaw: (phone ? -22 : -27) * DEG,
        focal,
      },
      lo,
      hi,
      width,
      height,
      rest,
    );

    run();
    // the full step starts once the stack has left the header's and the keys' place for good
    let clear = 0;
    if (mode !== 'still')
      for (let i = 100; i >= 0 && clear === 0; i--) {
        const stack = stackBox(aimAt(i / 100));
        const over =
          mode === 'phone'
            ? stack.y + stack.h > keysTop - 16
            : stack.x + stack.w > panelLeft - 24 || (mode === 'stage' && stack.y < headFoot + 16);
        if (over) clear = Math.min(1, (i + 1) / 100);
      }
    fullFrom = Math.max(STEP, clear);
    shader!.set('uCell', 2);
    shader!.set('uPost', [W / 2 - 0.05 * W, D / 2 - 0.07 * D, Math.max(3, 0.006 * W)]);
    shader!.set('uLight', [LIGHT[0] / length, LIGHT[1] / length, LIGHT[2] / length]);
    // the floor stops short of where the header and the panel stand over the canvas
    const stage = mode === 'stage';
    shader!.set('uFloor', [
      0,
      stage ? headFoot + 12 : 0,
      stage || mode === 'column' ? panelLeft - 12 : width,
      keysTop - 12,
    ]);
    instant = true;
    scrolled();
    progress = target;
    place(true);
    shader!.draw();
  }

  /** where the run is on the page: it pins from the figure's top (never read from what is stuck) */
  function run() {
    runFrom = root.getBoundingClientRect().top + window.scrollY - menu;
    runTo = runFrom + spacer.offsetHeight;
  }

  function scrolled() {
    const y = window.scrollY;
    if (y !== lastY) way = Math.sign(y - lastY);
    lastY = y;
    if (performance.now() - keyAt < KEY_WATCH) {
      clearTimeout(keyQuiet);
      keyQuiet = window.setTimeout(onKeyScrollEnd, KEY_QUIET);
    }
    target = mode === 'still' ? 1 : clamp((y - runFrom) / Math.max(1, runTo - runFrom));
    // the page snaps only within the run: above the page zoomed in and past the full step, nothing
    // pulls a reader in or back
    root.toggleAttribute('data-snapping', y >= runFrom - 1 && y <= runTo + 1);
    shader!.invalidate();
  }

  /**
   * The camera at `p` of the run into `cam`; returns how far the layers have parted. The pull-back
   * and the framing lead, so the stack clears the header's and the keys' place early; the tilt and
   * the parting carry on to the run's end.
   */
  function aimAt(p: number): number {
    const dolly = 1 - (1 - clamp(p / 0.35)) ** 2;
    const tilt = easeTilt(clamp(p / 0.9));
    const swing = easeSwing(clamp(p / 0.5));
    viewAt(view, from, to, dolly, tilt, swing);
    aim(cam, view, width, height);
    return easeCamera(clamp((p - 0.2) / 0.8));
  }

  /** the box across the page's width from `y0` to `y1` and `z0` to `z1`, into `lo` and `hi` */
  function box(y0: number, y1: number, z0: number, z1: number) {
    lo[0] = -W / 2;
    lo[1] = y0;
    lo[2] = z0;
    hi[0] = W / 2;
    hi[1] = y1;
    hi[2] = z1;
  }

  /** the stack's box on the canvas with its layers parted by `part`, no tray out */
  function stackBox(part: number) {
    box(0, 4 * T + 3 * gap * T * part, -D / 2, D / 2);
    return boundsOf(cam, lo, hi);
  }

  /**
   * A face across the page's width, top edge at `y0`, `z0` and bottom at `y1`, `z1`: its corners on
   * the canvas less where its element sits (`dx`, `dy`), into `quad` from the top left, clockwise
   */
  function corners(y0: number, z0: number, y1: number, z1: number, dx = 0, dy = 0) {
    for (let i = 0; i < 4; i++) {
      const bottom = i >= 2;
      project(cam, i === 0 || i === 3 ? -W / 2 : W / 2, bottom ? y1 : y0, bottom ? z1 : z0, point);
      quad[2 * i] = point[0] - dx;
      quad[2 * i + 1] = point[1] - dy;
    }
    return quad;
  }

  function write(i: number, transform: string) {
    if (written[i] === transform) return;
    written[i] = transform;
    faces[i].style.transform = transform;
  }

  function onFrame() {
    if (width === 0) return;
    // the page's clock, which picks set their times by
    const now = performance.now();
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    let moving = false;

    progress += clamp((target - progress) * (1 - Math.exp(-dt / 0.07)), -dt / MOVE, dt / MOVE);
    if (Math.abs(target - progress) < 1e-4) progress = target;
    else moving = true;

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
      if (out || tray.out !== goal) moving = true;
    }

    const part = aimAt(progress);
    shader!.set('uEye', cam.eye);
    shader!.set('uRight', cam.right);
    shader!.set('uUp', cam.up);
    shader!.set('uFwd', cam.fwd);
    shader!.set('uFocal', cam.focal);
    shader!.set('uCentre', cam.centre);

    // the layers top down, parted by `part`, each slid out by its tray; the real faces on them
    const step = T + gap * T * part;
    let reach = 0;
    for (let i = 0; i < 4; i++) {
      const out = trays.get(LAYERS[i] as SwapLayer)?.out ?? 0;
      const dz = out * pull;
      const y = (3 - i) * step;
      const z = D / 2 + dz;
      reach = Math.max(reach, dz);
      box(y, y + T, -D / 2 + dz, z);
      shader!.set(UNIFORM_MIN[i], lo);
      shader!.set(UNIFORM_MAX[i], hi);
      if (i === 0) write(0, quadMatrix(corners(y + T, -D / 2 + dz, y + T, z, pageX, pageY), W, D));
      // a front shows once the eye is in front of it, and the tray out sits over the ones below
      const front = fronts[i];
      const shows = cam.eye[2] > z + 1;
      if (shows !== facing[i]) {
        facing[i] = shows;
        front.style.visibility = shows ? 'visible' : 'hidden';
      }
      if (shows) write(i + 1, quadMatrix(corners(y + T, z, y, z), frontW, frontH));
      if (out > 0 !== raised[i]) {
        raised[i] = out > 0;
        front.style.zIndex = raised[i] ? '1' : '';
      }
    }
    box(0, 3 * step + T, -D / 2, D / 2 + reach);
    shader!.set('uBoundMin', lo);
    shader!.set('uBoundMax', hi);
    // the floor's shadow and grid come in once the camera has left overhead, so the page starts flat
    const world = clamp((84 - view.elev / DEG) / 18);
    shader!.set('uShadow', 0.28 * world);
    grid[0] = mode === 'phone' ? 24 : 48;
    grid[1] = 0.14 * world;
    grid[2] = 0.8 * Math.max(W, D);
    shader!.set('uGrid', grid);

    if (moving) {
      for (const face of faces) face.style.willChange = 'transform';
      clearTimeout(still);
      still = window.setTimeout(() => {
        for (const face of faces) face.style.willChange = '';
      }, STILL);
    }

    place();
    instant = false;
    if (moving) shader!.invalidate();
  }

  /**
   * The header and the panel by the step, both ways of the scroll: the page zoomed in, or the full
   * step from where the camera has cleared their place, with a margin so a move back and forth
   * there never flickers. The full step shows the keys, the header with them, or on a phone giving
   * way to them. A pick still on its way lands as the keys go, and focus in them moves to the
   * figure.
   */
  function place(force = false) {
    zoomed = progress < fullFrom - (zoomed ? 0 : STEP_MARGIN);
    const headNext = mode === 'phone' || !zoomed;
    const panelNext = !zoomed;
    if (force || headNext !== headShown) show(head, headNext);
    if (force || panelNext !== panelShown) {
      if (panelShown && !panelNext) {
        settle(false);
        if (panel.contains(document.activeElement)) root.focus({ preventScroll: true });
      }
      show(panel, panelNext);
    }
  }

  /**
   * The header rises on ticks with the lead's pixels morphing in, as Start's does; the panel's keys
   * rise in pairs with their labels and our window opens from a 1px line, in about 300ms. Hidden at
   * once, and inert to the pointer while hidden.
   */
  function show(container: HTMLElement, next: boolean) {
    const quick = container === panel;
    if (quick) panelShown = next;
    else headShown = next;
    container.toggleAttribute('data-shown', next);
    const items = quick ? panelItems : headItems;
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
      if (instant || !next) {
        const end = next ? shown : hidden;
        const opacity = next ? 1 : 0;
        // the phone's header and keys share a place: the one going leaves it at once
        const fade = instant || mode === 'phone' ? 1 : 120;
        item.animate([end, end], { duration: 1, fill: 'forwards' });
        item.animate([{ opacity }, { opacity }], { duration: fade, fill: 'forwards' });
        continue;
      }
      const delay = quick ? (opens ? 70 : Math.floor(i / 2) * 35) : i * TICK;
      const motion = opens
        ? { duration: 200, easing: 'steps(4, end)' }
        : { duration: quick ? 220 : 700, easing: settleCss };
      item.animate([hidden, shown], { ...motion, delay, fill: 'both' });
      item.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: quick ? 80 : 120,
        delay,
        fill: 'both',
      });
      if (i === 0 && !quick)
        item.animate(
          [{ fontVariationSettings: "'ELSH' 100" }, { fontVariationSettings: "'ELSH' 0" }],
          { duration: 4 * TICK, delay, easing: 'steps(4, end)', fill: 'both' },
        );
    }
  }

  function want(layer: SwapLayer, option: number) {
    const tray = trays.get(layer)!;
    tray.want = option;
    // the drawer plays in the full step with the stack on the screen; elsewhere a pick lands at once
    if (!seen || mode === 'still' || zoomed) settle();
    else if (tray.out === 0) tray.unlatch = performance.now() + TICK;
    shader!.invalidate();
  }

  /**
   * Chrome leaves a keyboard scroll unsnapped, and fires no `scrollend` for it, when a second press
   * extends it while it snaps: once such a scroll is still between the steps, it goes on to the one
   * it was heading for. The stage is pinned there, so only the camera moves, at its own pace.
   */
  function onKeyScrollEnd() {
    const y = window.scrollY;
    if (mode === 'still' || y <= runFrom + 2 || y >= runTo - 2) return;
    window.scrollTo({ top: way > 0 ? runTo : runFrom, behavior: 'instant' });
  }

  function onKey(event: KeyboardEvent) {
    // only the keys that scroll the page, and not while typing
    const target = event.target;
    if (!SCROLL_KEYS.has(event.key)) return;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || target.closest('input, textarea, select'))
    )
      return;
    keyAt = performance.now();
  }

  function onFocusIn() {
    // keyboard focus reaches the keys before they show: finish the move to the full step first
    if (!panelShown) window.scrollTo({ top: runTo, behavior: 'instant' });
  }

  const resize = new ResizeObserver(measure);
  // the camera follows the page's scroll only while the canvas is on screen; frames stop off
  // screen, so coming back it takes the pose the scroll has it in at once rather than catching up
  // through the states between
  const visibility = new IntersectionObserver((entries) => {
    // a batch can hold both ways: the last is where it stands
    seen = entries[entries.length - 1].isIntersecting;
    if (!seen) {
      window.removeEventListener('scroll', scrolled);
      return settle();
    }
    window.addEventListener('scroll', scrolled, { passive: true });
    scrolled();
    progress = target;
  });
  const stopTheme = onTheme(colours);
  resize.observe(cell);
  resize.observe(root);
  resize.observe(document.documentElement);
  visibility.observe(cell);
  full.addEventListener('change', measure);
  wide.addEventListener('change', measure);
  reduce.addEventListener('change', measure);
  panel.addEventListener('focusin', onFocusIn);
  window.addEventListener('keydown', onKey);
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
      window.removeEventListener('keydown', onKey);
      clearTimeout(keyQuiet);
      shader.destroy();
    },
  };
}
