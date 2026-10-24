import { TICK } from '../../lib/motion';
import { setStatus } from '../../lib/status';
import { COVER, createSand, type Frame, type Grain } from './sand';
import { type FileLine, type Step, tokenize } from './steps';

/** dither cell of the reveals, CSS px */
const DITHER_CELL = 3;
/** a dither runs its 16 levels in 16 frames at 60 fps, so no level holds for two */
const DITHER = (16 * 1000) / 60;
/** a character types in this long: two a frame at 60 Hz, one at 120 Hz, an even rhythm */
const CHAR = 1000 / 120;
/** a typed block stays selected this long, then lifts off */
const SELECT = 100;
/** the copies of a glyph launch this far apart */
const COPY_GAP = 60;
/** a part of the page dithers in over this long */
const REVEAL = DITHER;
/** the next part of a drawing starts when the one before is this far along */
const HANDOFF = 0.5;
/** a line of a drawing draws at the pen's pace, in this long at least */
const LINE_MIN = 150;
/** a leader draws at this pace (px per ms), in this long at least and at most */
const PEN = 0.6;
const DRAW_MIN = 2 * TICK;
const DRAW_MAX = 5 * TICK;
/** the replay dithers the page out over this long */
const FADE = DITHER;
/** share of the stage on screen that starts the animation, and below which it pauses */
const START = 0.4;
const WATCH = 0.2;
/** stacked, the animation starts once the strip between the windows is inside this band */
const BAND = '-20% 0px -25% 0px';

/** a critically damped spring from 0 to 1 over `p` in [0, 1]: it starts at rest and settles */
function spring(p: number): number {
  const a = 4.74;
  return (1 - (1 + a * p) * Math.exp(-a * p)) / (1 - (1 + a) * Math.exp(-a));
}

export interface Player {
  /** clear the page and play every step again */
  replay: () => void;
  destroy: () => void;
}

/** a step on the cycle's clock (ms): when it starts, its beats relative to that */
interface Timeline {
  start: number;
  keys: number;
  typed: number;
  lift: number;
  reveal: number;
  late: number;
  leader: number;
  end: number;
}

/**
 * `quick-start.mdx` written into its page: a block types, lifts off as glyphs and lands, its
 * output dithers in and its leader draws, while the next block already types. Everything on
 * screen is a function of the cycle's clock, which runs while the stage is in view; a frame
 * writes only what changed, and draws the glyphs and the reveals on one canvas.
 * `still` keeps the finished drawing.
 */
export function createPlayer(
  stage: HTMLElement,
  steps: Step[],
  lines: FileLine[],
  still = false,
): Player {
  /** the TOC entry gets a pile of its own, after the steps' */
  const TOC = steps.length;
  const canvas = stage.querySelector<HTMLCanvasElement>('canvas[data-sand]')!;
  const editor = stage.querySelector<HTMLElement>('[data-editor]')!;
  const code = stage.querySelector<HTMLElement>('[data-code]')!;
  const rows = stage.querySelectorAll<HTMLElement>('[data-line]');
  const texts = stage.querySelectorAll<HTMLElement>('[data-text]');
  const caret = stage.querySelector<HTMLElement>('[data-caret]')!;
  const cursor = stage.querySelector<HTMLElement>('[data-cursor]');
  const page = stage.querySelector<HTMLElement>('[data-page]')!;
  const zoomed = stage.querySelector<HTMLElement>('[data-zoom]')!;
  const slots = stage.querySelectorAll<HTMLElement>('[data-slot]');
  const toc = stage.querySelector<HTMLElement>('[data-toc]');
  const drawing = stage.querySelector<SVGSVGElement>('[data-drawing]')!;
  const leaders = drawing.querySelectorAll<SVGGElement>('[data-pen]');
  /** a leader's paths: source bracket up and down, the line in and out of the balloon, the slot's
   * bracket up and down */
  const pens = [...leaders].map((g) => [...g.querySelectorAll('path')]);
  const targets = drawing.querySelectorAll<SVGGElement>('[data-frame]');
  const balloons = stage.querySelectorAll<HTMLElement>('[data-balloon]');
  const strip = stage.querySelector<HTMLElement>('[data-channel]')!;
  const figure = stage.closest<HTMLElement>('[data-figure]');
  const tocStep = steps.findIndex((step) => step.toc);
  const sand = createSand(canvas);

  // file lines typed by each step: [from, to)
  const ranges: [number, number][] = [];
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].step;
    if (!ranges[s]) ranges[s] = [i, i + 1];
    else ranges[s][1] = i + 1;
  }
  const timelines: Timeline[] = [];
  for (let s = 0; s < steps.length; s++) {
    const [from, to] = ranges[s];
    // its characters and the line breaks between them
    let keys = to - from - 1;
    for (let i = from; i < to; i++) keys += lines[i].text.length;
    const typed = keys * CHAR;
    // the landing beats are set by `build()`
    timelines.push({
      start: 0,
      keys,
      typed,
      lift: typed + SELECT,
      reveal: Infinity,
      late: Infinity,
      leader: Infinity,
      end: Infinity,
    });
  }
  const late: Element[][] = [];
  /** each part's box; a part led by a path is a line, drawn like a pen: its path, its length
   * (user units) and its length on screen (CSS px) */
  const lateRects: Frame[][] = [];
  const lateLines: (SVGPathElement | null)[][] = [];
  const lateLengths: number[][] = [];
  const lateSpans: number[][] = [];
  /** when each part starts, ms into its step, and how long it takes */
  const lateFrom: number[][] = [];
  const lateTime: number[][] = [];
  const lineDrawn = new Map<Element, number>();
  const times = new Float64Array(steps.length + 1);

  // what is on screen, so a frame only writes what changed
  const lineShown = new Uint8Array(lines.length).fill(1);
  const marked = new Uint8Array(steps.length);
  const visibility = new Map<Element, boolean>();
  const drawn = new Float32Array(steps.length).fill(-1);
  const popped = new Uint8Array(steps.length);
  let caretAt = '';
  let caretTyping = -1;
  let cursorText = '';
  let cursorClock = 0;
  let canvasShown = false;
  let lastStatus = '';
  /** the dither covers of this frame, `COVER` floats each */
  const covers = new Float32Array(16 * COVER);
  let covered = 0;

  /** the cycle's clock (ms) and length, the cycle rests on its end */
  let clock = 0;
  let total = 0;
  let finale = 0;
  let playing = false;
  /** ms into the replay's dither-out, -1 outside it */
  let fading = -1;
  /** it played since it last came into view */
  let started = false;
  let onScreen = false;
  let ready = false;
  let raf = 0;
  let last = 0;

  // metrics, stage coordinates in CSS px
  let advance = 7.8;
  let lineHeight = 20;
  let cell = 12;
  /** the top of the code, glyphs never fly over the window chrome above it */
  let ceiling = 0;
  let textX = 0;
  let textY = 0;
  /** the top of the first line's box */
  let rowY = 0;
  let vertical = true;
  let sourceX = 0;
  let pageX = 0;
  let channel = 0;
  const frames: Frame[] = [];
  for (let i = 0; i <= TOC; i++) frames.push({ x: 0, y: 0, w: 0, h: 0 });
  /** what the replay dithers out: the code, the page and the channel between them */
  const fades: Frame[] = [];
  const stations: number[] = [];
  const widths: number[] = [];
  /** how long each leader takes to draw, by its length */
  const draws: number[] = [];
  /** a leader is drawn in phases: the source bracket, the line in, the line out, the slot's
   * bracket; their lengths, and when the pen reaches the balloon (ms into the draw) */
  const phases: number[][] = [];
  const reach: number[] = [];
  const penAt = new Float32Array(steps.length * 6).fill(-1);
  const leaderShown = new Uint8Array(steps.length).fill(2);
  const balloonShown = new Uint8Array(steps.length).fill(2);

  function measure() {
    const s = stage.getBoundingClientRect();
    const box = (el: Element): Frame => {
      const r = el.getBoundingClientRect();
      return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
    };
    const first = texts[0].getBoundingClientRect();
    const style = getComputedStyle(texts[0]);
    let longest = 0;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].text.length > lines[longest].text.length) longest = i;
    }
    advance = texts[longest].getBoundingClientRect().width / lines[longest].text.length;
    lineHeight = rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top;
    cell = Math.round(lineHeight * 0.58);
    textX = first.left - s.left;
    textY = first.top - s.top;
    rowY = rows[0].getBoundingClientRect().top - s.top;
    ceiling = code.getBoundingClientRect().top - s.top;
    for (let i = 0; i <= TOC; i++) {
      const el = i === TOC ? toc : slots[i];
      Object.assign(frames[i], el ? box(el) : { x: 0, y: 0, w: 0, h: 0 });
    }
    // the parts that appear after their step lands, along the reading diagonal: a diagram builds
    // along its flow, across or down
    for (let i = 0; i < steps.length; i++) {
      const selector = steps[i].late;
      const parts: [Element, number, Frame][] = [];
      if (selector) {
        for (const el of slots[i].querySelectorAll(selector)) {
          const r = box(el);
          if (r.w > 0) parts.push([el, r.x + r.y + (r.w + r.h) / 2, r]);
        }
      }
      parts.sort((a, b) => a[1] - b[1]);
      late[i] = parts.map((part) => part[0]);
      lateRects[i] = parts.map((part) => part[2]);
      lateLines[i] = late[i].map((el) =>
        el.firstElementChild instanceof SVGPathElement ? el.firstElementChild : null,
      );
      lateLengths[i] = lateLines[i].map((line) => line?.getTotalLength() ?? 0);
      lateSpans[i] = lateLines[i].map((line, k) => {
        const svg = line?.ownerSVGElement;
        const units = svg?.viewBox.baseVal?.width;
        return svg && units ? (lateLengths[i][k] * svg.getBoundingClientRect().width) / units : 0;
      });
    }
    lineDrawn.clear();

    const e = editor.getBoundingClientRect();
    const p = page.getBoundingClientRect();
    vertical = p.left > e.right;
    sourceX = e.right - s.left;
    pageX = p.left - s.left;
    channel = (sourceX + pageX) / 2;
    fades.length = 0;
    fades.push(box(code), box(zoomed));
    fades.push(
      vertical
        ? { x: sourceX, y: 0, w: pageX - sourceX, h: s.height }
        : { x: e.left - s.left, y: e.bottom - s.top, w: e.width, h: p.top - e.bottom },
    );
    // side by side, a balloon sits between its block and its slot, at least a balloon apart;
    // stacked, the balloons share the strip between the windows, evenly spaced
    let room = e.width;
    for (let i = 0; i < steps.length; i++) {
      widths[i] = balloons[i].offsetWidth;
      room -= widths[i];
    }
    const gap = room / (steps.length + 1);
    let previous = -Infinity;
    let left = e.left - s.left + gap;
    for (let i = 0; i < steps.length; i++) {
      let x: number;
      let y: number;
      if (vertical) {
        x = channel - widths[i] / 2;
        y = Math.max((sourceMid(i) + frames[i].y + frames[i].h / 2) / 2, previous + 32);
        previous = y;
      } else {
        x = left;
        left += widths[i] + gap;
        y = (e.bottom + p.top) / 2 - s.top;
      }
      stations[i] = y;
      balloons[i].style.transform = `translate(${x}px, ${y - 12}px)`;
      // the target frame just outside the step's slot, clear of the next one's, its label inside
      const [rect, label] = targets[i].children;
      const f = frames[i];
      rect.setAttribute('x', String(f.x - 1.5));
      rect.setAttribute('y', String(f.y - 1.5));
      rect.setAttribute('width', String(f.w + 3));
      rect.setAttribute('height', String(f.h + 3));
      label.setAttribute('x', String(f.x + 6.5));
      label.setAttribute('y', String(f.y + 12));
    }
    drawLeaders();

    sand.setMetrics({
      font: style.fontFamily,
      size: parseFloat(style.fontSize),
      advance,
      cell,
      dpr: Math.min(window.devicePixelRatio, 2),
      dither: DITHER_CELL,
    });
    sand.resize(s.width, s.height);
    build();
  }

  /** the middle of a step's lines, without the blank line before it */
  function sourceMid(step: number): number {
    const [from, to] = ranges[step];
    const first = step === 0 ? from : from + 1;
    return textY + ((first + to) / 2) * lineHeight;
  }

  /**
   * The glyphs of every step, emitted ahead on their clocks; their landings set the beats. A
   * step starts typing when the one before lifts off.
   */
  function build() {
    for (let i = 0; i <= TOC; i++) sand.clear(i);
    let start = 0;
    let end = 0;
    for (let i = 0; i < steps.length; i++) {
      const tl = timelines[i];
      tl.start = start;
      const [from, to] = ranges[i];
      const rested = sand.emit(grains(from, to), i, frames[i], tl.lift, {
        copies: steps[i].copies,
        gap: COPY_GAP,
        ceiling,
      });
      // the output comes in under the sand as it settles, and the sand sinks away through it
      tl.reveal = rested;
      tl.late = tl.reveal + REVEAL * HANDOFF;
      // the parts chain along the flow, each starting halfway through the one before
      tl.leader = tl.late;
      lateFrom[i] = [];
      lateTime[i] = [];
      let at = tl.late;
      for (let k = 0; k < late[i].length; k++) {
        const time = lateLines[i][k] ? Math.max(LINE_MIN, lateSpans[i][k] / PEN) : REVEAL;
        lateFrom[i].push(at);
        lateTime[i].push(time);
        tl.leader = Math.max(tl.leader, at + time);
        at += time * HANDOFF;
      }
      tl.end = tl.leader + draws[i];
      sand.drain(i, tl.reveal);
      if (i === tocStep && frames[TOC].w > 0) {
        // the words of the heading also fly to its TOC entry
        const heading = i === 0 ? from : from + 1;
        sand.emit(grains(heading, heading + 1, 1), TOC, frames[TOC], tl.lift + TICK / 2, {
          ceiling,
        });
        sand.drain(TOC, tl.reveal + TICK);
      }
      // a spring's last stretch barely moves, so the next beat comes when it is nearly drawn
      end = Math.max(end, start + tl.leader + 0.7 * draws[i]);
      start += tl.lift;
    }
    // the finished drawing: balloons pop down the channel, one per tick
    finale = end;
    const finished = clock >= total;
    total = finale + (steps.length + 1) * TICK;
    if (finished) clock = total;
  }

  /** the characters of lines `[from, to)`, with `tones` to keep */
  function grains(from: number, to: number, tones = 7): Grain[] {
    const out: Grain[] = [];
    const y0 = textY + (lineHeight - cell) / 2;
    for (let i = from; i < to; i++) {
      let col = 0;
      for (const [text, tone] of tokenize(lines[i].text)) {
        for (const char of text) {
          if (char !== ' ' && (tones & (1 << tone)) !== 0) {
            out.push({ x: textX + col * advance, y: y0 + i * lineHeight, char, tone });
          }
          col++;
        }
      }
    }
    return out;
  }

  function drawLeaders() {
    for (let i = 0; i < steps.length; i++) {
      const parts = pens[i];
      if (!vertical) {
        for (const part of parts) part.setAttribute('d', '');
        phases[i] = [0, 0, 0, 0];
        draws[i] = DRAW_MIN;
        reach[i] = 0;
        continue;
      }
      const [from, to] = ranges[i];
      const first = i === 0 ? from : from + 1;
      const y0 = textY + first * lineHeight + 3;
      const y1 = textY + to * lineHeight - 3;
      const box = frames[i];
      const sx = sourceX + 6;
      const px = pageX - 6;
      const station = stations[i];
      const ym = (y0 + y1) / 2;
      const sm = box.y + box.h / 2;
      // into the balloon's left end, out of its right end
      const a = channel - widths[i] / 2;
      const b = channel + widths[i] / 2;
      const c = (a - sx) / 2;
      parts[0].setAttribute('d', `M${sx} ${ym}V${y0}H${sx - 4}`);
      parts[1].setAttribute('d', `M${sx} ${ym}V${y1}H${sx - 4}`);
      parts[2].setAttribute(
        'd',
        `M${sx} ${ym}C${sx + c} ${ym} ${a - c} ${station} ${a} ${station}`,
      );
      parts[3].setAttribute(
        'd',
        `M${b} ${station}C${b + c} ${station} ${px - c} ${sm} ${px} ${sm}`,
      );
      parts[4].setAttribute('d', `M${px} ${sm}V${box.y}H${px + 4}`);
      parts[5].setAttribute('d', `M${px} ${sm}V${box.y + box.h}H${px + 4}`);
      const lengths = parts.map((part) => part.getTotalLength());
      phases[i] = [
        Math.max(lengths[0], lengths[1]),
        lengths[2],
        lengths[3],
        Math.max(lengths[4], lengths[5]),
      ];
      const total = phases[i][0] + phases[i][1] + phases[i][2] + phases[i][3];
      draws[i] = Math.min(DRAW_MAX, Math.max(DRAW_MIN, total / PEN));
      // the spring's progress when the pen enters the balloon, found by halving
      const share = (phases[i][0] + phases[i][1]) / total;
      let lo = 0;
      let hi = 1;
      for (let n = 0; n < 20; n++) {
        const mid = (lo + hi) / 2;
        if (spring(mid) < share) lo = mid;
        else hi = mid;
      }
      reach[i] = hi * draws[i];
    }
  }

  // the state at the clock

  function apply() {
    let caretRow = 0;
    let caretCol = 0;
    let typing = -1;
    let lifted = -1;
    covered = 0;
    for (let i = 0; i < steps.length; i++) {
      const tl = timelines[i];
      const begun = clock >= tl.start;
      const t = Math.min(tl.end, Math.max(0, clock - tl.start));
      times[i] = t;

      // before anything is typed, the file is an empty line 1
      let keys = -1;
      if (!begun) keys = i === 0 ? 0 : -1;
      else if (t >= tl.typed) keys = tl.keys;
      else {
        keys = Math.floor(t / CHAR);
        typing = i;
      }
      const at = typeTo(i, keys);
      if (at) [caretRow, caretCol] = at;
      if (begun && t >= tl.lift) lifted = i;
      mark(i, (t >= tl.typed && t < tl.lift ? 1 : 0) | (t >= tl.lift && t < tl.leader ? 2 : 0));

      // once typed, the slot waits in its dashed frame for the glyphs, then its output dithers in
      show(targets[i], t >= tl.typed && t < tl.reveal);
      reveal(slots[i], frames[i], t - tl.reveal, REVEAL);
      if (i === tocStep) reveal(toc, frames[TOC], t - tl.reveal - TICK, REVEAL);
      for (let k = 0; k < late[i].length; k++) {
        const part = late[i][k];
        const line = lateLines[i][k];
        const elapsed = t - lateFrom[i][k];
        // lines draw like a pen, the rest dithers in
        if (line) drawLine(part, line, lateLengths[i][k], elapsed / lateTime[i][k]);
        else reveal(part, lateRects[i][k], elapsed, lateTime[i][k]);
      }
      // the balloon pops as the pen reaches it, and again down the channel at the end
      const pop =
        (t >= tl.leader + reach[i] && t < tl.leader + reach[i] + TICK) ||
        (clock >= finale + i * TICK && clock < finale + (i + 1) * TICK);
      leader(i, (t - tl.leader) / draws[i], pop);
    }
    times[TOC] = tocStep === -1 ? 0 : times[tocStep];

    const position = `${caretRow}:${caretCol}`;
    if (position !== caretAt) {
      caretAt = position;
      caret.style.transform = `translate(${caretCol}ch, ${caretRow}lh)`;
    }
    if (typing !== -1) {
      // the rest of the line being typed stays under a cover, past the caret's cell
      const len = lines[caretRow].text.length;
      if (caretCol + 1 < len) {
        cover(
          {
            x: textX + (caretCol + 1) * advance,
            y: rowY + caretRow * lineHeight,
            w: (len - caretCol - 1) * advance + 1,
            h: lineHeight,
          },
          0,
          0,
        );
      }
    }
    // the readout is text, so it follows at most once a tick: typing never lays out every frame
    const readout = `${caretRow + 1}:${caretCol + 1}`;
    if (cursor && readout !== cursorText && (typing === -1 || clock - cursorClock >= TICK)) {
      cursorText = readout;
      cursorClock = clock;
      cursor.textContent = readout;
    }
    if (typing !== caretTyping) {
      caretTyping = typing;
      // solid while it types, blinking at rest
      caret.style.animation = typing === -1 ? '' : 'none';
    }

    if (clock >= finale) {
      if (!still) status('compiled quick-start.mdx');
    } else status(lifted === -1 ? 'typing quick-start.mdx' : steps[lifted].status);
    paint();
  }

  /** `keys` typed characters of a step, -1 hides it; returns where the caret sits */
  function typeTo(step: number, keys: number): [number, number] | null {
    const [from, to] = ranges[step];
    let rest = keys;
    let at: [number, number] | null = null;
    for (let i = from; i < to; i++) {
      const len = lines[i].text.length;
      let next: number;
      if (rest < 0) next = -1;
      else if (rest <= len) {
        next = rest;
        at = [i, rest];
        rest = -1;
      } else {
        next = len;
        rest -= len + 1;
      }
      showLine(i, next);
    }
    if (!at && keys >= 0) at = [to - 1, lines[to - 1].text.length];
    return at;
  }

  /** line `i` shows once its first character is typed (`chars` 0 or more), the rest of it waits
   * under a cover */
  function showLine(i: number, chars: number) {
    const on = chars >= 0 ? 1 : 0;
    if (lineShown[i] === on) return;
    lineShown[i] = on;
    rows[i].style.visibility = on ? '' : 'hidden';
  }

  /** 1 selected, 2 lifted off */
  function mark(step: number, state: number) {
    if (marked[step] === state) return;
    marked[step] = state;
    const [from, to] = ranges[step];
    for (let i = from; i < to; i++) {
      if (state & 1) texts[i].dataset.selected = '';
      else delete texts[i].dataset.selected;
      if (state & 2) rows[i].dataset.flying = '';
      else delete rows[i].dataset.flying;
    }
  }

  function show(el: Element | null, on: boolean) {
    if (!el || visibility.get(el) === on) return;
    visibility.set(el, on);
    (el as HTMLElement | SVGElement).style.visibility = on ? '' : 'hidden';
  }

  /** a part of the page, hidden before `elapsed` reaches 0, then dithered in over `duration` */
  function reveal(el: Element | null, box: Frame, elapsed: number, duration: number) {
    show(el, elapsed > 0);
    if (elapsed > 0 && elapsed < duration) cover(box, Math.floor((elapsed / duration) * 16));
  }

  /**
   * A line of a drawing drawn up to `progress`, on a spring; the rest of its part, an arrowhead,
   * comes with its end. Drawn, the line keeps its own styles.
   */
  function drawLine(part: Element, line: SVGPathElement, length: number, progress: number) {
    const k = progress <= 0 ? 0 : progress >= 1 ? 1 : spring(progress);
    show(part, k > 0);
    if (lineDrawn.get(line) === k) return;
    lineDrawn.set(line, k);
    const partial = k > 0 && k < 1;
    line.style.strokeDasharray = partial ? `${length} ${length}` : '';
    line.style.strokeDashoffset = partial ? String(length * (1 - k)) : '';
    for (let el = line.nextElementSibling; el; el = el.nextElementSibling) {
      (el as SVGElement).style.visibility = k < 1 ? 'hidden' : '';
    }
  }

  /** a dither cover over `box`, `pad` past its edges, `clear` cells of 16 open */
  function cover(box: Frame, clear: number, pad = 2) {
    if (covered * COVER >= covers.length) return;
    covers.set(
      [box.x - pad, box.y - pad, box.w + 2 * pad, box.h + 2 * pad, clear],
      covered * COVER,
    );
    covered++;
  }

  /**
   * The leader draws like a pen on a spring, phase after phase: the source bracket opens from its
   * middle, the line runs into the balloon, which shows as the pen reaches it, and out to the
   * slot, whose bracket opens. Only the paths that changed are written.
   */
  function leader(step: number, progress: number, pop: boolean) {
    const k = progress <= 0 ? 0 : spring(Math.min(1, progress));
    if (drawn[step] !== k) {
      drawn[step] = k;
      const [p0, p1, p2, p3] = phases[step];
      let left = k * (p0 + p1 + p2 + p3);
      for (let phase = 0; phase < 4; phase++) {
        const length = phases[step][phase];
        const share = length > 0 ? Math.min(1, Math.max(0, left / length)) : k > 0 ? 1 : 0;
        left -= length;
        // the brackets draw both halves at once
        const parts = phase === 0 ? [0, 1] : phase === 3 ? [4, 5] : [phase + 1];
        for (const part of parts) {
          const at = step * 6 + part;
          if (penAt[at] === share) continue;
          penAt[at] = share;
          pens[step][part].style.strokeDashoffset = String(1 - share);
        }
      }
      const on = k > 0 ? 1 : 0;
      if (leaderShown[step] !== on) {
        leaderShown[step] = on;
        leaders[step].style.visibility = on ? '' : 'hidden';
      }
      const reached = (vertical ? k * (p0 + p1 + p2 + p3) >= p0 + p1 - 0.5 : k > 0) ? 1 : 0;
      if (balloonShown[step] !== reached) {
        balloonShown[step] = reached;
        balloons[step].style.visibility = reached ? '' : 'hidden';
      }
    }
    if ((popped[step] === 1) !== pop) {
      popped[step] = pop ? 1 : 0;
      balloons[step].style.backgroundColor = pop ? 'var(--lp-ink)' : '';
      balloons[step].style.color = pop ? 'var(--lp-paper)' : '';
    }
  }

  /** the glyphs and covers on the canvas, the covers `over` the glyphs; hidden while it has
   * nothing to show */
  function paint(over = false) {
    const any = sand.draw(times, frames, covers, covered, over);
    if (any === canvasShown) return;
    canvasShown = any;
    canvas.style.visibility = any ? 'visible' : 'hidden';
  }

  /** the figure covers the middle of the viewport: the status bar is this figure's */
  let active = false;
  function status(text: string) {
    if (text === lastStatus || !active) return;
    lastStatus = text;
    setStatus(text);
  }

  // time

  function frame(now: number) {
    raf = 0;
    const dt = last === 0 ? 16 : Math.min(48, now - last);
    last = now;
    if (fading >= 0) {
      fading += dt;
      if (fading < FADE) {
        // the page and its source dither away inside the window frames, glyphs in flight held
        // where they are under the same dither, then the first step types
        covered = 0;
        for (const box of fades) cover(box, 16 - Math.ceil((fading / FADE) * 16), 0);
        paint(true);
      } else {
        fading = -1;
        clock = 0;
        cursorClock = -Infinity;
        apply();
      }
    } else if (playing) {
      clock = Math.min(total, clock + dt);
      playing = clock < total;
      apply();
    }
    if (playing || fading >= 0) schedule();
    else last = 0;
  }

  function schedule() {
    if (raf === 0 && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function replay() {
    started = true;
    fading = 0;
    playing = true;
    schedule();
  }

  function recolor() {
    const style = getComputedStyle(stage);
    sand.setColors({
      ink: style.getPropertyValue('--lp-ink'),
      mute: style.getPropertyValue('--lp-ink-2'),
      number: style.getPropertyValue('--lp-orange'),
      paper: style.getPropertyValue('--lp-paper'),
      yellow: style.getPropertyValue('--lp-yellow'),
    });
  }

  const resize = new ResizeObserver(() => {
    measure();
    if (ready) apply();
  });
  // side by side it starts when the stage is in view, stacked when the strip is in the band, so
  // the reader sees a step leave its block and land in its slot
  let inView = false;
  let inBand = false;
  function start(): boolean {
    if (started || !(vertical ? inView : inBand)) return false;
    replay();
    return true;
  }
  const view = new IntersectionObserver(
    ([entry]) => {
      // a stage taller than the viewport counts by the share of the viewport it fills
      const seen = (ratio: number) =>
        entry.intersectionRatio >= ratio ||
        entry.intersectionRect.height >= innerHeight * ratio * 1.5;
      onScreen = seen(WATCH);
      // played and gone: it plays again when it comes back
      if (!entry.isIntersecting && clock >= total) started = false;
      inView = seen(START);
      if (!start() && !ready) apply();
      ready = true;
      schedule();
    },
    { threshold: [0, 0.1, WATCH, 0.3, START, 0.5] },
  );
  const band = new IntersectionObserver(
    ([entry]) => {
      inBand = entry.isIntersecting;
      start();
    },
    { rootMargin: BAND },
  );
  const middle = new IntersectionObserver(
    ([entry]) => {
      active = entry.isIntersecting;
      // the bar shows the figure's own line as it becomes active, so ours is said again
      if (active) lastStatus = '';
    },
    { rootMargin: '-50% 0px -50% 0px' },
  );
  const theme = new MutationObserver(recolor);

  recolor();
  measure();
  resize.observe(stage);
  if (still) {
    ready = true;
    apply();
  } else {
    view.observe(stage);
    band.observe(strip);
    if (figure) middle.observe(figure);
  }
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', schedule);
  void document.fonts.ready.then(() => {
    measure();
    if (ready) apply();
  });

  return {
    replay,
    destroy() {
      cancelAnimationFrame(raf);
      resize.disconnect();
      view.disconnect();
      band.disconnect();
      middle.disconnect();
      theme.disconnect();
      document.removeEventListener('visibilitychange', schedule);
    },
  };
}
