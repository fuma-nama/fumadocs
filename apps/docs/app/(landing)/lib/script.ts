/**
 * The machinery the landing's scripts run on. A window pops from a dot of ink (`dot`), through
 * the scales an old desktop draws one at, a keyframe a frame, eased in between. The first window of
 * a script takes 7 frames, the others 3.
 */
export const FIRST: Keyframe[] = [
  { transform: 'scale(0)' },
  { transform: 'scale(0.08, 0.07)' },
  { transform: 'scale(0.27, 0.25)' },
  { transform: 'scale(0.87)' },
  { transform: 'scale(0.96)' },
  { transform: 'scale(0.99)' },
  { transform: 'none' },
  { transform: 'none' },
];
export const POP: Keyframe[] = [
  { transform: 'scale(0)' },
  { transform: 'scale(0.3, 0.2)' },
  { transform: 'scale(0.86)' },
  { transform: 'none' },
];

/** ms a frame of a pop takes */
export const FRAME = 42;

/** `el`'s text, written into its one text node: a node put in has the page match its `:has()`
 * rules again */
export function setText(el: Element, text: string) {
  const node = el.firstChild;
  if (node instanceof Text && node === el.lastChild) {
    if (node.data !== text) node.data = text;
  } else el.textContent = text;
}

/** `el` shown, or hidden, from now */
export function show(el: Element, on: boolean) {
  el.classList.toggle('invisible', !on);
}

/**
 * `el` shown, popping by `frames` from its transform origin, a frame each `FRAME` ms from `delay` ms
 * from now; till then, or set to a time before its start, it holds its first frame
 */
export function pop(el: HTMLElement | SVGElement, frames: Keyframe[], delay = 0): Animation {
  show(el, true);
  return el.animate(frames, { duration: (frames.length - 1) * FRAME, delay, fill: 'backwards' });
}

/** each parent's dots whose frame is over, kept for its next pops rather than put in again */
const spare = new WeakMap<Element, HTMLElement[]>();

/** a pop's first frame: a 6px dot at `x, y` in `parent`'s box, in ink or `tone`, `delay` ms from now */
export function dot(
  parent: Element,
  x: number,
  y: number,
  tone = 'bg-lp-ink',
  delay = 0,
): Animation {
  let kept = spare.get(parent);
  if (!kept) spare.set(parent, (kept = []));
  const el = kept.pop() ?? document.createElement('span');
  el.className = `pointer-events-none absolute top-0 left-0 size-1.5 opacity-0 ${tone}`;
  // over everything else in `parent`, as a dot put in last is
  if (parent.lastElementChild !== el) parent.append(el);
  const at = `translate(${x - 3}px, ${y - 3}px)`;
  const animation = el.animate(
    { transform: [at, at], opacity: [1, 1] },
    { duration: FRAME, delay },
  );
  animation.onfinish = animation.oncancel = () => kept.push(el);
  return animation;
}

/** `el` popping by `frames` from its centre, with its dot in `parent` */
export function popCentred(el: HTMLElement, frames: Keyframe[], parent: Element) {
  const origin = parent.getBoundingClientRect();
  const box = el.getBoundingClientRect();
  dot(parent, box.left + box.width / 2 - origin.left, box.top + box.height / 2 - origin.top);
  pop(el, frames);
}

interface Sleeper {
  left: number;
  since: number;
  timer: number;
  done: () => void;
}

interface Clock {
  /** resolves once `ms` of the script's time have passed */
  wait: (ms: number) => Promise<void>;
  /** stops the script's time and its running animations, or lets them go on */
  hold: (held: boolean) => void;
  /** whether it's held: an animation made meanwhile starts paused */
  readonly held: boolean;
  stop: () => void;
}

/** a script's time: timers that stop, with every animation under `roots`, while it is held */
export function createClock(roots: Element[]): Clock {
  let held = false;
  const sleepers = new Set<Sleeper>();
  /** the CSS animations it held: one its own style holds, it leaves held */
  const styled = new Set<Animation>();

  function arm(sleeper: Sleeper) {
    sleeper.since = performance.now();
    sleeper.timer = window.setTimeout(() => {
      sleepers.delete(sleeper);
      sleeper.done();
    }, sleeper.left);
  }

  return {
    wait(ms) {
      return new Promise((done) => {
        const sleeper = { left: ms, since: 0, timer: 0, done };
        sleepers.add(sleeper);
        if (!held) arm(sleeper);
      });
    },
    hold(next) {
      if (next === held) return;
      held = next;
      for (const sleeper of sleepers) {
        if (!held) {
          arm(sleeper);
          continue;
        }
        clearTimeout(sleeper.timer);
        sleeper.left -= performance.now() - sleeper.since;
      }
      for (const root of roots) {
        for (const animation of root.getAnimations({ subtree: true })) {
          if (held && animation.playState === 'running') {
            animation.pause();
            if (animation instanceof CSSAnimation) styled.add(animation);
          } else if (
            !held &&
            animation.playState === 'paused' &&
            (!(animation instanceof CSSAnimation) || styled.has(animation))
          )
            animation.play();
        }
      }
      if (!held) styled.clear();
    },
    get held() {
      return held;
    },
    stop() {
      for (const sleeper of sleepers) clearTimeout(sleeper.timer);
      sleepers.clear();
    },
  };
}

/** `create` run for `el`'s script once it is a screen away; returns its teardown */
export function nearby(el: Element, create: () => (() => void) | undefined): () => void {
  let destroy: (() => void) | undefined;
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries[entries.length - 1].isIntersecting) return;
      observer.disconnect();
      destroy = create();
    },
    { rootMargin: '100% 0px' },
  );
  observer.observe(el);
  return () => {
    observer.disconnect();
    destroy?.();
  };
}

/** a stage's ref: its script made once it is a screen away, and torn down when it unmounts */
export function mount(create: (el: HTMLElement) => (() => void) | undefined) {
  return (el: HTMLDivElement) => nearby(el, () => create(el));
}

export const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** whether `el`'s script is simply at its end: with reduced motion, or already reached */
export function reached(el: Element): boolean {
  return reduce() || el.getBoundingClientRect().top < window.innerHeight;
}

/**
 * Plays `play` once `share` of `el` is on screen, or it fills that share of the screen, holding
 * `clock` while less than half that is; returns its stop
 */
export function whenShareSeen(
  el: Element,
  clock: Clock,
  play: () => void,
  share = 0.5,
): () => void {
  let started = false;
  const thresholds: number[] = [];
  for (let i = 0; i <= 20; i++) thresholds.push(i / 20);
  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[entries.length - 1];
      const screen = entry.rootBounds?.height ?? window.innerHeight;
      const seen = Math.max(entry.intersectionRatio, entry.intersectionRect.height / screen);
      if (seen >= share) {
        clock.hold(false);
        if (!started) {
          started = true;
          play();
        }
      } else if (seen < share / 2) clock.hold(true);
    },
    { threshold: thresholds },
  );
  observer.observe(el);
  return () => observer.disconnect();
}
