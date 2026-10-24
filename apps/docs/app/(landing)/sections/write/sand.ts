import { BAYER4 } from '../../lib/bayer';
import { TICK } from '../../lib/motion';

/** a character of the source, in stage coordinates (CSS px, top-left of its cell) */
export interface Grain {
  x: number;
  y: number;
  char: string;
  /** 0 ink, 1 syntax, 2 number */
  tone: number;
}

/** where a pile sits, in stage coordinates; the pile rests on its bottom edge */
export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EmitOptions {
  /** launch every grain this many times, `gap` ms apart */
  copies?: number;
  gap?: number;
  /** arcs stay under this line, in stage coordinates */
  ceiling?: number;
}

export interface SandColors {
  ink: string;
  mute: string;
  number: string;
  paper: string;
  yellow: string;
}

const CAPACITY = 1600;
/** a grain waits this long over its character, then flies */
const LIFT = 90;
/** a grain flies at about this pace (px per ms), in this long at least and at most */
const FLY = 1.4;
const FLIGHT_MIN = 300;
const FLIGHT_MAX = 650;
/** a landed grain slides one column in this long, a draining pile sinks one row */
const SLIDE = 28;
const DRAIN_ROW = 30;
/** a cover is `x, y, w, h, shown`: `shown` of the 16 cells of every 4x4 dither tile are clear */
export const COVER = 5;
/** a grain slides while a column this close is two rows lower: about one row per three columns */
const REACH = 3;
/** styles after the three tones: inverted (ink block), highlighted (yellow block) */
const INVERTED = 3;
const HIGHLIGHT = 4;
const STYLES = 5;

/**
 * Glyph particles: lift from the source, arc with gravity, pile as sand on a character grid at
 * the floor of a frame, then drain through it. Every pile has its own clock (ms) and is drawn
 * as a function of it. Under them, covers in the paper colour dither parts of the stage in or
 * out, so a reveal is drawn on this one canvas instead of restyling the page.
 */
export function createSand(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const atlas = document.createElement('canvas');
  const atlasCtx = atlas.getContext('2d')!;

  const sx = new Float32Array(CAPACITY);
  const sy = new Float32Array(CAPACITY);
  // landing cell and resting cell, relative to the pile's frame
  const lx = new Float32Array(CAPACITY);
  const ly = new Float32Array(CAPACITY);
  const rx = new Float32Array(CAPACITY);
  const ry = new Float32Array(CAPACITY);
  const launch = new Float64Array(CAPACITY);
  const flight = new Float32Array(CAPACITY);
  // apex of the arc above the higher of its two ends
  const hop = new Float32Array(CAPACITY);
  const glyph = new Uint16Array(CAPACITY);
  const tone = new Uint8Array(CAPACITY);
  /** the look it takes once it rests: its tone, or an inverted or highlighted block */
  const style = new Uint8Array(CAPACITY);
  const pile = new Uint8Array(CAPACITY);
  const alive = new Uint8Array(CAPACITY);
  let count = 0;

  const charIndex = new Map<string, number>();
  let chars = '';
  let advance = 8;
  let cell = 14;
  let dpr = 1;
  let cw = 8;
  let ch = 14;
  let font = '';
  let size = 13;
  let colors: SandColors | null = null;
  /** dither cell of the covers, CSS px, and a pattern per number of clear cells */
  let dither = 3;
  const patterns: (CanvasPattern | null)[] = [];

  /** drain start per pile, `Infinity` while it rests */
  const drains: number[] = [];

  function rasterize() {
    if (!colors || chars.length === 0) return;
    cw = Math.ceil(advance * dpr);
    ch = Math.ceil(cell * dpr);
    atlas.width = cw * chars.length;
    atlas.height = ch * STYLES;
    atlasCtx.font = `${size * dpr}px ${font}`;
    atlasCtx.textAlign = 'center';
    atlasCtx.textBaseline = 'middle';
    const fills = [colors.ink, colors.mute, colors.number, colors.paper, '#121210'];
    for (let s = 0; s < STYLES; s++) {
      const y = s * ch;
      if (s === INVERTED || s === HIGHLIGHT) {
        atlasCtx.fillStyle = s === INVERTED ? colors.ink : colors.yellow;
        atlasCtx.fillRect(0, y, atlas.width, ch);
      }
      atlasCtx.fillStyle = fills[s];
      for (let i = 0; i < chars.length; i++) {
        atlasCtx.fillText(chars[i], i * cw + cw / 2, y + ch / 2 + dpr * 0.5);
      }
    }
  }

  function tile() {
    if (!colors) return;
    const px = Math.max(1, Math.round(dither * dpr));
    for (let shown = 1; shown < 16; shown++) {
      const tileCanvas = document.createElement('canvas');
      tileCanvas.width = tileCanvas.height = px * 4;
      const tileCtx = tileCanvas.getContext('2d')!;
      tileCtx.fillStyle = colors.paper;
      for (let i = 0; i < 16; i++) {
        if (BAYER4[i] >= shown) tileCtx.fillRect((i % 4) * px, Math.floor(i / 4) * px, px, px);
      }
      patterns[shown] = ctx.createPattern(tileCanvas, 'repeat');
    }
  }

  return {
    /** glyph metrics: font family and size, the monospace advance and the pile's row height, CSS px */
    setMetrics(next: {
      font: string;
      size: number;
      advance: number;
      cell: number;
      dpr: number;
      dither?: number;
    }) {
      font = next.font;
      size = next.size;
      advance = next.advance;
      cell = next.cell;
      dpr = next.dpr;
      dither = next.dither ?? dither;
      rasterize();
      tile();
    },
    setColors(next: SandColors) {
      colors = next;
      rasterize();
      tile();
    },
    resize(width: number, height: number) {
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
    },

    /**
     * Launch grains toward pile `target` from `start` on, staggered by column, and return when
     * the last one comes to rest. Resting cells are settled now, in order of arrival: each grain
     * drops on its column and slides while a column within reach is two rows lower.
     */
    emit(
      grains: Grain[],
      target: number,
      frame: Frame,
      start: number,
      { copies = 1, gap = TICK, ceiling = 0 }: EmitOptions = {},
    ): number {
      for (const grain of grains) {
        if (!charIndex.has(grain.char)) {
          charIndex.set(grain.char, chars.length);
          chars += grain.char;
        }
      }
      rasterize();
      drains[target] = Infinity;

      const cols = Math.max(4, Math.floor(frame.w / advance));
      const heights = new Int16Array(cols);
      const added: number[] = [];
      let minX = Infinity;
      for (const grain of grains) minX = Math.min(minX, grain.x);

      for (let copy = 0; copy < copies; copy++) {
        for (const grain of grains) {
          const i = alloc();
          if (i === -1) break;
          sx[i] = grain.x;
          sy[i] = grain.y;
          const column = Math.round((grain.x - minX) / advance);
          launch[i] = start + column * 2 + copy * gap + Math.random() * 30;
          // far or near, the grains fly at about the same pace
          const distance = Math.hypot(frame.x + frame.w / 2 - grain.x, frame.y + frame.h - grain.y);
          flight[i] =
            Math.min(FLIGHT_MAX, Math.max(FLIGHT_MIN, distance / FLY)) +
            Math.random() * 80 +
            Math.min(copy, 4) * 25;
          const room = Math.min(grain.y, frame.y + frame.h) - ceiling - 8;
          const reach = Math.abs(frame.x + frame.w / 2 - grain.x);
          // a low arc, so the stream crosses near its own lines and clear of the ones above
          hop[i] = Math.max(8, Math.min(room, 10 + reach * 0.03 + Math.random() * 18));
          glyph[i] = charIndex.get(grain.char)!;
          const roll = Math.random();
          tone[i] = grain.tone;
          style[i] = roll < 0.05 ? INVERTED : roll < 0.08 ? HIGHLIGHT : grain.tone;
          pile[i] = target;
          added.push(i);
        }
      }

      added.sort((a, b) => launch[a] + flight[a] - (launch[b] + flight[b]));
      const center = cols / 2 + (Math.random() - 0.5) * cols * 0.2;
      const spread = Math.max(4, Math.sqrt(added.length) * 1.6);
      const maxRows = Math.max(1, Math.floor(frame.h / cell) - 1);
      let rested = start;
      for (const i of added) {
        let aim = Math.round(center + gaussian() * spread);
        aim = Math.min(cols - 1, Math.max(0, aim));
        if (heights[aim] >= maxRows) aim = lowest(heights, aim);
        lx[i] = aim * advance;
        ly[i] = frame.h - (heights[aim] + 1) * cell;
        const rest = slide(heights, aim);
        heights[rest]++;
        rx[i] = rest * advance;
        ry[i] = frame.h - heights[rest] * cell;
        rested = Math.max(rested, launch[i] + LIFT + flight[i] + Math.abs(rest - aim) * SLIDE);
      }
      return rested;
    },

    /** start draining pile `target` through its floor */
    drain(target: number, start: number) {
      drains[target] = start;
    },

    /** remove every grain of pile `target` */
    clear(target: number) {
      for (let i = 0; i < count; i++) if (pile[i] === target) alive[i] = 0;
      compact();
    },

    /**
     * Draw every pile at its time in `times`, placed by `frames`, and `coverCount` covers (see
     * `COVER`): under the piles, so a slot dithers in beneath its sand, or `over` them, so the
     * sand dithers out with the page. Returns whether anything shows.
     */
    draw(
      times: ArrayLike<number>,
      frames: Frame[],
      covers: Float32Array,
      coverCount: number,
      over = false,
    ): boolean {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (over) {
        const piles = drawPiles(times, frames);
        return drawCovers(covers, coverCount) || piles;
      }
      const shown = drawCovers(covers, coverCount);
      return drawPiles(times, frames) || shown;
    },
  };

  function drawCovers(covers: Float32Array, coverCount: number): boolean {
    let shown = false;
    for (let c = 0; c < coverCount && colors; c++) {
      const o = c * COVER;
      const clear = covers[o + 4];
      if (clear >= 16) continue;
      ctx.fillStyle = clear <= 0 ? colors.paper : patterns[clear]!;
      const x = Math.round(covers[o] * dpr);
      const y = Math.round(covers[o + 1] * dpr);
      const right = Math.round((covers[o] + covers[o + 2]) * dpr);
      const bottom = Math.round((covers[o + 1] + covers[o + 3]) * dpr);
      ctx.fillRect(x, y, right - x, bottom - y);
      shown = true;
    }
    return shown;
  }

  function drawPiles(times: ArrayLike<number>, frames: Frame[]): boolean {
    let shown = false;
    for (let i = 0; i < count; i++) {
      if (alive[i] === 0) continue;
      const now = times[pile[i]];
      const s = now - launch[i];
      if (s < 0) continue;
      const frame = frames[pile[i]];
      let x: number;
      let y: number;
      const landed = s - LIFT - flight[i];
      let rests = false;
      if (s < LIFT) {
        // a beat over its character, then it launches
        x = sx[i];
        y = sy[i];
      } else if (landed < 0) {
        // a ballistic arc whose apex sits `hop` above the higher end
        const u = (s - LIFT) / flight[i];
        const ax = sx[i];
        const ay = sy[i];
        const tx = frame.x + lx[i];
        const ty = frame.y + ly[i];
        const h = hop[i] + Math.max(0, ay - ty);
        const k = Math.sqrt(2 * h) + Math.sqrt(2 * Math.max(0, h + ty - ay));
        const g = k * k;
        x = ax + (tx - ax) * u;
        y = ay - Math.sqrt(2 * g * h) * u + 0.5 * g * u * u;
      } else {
        // it slides down the slope to its resting cell at a steady pace
        const span = (Math.abs(rx[i] - lx[i]) / advance) * SLIDE;
        const k = span === 0 ? 1 : Math.min(1, landed / span);
        x = frame.x + lx[i] + (rx[i] - lx[i]) * k;
        y = frame.y + ly[i] + (ry[i] - ly[i]) * k;
        rests = k === 1;
      }
      // draining, the pile sinks through its floor at a steady pace, cut off by it
      let height = ch;
      const drain = drains[pile[i]];
      if (landed >= 0 && now > drain) {
        y += ((now - drain) / DRAIN_ROW) * cell;
        height = Math.min(ch, Math.round((frame.y + frame.h - y) * dpr));
        if (height <= 0) continue;
      }
      shown = true;
      ctx.drawImage(
        atlas,
        glyph[i] * cw,
        // the pile's texture shows on grains at rest, nothing in motion changes its look
        (rests ? style[i] : tone[i]) * ch,
        cw,
        height,
        Math.round(x * dpr),
        Math.round(y * dpr),
        cw,
        height,
      );
    }
    return shown;
  }

  function alloc(): number {
    if (count >= CAPACITY) compact();
    if (count >= CAPACITY) return -1;
    alive[count] = 1;
    return count++;
  }

  function compact() {
    let j = 0;
    for (let i = 0; i < count; i++) {
      if (alive[i] === 0) continue;
      if (i !== j) {
        sx[j] = sx[i];
        sy[j] = sy[i];
        lx[j] = lx[i];
        ly[j] = ly[i];
        rx[j] = rx[i];
        ry[j] = ry[i];
        launch[j] = launch[i];
        flight[j] = flight[i];
        hop[j] = hop[i];
        glyph[j] = glyph[i];
        tone[j] = tone[i];
        style[j] = style[i];
        pile[j] = pile[i];
        alive[j] = 1;
      }
      j++;
    }
    for (let i = j; i < count; i++) alive[i] = 0;
    count = j;
  }
}

/** the lowest column, nearest to `aim` on ties */
function lowest(heights: Int16Array, aim: number): number {
  let best = aim;
  for (let c = 0; c < heights.length; c++) {
    const h = heights[c];
    if (h < heights[best] || (h === heights[best] && Math.abs(c - aim) < Math.abs(best - aim))) {
      best = c;
    }
  }
  return best;
}

/** where a grain dropped on `column` comes to rest: it slides while a near column is two rows lower */
function slide(heights: Int16Array, column: number): number {
  let c = column;
  for (let moves = 0; moves < 12; moves++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    let next = c;
    for (let d = 1; d <= REACH && next === c; d++) {
      if (lower(heights, c + side * d, c)) next = c + side * d;
      else if (lower(heights, c - side * d, c)) next = c - side * d;
    }
    if (next === c) break;
    c = next;
  }
  return c;
}

/** whether column `n` exists and is two rows lower than column `c` */
function lower(heights: Int16Array, n: number, c: number): boolean {
  return n >= 0 && n < heights.length && heights[n] <= heights[c] - 2;
}

function gaussian(): number {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
}
