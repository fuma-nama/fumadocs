import { type Cable, cable, GROW, plug, type Point, PORT, wipe } from '../../lib/cable';
import { clamp, type Rect } from '../../lib/motion';
import {
  createClock,
  FIRST,
  FRAME,
  POP,
  pop,
  popCentred,
  reached,
  show,
  whenShareSeen,
} from '../../lib/script';
import { report } from '../../lib/status';

/** the script's timing, in ms, from the desk's top quarter on screen */
const TIMING = {
  /** a cable's head, px a ms, and the least and most a growth takes */
  speed: 1.4,
  grow: [300, 600],
  /** from a quote's pop to the next cable, and to the quote without one */
  next: 126,
  last: 210,
  /** on phones, when each pops */
  phone: [0, 252, 462, 756],
} as const;
/** px a port keeps from its window's corners */
const CORNER = 20;

interface Wire {
  svg: HTMLElement;
  cable: Cable;
  /** the project's window it leaves and the quote that pops on its tip, each with its port */
  from: HTMLElement;
  out: HTMLElement;
  to: HTMLElement;
  in: HTMLElement;
  /** its tip, where the quote it feeds is entered, in the desk's box */
  tip: Point;
  growth?: Animation;
}

/** `el`'s box in `origin`'s as laid out, with its offset: a pop scales it about its transform
 * origin, which holds still */
function box(el: HTMLElement, origin: DOMRect): Rect {
  const r = el.getBoundingClientRect();
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const [ox, oy] = getComputedStyle(el).transformOrigin.split(' ').map(parseFloat);
  return {
    x: r.left - origin.left - ox * (1 - r.width / w),
    y: r.top - origin.top - oy * (1 - r.height / h),
    w,
    h,
  };
}

/**
 * A cable's waypoints, on whole px, down from the bottom edge of `from`, its project's window, to
 * `quote`, its quote's box: shadcn's drops down the gap between its quote and `david`, David's, to
 * its quote's 30% height and turns into its right edge; David's drops from ArkType's centre into
 * his quote's top; Anthony's drops into his quote's top at 82%, right of David's. A port kept clear
 * of its window's corners moves its end across, and the cable jogs across halfway down.
 */
function route(handle: string | undefined, from: Rect, quote: Rect, david: Rect): Point[] {
  const bottom = Math.round(from.y + from.h);
  const inside = (x: number, rect: Rect) =>
    Math.round(clamp(x, rect.x + CORNER, rect.x + rect.w - CORNER));
  const drop = (x: number, [ex, ey]: Point): Point[] => {
    const out = inside(x, from);
    if (out === ex)
      return [
        [out, bottom],
        [ex, ey],
      ];
    const level = Math.round((bottom + quote.y) / 2);
    return [
      [out, bottom],
      [out, level],
      [ex, level],
      [ex, ey],
    ];
  };
  if (handle === 'shadcn') {
    const gap = Math.round((quote.x + quote.w + david.x) / 2);
    const y = Math.round(quote.y + quote.h * 0.3);
    return [...drop(gap, [gap, y]), [Math.round(quote.x + quote.w), y]];
  }
  const x = handle === 'ssalbdivad' ? from.x + from.w / 2 : quote.x + quote.w * 0.82;
  return drop(x, [inside(x, quote), Math.round(quote.y)]);
}

/**
 * Cable-led, as the page's windows are: from 1024px a cable draws on down from a project's window
 * on the Projects desk, its port cut in as it starts, and its creator's quote pops on its tip, whole,
 * with its port; the next follows a beat later, in reading order: shadcn's from shadcn/ui, David's
 * from ArkType, then Aiden's on its own, Million.js not being among the sites, then Anthony's from
 * Vercel's SDKs. On phones the quotes pop on their own, top to bottom, at uneven beats.
 */
export function createFeedback(desk: HTMLElement): (() => void) | undefined {
  const wired = desk.closest<HTMLElement>('[data-showcase]');
  const layer = wired?.querySelector<HTMLElement>(':scope > [data-layer]');
  const projects = wired?.querySelector<HTMLElement>('[data-desk]');
  const david = desk.querySelector<HTMLElement>('[data-window="ssalbdivad"]');
  if (!wired || !layer || !projects || !david) return;

  const quotes = [...desk.querySelectorAll<HTMLElement>('[data-window]')];

  const wires: Wire[] = [];
  for (const svg of layer.querySelectorAll<HTMLElement>('[data-wire]')) {
    const to = quotes.find((el) => el.dataset.window === svg.dataset.wire);
    const from = projects.querySelector<HTMLElement>(`[data-window="${svg.dataset.from}"]`);
    const port = to?.querySelector<HTMLElement>('[data-port]');
    if (!from || !to || !port) return;
    const out = document.createElement('span');
    out.setAttribute('aria-hidden', 'true');
    out.className = `${PORT} invisible max-lg:hidden`;
    from.append(out);
    const none: Cable = { line: [], lengths: [0], origin: [0, 0], clips: [] };
    wires.push({ svg, cable: none, from, out, to, in: port, tip: [0, 0] });
  }

  function layout() {
    // the cables show from 1024px only
    if (layer!.getClientRects().length === 0) return;
    const origin = wired!.getBoundingClientRect();
    const own = box(desk, origin);
    const beside = box(david!, origin);
    for (const wire of wires) {
      const from = box(wire.from, origin);
      const to = box(wire.to, origin);
      const points = route(wire.to.dataset.window, from, to, beside);
      const tip = points[points.length - 1];
      wire.cable = cable(wire.svg, points);
      plug(wire.out, from, points[0]);
      plug(wire.in, to, tip);
      wire.tip = [tip[0] - own.x, tip[1] - own.y];
      (wire.growth?.effect as KeyframeEffect | undefined)?.setKeyframes(wipe(wire.cable));
    }
  }

  const clock = createClock([desk, layer]);
  let dead = false;

  /** a cable draws on down from its project, once that's on the desk; resolves as its head lands */
  async function grow(wire: Wire) {
    // a project still to pop (the reader came straight here) is put on its desk first
    if (wire.from.classList.contains('invisible')) projects!.dispatchEvent(new Event('lp-finish'));
    show(wire.out, true);
    show(wire.svg, true);
    const { lengths } = wire.cable;
    wire.growth = wire.svg.animate(wipe(wire.cable), {
      duration: Math.round(clamp(lengths[lengths.length - 1] / TIMING.speed, ...TIMING.grow)),
      easing: GROW,
    });
    if (clock.held) wire.growth.pause();
    await wire.growth.finished;
    wire.growth = undefined;
  }

  /** a quote pops from its cable's tip, a point in the desk's box, or else from its centre */
  function popUp(el: HTMLElement, frames: Keyframe[], tip?: Point) {
    report(desk, `message from @${el.dataset.window}`);
    if (!tip) return popCentred(el, frames, desk);
    el.style.transformOrigin = `${tip[0] - el.offsetLeft}px ${tip[1] - el.offsetTop}px`;
    pop(el, frames);
  }

  async function play() {
    const wide = layer!.getClientRects().length > 0;
    for (let i = 0; i < quotes.length; i++) {
      const wire = wide ? wires.find((item) => item.to === quotes[i]) : undefined;
      if (!wide) {
        if (i > 0) await clock.wait(TIMING.phone[i] - TIMING.phone[i - 1]);
      } else if (wire) await grow(wire);
      else await clock.wait(TIMING.last - TIMING.next);
      if (dead) return;
      popUp(quotes[i], i === 0 ? FIRST : POP, wire?.tip);
      if (wide && i < quotes.length - 1) await clock.wait(TIMING.next);
    }
    await clock.wait((POP.length - 1) * FRAME);
    report(desk, `${quotes.length} messages received`);
  }

  layout();
  const resize = new ResizeObserver(layout);
  resize.observe(wired);
  resize.observe(desk);
  resize.observe(projects);

  // a desk already in view, or with reduced motion, is simply there, as the page shows it
  const shown = reached(desk);
  for (const el of quotes) show(el, shown);
  for (const wire of wires) {
    show(wire.svg, shown);
    show(wire.out, shown);
  }
  const stopView = shown ? undefined : whenShareSeen(desk, clock, () => void play(), 0.25);

  return () => {
    dead = true;
    resize.disconnect();
    stopView?.();
    clock.stop();
    for (const wire of wires) wire.out.remove();
  };
}
