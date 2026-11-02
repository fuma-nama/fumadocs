import { createMesh, type Vec3 } from '../../lib/mesh';
import { clamp, easeInOut, rectIn, smoothstep, TICK } from '../../lib/motion';
import { report } from '../../lib/status';
import { COLS, createSession, type Frame, ROWS } from './data';
import {
  type View,
  backdrop,
  columnWidth,
  createAtlas,
  framedView,
  insideView,
  paint,
  terminalRect,
  unproject,
  viewAt,
} from './scene';

/** CRT power on, ms: the raster opens from a line, easing in, while the session starts */
const OPEN = 1.5 * TICK;
/** the narrowest column the session plays in, the windows' 12px code; narrower shows its end */
const LEGIBLE = 7.2;

/**
 * The figure's scene in `pin`, the tall element its stage is pinned in: camera on scroll, the
 * session on a timer, both only while on screen.
 */
export function createStart(pin: HTMLElement): () => void {
  const stage = pin.querySelector<HTMLElement>('[data-stage]')!;
  /** where the terminal stands in the final composition */
  const slot = pin.querySelector<HTMLElement>('[data-slot]')!;
  const cta = pin.querySelector<HTMLElement>('[data-cta]')!;
  const canvas = pin.querySelector('canvas')!;
  const chars = new ImageData(COLS, ROWS);
  // no parts: the figure is all backdrop, the terminal traced in it
  const mesh = createMesh(canvas, {
    parts: [],
    // the stage's fraction of a pixel, as the stage itself has it
    stretch: true,
    onFrame,
    onResize(cssWidth) {
      mesh!.uniform('uResolution', [canvas.width, canvas.height]);
      mesh!.uniform('uDpr', canvas.width / cssWidth);
      layout();
    },
    shader: {
      backdrop,
      textures: { uAtlas: new ImageData(1, 1), uChars: chars },
      coverage: ['uAtlas'],
    },
    // its backdrop reads the theme's paper, ink and accent as uniforms of its own
    theme({ paper, ink, sun, yellow, night }) {
      mesh!.uniform('uLit', night ? ink : paper);
      mesh!.uniform('uShade', night ? paper : ink);
      mesh!.uniform('uAccent', night ? yellow : sun);
      mesh!.uniform('uNight', night ? 1 : 0);
      return undefined;
    },
  });
  if (!mesh) return () => {};

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  const { signal } = listeners;
  const session = createSession();

  let width = 0;
  let height = 0;
  let inside: View | undefined;
  let final: View | undefined;
  let moon: Vec3 = [0, -100, -400];
  let moonRadius = 1;
  let horizonX = 0;
  let stickyTop = 0;
  /** the scroll the stage stays pinned for, the camera's move */
  let range = 0;
  let pinned = false;
  /** the session plays where its glass can be read, its end rests there otherwise */
  let live = false;
  /** the call to action stands beside the terminal, over the hills */
  let beside = false;
  /** its edges and foot on the stage, and how far the valley under it is open */
  const clear: [number, number, number, number] = [0, 0, 0, 0];

  let target = 0;
  let progress = 0;
  /** no frame since the stage came on screen: the next one starts where the page is */
  let fresh = true;
  let shown = true;

  let density: Uint8Array | undefined;
  /** half the stage is on screen: the screen is on */
  let half = false;
  let current = 0;
  let timer = 0;
  let openAt = -1;
  /** the session played through once: from then on it rests */
  let played = false;
  let disposed = false;

  /** how far through its move the camera is, from where the pin is: 0 at the glass, 1 framed */
  function aim() {
    return pinned ? clamp((stickyTop - pin.getBoundingClientRect().top) / range) : 1;
  }

  /** the camera's swing round to the final composition */
  function swing(p: number) {
    return easeInOut(clamp((p - 0.15) / 0.85));
  }

  function layout() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    if (width === 0 || height === 0) return;
    const stageBox = stage.getBoundingClientRect();
    const slotBox = rectIn(slot, stageBox);
    const ctaBox = rectIn(cta, stageBox);
    const foot = cta.lastElementChild as HTMLElement;
    range = pin.offsetHeight - height;
    pinned = range > 0;
    stickyTop = Number.parseFloat(getComputedStyle(stage).top) || 0;
    beside = ctaBox.y < slotBox.y + slotBox.h;
    clear[0] = ctaBox.x;
    clear[1] = ctaBox.x + ctaBox.w;
    clear[2] = ctaBox.y + foot.offsetTop + foot.offsetHeight + 16;
    // the terminal takes the slot's left part, the moon rises in the rest
    final = framedView(width, height, { ...slotBox, w: slotBox.w * 0.8 });
    inside = insideView(width, height);
    // the patterns lie as they show from the final view
    mesh!.uniform('uRestEye', final.eye);
    mesh!.uniform('uRestYaw', final.yaw);
    mesh!.uniform('uRestShift', final.shift);
    const t = terminalRect(final, width, height);
    const radius = Math.min(slotBox.w * 0.11, t.h * 0.28);
    const distance = 420;
    moon = unproject(
      final,
      width,
      height,
      slotBox.x + slotBox.w - radius * 1.5,
      t.y + t.h - radius * 0.75,
      distance,
    );
    moonRadius = (radius * distance) / final.focal;
    horizonX = t.x + t.w / 2;
    target = aim();
    if (fresh) progress = target;
    reveal(swing(progress));
    const plays = !reduce.matches && columnWidth(pinned ? inside : final) >= LEGIBLE;
    if (plays !== live) {
      live = plays;
      play();
    }
    mesh!.invalidate();
  }

  function onScroll() {
    if (!pinned || fresh) return;
    const next = aim();
    if (next === target) return;
    target = next;
    mesh!.invalidate();
  }

  function onFrame(dt: number) {
    if (!final || !inside) return;
    let moving = false;

    if (fresh) progress = target = aim();
    progress += (target - progress) * (1 - Math.exp(-dt / 70));
    if (Math.abs(target - progress) < 1e-4) progress = target;
    else moving = true;
    // an even zoom out of the glass (log distance), and the eased swing round to the final composition
    const dolly = 1 - (1 - clamp(progress / 0.7)) ** 1.6;
    const e = swing(progress);
    const view = pinned ? viewAt(inside, final, dolly, e) : final;
    mesh!.uniform('uEye', view.eye);
    mesh!.uniform('uYaw', view.yaw);
    mesh!.uniform('uFocal', view.focal);
    mesh!.uniform('uShift', view.shift);
    const rise = pinned ? 1 - smoothstep(0.25, 1, e) : 0;
    mesh!.uniform('uMoon', [moon[0], moon[1] - rise * moonRadius * 2.6, moon[2], moonRadius]);
    mesh!.uniform('uHorizon', [horizonX, (pinned ? smoothstep(0.35, 0.8, e) : 1) * width]);

    // a playing session's screen stays off until it powers on, and the raster shows on the glass
    let open = 1;
    if (live && !played) {
      const t = openAt < 0 ? -1 : (performance.now() - openAt) / OPEN;
      open = t < 0 ? 0 : t >= 1 ? 1 : Math.max(0.002, t ** 2.3);
      if (t >= 0 && t < 1) moving = true;
    }
    mesh!.uniform('uOpen', open);

    reveal(e);
    // the hills under the call to action open into a valley as it rises
    const opening = beside && shown ? 1 : 0;
    clear[3] =
      pinned && !fresh ? clear[3] + (opening - clear[3]) * (1 - Math.exp(-dt / 120)) : opening;
    if (Math.abs(opening - clear[3]) < 1e-3) clear[3] = opening;
    else moving = true;
    mesh!.uniform('uClear', clear);
    fresh = false;
    if (moving) mesh!.invalidate();
  }

  /** the call to action shows once the camera has pulled out, and hides as it goes back in */
  function reveal(e: number) {
    const next = !pinned || (shown ? e > 0.6 : e > 0.8);
    if (next === shown) return;
    shown = next;
    cta.toggleAttribute('data-hidden', !next);
  }

  function render(frame: Frame) {
    paint(frame, chars.data, density!);
    mesh!.texture('uChars', chars);
    mesh!.invalidate();
    if (frame.status) report(pin, frame.status);
  }

  /**
   * the session from its start as the screen powers on, or its end at rest where it can't be read or
   * once it has played
   */
  function play() {
    clearTimeout(timer);
    openAt = -1;
    if (!density) return;
    if (!live || played) render(session.rest);
    else if (half) {
      openAt = performance.now();
      current = -1;
      next();
    }
  }

  function next() {
    const frame = session.frames[++current];
    render(frame);
    const following = session.frames[current + 1];
    if (following) timer = window.setTimeout(next, following.at - frame.at);
    else played = true;
  }

  // half the stage on screen turns the screen on
  const watch = new IntersectionObserver(
    (entries) => {
      const ratio = entries[entries.length - 1].intersectionRatio;
      if (ratio === 0) {
        fresh = true;
        half = false;
        clearTimeout(timer);
        openAt = -1;
      } else if (ratio >= 0.5 && !half) {
        half = true;
        if (live) play();
      }
    },
    { threshold: [0, 0.5] },
  );
  watch.observe(canvas);
  addEventListener('scroll', onScroll, { passive: true, signal });
  reduce.addEventListener('change', layout, { signal });
  // the title rewraps as fonts load, moving the call to action's foot
  if (document.fonts.status !== 'loaded') {
    void document.fonts.ready.then(() => {
      if (!disposed) layout();
    });
  }

  const family =
    getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() ||
    'monospace';
  void document.fonts
    .load(`48px ${family}`)
    .catch(() => undefined)
    .then(() => {
      if (disposed) return;
      const atlas = createAtlas(family);
      density = atlas.density;
      mesh!.texture('uAtlas', atlas.image);
      mesh!.uniform('uGlyph', atlas.metrics);
      mesh!.invalidate();
      play();
    });

  return () => {
    disposed = true;
    clearTimeout(timer);
    listeners.abort();
    watch.disconnect();
    mesh!.destroy();
    cta.removeAttribute('data-hidden');
  };
}
