import { cubicBezier } from 'motion/react';
import { createShaderCanvas, cssRgb } from '../../lib/gl';
import { camera, clamp, rectIn, settleCss, smoothstep, TICK } from '../../lib/motion';
import { report } from '../../lib/status';
import { isDark, onTheme } from '../../lib/theme';
import { COLS, createSession, type Frame, ROWS } from './data';
import {
  type Vec3,
  type View,
  createAtlas,
  fragment,
  framedView,
  insideView,
  paint,
  terminalRect,
  unproject,
  viewAt,
} from './scene';

const cameraEase = cubicBezier(...camera);
/** CRT power on: the raster opens from a line, one step per half tick, while the session starts */
const OPEN = [0.002, 0.08, 0.4, 1];
const LIGHT = { azimuth: 0.85, elevation: 0.62 };

/**
 * The figure's scene in `pin`, the tall element its stage is pinned in: camera on scroll, the
 * session on a timer, both only while on screen.
 */
export function createStart(pin: HTMLElement): () => void {
  const stage = pin.querySelector<HTMLElement>('[data-stage]')!;
  /** where the terminal stands in the final composition */
  const slot = pin.querySelector<HTMLElement>('[data-slot]')!;
  const cta = pin.querySelector<HTMLElement>('[data-cta]')!;
  const shader = createShaderCanvas(pin.querySelector('canvas')!, { fragment, onFrame });
  if (!shader) return () => {};

  const root = document.documentElement;
  const wide = matchMedia('(min-width: 768px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  const { signal } = listeners;
  const session = createSession();
  const chars = new ImageData(COLS, ROWS);
  const items = cta.querySelectorAll<HTMLElement>('[data-rise-group] > *, [data-rise]');

  let width = 0;
  let height = 0;
  let inside: View | undefined;
  let final: View | undefined;
  let moon: Vec3 = [0, -100, -400];
  let moonRadius = 1;
  let horizonX = 0;
  let pinTop = 0;
  let stickyTop = 0;
  let range = 1;
  let pinned = false;
  /** the call to action stands beside the terminal, over the hills */
  let beside = false;
  /** its edges and foot on the stage, and how far the valley under it is open */
  const clear: [number, number, number, number] = [0, 0, 0, 0];

  let target = 0;
  let progress = 0;
  let last = 0;
  const light = { ...LIGHT };
  const lightTarget = { ...LIGHT };
  let spin = 0;

  let density: Uint8Array | undefined;
  let visible = false;
  let current = 0;
  let timer = 0;
  let spinner = 0;
  let openAt = -1;
  let shown = true;
  let disposed = false;

  function colours() {
    const style = getComputedStyle(root);
    const night = isDark();
    const paper = cssRgb(style.getPropertyValue('--lp-paper'));
    const ink = cssRgb(style.getPropertyValue('--lp-ink'));
    shader!.set('uLit', night ? ink : paper);
    shader!.set('uShade', night ? paper : ink);
    shader!.set('uAccent', cssRgb(style.getPropertyValue(night ? '--lp-yellow' : '--lp-sun')));
    shader!.set('uNight', night ? 1 : 0);
    shader!.invalidate();
  }

  function layout() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    if (width === 0 || height === 0) return;
    const stageBox = stage.getBoundingClientRect();
    const slotBox = rectIn(slot, stageBox);
    pinned = wide.matches && !reduce.matches;
    beside = wide.matches;
    const ctaBox = cta.getBoundingClientRect();
    const foot = items[items.length - 1];
    clear[0] = ctaBox.left - stageBox.left;
    clear[1] = ctaBox.right - stageBox.left;
    clear[2] = ctaBox.top - stageBox.top + foot.offsetTop + foot.offsetHeight + 16;
    // the terminal takes the slot's left part, the moon rises in the rest
    final = framedView(width, height, { ...slotBox, w: slotBox.w * 0.8 });
    inside = insideView(width, height);
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
    const pinBox = pin.getBoundingClientRect();
    pinTop = pinBox.top + window.scrollY;
    stickyTop = Number.parseFloat(getComputedStyle(stage).top) || 0;
    range = Math.max(1, pinBox.height - height);
    scroll();
    progress = target;
  }

  function scroll() {
    target = pinned ? clamp((window.scrollY + stickyTop - pinTop) / range) : 1;
    shader!.invalidate();
  }

  function onFrame(time: number) {
    if (!final || !inside) return;
    const dt = Math.min(0.1, time - last);
    last = time;
    let moving = false;

    progress += (target - progress) * (1 - Math.exp(-dt / 0.07));
    if (Math.abs(target - progress) < 1e-4) progress = target;
    else moving = true;
    // an even zoom out of the glass (log distance), and the eased swing round to the final composition
    const dolly = 1 - (1 - clamp(progress / 0.7)) ** 1.6;
    const e = cameraEase(clamp((progress - 0.15) / 0.85));
    const view = pinned ? viewAt(inside, final, dolly, e) : final;
    shader!.set('uEye', view.eye);
    shader!.set('uYaw', view.yaw);
    shader!.set('uFocal', view.focal);
    shader!.set('uShift', view.shift);
    const rise = pinned ? 1 - smoothstep(0.25, 1, e) : 0;
    shader!.set('uMoon', [moon[0], moon[1] - rise * moonRadius * 2.6, moon[2], moonRadius]);
    shader!.set('uHorizon', [horizonX, (pinned ? smoothstep(0.35, 0.8, e) : 1) * width]);

    light.azimuth += (lightTarget.azimuth - light.azimuth) * (1 - Math.exp(-dt / 0.25));
    light.elevation += (lightTarget.elevation - light.elevation) * (1 - Math.exp(-dt / 0.25));
    if (
      Math.abs(lightTarget.azimuth - light.azimuth) > 1e-3 ||
      Math.abs(lightTarget.elevation - light.elevation) > 1e-3
    )
      moving = true;
    else Object.assign(light, lightTarget);
    const c = Math.cos(light.elevation);
    shader!.set('uLight', [
      Math.sin(light.azimuth) * c,
      Math.sin(light.elevation),
      Math.cos(light.azimuth) * c,
    ]);
    shader!.set('uSpin', spin);

    let open = 1;
    if (openAt >= 0) {
      const step = Math.floor((performance.now() - openAt) / (TICK / 2));
      open = OPEN[Math.min(step, OPEN.length - 1)];
      if (step < OPEN.length) moving = true;
    } else if (!reduce.matches) open = 0;
    shader!.set('uOpen', open);

    reveal(!pinned || (shown ? e > 0.6 : e > 0.8));
    // the hills under the call to action open into a valley as it rises
    const opening = beside && shown ? 1 : 0;
    clear[3] = pinned ? clear[3] + (opening - clear[3]) * (1 - Math.exp(-dt / 0.12)) : opening;
    if (Math.abs(opening - clear[3]) < 1e-3) clear[3] = opening;
    else moving = true;
    shader!.set('uClear', clear);
    if (moving) shader!.invalidate();
  }

  function reveal(next: boolean) {
    if (shown === next) return;
    shown = next;
    cta.style.pointerEvents = next ? '' : 'none';
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      for (const animation of item.getAnimations()) animation.cancel();
      // no transform or clip-path stays filled: a hidden item is see-through, and a rise ends
      // at the item's own style (filled ones in the sticky, clipped stage crash Chromium 156)
      if (!next) {
        item.animate({ opacity: 0 }, { fill: 'forwards' });
        continue;
      }
      const delay = i * TICK;
      const from = { transform: 'translateY(24px)', clipPath: 'inset(0 0 24px 0)' };
      const to = { transform: 'none', clipPath: 'inset(0 0 0 0)' };
      item.animate([from, to], { duration: 700, delay, easing: settleCss, fill: 'backwards' });
      item.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, delay, fill: 'both' });
    }
  }

  function render(frame: Frame) {
    if (!density) return;
    paint(frame, chars.data, density);
    shader!.texture('uChars', chars);
    if (frame.status) report(pin, frame.status);
  }

  function play() {
    clearTimeout(timer);
    if (!density) return;
    if (reduce.matches) {
      openAt = -1;
      render(session.rest);
      return;
    }
    openAt = performance.now();
    current = -1;
    next();
  }

  function next() {
    current = (current + 1) % session.frames.length;
    const frame = session.frames[current];
    render(frame);
    const following = session.frames[current + 1];
    timer = window.setTimeout(next, (following ? following.at : session.duration) - frame.at);
  }

  const visibility = new IntersectionObserver(
    ([entry]) => {
      // the screen powers on once half the glass is in view (the stage may be taller than it)
      const fill =
        entry.intersectionRect.height /
        Math.min(entry.boundingClientRect.height, window.innerHeight);
      if (!visible && fill >= 0.5) {
        visible = true;
        play();
        spinner = window.setInterval(turn, 2 * TICK);
      } else if (visible && !entry.isIntersecting) {
        visible = false;
        clearTimeout(timer);
        clearInterval(spinner);
      }
    },
    { threshold: [0, 0.25, 0.5, 0.75, 0.9, 1] },
  );

  // the camera follows the page's scroll only while the stage is on screen
  const follow = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      window.addEventListener('scroll', scroll, { passive: true, signal });
      scroll();
    } else window.removeEventListener('scroll', scroll);
  });

  /** the moon turns a step at a time while the screen is on */
  function turn() {
    if (reduce.matches) return;
    spin += 0.02;
    shader!.invalidate();
  }

  function onPointer(event: PointerEvent) {
    if (event.pointerType !== 'mouse' || reduce.matches) return;
    const box = stage.getBoundingClientRect();
    lightTarget.azimuth = ((event.clientX - box.left) / box.width - 0.5) * 2.4;
    lightTarget.elevation = 0.2 + (1 - (event.clientY - box.top) / box.height) * 0.9;
    shader!.invalidate();
  }

  function onLeave() {
    Object.assign(lightTarget, LIGHT);
    shader!.invalidate();
  }

  function onFocus() {
    // keyboard focus lands on the call to action: finish the camera move first
    if (pinned && target < 0.9)
      window.scrollTo({ top: pinTop - stickyTop + range, behavior: 'instant' });
  }

  function onPreference() {
    layout();
    if (visible) play();
  }

  const resize = new ResizeObserver(layout);
  const stopTheme = onTheme(colours);
  resize.observe(stage);
  resize.observe(pin);
  resize.observe(root);
  // the title and description rewrap as fonts load, moving the call to action's foot
  resize.observe(items[0].parentElement!);
  visibility.observe(stage);
  follow.observe(stage);
  wide.addEventListener('change', onPreference, { signal });
  reduce.addEventListener('change', onPreference, { signal });
  stage.addEventListener('pointermove', onPointer, { signal });
  stage.addEventListener('pointerleave', onLeave, { signal });
  cta.addEventListener('focusin', onFocus, { signal });
  colours();
  layout();
  if (pinned && target < 0.6) reveal(false);

  const family = getComputedStyle(root).getPropertyValue('--font-mono').trim() || 'monospace';
  void document.fonts
    .load(`56px ${family}`)
    .catch(() => undefined)
    .then(() => {
      if (disposed) return;
      const atlas = createAtlas(family);
      density = atlas.density;
      shader.texture('uAtlas', atlas.canvas);
      shader.set('uGlyph', atlas.metrics);
      if (visible) play();
    });

  return () => {
    disposed = true;
    clearTimeout(timer);
    clearInterval(spinner);
    resize.disconnect();
    stopTheme();
    visibility.disconnect();
    follow.disconnect();
    listeners.abort();
    shader.destroy();
  };
}
