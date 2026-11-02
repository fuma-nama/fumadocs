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
 * `els` each keep their layer till all of `moves` have ended, by a paused move of their `translate`
 * that adds nothing, as `steer` does with `transform`, which leaves their own animations as they are:
 * the page is laid out in layers once as they all end, not again as each does; resolves as they let go
 */
function keepLayers(els: Element[], moves: Animation[]): Promise<void> {
  const held: Animation[] = [];
  for (const el of els) {
    const still = el.animate({ translate: ['0 0', '0 0'] }, { duration: 1, composite: 'add' });
    still.pause();
    held.push(still);
  }
  const ends: Promise<Animation>[] = [];
  for (const move of moves) ends.push(move.finished);
  return Promise.allSettled(ends).then(() => {
    for (const still of held) still.cancel();
  });
}

/**
 * The machine's screen switches on, a dot, a line, then all of it, and as it opens its counters roll
 * in from zeros; the windows land on the desk by `TIMING`: the picks, Vercel's SDKs, the pile and
 * ArkType, then the way to all of the sites on top. The first reports its file, and `status`, the
 * figure's line, is reported again once all is there; `hold` holds the counters at zeros, or lets
 * them rest on their readings.
 */
export function createProjects(
  root: HTMLElement,
  status: string,
  hold: (zeros: boolean) => void,
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
    hold(false);
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
    const cells: Element[] = [];
    const rolls: Animation[] = [];
    for (const cell of machine!.querySelectorAll('[data-cell]')) {
      const roll = cell.getAnimations()[0];
      if (!roll) continue;
      cells.push(cell);
      rolls.push(roll);
    }
    void keepLayers(cells, rolls);
    // a counter rolls in as its held cells run, set here rather than rendered again
    const counters = machine!.querySelectorAll('dd');
    for (let i = 0; i < counters.length; i++) {
      at(clocks.machine, TIMING.rolls[i], () => {
        for (const cell of counters[i].querySelectorAll<HTMLElement>('[data-cell]'))
          cell.style.animationPlayState = 'running';
      });
    }
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
    const els: HTMLElement[] = [];
    const moves: Animation[] = [];
    for (const { el, frames, beat, x, y } of pops) {
      const made = [dot(desk!, x, y, beat), pop(el, frames, beat)];
      if (clocks.desk.held) for (const animation of made) animation.pause();
      els.push(el);
      moves.push(made[1]);
    }
    // a window that kept its layer past its landing stays painted as it was laid out on it, its
    // shadow's edge a device px off; laid out again, it is painted in place (one that has focus keeps it)
    void keepLayers(els, moves).then(() => {
      if (dead) return;
      const again: HTMLElement[] = [];
      for (const el of els) {
        if (el.contains(document.activeElement)) continue;
        el.style.display = 'none';
        again.push(el);
      }
      void desk!.offsetHeight;
      for (const el of again) el.style.display = '';
    });
  }

  // each part already in view, or with reduced motion, is simply there, as the page shows it: else
  // the machine's screen is off, its counters at zeros, and nothing is on the desk yet
  const stopViews: (() => void)[] = [];
  if (reached(machine)) {
    power(true);
    open();
  } else {
    power(false);
    hold(true);
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
