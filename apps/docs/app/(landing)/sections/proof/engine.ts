import { TICK } from '../../lib/motion';
import { createClock, dot, FIRST, POP, pop, reached, show, whenShareSeen } from '../../lib/script';
import { report } from '../../lib/status';

type Clock = ReturnType<typeof createClock>;

/**
 * The script's timing, in ms, on two clocks. The machine's, from half of it on screen: its screen's
 * frames, a dot, a line, half open, open; its counters as it opens and after, each digit a step and
 * a stagger as it rolls in from zeros. The desk's, from its top quarter on screen but not before the
 * screen is open: the windows in reading order, from 1024px row by row, left to right, zod's first,
 * then the pile and the way to the showcase with the count of all the sites; on phones the picks'
 * pile top to bottom, Vercel's SDKs, then the showcase's pile left to right, ArkType at its end, and
 * the way to the showcase: each window by its `data-window` from 1024px and on phones. The first
 * is the figure's first pop.
 */
export const TIMING = {
  screen: 84,
  rolls: [252, 336, 420],
  step: TICK / 3,
  stagger: TICK / 8,
  open: 252,
  windows: [
    { at: 0, desk: 'zod', phone: 'zod' },
    { at: 126, desk: 'prisma', phone: 'prisma' },
    { at: 210, desk: 'heroui', phone: 'heroui' },
    { at: 336, desk: 'vercel', phone: 'nuqs' },
    { at: 420, desk: 'nuqs', phone: 'better-auth' },
    { at: 546, desk: 'better-auth', phone: 'shadcn-ui' },
    { at: 630, desk: 'shadcn-ui', phone: 'vercel' },
    { at: 756, desk: 'arktype', phone: 'pile-0' },
    { at: 840, desk: 'pile-0', phone: 'pile-1' },
    { at: 966, desk: 'pile-1', phone: 'pile-2' },
    { at: 1050, desk: 'pile-2', phone: 'arktype' },
    { at: 1302, desk: 'all', phone: 'all' },
  ],
};

/**
 * The machine's screen switches on, a dot, a line, then all of it, and as it opens its counters roll
 * in from zeros; the windows land on the desk by `TIMING`: the picks, Vercel's SDKs, the pile and
 * ArkType, then the way to all of the sites on top. The first reports its file, and `status`, the
 * figure's line, is reported again once all is there; `roll` sets how many counters have rolled in,
 * `null` for all at rest.
 */
export function createProjects(
  root: HTMLElement,
  status: string,
  roll: (printed: number | null) => void,
): (() => void) | undefined {
  const machine = root.querySelector<HTMLElement>('[data-machine]');
  const desk = root.querySelector<HTMLElement>('[data-desk]');
  const screen = root.querySelector<HTMLElement>('[data-screen]');
  const beam = root.querySelector<HTMLElement>('[data-beam]');
  const lamp = root.querySelector<HTMLElement>('[data-lamp]');
  if (!machine || !desk || !screen || !beam || !lamp) return;
  const windows = new Map<string, HTMLElement>();
  for (const el of desk.querySelectorAll<HTMLElement>('[data-window]'))
    windows.set(el.dataset.window ?? '', el);
  const clocks = { machine: createClock([machine]), desk: createClock([desk]) };
  let dead = false;
  let open!: () => void;
  const opened = new Promise<void>((done) => (open = done));

  function power(on: boolean) {
    lamp!.dataset.state = on ? 'on' : 'off';
    show(screen!, on);
  }

  function finish() {
    for (const el of windows.values()) show(el, true);
    power(true);
    roll(null);
    report(desk!, status);
  }

  function stop() {
    dead = true;
    for (const stopView of stopViews) stopView();
    clocks.machine.stop();
    clocks.desk.stop();
  }

  // a quote's wire can't wait for its project: the desk goes to its end at once
  function skip() {
    stop();
    for (const animation of root.getAnimations({ subtree: true })) animation.finish();
    finish();
  }
  desk.addEventListener('lp-finish', skip);

  function at(clock: Clock, ms: number, run: () => void) {
    void clock.wait(ms).then(() => {
      if (!dead) run();
    });
  }

  /**
   * The screen opens from its centre: from a 6px dot of the beam through a 1px line of it the
   * screen's width and half the screen to all of it, each of those with its edges on whole device
   * px; the beam goes out at the line
   */
  function switchOn() {
    power(true);
    const box = screen!.getBoundingClientRect();
    const snap = (v: number) => Math.round(v * devicePixelRatio) / devicePixelRatio;
    /** the screen's content shrunk to `w` x `h` about its centre, moved onto whole px */
    function frame(w: number, h: number): Keyframe {
      const x = box.left + (box.width - w) / 2;
      const y = box.top + (box.height - h) / 2;
      return {
        transform: `translate(${snap(x) - x}px, ${snap(y) - y}px) scale(${w / box.width}, ${h / box.height})`,
      };
    }
    const duration = 4 * TIMING.screen;
    screen!.animate(
      [
        frame(6, 6),
        frame(box.width, 1),
        frame(box.width, Math.round(box.height / 2)),
        { transform: 'none' },
        { transform: 'none' },
      ],
      duration,
    );
    beam!.animate({ opacity: [1, 1, 0, 0, 0] }, { duration, easing: 'steps(4, end)' });
  }

  function playMachine() {
    switchOn();
    for (let i = 0; i < TIMING.rolls.length; i++)
      at(clocks.machine, TIMING.rolls[i], () => roll(i + 1));
    at(clocks.machine, TIMING.open, open);
  }

  /** the desk once the machine's screen is open, or after as long on its own clock if the reader
   * has gone past the machine */
  async function playDesk() {
    await Promise.race([opened, clocks.desk.wait(TIMING.open)]);
    if (dead) return;
    const wide = matchMedia('(min-width: 1024px)').matches;
    const last = TIMING.windows.length - 1;
    // every window's pop, from its centre, made now and held at nothing till its beat: the desk is
    // laid out once, and nothing is shown or put in as each lands
    const origin = desk!.getBoundingClientRect();
    const pops: { el: HTMLElement; frames: Keyframe[]; beat: number; x: number; y: number }[] = [];
    for (let i = 0; i <= last; i++) {
      const name = wide ? TIMING.windows[i].desk : TIMING.windows[i].phone;
      const el = windows.get(name);
      if (!el) continue;
      const box = el.getBoundingClientRect();
      const beat = TIMING.windows[i].at;
      pops.push({
        el,
        frames: i === 0 ? FIRST : POP,
        beat,
        x: box.left + box.width / 2 - origin.left,
        y: box.top + box.height / 2 - origin.top,
      });
      if (i === 0) at(clocks.desk, beat, () => report(desk!, `${name}.png`));
      else if (i === last) at(clocks.desk, beat, () => report(desk!, status));
    }
    for (const { el, frames, beat, x, y } of pops) {
      const made = [dot(desk!, x, y, undefined, beat), pop(el, frames, beat)];
      if (clocks.desk.held) for (const animation of made) animation.pause();
    }
  }

  // each part already in view, or with reduced motion, is simply there, as the page shows it: else
  // the machine's screen is off, its counters at zeros, and nothing is on the desk yet
  const stopViews: (() => void)[] = [];
  if (reached(machine)) {
    power(true);
    roll(null);
    open();
  } else {
    power(false);
    roll(0);
    stopViews.push(whenShareSeen(machine, clocks.machine, playMachine));
  }
  const there = reached(desk);
  for (const el of windows.values()) show(el, there);
  if (!there) stopViews.push(whenShareSeen(desk, clocks.desk, () => void playDesk(), 0.25));

  return () => {
    stop();
    desk.removeEventListener('lp-finish', skip);
  };
}
