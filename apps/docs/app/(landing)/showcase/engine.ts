import { type MateInk, mateInk, ORBIT_STEPS, paintMate } from '@/components/mascot/paint';
import { LEGS, MATE_H, MATE_W, SIT } from '@/components/mascot/sprite';
import { BAYER4, ditherKeyframes } from '../lib/dither';
import { BEAT, clamp, TICK } from '../lib/motion';
import { cssRgb, isDark, onTheme } from '../lib/theme';

/** the deck in its own units, y down from the viewer's bottom edge; it scales with its column */
export const W = 640;
export const H = 164;
/** the strip's centre line and band, a frame, and the pitch from frame to frame (4 perforations) */
export const STRIP_Y = 78;
export const BAND = 48;
export const FRAME_W = 63;
export const FRAME_H = 33;
export const PITCH = 72;
export const LEADER = 3;
/** where the strip shows, between the drums' light traps; the gate holds the frame in its middle */
export const TRACK_LEFT = 136;
export const TRACK_RIGHT = 504;
export const GATE = (TRACK_LEFT + TRACK_RIGHT) / 2;
/** frames the strip shows either side of the gate; they print in one a tick at first */
export const SIDE = 2;

/** the Geneva drive under the gate: its wheel, the driver beside it, their centre distance */
export const GENEVA_C = 30;
/** the crank's radius, the slots' reach: for 4 slots, both are the centre distance over √2 */
export const CRANK = GENEVA_C / Math.SQRT2;
export const LOCK = 14;
export const WHEEL = [GATE - 26, 136] as const;
export const DRIVER = [WHEEL[0] + GENEVA_C, WHEEL[1]] as const;

/** her seat on the screen's bottom edge, over the free deck between the gate and the feed drum */
export const SEAT_X = 420;
/** her moon's ring, as wide as on the hero's moon, and the light on her moon */
const RING = 21;
const LIGHT = [0.13, -0.18, 0.975] as const;

/** a turn of the driver, one frame: its pin winds up for 3/8 of it and pulls for the middle quarter */
const TURN = 1200;
const WIND = (TURN * 3) / 8;
/** the screen's develop */
export const DEVELOP = 312;
/** the frame shows in colour this long before the next pull darkens it */
const HOLD = 3000;
/** a reader's pick turns quicker, the further the quicker; a far one runs the strip straight */
const PICK = 480;
const PICK_MIN = 120;
const FAR = 6;
/** a straight run: the rewind at the reel's end, and a far pick */
const RUN = 1000;
/** the frames on the strip print in, one a tick, before the reel first plays */
const PRINT_IN = (SIDE * 2 + 1) * TICK;

/**
 * Where the strip stands for a total driver angle, in frames. The driver rests with its pin away
 * from the wheel, at -π + 2πn with frame n in the gate; its pin turns the wheel a quarter from -45°
 * to 45°, and the rest of the turn its locking disc holds the wheel still.
 */
function framesAt(alpha: number): number {
  const turn = Math.round(alpha / (2 * Math.PI));
  const angle = alpha - turn * 2 * Math.PI;
  if (angle <= -Math.PI / 4) return turn;
  if (angle >= Math.PI / 4) return turn + 1;
  const slot = Math.atan2(-CRANK * Math.sin(angle), GENEVA_C - CRANK * Math.cos(angle));
  return turn + (Math.PI / 4 - slot) / (Math.PI / 2);
}

function restAt(n: number): number {
  return -Math.PI + n * 2 * Math.PI;
}

function rotate(deg: number, [x, y]: readonly [number, number]) {
  return `rotate(${deg.toFixed(2)} ${x} ${y})`;
}

export type ProjectorEngine = ReturnType<typeof createProjector>;

/**
 * The projector's loop: still between frames; for a frame, the driver turns once and its pin turns
 * the Geneva wheel a quarter, which pulls the strip a frame and locks it. The first time the deck
 * is seen, the frames on the strip print in; then it plays while on screen and out of the reader's
 * hands.
 */
export function createProjector(
  root: HTMLElement,
  count: number,
  reduced: boolean,
  events: { leave: (from: number, to: number) => void; arrive: (index: number) => void },
) {
  const part = (name: string) => root.querySelector<SVGElement>(`[data-part="${name}"]`)!;
  const reel = root.querySelector<HTMLElement>('[data-reel]')!;
  const track = reel.parentElement!;
  const wheel = part('wheel');
  const driver = part('driver');
  const mate = root.querySelector<HTMLCanvasElement>('canvas[data-mate]')!;
  const mateImage = new ImageData(MATE_W, MATE_H);
  let ink: MateInk | null = null;
  let mateShown = -1;
  let blinkUntil = 0;

  let mode: 'rest' | 'turn' | 'run' = 'rest';
  let alpha = restAt(0);
  let position = 0;
  /** the wheel turns with the strip only while the driver pulls it */
  let indexed = 0;
  let goal = 0;
  let rate = 0;
  let runFrom = 0;
  let runStart = 0;
  /** forward, or back on a rewind */
  let way = 1;
  let left = false;
  let queued: number | null = null;

  let on = true;
  let seen = false;
  let booted = false;
  let held = false;
  let visible = false;
  let due = 0;
  let timer = 0;
  let boot = 0;
  let raf = 0;
  let last = 0;
  let pitch = 0;

  function measure() {
    const unit = track.clientWidth / (TRACK_RIGHT - TRACK_LEFT);
    pitch = unit * PITCH;
    // her cells: the most whole device pixels that leave the lower half of the gap above the strip
    // clear of her legs
    const gap = (STRIP_Y - BAND / 2) * unit;
    const fit = Math.floor((gap * devicePixelRatio) / (2 * LEGS));
    mate.style.setProperty('--cell', `${fit / devicePixelRatio}px`);
    mate.style.display = fit < 1 ? 'none' : '';
    write();
  }

  /** the strip's frames, at their size and in the theme's colours */
  function reprint() {
    for (const frame of root.querySelectorAll('[data-frame]')) printFrame(frame);
  }

  /** her on the screen's edge: her eyes follow the film while it moves (it runs left, a rewind
   * right), she blinks as a frame locks, her moon steps round as the strip runs */
  function paintHer(now: number) {
    if (!ink) return;
    const moving = mode === 'run' || (mode === 'turn' && left);
    const eyes = now < blinkUntil ? 1 : moving ? (way > 0 ? 2 : 3) : 0;
    const step = ((Math.floor(position * 4) % ORBIT_STEPS) + ORBIT_STEPS) % ORBIT_STEPS;
    const shown = eyes * ORBIT_STEPS + step;
    if (shown === mateShown) return;
    mateShown = shown;
    paintMate(mateImage, SIT, false, eyes, step, RING, ink, LIGHT);
    mate.getContext('2d')!.putImageData(mateImage, 0, 0);
    mate.style.visibility = 'visible';
  }

  function write() {
    reel.style.transform = `translateX(${(-position * pitch).toFixed(2)}px)`;
    wheel.setAttribute('transform', rotate(-90 * indexed, WHEEL));
    driver.setAttribute('transform', rotate((alpha * 180) / Math.PI, DRIVER));
  }

  function playing() {
    return on && booted && !held && visible && !reduced;
  }

  function schedule() {
    clearTimeout(timer);
    if (mode !== 'rest' || !playing()) return;
    // the rewind runs straight away, with no wind-up of the driver: it waits that much longer
    const rewind = Math.round(position) >= count - 1;
    timer = window.setTimeout(
      () => start(rewind ? 0 : Math.round(position) + 1, TURN),
      Math.max(0, due + (rewind ? WIND : 0) - performance.now()),
    );
  }

  function start(to: number, turn: number) {
    goal = to;
    if (Math.abs(to - position) > FAR) {
      mode = 'run';
      runFrom = position;
      runStart = performance.now();
    } else {
      mode = 'turn';
      rate = ((restAt(to) > alpha ? 1 : -1) * 2 * Math.PI) / turn;
    }
    way = to >= position ? 1 : -1;
    wake();
  }

  function arrive(index: number) {
    left = false;
    // the next pull darkens it after its develop and its hold, the driver's wind-up included
    due = performance.now() + DEVELOP + HOLD - WIND;
    blinkUntil = performance.now() + TICK;
    events.arrive(index);
  }

  function rest() {
    mode = 'rest';
    const next = queued;
    queued = null;
    if (next !== null) seek(next);
    if (mode === 'rest') schedule();
  }

  function step(now: number) {
    // a frame's timestamp can come before the moment the loop woke
    const dt = clamp(now - last, 0, 48);
    last = Math.max(last, now);
    const from = position;

    if (mode === 'turn') {
      const end = restAt(goal);
      alpha += rate * dt;
      if (rate > 0 ? alpha >= end : alpha <= end) alpha = end;
      position = framesAt(alpha);
      indexed = position;
    } else if (mode === 'run') {
      const t = Math.min(1, (now - runStart) / RUN);
      // a straight run settles symmetrically
      position = runFrom + (goal - runFrom) * (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
    }

    if (!left && position !== from) {
      left = true;
      events.leave(Math.round(from), goal);
    }
    if (mode !== 'rest' && left && position === goal) {
      // the frame has locked: in a turn the driver swings on back to rest, a run is done
      arrive(goal);
      if (mode === 'run') {
        alpha = restAt(goal);
        indexed = goal;
        rest();
      }
    }
    if (mode === 'turn' && alpha === restAt(goal)) rest();
    write();
    paintHer(now);
    // the loop sleeps at rest, once her blink is over
    raf = mode === 'rest' && now >= blinkUntil ? 0 : requestAnimationFrame(step);
  }

  function wake() {
    if (raf !== 0) return;
    last = performance.now();
    raf = requestAnimationFrame(step);
  }

  function seek(index: number) {
    const to = clamp(index, 0, count - 1);
    if (reduced) {
      if (to === position) return;
      events.leave(position, to);
      alpha = restAt(to);
      position = to;
      indexed = to;
      write();
      events.arrive(to);
      return;
    }
    // a pick waits for the pull in flight, and for the strip to print in
    if (mode !== 'rest' || !booted) {
      queued = to;
      return;
    }
    if (to === position) return;
    clearTimeout(timer);
    start(to, clamp((PICK * 2) / (Math.abs(to - position) + 1), PICK_MIN, PICK));
  }

  function play() {
    booted = true;
    due = performance.now() + HOLD - WIND - BEAT * 2;
    ink = mateInk(getComputedStyle(mate));
    paintHer(performance.now());
    rest();
  }

  const view = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !seen) {
      seen = true;
      root.dataset.booted = '';
      boot = window.setTimeout(play, reduced ? 0 : PRINT_IN);
    }
    schedule();
  });
  // also prints the frames whose screenshots loaded before hydration
  const resize = new ResizeObserver(() => {
    measure();
    reprint();
  });
  // her colours and the prints follow the theme
  const stopTheme = onTheme(() => {
    reprint();
    if (!ink) return;
    ink = mateInk(getComputedStyle(mate));
    mateShown = -1;
    paintHer(performance.now());
  });
  // the reader's hands on the reel: a mouse over it, or focus from the keyboard in it; let go, it
  // waits a beat
  let pointed = false;
  let focused = false;
  const hands = () => {
    const was = held;
    held = pointed || focused;
    if (was && !held) due = Math.max(due, performance.now() + BEAT);
    schedule();
  };
  const listeners = new AbortController();
  const listen = { signal: listeners.signal };
  const point = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    pointed = event.type === 'pointerenter';
    hands();
  };

  view.observe(root);
  resize.observe(track);
  root.addEventListener('pointerenter', point, listen);
  root.addEventListener('pointerleave', point, listen);
  root.addEventListener(
    'focusin',
    (event) => {
      focused = (event.target as Element).matches(':focus-visible');
      hands();
    },
    listen,
  );
  root.addEventListener(
    'focusout',
    (event) => {
      if (root.contains(event.relatedTarget as Node | null)) return;
      focused = false;
      hands();
    },
    listen,
  );

  return {
    seek,
    power(value: boolean) {
      on = value;
      due = Math.max(due, performance.now() + BEAT);
      schedule();
    },
    destroy() {
      clearTimeout(timer);
      clearTimeout(boot);
      cancelAnimationFrame(raf);
      view.disconnect();
      resize.disconnect();
      stopTheme();
      listeners.abort();
    },
  };
}

/**
 * Prints the screenshot on the canvas at its size, a dot a pixel: object-cover and centred like the
 * <img>, an ordered 4x4 dither in the theme's ink and paper.
 */
function printDots(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const cols = canvas.width;
  const rows = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  // the whole image goes in, a source rectangle would be in bitmap pixels while `naturalWidth` of
  // a `srcset` image is density-corrected
  const scale = Math.max(cols / image.naturalWidth, rows / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, (cols - width) / 2, (rows - height) / 2, width, height);
  // dark dots take the darker theme colour, the rest the lighter one, so dark mode keeps tones
  const style = getComputedStyle(canvas);
  const ink = cssRgb(style.getPropertyValue('--lp-ink'));
  const paper = cssRgb(style.getPropertyValue('--lp-paper'));
  const [dot, ground] = isDark() ? [paper, ink] : [ink, paper];
  const pixels = ctx.getImageData(0, 0, cols, rows);
  const data = pixels.data;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const light = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      const color = light > (BAYER4[(y % 4) * 4 + (x % 4)] + 0.5) / 16 ? ground : dot;
      data[i] = color[0] * 255;
      data[i + 1] = color[1] * 255;
      data[i + 2] = color[2] * 255;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
}

/** a frame of the strip: its screenshot as a 1-bit print in 1px dots */
export function printFrame(frame: Element | null) {
  const canvas = frame?.querySelector('canvas');
  const image = frame?.querySelector('img');
  if (!canvas || !image) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width === 0 || !image.complete || image.naturalWidth === 0) return;
  canvas.width = width;
  canvas.height = height;
  printDots(canvas, image);
}

/** a screen print's dots, in CSS px */
const DOT = 2;
/** the size and theme each screen print was made for */
const made = new WeakMap<HTMLCanvasElement, string>();

/**
 * Dither: shows a screen layer's 1-bit print over its screenshot (`to` 16), or develops it back to
 * the screenshot (`to` 0), through an ordered dither of 2x2 dots.
 */
export function dither(layer: Element | null | undefined, to: 0 | 16, duration: number) {
  const canvas = layer?.querySelector('canvas');
  const image = layer?.querySelector('img');
  if (!layer || !canvas || !image) return;
  for (const animation of canvas.getAnimations()) animation.cancel();
  if (!image.complete || image.naturalWidth === 0) return;
  // the print is made once per size and theme, over the box the screenshot covers
  const key = `${layer.clientWidth}x${layer.clientHeight} ${isDark()}`;
  if (made.get(canvas) !== key) {
    const cols = Math.ceil(layer.clientWidth / DOT);
    const rows = Math.ceil(layer.clientHeight / DOT);
    canvas.width = cols;
    canvas.height = rows;
    // exact dot sizes, the layer clips the last partial dot
    canvas.style.width = `${cols * DOT}px`;
    canvas.style.height = `${rows * DOT}px`;
    printDots(canvas, image);
    made.set(canvas, key);
  }
  const frames = ditherKeyframes(DOT * 2);
  if (to === 0) frames.reverse();
  canvas.style.visibility = 'visible';
  const animation = canvas.animate(frames, { duration });
  if (to === 0) {
    animation.onfinish = () => {
      canvas.style.visibility = '';
    };
  }
}

export function hidePrint(layer: Element) {
  const canvas = layer.querySelector('canvas');
  if (!canvas) return;
  for (const animation of canvas.getAnimations()) animation.cancel();
  canvas.style.visibility = '';
}
