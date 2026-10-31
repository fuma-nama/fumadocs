import { type Cable, cable, GROW, plug, type Point, wipe } from '../../lib/cable';
import { DISSOLVE, ditherKeyframes } from '../../lib/dither';
import { clamp, type Rect, rectIn, TICK } from '../../lib/motion';
import {
  createClock,
  dot,
  FIRST,
  FRAME,
  POP,
  pop,
  reached,
  setText,
  show,
  whenShareSeen,
} from '../../lib/script';
import { report } from '../../lib/status';
import { EDIT_LINE, FILE, OUTPUTS } from './data';

/** px a ms: the head drawing a cable, and the bead riding one */
const SPEED = 0.8;
const PACE = 0.5;
/** the bead, port to port */
const GLIDE = 'cubic-bezier(0.45, 0, 0.55, 1)';
/**
 * ms: an output's pop, from the head reaching its port to it landing; the source's, to it landing;
 * the drawn desk's hold; a typed character of the edit; from saving to the bead setting off; its
 * slide into or out of a port, and its hold in a window; a window's swap; a change's frame before
 * it dithers out
 */
const STOP = (POP.length - 1) * FRAME;
const LANDS = (FIRST.length - 2) * FRAME;
const HOLD = 500;
const TYPE = 40;
const BEAT = 250;
const DROP = 100;
const SWAP = 300;
const SHOW = 1000;

/** the middle of where two spans overlap */
function middle(a0: number, a1: number, b0: number, b1: number): number {
  return Math.round((Math.max(a0, b0) + Math.min(a1, b1)) / 2);
}

/**
 * The cables' waypoints for the desk's layout, from its windows' boxes in the thread's order, on
 * whole px: each out of one window's edge and into the next's, square to both, at right angles
 * between. From 1024px over the desk into ButtonProps, down and across into button.mdx, straight
 * on to og.png and llms.txt, then across and down into releases; snaking across and down the two
 * columns from 768px; straight down the column below.
 */
function routes(b: Rect[], layout: 'wide' | 'snake' | 'column'): Point[][] {
  const left = (box: Rect) => Math.round(box.x);
  const top = (box: Rect) => Math.round(box.y);
  const right = (box: Rect) => Math.round(box.x + box.w);
  const bottom = (box: Rect) => Math.round(box.y + box.h);
  const at = (box: Rect, share: number) => Math.round(box.x + box.w * share);
  const down = (from: Rect, to: Rect, x: number): Point[] => [
    [x, bottom(from)],
    [x, top(to)],
  ];
  const across = (from: Rect, to: Rect): Point[] => {
    const y = middle(from.y, from.y + from.h, to.y, to.y + to.h);
    return from.x < to.x
      ? [
          [right(from), y],
          [left(to), y],
        ]
      : [
          [left(from), y],
          [right(to), y],
        ];
  };
  const below = (from: Rect, to: Rect) =>
    down(from, to, middle(from.x, from.x + from.w, to.x, to.x + to.w));

  if (layout === 'column') {
    const list: Point[][] = [];
    for (let k = 0; k + 1 < b.length; k++) {
      const l = Math.max(b[k].x, b[k + 1].x);
      const r = Math.min(b[k].x + b[k].w, b[k + 1].x + b[k + 1].w);
      list.push(down(b[k], b[k + 1], Math.round(l + (r - l) * (k % 2 === 0 ? 0.7 : 0.3))));
    }
    return list;
  }
  if (layout === 'snake')
    return [
      across(b[0], b[1]),
      below(b[1], b[2]),
      across(b[2], b[3]),
      below(b[3], b[4]),
      across(b[4], b[5]),
    ];
  const over = at(b[0], 0.84);
  const into = at(b[1], 0.06);
  const turn = at(b[1], 0.86);
  const level = clamp(bottom(b[1]) + 56, top(b[2]) + 20, bottom(b[2]) - 20);
  const drop = at(b[5], 0.73);
  // between the source and releases, on llms.txt's side
  const under = clamp(
    Math.round((b[0].y + b[0].h + b[5].y) / 2),
    top(b[4]) + 20,
    bottom(b[4]) - 20,
  );
  return [
    [
      [over, top(b[0])],
      [over, -24],
      [into, -24],
      [into, top(b[1])],
    ],
    [
      [turn, bottom(b[1])],
      [turn, level],
      [left(b[2]), level],
    ],
    below(b[2], b[3]),
    across(b[3], b[4]),
    [
      [left(b[4]), under],
      [drop, under],
      [drop, top(b[5])],
    ],
  ];
}

/** `at`, a point along the keys `from`, carried to the same point between the same keys of `to` */
function carry(at: number, from: number[], to: number[]): number {
  let i = 0;
  while (i + 2 < from.length && from[i + 1] <= at) i++;
  const share = from[i + 1] > from[i] ? (at - from[i]) / (from[i + 1] - from[i]) : 0;
  return to[i] + Math.min(share, 1) * (to[i + 1] - to[i]);
}

/**
 * A changed part, marked: its flash, solid yellow under its text, framed or bare, and the bar the
 * change leaves in the gutter on its window's inner left edge, beside it
 */
interface Mark {
  part: HTMLElement;
  flash: HTMLElement;
  bar?: HTMLElement;
}

/** `part` marked, with a bar if it's given the window's `pop` to draw one in */
function mark(part: HTMLElement, framed: boolean, pop?: HTMLElement): Mark {
  const span = (parent: HTMLElement, className: string) => {
    const el = document.createElement('span');
    el.className = `pointer-events-none invisible absolute ${className}`;
    parent.append(el);
    return el;
  };
  part.dataset.mark = '';
  const flash = span(part, `inset-0 -z-1 bg-lp-yellow ${framed ? 'border-2 border-lp-ink' : ''}`);
  flash.dataset.frame = '';
  return { part, flash, bar: pop && span(pop, 'left-px w-0.5 bg-lp-ink') };
}

/** `m`'s bar level with its part, by layout, so a window's pop doesn't skew it */
function level({ part, bar }: Mark) {
  if (!bar) return;
  let y = 0;
  for (
    let el: Element | null = part;
    el && el !== bar.parentElement;
    el = (el as HTMLElement).offsetParent
  )
    y += (el as HTMLElement).offsetTop;
  bar.style.top = `${y}px`;
  bar.style.height = `${part.offsetHeight}px`;
}

/** `m` flashing, its text in ink on the yellow; settled to its bar; or unmarked */
function flag(m: Mark, state: 'on' | 'bar' | '') {
  m.part.dataset.mark = state === 'on' ? 'on' : '';
  show(m.flash, state === 'on');
  level(m);
  if (m.bar) show(m.bar, state === 'bar');
}

/**
 * `m` settled to its bar by a dither from its flash, whole: a copy of it flashing over it, dithered
 * out, and `others` with it
 */
function fade(m: Mark, others: Element[] = []) {
  const { part } = m;
  const copy = part.cloneNode(true) as HTMLElement;
  copy.ariaHidden = 'true';
  Object.assign(copy.style, {
    position: 'absolute',
    margin: '0',
    boxSizing: 'border-box',
    left: '0',
    top: '0',
    width: `${part.offsetWidth}px`,
    height: `${part.offsetHeight}px`,
    pointerEvents: 'none',
  });
  part.after(copy);
  // over the part, from wherever its containing block puts it
  const [to, at] = [part.getBoundingClientRect(), copy.getBoundingClientRect()];
  copy.style.left = `${to.left - at.left}px`;
  copy.style.top = `${to.top - at.top}px`;
  flag(m, '');
  for (const el of others) el.animate(DISSOLVE, { duration: 3 * TICK });
  const out = copy.animate(DISSOLVE, { duration: 3 * TICK });
  out.onfinish = out.oncancel = () => {
    copy.remove();
    flag(m, 'bar');
    for (const el of others) show(el, false);
  };
}

/** an output's window and the parts of it the script moves */
interface OutputWindow {
  window: HTMLElement;
  /** what pops, the window over its shadow, with its ports */
  pop: HTMLElement;
  /** what the source made before the edit, and after it */
  before: HTMLElement;
  after: HTMLElement;
  /** what the edit changed in it, marked, and its `updated` chip */
  mark: Mark;
  chip: Element;
  /** the status it reports as it pops */
  status: string;
  /** the cable into it: its svg, the same lit, and its line as routed */
  wire: HTMLElement;
  lit: HTMLElement;
  cable: Cable;
  /** its ports, where that cable meets it and where the next leaves */
  ports: { in: HTMLElement; out?: HTMLElement };
  /** the lit pins at that cable's ends, in the port it leaves and in its own */
  pins: HTMLElement[];
  /** its swap to what the source makes now, once made: made once, it runs on through a resize */
  swap?: Animation;
}

/**
 * The desk: the source's window pops, and a cable draws on out of it to each output in turn, the
 * output popping where it plugs in. Then the source is edited, and the edit rides the cables to
 * every output as a bead, lighting each cable behind it, each output changing as the bead goes in.
 */
export function createAutomate(desk: HTMLElement): () => void {
  const byId = (id: string) => desk.querySelector<HTMLElement>(`[data-window="${id}"]`)!;
  const source = byId('source');
  const sourcePop = source.querySelector<HTMLElement>('[data-pop]')!;
  const sourceOut = source.querySelector<HTMLElement>('[data-port]')!;
  const wires = desk.querySelector<HTMLElement>('[data-wires]')!;
  const svgs = wires.querySelectorAll<HTMLElement>('[data-cable]');
  const lits = wires.querySelectorAll<HTMLElement>('[data-lit]');
  const bead = wires.querySelector<HTMLElement>('[data-bead]')!;
  const pin = (el: Element, way: 'in' | 'out') =>
    el.querySelector<HTMLElement>(`[data-port="${way}"] > span`)!;
  const outputs: OutputWindow[] = [];
  for (let k = 0; k < OUTPUTS.length; k++) {
    const el = byId(OUTPUTS[k].id);
    const after = el.querySelector<HTMLElement>('[data-after]')!;
    // what the edit changed, the same mark on each: marked in the markup where it's drawn here,
    // else the struck prop's row and the edit's line in the page's code
    const part =
      after.querySelector<HTMLElement>('[data-mark]') ??
      after.querySelector('.line-through')?.closest('button') ??
      after.querySelectorAll<HTMLElement>('.line')[EDIT_LINE];
    const pop = el.querySelector<HTMLElement>('[data-pop]')!;
    outputs.push({
      window: el,
      pop,
      before: el.querySelector<HTMLElement>('[data-before]')!,
      after,
      // an image's change has no gutter, its chip marks it
      mark: mark(part, true, OUTPUTS[k].id === 'og' ? undefined : pop),
      chip: el.querySelector('[data-chip]')!,
      status: OUTPUTS[k].status,
      wire: svgs[k],
      lit: lits[k],
      cable: { line: [], lengths: [0], origin: [0, 0], clips: [] },
      ports: {
        in: el.querySelector<HTMLElement>('[data-port="in"]')!,
        out: el.querySelector<HTMLElement>('[data-port="out"]') ?? undefined,
      },
      pins: [pin(k ? outputs[k - 1].window : source, 'out'), pin(el, 'in')],
    });
  }
  const said = desk.querySelector('[data-said]')!;
  const edit = desk.querySelectorAll<HTMLElement>('[data-code] .line')[EDIT_LINE];
  const edited = mark(edit, false, sourcePop);
  const footer = desk.querySelector('[data-footer]')!;
  const modified = desk.querySelector('[data-modified]')!;
  const caret = document.createElement('span');
  caret.className = 'inline-block h-lh w-[1ch] bg-current align-top';
  const typed: { node: Text; text: string }[] = [];
  const walker = document.createTreeWalker(edit, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode())
    typed.push({ node: node as Text, text: node.nodeValue ?? '' });
  const clock = createClock([desk]);
  let dead = false;

  let boxes: Rect[] = [];
  let centred: Point = [0, 0];

  // the running phase: the cables drawing on or the bead's ride, led by one animation; when the
  // desk is resized it's carried to the same point of its way, between the same `keys`
  let phase: 'draw' | 'ride' | undefined;
  let lead: Animation | undefined;
  let keys: number[] = [];
  let settle = () => {};
  let generation = 0;

  /** the cables routed through the windows as they lie now, their ports placed on the windows */
  function layout() {
    const origin = desk.getBoundingClientRect();
    boxes = [rectIn(source, origin)];
    for (const output of outputs) boxes.push(rectIn(output.window, origin));
    const list = routes(
      boxes,
      matchMedia('(width >= 1024px)').matches
        ? 'wide'
        : matchMedia('(width >= 768px)').matches
          ? 'snake'
          : 'column',
    );
    for (let k = 0; k < outputs.length; k++) {
      const output = outputs[k];
      const points = list[k];
      output.cable = cable(output.wire, points);
      cable(output.lit, points, true, undefined, 'stroke-lp-yellow');
      plug(k === 0 ? sourceOut : outputs[k - 1].ports.out!, boxes[k], points[0]);
      const [x, y] = points[points.length - 1];
      plug(output.ports.in, boxes[k + 1], [x, y]);
      output.pop.style.transformOrigin = `${x - boxes[k + 1].x}px ${y - boxes[k + 1].y}px`;
    }
    centred = [Math.round(boxes[0].x + boxes[0].w / 2), Math.round(boxes[0].y + boxes[0].h / 2)];
    level(edited);
    for (const output of outputs) level(output.mark);
    // a phase whose lead has run out has nothing left to move
    if (!phase || !lead || lead.playState === 'finished') return;
    const at = lead.currentTime as number;
    if (phase === 'draw') draw(carry(at, keys, drawing().keys));
    else ride(carry(at, keys, riding().keys));
  }

  /** an output shows what the source made before the edit, or after it */
  function showMade(output: OutputWindow, after: boolean) {
    show(output.before, !after);
    output.before.inert = after;
    show(output.after, after);
  }

  /** animations set at `at` ms of their phase, held with the clock if it is */
  function start(animations: Animation[], at: number) {
    for (const animation of animations) {
      animation.currentTime = at;
      if (clock.held) animation.pause();
    }
  }

  /**
   * `make` on the beat `time` ms into the running phase: at once if that's past, else on the clock,
   * hidden till then. What it makes starts at `time` on the lead's own timeline, so it lands on the
   * frame it's due, not the one after.
   */
  function on(time: number, at: number, make: () => Animation[]) {
    const id = generation;
    const go = () => {
      const made = make();
      const origin = lead!.startTime;
      // a lead yet to start, or held, has no start time: then by its current time
      if (origin === null) start(made, (lead!.currentTime as number) - time);
      else for (const animation of made) animation.startTime = (origin as number) + time;
    };
    if (time <= at) go();
    else
      void clock.wait(time - at).then(() => {
        if (id === generation) go();
      });
  }

  /**
   * A leg along each cable from `t` ms, the next `gap` ms after, each `ms(length)` long, and the
   * phase's span, `tail` ms past the last
   */
  function timeline(t: number, gap: number, tail: number, ms: (length: number) => number) {
    const legs: { start: number; end: number }[] = [];
    const turns = [0];
    for (const output of outputs) {
      const end = t + ms(output.cable.lengths[output.cable.lengths.length - 1]);
      legs.push({ start: t, end });
      turns.push(t, end);
      t = end + gap;
    }
    turns.push(t - gap + tail);
    return { legs, keys: turns, span: t - gap + tail };
  }

  /**
   * The cables' draw-on from the source's pop: each from as the window it leaves lands, at the
   * head's pace, to its IN port, where its window pops; the last done as releases lands
   */
  const drawing = () => timeline(LANDS, STOP, STOP, (l) => l / SPEED);

  /**
   * The bead's ride: out of each port and along its cable to the next window's, eased port to
   * port, its legs ending as it reaches that port; it goes in, holds and comes out of the window's
   * OUT port. Done as it reaches releases.
   */
  const riding = () => timeline(0, 2 * DROP, 0, (l) => clamp(l / PACE, 300, 600) + DROP);

  /** the phase's lead, a keyframe-less animation `span` ms long, at `at` */
  function leading(span: number, at: number) {
    if (lead?.playState === 'running' || lead?.playState === 'paused')
      lead.effect!.updateTiming({ duration: span });
    else {
      lead = wires.animate([], { duration: span });
      lead.onfinish = () => {
        phase = undefined;
        settle();
      };
    }
    start([lead], at);
  }

  /**
   * The draw-on from `at` ms into it, on one timeline that a keyframe-less animation of the desk's
   * wires keeps: each cable wiped on, then the window it plugs into popping, with its status. Each
   * is made on its beat; for a resized desk, a wipe under way is made again for the new route, and
   * a pop under way set to its point.
   */
  function draw(at: number) {
    ++generation;
    const { legs, keys: turns, span } = drawing();
    keys = turns;
    leading(span, at);
    for (let k = 0; k < outputs.length; k++) {
      const output = outputs[k];
      const { start: from, end } = legs[k];
      for (const animation of output.wire.getAnimations()) animation.cancel();
      show(output.wire, end <= at);
      if (end > at)
        on(from, at, () => {
          show(output.wire, true);
          return [
            output.wire.animate(wipe(output.cable), {
              duration: end - from,
              easing: GROW,
              fill: 'backwards',
            }),
          ];
        });
      const [popping] = output.pop.getAnimations();
      if (popping) start([popping], at - end);
      else if (end + STOP > at)
        on(end, at, () => {
          report(desk, output.status);
          return [pop(output.pop, POP)];
        });
    }
  }

  /**
   * The bead's ride from `at` ms into it: each leg's bead and lit core made on its beat, from its
   * OUT port lit, and each window's change as it reaches its IN port. For a resized desk, a leg
   * under way is made again for the new route.
   */
  function ride(at: number) {
    ++generation;
    const { legs, keys: turns, span } = riding();
    keys = turns;
    leading(span, at);
    for (const animation of bead.getAnimations()) animation.cancel();
    for (let k = 0; k < outputs.length; k++) {
      const output = outputs[k];
      const { line, lengths } = output.cable;
      const { start: from, end } = legs[k];
      if (end + DROP > at) {
        for (const animation of output.lit.getAnimations()) animation.cancel();
        on(from, at, () => {
          const frames: Keyframe[] = [];
          for (let i = 0; i < line.length; i++)
            frames.push({
              offset: lengths[i] / lengths[lengths.length - 1],
              transform: `translate(${line[i][0] - 4}px, ${line[i][1] - 4}px)`,
              opacity: 1,
            });
          const timing = { duration: end + DROP - from, easing: GLIDE, fill: 'backwards' as const };
          show(output.pins[0], true);
          show(output.lit, true);
          return [bead.animate(frames, timing), output.lit.animate(wipe(output.cable), timing)];
        });
      }
      if (!output.swap) on(end, at, () => change(output));
    }
  }

  /**
   * An output taking the edit as the bead reaches it: its pin lit, its change dithering in inside
   * the flash, its chip on; the flash dithers out a while later to the change's bar, and its cable
   * and pins with it
   */
  function change(output: OutputWindow): Animation[] {
    show(output.pins[1], true);
    show(output.after, true);
    const swap = output.after.animate(ditherKeyframes(2), {
      duration: SWAP,
      easing: 'steps(16, start)',
      fill: 'backwards',
    });
    swap.onfinish = () => {
      show(output.before, false);
      output.before.inert = true;
    };
    output.swap = swap;
    flag(output.mark, 'on');
    show(output.chip, true);
    void clock.wait(SHOW).then(() => fade(output.mark, [output.lit, ...output.pins]));
    return [swap];
  }

  /** an output's cable and pins plain */
  function unlit(output: OutputWindow) {
    for (const el of [output.lit, ...output.pins]) show(el, false);
  }

  /** a phase played from its start, done when its last animation is */
  function play(kind: 'draw' | 'ride'): Promise<void> {
    return new Promise((resolve) => {
      phase = kind;
      settle = resolve;
      if (kind === 'draw') draw(0);
      else ride(0);
    });
  }

  /** nothing on the desk yet; under each output, what the source made before the edit */
  function reset() {
    show(sourcePop, false);
    for (const output of outputs) {
      show(output.pop, false);
      showMade(output, false);
      show(output.wire, false);
      unlit(output);
      flag(output.mark, '');
      show(output.chip, false);
    }
    edit.hidden = true;
    for (const item of typed) item.node.nodeValue = '';
    flag(edited, '');
    show(modified, false);
    caret.remove();
    setText(footer, FILE);
    report(desk, FILE);
  }

  /** the script's end at once: every cable drawn, each output made from the edited source */
  function finish() {
    ++generation;
    for (const animation of desk.getAnimations({ subtree: true })) animation.cancel();
    show(sourcePop, true);
    for (const output of outputs) {
      show(output.pop, true);
      showMade(output, true);
      show(output.wire, true);
      unlit(output);
      flag(output.mark, 'bar');
      show(output.chip, true);
    }
    edit.hidden = false;
    for (const item of typed) item.node.nodeValue = item.text;
    flag(edited, 'bar');
    show(modified, false);
    caret.remove();
    setText(footer, '5 outputs up to date');
    report(desk, '5 outputs up to date');
  }

  async function script() {
    report(desk, FILE);
    pop(sourcePop, FIRST);
    dot(wires, ...centred);
    await play('draw');
    if (dead) return;
    report(desk, '5 outputs');
    await clock.wait(HOLD);
    if (dead) return;
    report(desk, `${FILE} changed`);
    said.textContent = `${FILE} changed: color is deprecated. Every output is regenerated.`;
    edit.hidden = false;
    edit.append(caret);
    for (let i = 0; i < 2; i++) {
      show(caret, i % 2 === 0);
      await clock.wait(TICK);
      if (dead) return;
    }
    show(caret, true);
    flag(edited, 'on');
    show(modified, true);
    setText(footer, 'Modified');
    for (const item of typed) {
      for (let i = 1; i <= item.text.length; i++) {
        item.node.nodeValue = item.text.slice(0, i);
        if (item.text[i - 1] !== ' ') await clock.wait(TYPE);
        if (dead) return;
      }
    }
    caret.remove();
    show(modified, false);
    setText(footer, 'Saved');
    fade(edited);
    await clock.wait(BEAT);
    if (dead) return;
    setText(footer, 'Regenerating 5 outputs…');
    report(desk, 'regenerating 5 outputs');
    await play('ride');
    if (dead) return;
    setText(footer, '5 outputs up to date');
    report(desk, '5 outputs up to date');
  }

  layout();
  const resize = new ResizeObserver(layout);
  resize.observe(desk);
  resize.observe(source);
  for (const output of outputs) resize.observe(output.window);

  // a desk already in view, or with reduced motion, is simply at its end; one below plays once
  // its top quarter is on screen
  let stop = () => {};
  if (reached(desk)) finish();
  else {
    reset();
    stop = whenShareSeen(desk, clock, () => void script(), 0.25);
  }

  return () => {
    dead = true;
    clock.stop();
    stop();
    resize.disconnect();
  };
}
