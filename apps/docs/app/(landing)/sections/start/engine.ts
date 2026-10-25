import { cubicBezier } from 'motion/react';
import { createShaderCanvas } from '../../lib/gl';
import { camera, settleCss, TICK } from '../../lib/motion';
import { setStatus } from '../../lib/status';
import { createAtlas } from './atlas';
import {
  type Rect,
  type Vec3,
  type View,
  fragment,
  framedView,
  insideView,
  terminalRect,
  unproject,
  viewAt,
} from './scene';
import { COLS, createSession, finalFrame, type Frame, paint, ROWS } from './session';

const cameraEase = cubicBezier(...camera);
/** CRT power on: the raster opens from a line, one step per tick */
const OPEN = [0.002, 0.08, 0.4, 1];
const LIGHT = { azimuth: 0.85, elevation: 0.62 };

interface StartElements {
  /** the tall element the stage is pinned in */
  pin: HTMLElement;
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  /** where the terminal stands in the final composition */
  slot: HTMLElement;
  cta: HTMLElement;
  readout: HTMLElement;
}

/** the figure's scene: camera on scroll, the session on a timer, both only while on screen */
export function createStart(el: StartElements): () => void {
  const shader = createShaderCanvas(el.canvas, { fragment, onFrame });
  if (!shader) return () => {};

  const root = document.documentElement;
  const wide = matchMedia('(min-width: 768px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const session = createSession();
  const chars = new ImageData(COLS, ROWS);
  const items = el.cta.querySelectorAll<HTMLElement>('[data-rise-group] > *, [data-rise]');
  const values = el.readout.querySelectorAll<HTMLElement>('[data-value]');

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

  let target = 0;
  let progress = 0;
  let last = 0;
  const light = { ...LIGHT };
  const lightTarget = { ...LIGHT };
  let spin = 0;

  let density: Uint8Array | undefined;
  let visible = false;
  /** the stage holds most of the view, so the session may speak in the status bar */
  let focused = false;
  let current = 0;
  let timer = 0;
  let openAt = -1;
  let shown = true;
  let readoutShown = true;
  let disposed = false;

  function colours() {
    const style = getComputedStyle(root);
    const night = root.classList.contains('dark');
    const paper = rgb(style.getPropertyValue('--lp-paper'));
    const ink = rgb(style.getPropertyValue('--lp-ink'));
    shader!.set('uLit', night ? ink : paper);
    shader!.set('uShade', night ? paper : ink);
    shader!.set('uAccent', rgb(style.getPropertyValue(night ? '--lp-yellow' : '--lp-sun')));
    shader!.set('uNight', night ? 1 : 0);
    shader!.invalidate();
  }

  function layout() {
    width = el.stage.clientWidth;
    height = el.stage.clientHeight;
    if (width === 0 || height === 0) return;
    const stage = el.stage.getBoundingClientRect();
    const box = el.slot.getBoundingClientRect();
    const slot: Rect = {
      x: box.left - stage.left,
      y: box.top - stage.top,
      w: box.width,
      h: box.height,
    };
    pinned = wide.matches && !reduce.matches;
    // the terminal takes the slot's left part, the moon rises in the rest
    final = framedView(width, height, { ...slot, w: slot.w * 0.8 });
    inside = insideView(width, height);
    const t = terminalRect(final, width, height);
    const radius = Math.min(slot.w * 0.11, t.h * 0.28);
    const distance = 420;
    moon = unproject(
      final,
      width,
      height,
      slot.x + slot.w - radius * 1.5,
      t.y + t.h - radius * 0.75,
      distance,
    );
    moonRadius = (radius * distance) / final.focal;
    horizonX = t.x + t.w / 2;
    const pin = el.pin.getBoundingClientRect();
    pinTop = pin.top + window.scrollY;
    stickyTop = Number.parseFloat(getComputedStyle(el.stage).top) || 0;
    range = Math.max(1, pin.height - height);
    shader!.set('uCell', 2);
    scroll();
    progress = target;
    shader!.invalidate();
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
      const step = Math.floor((performance.now() - openAt) / TICK);
      open = OPEN[Math.min(step, OPEN.length - 1)];
      if (step < OPEN.length) moving = true;
    } else if (!reduce.matches) open = 0;
    shader!.set('uOpen', open);

    reveal(!pinned || (shown ? e > 0.6 : e > 0.8));
    readout(view, pinned && dolly > 0.5);
    if (moving) shader!.invalidate();
  }

  function reveal(next: boolean, instant = false) {
    if (shown === next) return;
    shown = next;
    el.cta.style.pointerEvents = next ? '' : 'none';
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      for (const animation of item.getAnimations()) animation.cancel();
      const from = { transform: 'translateY(24px)', clipPath: 'inset(0 0 24px 0)' };
      const to = { transform: 'none', clipPath: 'inset(0 0 0 0)' };
      if (instant || !next) {
        item.animate([next ? to : from, next ? to : from], { duration: 1, fill: 'forwards' });
        item.animate([{ opacity: next ? 1 : 0 }, { opacity: next ? 1 : 0 }], {
          duration: instant ? 1 : 120,
          fill: 'forwards',
        });
        continue;
      }
      const delay = i * TICK;
      item.animate([from, to], { duration: 700, delay, easing: settleCss, fill: 'both' });
      item.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, delay, fill: 'both' });
      if (i === 0) {
        item.animate(
          [{ fontVariationSettings: "'ELSH' 100" }, { fontVariationSettings: "'ELSH' 0" }],
          { duration: 4 * TICK, delay, easing: 'steps(4, end)', fill: 'both' },
        );
      }
    }
  }

  function readout(view: View, next: boolean) {
    if (next !== readoutShown) {
      readoutShown = next;
      el.readout.style.visibility = next ? '' : 'hidden';
    }
    if (!next || values.length < 2) return;
    const yaw = `${((view.yaw * 180) / Math.PI).toFixed(1)}°`;
    const distance = Math.hypot(view.eye[0], view.eye[2]).toFixed(2);
    if (values[0].textContent !== yaw) values[0].textContent = yaw;
    if (values[1].textContent !== distance) values[1].textContent = distance;
  }

  function render(frame: Frame) {
    if (!density) return;
    paint(frame, chars.data, density);
    shader!.texture('uChars', chars);
    if (frame.status && focused) setStatus(frame.status);
  }

  function play() {
    clearTimeout(timer);
    if (!density) return;
    if (reduce.matches) {
      openAt = -1;
      render(finalFrame(session));
      return;
    }
    openAt = performance.now();
    current = 0;
    render(session.frames[0]);
    timer = window.setTimeout(next, OPEN.length * TICK + session.frames[1].at);
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
      // the screen powers on once the glass fills the view (the stage may be taller than it)
      const fill =
        entry.intersectionRect.height /
        Math.min(entry.boundingClientRect.height, window.innerHeight);
      focused = fill > 0.5;
      if (!visible && fill > 0.85) {
        visible = true;
        play();
      } else if (visible && !entry.isIntersecting) {
        visible = false;
        clearTimeout(timer);
      }
    },
    { threshold: [0, 0.25, 0.5, 0.75, 0.9, 1] },
  );

  const spinner = window.setInterval(() => {
    if (!visible || reduce.matches) return;
    spin += 0.02;
    shader.invalidate();
  }, 2 * TICK);

  function onPointer(event: PointerEvent) {
    if (event.pointerType !== 'mouse' || reduce.matches) return;
    const box = el.stage.getBoundingClientRect();
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
    play();
  }

  const resize = new ResizeObserver(layout);
  const theme = new MutationObserver(colours);
  resize.observe(el.stage);
  resize.observe(el.pin);
  resize.observe(root);
  theme.observe(root, { attributes: true, attributeFilter: ['class'] });
  visibility.observe(el.stage);
  window.addEventListener('scroll', scroll, { passive: true });
  wide.addEventListener('change', onPreference);
  reduce.addEventListener('change', onPreference);
  el.stage.addEventListener('pointermove', onPointer);
  el.stage.addEventListener('pointerleave', onLeave);
  el.cta.addEventListener('focusin', onFocus);
  colours();
  layout();
  if (pinned && target < 0.6) reveal(false, true);

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
    theme.disconnect();
    visibility.disconnect();
    window.removeEventListener('scroll', scroll);
    wide.removeEventListener('change', onPreference);
    reduce.removeEventListener('change', onPreference);
    el.stage.removeEventListener('pointermove', onPointer);
    el.stage.removeEventListener('pointerleave', onLeave);
    el.cta.removeEventListener('focusin', onFocus);
    shader.destroy();
  };
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(a: number, b: number, t: number) {
  const x = clamp((t - a) / (b - a));
  return x * x * (3 - 2 * x);
}

function rgb(value: string): [number, number, number] {
  const hex = value.trim().slice(1);
  const n = Number.parseInt(hex.length === 3 ? hex.replace(/./g, '$&$&') : hex.slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
