import { BAYER4 } from '../../lib/bayer';

/** her sprite, hand-drawn on a 30x57 grid: . clear, # line, w lit, : half tone, y yellow */
const SPRITE = [
  '................##............',
  '...............#..#...........',
  '...............#.#............',
  '...........########...........',
  '.........##wwwwwwww##.........',
  '.......##wwwwwwwwwwww##.......',
  '......#wwwwwwwwwwwwwwww#......',
  '.....#wwwwwwwwwwwwwwwwww#.....',
  '....#wwwwwwwwwwwwwwwwwwww#....',
  '...#wwwwwwwwwwwwwwwwwwwwww#...',
  '...#wwwwwwwwwwwwwwwwwwwwww#...',
  '...#wwwwwwwwwwwwwwwwwwwwwww#..',
  '..#wwwwww#wwwwwwwwwwwwwwwww#..',
  '..#wwwwww#wwwwwwwwwwwwwwwww#..',
  '..#wwwwww#wwwwwwwwwwwwwwwww#..',
  '..#wwwwww#wwwwwwwwwwwwwwwww#..',
  '..#wwwwwww#wwwwwwwwwwwwwwww#..',
  '..#wwwwwww#wwwwwwwwwwwwwwww#..',
  '..#wwwwwww#wwwwwwwwwwwwwwww#..',
  '..#wwwwwwww###w##wwwwwwwwww#..',
  '..##wwww#ww#ww#ww##ww#wwww##..',
  '.#w#www#w####wwww####w#www#w#.',
  '.#w#www#ww#w#wwww#w#ww#www#w#.',
  '.#w#www#ww###wwww###ww#www#w#.',
  '.#w#www#wwwwwwwwwwwwww#www#w#.',
  '.#w#www#wwwwww##wwwwww#www#w#.',
  '##w#www##wwwwwwwwwwww##www#w##',
  '.#ww#w#::##wwwwwwww##::#w#ww#.',
  '..#####:::##########:::#####..',
  '.....###w###wwwwww###w###.....',
  '.....#www#####yy#####www#.....',
  '....#wwww#w########w#wwww#....',
  '....#wwww#w#wwwwww#w#w####....',
  '...#wwwww#w#wwwwww#w#w#ww##...',
  '...#######yywwwwwwyy#w#yy##...',
  '...#wwwww#yywwwwwwyy#w#####...',
  '..#wwwwww#w#wwwwww#w#wwwwww#..',
  '..#wwwwww#w#wwwwww#w#wwwwww#..',
  '..#wwwwww#w#wwwwww#w#wwwwww#..',
  '..########w#wwwwww#w########..',
  '..########w########w########..',
  '...#wwwww############wwwww#...',
  '...#wwwww############wwwww#...',
  '....######################....',
  '....######################....',
  '.....###w##w######w##w###.....',
  '........#ww#......#ww#........',
  '........####......####........',
  '........####......####........',
  '........####......####........',
  '........####......####........',
  '........####......####........',
  '.......######....######.......',
  '......#y####......####y#......',
  '......#wwww##....##wwww#......',
  '.....#wwwwww#....#wwwwww#.....',
  '.....########....########.....',
];

export const SPRITE_W = 30;
export const SPRITE_H = 57;
/** sprite cells: the one over her seat on the rig, and the middle of her crown, which her moon rings */
export const SEAT_CELL = [15, 45] as const;
export const CROWN_CELL = [14.5, 6] as const;
/** canvas cells round the sprite, for her moon's ring at either side and above her crown; of those
 * above, the moon reaches up this many on its orbit */
export const MATE_PAD = [9, 6] as const;
export const MATE_RISE = 3;
export const MATE_W = SPRITE_W + 2 * MATE_PAD[0];
export const MATE_H = SPRITE_H + MATE_PAD[1] + 1;
/** her moon's ring: its tilt (rad) and half height (cells); the steps her moon takes round it */
const TILT = -0.16;
const RING_Y = 4;
export const ORBIT_STEPS = 32;
/** her eyes, rows 21 to 23 of each: shut, both looking left, both looking right */
const EYES = [
  ['wwww', '####', 'wwww'],
  ['####', '#w#w', '###w'],
  ['####', 'w#w#', 'w###'],
];

type Rgb = readonly [number, number, number];

/** what she is painted in, from the page's tokens */
export interface MateInk {
  /** her black clothes */
  line: Rgb;
  /** her outline, the ink of either theme */
  pen: Rgb;
  /** her jacket and skin */
  lit: Rgb;
  yellow: Rgb;
  /** the page: a cell round her, and her moon's dark side */
  paper: Rgb;
  /** her moon's lit side */
  accent: Rgb;
}

/** frame 0 open, 1 shut, 2 looking left, 3 looking right */
function cell(frame: number, x: number, y: number): string {
  if (x < 0 || y < 0 || x >= SPRITE_W || y >= SPRITE_H) return '.';
  if (frame > 0 && y >= 21 && y <= 23) {
    if (x >= 9 && x <= 12) return EYES[frame - 1][y - 21][x - 9];
    if (x >= 17 && x <= 20) return EYES[frame - 1][y - 21][x - 17];
  }
  return SPRITE[y][x];
}

function beside(frame: number, x: number, y: number): boolean {
  return (
    cell(frame, x - 1, y) !== '.' ||
    cell(frame, x + 1, y) !== '.' ||
    cell(frame, x, y - 1) !== '.' ||
    cell(frame, x, y + 1) !== '.'
  );
}

/** her outline as the rig's shader casts it: 255 where she is */
export function silhouette(): ImageData {
  const image = new ImageData(SPRITE_W, SPRITE_H);
  for (let y = 0; y < SPRITE_H; y++) {
    for (let x = 0; x < SPRITE_W; x++) {
      const i = (y * SPRITE_W + x) * 4;
      image.data[i] = SPRITE[y][x] === '.' ? 0 : 255;
      image.data[i + 3] = 255;
    }
  }
  return image;
}

/**
 * Paints her into `image` (`MATE_W` by `MATE_H`, a pixel a cell): her `frame`, a cell of paper round
 * her so she reads cut out, and her moon at `step` of its orbit on a ring `rx` cells wide round her
 * crown, lit from `light`: the near half of the ring over her, the far half behind her.
 */
export function paintMate(
  image: ImageData,
  frame: number,
  step: number,
  rx: number,
  ink: MateInk,
  light: Rgb,
) {
  const data = image.data;
  const cos = Math.cos(TILT);
  const sin = Math.sin(TILT);
  const radius = rx * 0.16;
  const angle = Math.PI + 0.45 + (step * 2 * Math.PI) / ORBIT_STEPS;
  const mx = rx * Math.cos(angle);
  const my = RING_Y * Math.sin(angle);
  const moonX = CROWN_CELL[0] + mx * cos - my * sin;
  const moonY = CROWN_CELL[1] + mx * sin + my * cos;
  for (let y = 0; y < MATE_H; y++) {
    for (let x = 0; x < MATE_W; x++) {
      const sx = x - MATE_PAD[0];
      const sy = y - MATE_PAD[1];
      // the ring: the cell's distance to the ellipse, in cells, and on which half
      const dx = sx + 0.5 - CROWN_CELL[0];
      const dy = sy + 0.5 - CROWN_CELL[1];
      const u = dx * cos + dy * sin;
      const v = dy * cos - dx * sin;
      const f = (u * u) / (rx * rx) + (v * v) / (RING_Y * RING_Y) - 1;
      const g = 2 * Math.hypot(u / (rx * rx), v / (RING_Y * RING_Y));
      const ring = Math.abs(f / g) < 0.5;
      // the moon, a sphere: outlined, lit in a dither like the hero's
      let moon: Rgb | null = null;
      const qx = (sx + 0.5 - moonX) / radius;
      const qy = (sy + 0.5 - moonY) / radius;
      const q = qx * qx + qy * qy;
      if (q <= 1) {
        const lambert = qx * light[0] + qy * light[1] + Math.sqrt(1 - q) * light[2];
        const threshold = ((BAYER4[(y % 4) * 4 + (x % 4)] + 0.5) / 16) * 0.9 - 0.15;
        moon =
          (1 - Math.sqrt(q)) * radius < 0.9
            ? ink.pen
            : lambert > threshold
              ? ink.accent
              : ink.paper;
      }
      const ch = cell(frame, sx, sy);
      let out: Rgb | null = null;
      if (moon && my > 0) out = moon;
      else if (ring && v > 0) out = ink.pen;
      else if (ch === '#') out = inside(frame, sx, sy) ? ink.line : ink.pen;
      else if (ch === 'w') out = ink.lit;
      else if (ch === ':') out = BAYER4[(sy % 4) * 4 + (sx % 4)] < 8 ? ink.line : ink.lit;
      else if (ch === 'y') out = ink.yellow;
      else if (beside(frame, sx, sy)) out = ink.paper;
      else if (moon) out = moon;
      else if (ring) out = ink.pen;
      const i = (y * MATE_W + x) * 4;
      if (!out) {
        data[i + 3] = 0;
        continue;
      }
      data[i] = out[0];
      data[i + 1] = out[1];
      data[i + 2] = out[2];
      data[i + 3] = 255;
    }
  }
}

/** whether a cell has her on all 4 sides, so it can't be on her outline */
function inside(frame: number, x: number, y: number): boolean {
  return (
    cell(frame, x - 1, y) !== '.' &&
    cell(frame, x + 1, y) !== '.' &&
    cell(frame, x, y - 1) !== '.' &&
    cell(frame, x, y + 1) !== '.'
  );
}
