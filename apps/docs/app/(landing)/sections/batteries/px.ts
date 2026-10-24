import { BAYER4 } from '../../lib/bayer';

/** SVG path data for 1-bit pixel art, one unit per pixel cell */

/** a pixel cell in CSS px; Geist Pixel at 40px draws on the same grid */
export const CELL = 3;

export function rect(x: number, y: number, w: number, h: number): string {
  return `M${x} ${y}h${w}v${h}h${-w}z`;
}

export function frame(x: number, y: number, w: number, h: number): string {
  return (
    rect(x, y, w, 1) +
    rect(x, y + h - 1, w, 1) +
    rect(x, y + 1, 1, h - 2) +
    rect(x + w - 1, y + 1, 1, h - 2)
  );
}

/** the cells of `rows` drawn with `char`, e.g. `art(['.#.', '###'], 4, 2)` */
export function art(rows: readonly string[], x = 0, y = 0, char = '#'): string {
  let d = '';
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    let c = 0;
    while (c < row.length) {
      if (row[c] !== char) {
        c++;
        continue;
      }
      const start = c;
      while (row[c] === char) c++;
      d += rect(x + start, y + r, c - start, 1);
    }
  }
  return d;
}

/** ordered dither fill keeping `level` of 16 cells of every 4x4 tile */
export function dither(x: number, y: number, w: number, h: number, level: number): string {
  let d = '';
  for (let r = 0; r < h; r++) {
    let c = 0;
    while (c < w) {
      if (BAYER4[((y + r) % 4) * 4 + ((x + c) % 4)] >= level) {
        c++;
        continue;
      }
      const start = c;
      while (c < w && BAYER4[((y + r) % 4) * 4 + ((x + c) % 4)] < level) c++;
      d += rect(x + start, y + r, c - start, 1);
    }
  }
  return d;
}

/** a horizontal dashed rule, `on` cells drawn then `off` cells skipped */
export function dashes(x: number, y: number, w: number, on = 2, off = 2): string {
  let d = '';
  for (let c = 0; c < w; c += on + off) d += rect(x + c, y, Math.min(on, w - c), 1);
  return d;
}
