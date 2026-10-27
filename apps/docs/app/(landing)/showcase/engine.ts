import { type MateInk, mateInk, ORBIT_STEPS, paintMate } from '@/components/mascot/paint';
import { LEGS, MATE_H, MATE_W, SIT } from '@/components/mascot/sprite';
import { BEAT, clamp, TICK } from '../lib/motion';
import { isDark } from '../lib/theme';
import { level, print, printDots, show } from '../ui/site-tile';

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

/** the drums the reels turn in, and the radius of film wound on a reel: empty to full */
export const DRUM_R = 56;
export const DRUMS = { take: [68, STRIP_Y], feed: [572, STRIP_Y] } as const;
const HUB = 12;
export const FULL = 44;

/** the Geneva drive under the gate: its wheel, the driver beside it, their centre distance */
export const GENEVA_C = 30;
/** the crank's radius, the slots' reach: for 4 slots, both are the centre distance over √2 */
export const CRANK = GENEVA_C / Math.SQRT2;
export const LOCK = 14;
export const WHEEL = [GATE - 26, 136] as const;
export const DRIVER = [WHEEL[0] + GENEVA_C, WHEEL[1]] as const;

export const MOTOR = [GATE + 72, 138] as const;
export const PULLEY = 5;
export const DRIVER_PULLEY = 7.5;
export const GAUGE = [MOTOR[0] + 39, MOTOR[1] - 13.5] as const;
/** the needle's angle from upright when the motor stands, and its sweep to flat out */
export const NEEDLE_REST = -70;
export const NEEDLE_SWEEP = 140;

export const ROLLER = 8;
export const ROLLERS = [
  [TRACK_LEFT + 22, STRIP_Y + BAND / 2 + ROLLER],
  [TRACK_RIGHT - 22, STRIP_Y + BAND / 2 + ROLLER],
] as const;

export const DANCER = { pivot: [TRACK_LEFT + 30, 34] as const, length: 34, rest: 24, roller: 6 };

/** her seat on the screen's bottom edge, over the free deck between the gate and the feed drum */
export const SEAT_X = 420;
/** her moon's ring, as wide as on the hero's moon, and the light on her moon */
const RING = 21;
const LIGHT = [0.13, -0.18, 0.975] as const;

/** a turn of the driver, one frame: its pin winds up for 3/8 of it and pulls for the middle quarter */
const TURN = 1200;
const WIND = (TURN * 3) / 8;
/** the screen's develop, 8 steps, ends a frame after "showing constatic-docs.vercel.app" resolves */
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

/** the drums' centres, the take-up reel's first like the radii of `reels()` */
const CENTRES = [DRUMS.take, DRUMS.feed];

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

/** the radius of film on a reel holding `share` of the reel, the area of film kept */
function wound(share: number): number {
  return Math.sqrt(HUB * HUB + clamp(share) * (FULL * FULL - HUB * HUB));
}

export function reels(position: number, count: number): [take: number, feed: number] {
  const taken = (position + LEADER) / (count + LEADER * 2);
  return [wound(taken), wound(1 - taken)];
}

function rotate(deg: number, [x, y]: readonly [number, number]) {
  return `rotate(${deg.toFixed(2)} ${x} ${y})`;
}

export type ProjectorEngine = ReturnType<typeof createProjector>;

/**
 * The projector's loop: still between frames; for a frame, the driver turns once and its pin turns
 * the Geneva wheel a quarter, which pulls the strip a frame and locks it. The reels, rollers, belt,
 * dancer arm and gauge follow.
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

  /** her on the screen's edge: her eyes follow the film while it moves (it runs left, a rewind
   * right), she blinks as a frame locks, her moon steps round with the motor */
  function paintHer(now: number) {
    if (!ink) return;
    const moving = mode === 'run' || (mode === 'turn' && left);
    const eyes = now < blinkUntil ? 1 : moving ? (way > 0 ? 2 : 3) : 0;
    const step = ((Math.floor((motor * 2) / Math.PI) % ORBIT_STEPS) + ORBIT_STEPS) % ORBIT_STEPS;
    const shown = eyes * ORBIT_STEPS + step;
    if (shown === mateShown) return;
    mateShown = shown;
    paintMate(mateImage, SIT, false, eyes, step, RING, ink, LIGHT);
    mate.getContext('2d')!.putImageData(mateImage, 0, 0);
    mate.style.visibility = 'visible';
  }

  function write() {
    reel.style.transform = `translate3d(${(-position * pitch).toFixed(2)}px, 0, 0)`;
    wheel.setAttribute('transform', rotate(-90 * indexed, WHEEL));
    driver.setAttribute('transform', rotate((alpha * 180) / Math.PI, DRIVER));
    pulley.setAttribute('transform', rotate((motor * 180) / Math.PI, MOTOR));
    belt.style.strokeDashoffset = (-motor * PULLEY).toFixed(2);
    const r = reels(position, count);
    for (let i = 0; i < 2; i++) {
      wounds[i].setAttribute('r', r[i].toFixed(2));
      const spun = rotate((-turned[i] * 180) / Math.PI, CENTRES[i]);
      for (const element of spins[i]) element.setAttribute('transform', spun);
      rollers[i].setAttribute('transform', rotate((-roll * 180) / Math.PI, ROLLERS[i]));
    }
    dancer.setAttribute('transform', rotate(swing, DANCER.pivot));
    needle.setAttribute('transform', rotate(NEEDLE_REST + gauge * NEEDLE_SWEEP, GAUGE));
  }

  function playing() {
    return on && booted && !held && visible && !document.hidden && !reduced;
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
    if (queued !== null) {
      const next = queued;
      queued = null;
      seek(next);
    } else schedule();
  }

  function step(now: number) {
    // a frame's timestamp can come before the moment the loop woke
    const dt = clamp(now - last, 0, 48);
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
      // a straight run settles symmetrically
      position = runFrom + (goal - runFrom) * (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
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
    const lift = clamp((-LIFT * travel) / Math.max(dt, 1), -18, 18);
    const reading = Math.log2(1 + motorSpeed / MOTOR_TURN) / Math.log2(1 + MOTOR_MAX / MOTOR_TURN);
    for (let t = 0; t < dt; t += 8) {
      const h = Math.min(8, dt - t);
      swingSpeed += (STIFF * (lift - swing) - DAMP * swingSpeed) * h;
      swing += swingSpeed * h;
      gaugeSpeed += (NEEDLE_STIFF * (reading - gauge) - NEEDLE_DAMP * gaugeSpeed) * h;
      gauge += gaugeSpeed * h;
    }
    write();
    paintHer(now);

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
    // a run, a far pick in a turn, or the strip before it has printed in: it finishes first
    if (mode === 'run' || !booted || (mode === 'turn' && Math.abs(to - position) > FAR)) {
      queued = to;
      return;
    }
    if (mode === 'rest' && to === position) return;
    clearTimeout(timer);
    start(to, clamp((PICK * 2) / (Math.abs(to - position) + 1), PICK_MIN, PICK));
  }

  const view = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    schedule();
  });
  const resize = new ResizeObserver(measure);
  const listeners = new AbortController();
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
  root.addEventListener('pointerenter', hold, { signal: listeners.signal });
  root.addEventListener('pointerleave', release, { signal: listeners.signal });
  root.addEventListener('focusin', hold, { signal: listeners.signal });
  root.addEventListener('focusout', release, { signal: listeners.signal });
  document.addEventListener('visibilitychange', schedule, { signal: listeners.signal });
  measure();

  return {
    seek,
    power(value: boolean) {
      on = value;
      due = Math.max(due, performance.now() + BEAT);
      schedule();
    },
    boot() {
      booted = true;
      due = performance.now() + HOLD - WIND - BEAT * 2;
      ink = mateInk(getComputedStyle(mate));
      paintHer(performance.now());
      rest();
    },
    /** her colours follow the theme */
    restyle() {
      if (!ink) return;
      ink = mateInk(getComputedStyle(mate));
      mateShown = -1;
      paintHer(performance.now());
    },
    destroy() {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      view.disconnect();
      resize.disconnect();
      listeners.abort();
    },
  };
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

const runs = new WeakMap<HTMLCanvasElement, number>();
/** the size and theme each screen print was made for */
const made = new WeakMap<HTMLCanvasElement, string>();

/**
 * Dither: crossfades a screen layer's 1-bit print over its screenshot from `from` to `to` of 16
 * levels, in steps: 16 is the full print, 0 the screenshot in colour, the print hidden again.
 */
export function dither(
  layer: Element | null | undefined,
  from: number,
  to: number,
  duration: number,
) {
  const canvas = layer?.querySelector('canvas');
  const image = layer?.querySelector('img');
  if (!layer || !canvas || !image) return;
  cancelAnimationFrame(runs.get(canvas) ?? 0);
  // the print is made once per size and theme, once the screenshot decodes
  if (!image.complete || image.naturalWidth === 0) return;
  const key = `${layer.clientWidth}x${layer.clientHeight} ${isDark()}`;
  if (made.get(canvas) !== key) {
    print(canvas, image);
    made.set(canvas, key);
  }
  show(canvas, from);
  canvas.style.visibility = 'visible';
  const start = performance.now();
  const tick = (now: number) => {
    const t = now - start;
    show(canvas, from + ((to - from) * level(t, duration)) / 16);
    if (t < duration) runs.set(canvas, requestAnimationFrame(tick));
    else if (to === 0) canvas.style.visibility = '';
  };
  runs.set(canvas, requestAnimationFrame(tick));
}

export function hidePrint(layer: Element) {
  const canvas = layer.querySelector('canvas');
  if (!canvas) return;
  cancelAnimationFrame(runs.get(canvas) ?? 0);
  show(canvas, 0);
  canvas.style.visibility = '';
}
