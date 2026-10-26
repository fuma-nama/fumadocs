import { BAYER4 } from '../lib/bayer';
import { BEAT } from '../lib/motion';
import { level, print, show } from '../ui/site-tile';
import {
  DANCER,
  DRIVER,
  DRIVER_PULLEY,
  DRUMS,
  framesAt,
  GAUGE,
  MOTOR,
  NEEDLE_REST,
  NEEDLE_SWEEP,
  PITCH,
  PULLEY,
  reels,
  restAt,
  ROLLER,
  ROLLERS,
  TRACK_LEFT,
  TRACK_RIGHT,
  WHEEL,
} from './film';

/**
 * A turn of the driver, one frame: its pin winds up for 3/8 of it, pulls the strip for the middle
 * quarter, and swings back to rest for the last 3/8.
 */
const TURN = 1200;
const WIND = (TURN * 3) / 8;
/**
 * The screen develops the new frame in this long once it locks, 8 steps; the pull and the develop
 * end a frame after the longest status line ("showing constatic-docs.vercel.app") has resolved.
 */
export const DEVELOP = 312;
/** the frame shows in colour this long before the next pull darkens it */
const HOLD = 3000;
/** a reader's pick turns quicker, the further the quicker; a far one runs the strip straight */
const PICK = 480;
const PICK_MIN = 120;
const FAR = 6;
/** a straight run: the rewind at the reel's end, and a far pick */
const RUN = 1000;

/** the motor's speed for a turn of the driver, and flat out for a run */
const MOTOR_TURN = ((2 * Math.PI) / TURN) * (DRIVER_PULLEY / PULLEY);
const MOTOR_MAX = MOTOR_TURN * 12;
/** the dancer's spring: how far the strip's speed lifts the arm, how fast it swings back */
const LIFT = 70;
const STIFF = 0.0011;
const DAMP = 0.012;
/** the gauge's needle reads the motor's speed on a stiffer spring */
const NEEDLE_STIFF = 0.0016;
const NEEDLE_DAMP = 0.05;

export interface ProjectorEvents {
  /** the strip leaves frame `from` for frame `to` */
  leave: (from: number, to: number) => void;
  /** frame `index` locked in the gate */
  arrive: (index: number) => void;
}

export interface Projector {
  /** run the strip to frame `index` */
  seek: (index: number) => void;
  /** the run switch: the reel plays on, or stops at the frame it stands on */
  power: (on: boolean) => void;
  /** the strip has printed in: start the reel */
  boot: () => void;
  destroy: () => void;
}

function rotate(deg: number, [x, y]: readonly [number, number]) {
  return `rotate(${deg.toFixed(2)} ${x} ${y})`;
}

/** the symmetric settle of a straight run */
function ease(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * The projector's loop. Between frames everything stands still. For a frame, a clutch couples the
 * driver to the motor for one turn: its pin turns the Geneva wheel a quarter, the wheel pulls the
 * strip one frame through the gate and locks it there. The reels, the rollers and the belt follow;
 * the dancer arm lifts as the strip jumps and its spring brings it back; the gauge reads the motor.
 */
export function createProjector(
  root: HTMLElement,
  count: number,
  reduced: boolean,
  events: ProjectorEvents,
): Projector {
  const part = (name: string) => root.querySelector<SVGElement>(`[data-part="${name}"]`)!;
  const reel = root.querySelector<HTMLElement>('[data-reel]')!;
  const track = reel.parentElement!;
  const wheel = part('wheel');
  const driver = part('driver');
  const belt = part('belt');
  const pulley = part('pulley');
  const dancer = part('dancer');
  const needle = part('needle');
  const spins = [
    root.querySelectorAll<SVGElement>('[data-spin="take"]'),
    root.querySelectorAll<SVGElement>('[data-spin="feed"]'),
  ];
  const wounds = [part('wound-take'), part('wound-feed')];
  const rollers = [part('roller-0'), part('roller-1')];

  let mode: 'rest' | 'turn' | 'run' = 'rest';
  let alpha = restAt(0);
  let position = 0;
  /** the wheel turns with the strip only while the driver pulls it */
  let indexed = 0;
  let goal = 0;
  let rate = 0;
  let runFrom = 0;
  let runStart = 0;
  let left = false;
  let queued: number | null = null;

  let on = true;
  let booted = false;
  let held = false;
  let visible = false;
  let due = 0;
  let timer = 0;
  let raf = 0;
  let last = 0;
  let pitch = 0;

  /** how far each reel has turned, in radians, the rollers, the motor */
  const turned = [0, 0];
  let roll = 0;
  let motor = 0;
  let motorSpeed = 0;
  /** forward or back: the motor keeps its last way round while it spins down */
  let way = 1;
  let swing = 0;
  let swingSpeed = 0;
  let gauge = 0;
  let gaugeSpeed = 0;

  function measure() {
    pitch = (track.clientWidth * PITCH) / (TRACK_RIGHT - TRACK_LEFT);
    write();
  }

  function write() {
    reel.style.transform = `translate3d(${(-position * pitch).toFixed(2)}px, 0, 0)`;
    wheel.setAttribute('transform', rotate(-90 * indexed, WHEEL));
    driver.setAttribute('transform', rotate((alpha * 180) / Math.PI, DRIVER));
    pulley.setAttribute('transform', rotate((motor * 180) / Math.PI, MOTOR));
    belt.style.strokeDashoffset = (-motor * PULLEY).toFixed(2);
    const r = reels(position, count);
    const centres = [DRUMS.take, DRUMS.feed];
    for (let i = 0; i < 2; i++) {
      wounds[i].setAttribute('r', r[i].toFixed(2));
      const spun = rotate((-turned[i] * 180) / Math.PI, centres[i]);
      for (const element of spins[i]) element.setAttribute('transform', spun);
      rollers[i].setAttribute('transform', rotate((-roll * 180) / Math.PI, ROLLERS[i]));
    }
    dancer.setAttribute('transform', rotate(swing, DANCER.pivot));
    needle.setAttribute('transform', rotate(NEEDLE_REST + gauge * NEEDLE_SWEEP, GAUGE));
  }

  function playing() {
    return on && booted && !held && visible && !document.hidden && !reduced;
  }

  /** the next frame comes when the one standing has shown for its hold */
  function schedule() {
    clearTimeout(timer);
    if (mode !== 'rest' || !playing()) return;
    // the rewind runs straight away, with no wind-up of the driver: it waits that much longer
    const rewind = Math.round(position) >= count - 1;
    timer = window.setTimeout(
      () => {
        if (mode !== 'rest' || !playing()) return;
        start(rewind ? 0 : Math.round(position) + 1, TURN);
      },
      Math.max(0, due + (rewind ? WIND : 0) - performance.now()),
    );
  }

  /** run the strip to `to`: driver turns for a near frame, a straight run for a far one */
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
    events.arrive(index);
  }

  function rest() {
    mode = 'rest';
    if (queued !== null) {
      const next = queued;
      queued = null;
      seek(next);
    } else schedule();
  }

  function step(now: number) {
    // a frame's timestamp can come before the moment the loop woke
    const dt = Math.max(0, Math.min(48, now - last));
    last = Math.max(last, now);
    const from = position;
    let target = 0;

    if (mode === 'turn') {
      const end = restAt(goal);
      alpha += rate * dt;
      if (rate > 0 ? alpha >= end : alpha <= end) alpha = end;
      position = framesAt(alpha);
      indexed = position;
      target = Math.abs(rate) * (DRIVER_PULLEY / PULLEY);
    } else if (mode === 'run') {
      const t = Math.min(1, (now - runStart) / RUN);
      position = runFrom + (goal - runFrom) * ease(t);
      target = MOTOR_MAX;
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

    const travel = (position - from) * PITCH;
    const r = reels(position, count);
    turned[0] += travel / r[0];
    turned[1] += travel / r[1];
    roll += travel / ROLLER;
    motorSpeed += (target - motorSpeed) * (1 - Math.exp(-dt / 60));
    motor += way * motorSpeed * dt;

    // the dancer lifts with the strip's speed; the needle reads the motor on a log scale
    const lift = Math.max(-18, Math.min(18, (-LIFT * travel) / Math.max(dt, 1)));
    const reading = Math.log2(1 + motorSpeed / MOTOR_TURN) / Math.log2(1 + MOTOR_MAX / MOTOR_TURN);
    for (let t = 0; t < dt; t += 8) {
      const h = Math.min(8, dt - t);
      swingSpeed += (STIFF * (lift - swing) - DAMP * swingSpeed) * h;
      swing += swingSpeed * h;
      gaugeSpeed += (NEEDLE_STIFF * (reading - gauge) - NEEDLE_DAMP * gaugeSpeed) * h;
      gauge += gaugeSpeed * h;
    }
    write();

    const still =
      mode === 'rest' &&
      motorSpeed < 1e-5 &&
      Math.abs(swing) + Math.abs(swingSpeed) < 0.01 &&
      Math.abs(gauge) + Math.abs(gaugeSpeed) < 0.001;
    raf = still ? 0 : requestAnimationFrame(step);
  }

  function wake() {
    if (raf !== 0) return;
    last = performance.now();
    raf = requestAnimationFrame(step);
  }

  function seek(index: number) {
    const to = Math.max(0, Math.min(count - 1, index));
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
    // a run, or the strip before it has printed in, finishes first
    if (mode === 'run' || !booted) {
      queued = to;
      return;
    }
    if (mode === 'turn' && Math.abs(to - position) > FAR) {
      queued = to;
      return;
    }
    if (mode === 'rest' && to === position) return;
    clearTimeout(timer);
    start(to, Math.max(PICK_MIN, Math.min(PICK, (PICK * 2) / (Math.abs(to - position) + 1))));
  }

  const view = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    schedule();
  });
  const resize = new ResizeObserver(measure);
  const hold = () => {
    held = true;
    schedule();
  };
  const release = () => {
    held = root.matches(':hover') || root.contains(document.activeElement);
    due = Math.max(due, performance.now() + BEAT);
    schedule();
  };

  view.observe(root);
  resize.observe(track);
  root.addEventListener('pointerenter', hold);
  root.addEventListener('pointerleave', release);
  root.addEventListener('focusin', hold);
  root.addEventListener('focusout', release);
  document.addEventListener('visibilitychange', schedule);
  measure();

  return {
    seek,
    power(value) {
      on = value;
      due = Math.max(due, performance.now() + BEAT);
      schedule();
    },
    boot() {
      booted = true;
      due = performance.now() + HOLD - WIND - BEAT * 2;
      if (queued !== null) rest();
      else schedule();
    },
    destroy() {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      view.disconnect();
      resize.disconnect();
      root.removeEventListener('pointerenter', hold);
      root.removeEventListener('pointerleave', release);
      root.removeEventListener('focusin', hold);
      root.removeEventListener('focusout', release);
      document.removeEventListener('visibilitychange', schedule);
    },
  };
}

/** a frame of the strip: the screenshot as a 1-bit print in the theme's ink and paper, 1px dots */
export function printFrame(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width === 0 || !image.complete || image.naturalWidth === 0) return;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
  const pixels = ctx.getImageData(0, 0, width, height);
  const data = pixels.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const light = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      data[i + 3] = light > (BAYER4[(y % 4) * 4 + (x % 4)] + 0.5) / 16 ? 0 : 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const style = getComputedStyle(canvas);
  const ink = style.getPropertyValue('--lp-ink').trim();
  const paper = style.getPropertyValue('--lp-paper').trim();
  const dark = document.documentElement.classList.contains('dark');
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = dark ? paper : ink;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = dark ? ink : paper;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
}

const runs = new Map<HTMLCanvasElement, number>();
/** the size and theme each screen print was made for */
const made = new WeakMap<HTMLCanvasElement, string>();

/** the screen's print of a screenshot, made once per size and theme; false until it decodes */
function prepare(canvas: HTMLCanvasElement, image: HTMLImageElement): boolean {
  if (!image.complete || image.naturalWidth === 0) return false;
  const box = canvas.parentElement!;
  const key = `${box.clientWidth}x${box.clientHeight} ${document.documentElement.classList.contains('dark')}`;
  if (made.get(canvas) !== key) {
    print(canvas, image);
    made.set(canvas, key);
  }
  return true;
}

/**
 * Dither: crossfades the screen's 1-bit print over the screenshot from `from` to `to` of 16
 * levels, in steps: 16 is the full print, 0 the screenshot in colour, the print hidden again.
 */
export function dither(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  from: number,
  to: number,
  duration: number,
) {
  cancelAnimationFrame(runs.get(canvas) ?? 0);
  runs.delete(canvas);
  if (!prepare(canvas, image)) return;
  show(canvas, from);
  canvas.style.visibility = 'visible';
  const start = performance.now();
  const tick = (now: number) => {
    const t = now - start;
    show(canvas, from + ((to - from) * level(t, duration)) / 16);
    if (t < duration) {
      runs.set(canvas, requestAnimationFrame(tick));
      return;
    }
    runs.delete(canvas);
    if (to === 0) canvas.style.visibility = '';
  };
  runs.set(canvas, requestAnimationFrame(tick));
}

/** the screenshot back in colour at once */
export function restore(canvas: HTMLCanvasElement) {
  cancelAnimationFrame(runs.get(canvas) ?? 0);
  runs.delete(canvas);
  show(canvas, 0);
  canvas.style.visibility = '';
}
