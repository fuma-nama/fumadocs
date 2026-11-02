import { BAYER4 } from '@/app/(landing)/lib/dither';
import { cssRgb, isDark } from '@/app/(landing)/lib/theme';
import { cellOf, CROWN_CELL, leanOf, MATE_H, MATE_PAD, MATE_W } from './sprite';

/** her moon's ring: its tilt (rad) and half height (cells); the steps her moon takes round it */
const TILT = -0.16;
const RING_Y = 4;
export const ORBIT_STEPS = 32;
/** ticks: her moon takes a step round its ring every STEP, she blinks for one every BLINK */
const STEP = 2;
const BLINK = 33;
/** px off her head past which her eyes follow what she watches */
const GLANCE = 60;

type Rgb = readonly [number, number, number];

/** what she is painted in: her black clothes, her outline (the ink of either theme), her jacket and
 * skin, yellow, the page (a cell round her, her moon's dark side) and her moon's lit side */
export interface MateInk {
  line: Rgb;
  pen: Rgb;
  lit: Rgb;
  yellow: Rgb;
  paper: Rgb;
  accent: Rgb;
}

/** her colours from the page's tokens: a light jacket, black clothes, ink lines in either theme */
export function mateInk(style: CSSStyleDeclaration): MateInk {
  const night = isDark();
  const paper = bytes(cssRgb(style.getPropertyValue('--lp-paper')));
  const ink = bytes(cssRgb(style.getPropertyValue('--lp-ink')));
  const yellow = bytes(cssRgb(style.getPropertyValue('--lp-yellow')));
  return {
    line: night ? paper : ink,
    pen: ink,
    lit: night ? ink : paper,
    yellow,
    paper,
    accent: night ? yellow : bytes(cssRgb(style.getPropertyValue('--lp-sun'))),
  };
}

function bytes([r, g, b]: Rgb): Rgb {
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/** her eyes and her moon's step `ticks` into her clock (`null` with reduced motion): she blinks
 * (1), or looks ahead (0), left (2) or right (3) at what lies `look` px across from her head */
export function mateAt(ticks: number | null, look: number) {
  const blink = ticks !== null && ticks % BLINK === 0;
  const eyes = blink ? 1 : look < -GLANCE ? 2 : look > GLANCE ? 3 : 0;
  return { eyes, step: Math.floor((ticks ?? 0) / STEP) % ORBIT_STEPS };
}

/** how many of a cell's 4 neighbours are hers */
function neighbours(pose: number, frame: number, x: number, y: number): number {
  let n = 0;
  if (cellOf(pose, frame, x - 1, y) !== '.') n++;
  if (cellOf(pose, frame, x + 1, y) !== '.') n++;
  if (cellOf(pose, frame, x, y - 1) !== '.') n++;
  if (cellOf(pose, frame, x, y + 1) !== '.') n++;
  return n;
}

/**
 * Paints her into `image`, a pixel a cell: `pose`, her remote's light on when `lit`, her eyes'
 * `frame`, a cell of paper round her, and her moon at `step` on a ring `rx` cells wide round her
 * crown, lit from `light`, the ring's near half over her and its far half behind.
 */
export function paintMate(
  image: ImageData,
  pose: number,
  lit: boolean,
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
  const crownX = CROWN_CELL[0] + leanOf(pose);
  const moonX = crownX + mx * cos - my * sin;
  const moonY = CROWN_CELL[1] + mx * sin + my * cos;
  for (let y = 0; y < MATE_H; y++) {
    for (let x = 0; x < MATE_W; x++) {
      const sx = x - MATE_PAD[0];
      const sy = y - MATE_PAD[1];
      // the ring: the cell's distance to the ellipse, in cells, and on which half
      const dx = sx + 0.5 - crownX;
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
      const ch = cellOf(pose, frame, sx, sy);
      let out: Rgb | null = null;
      if (moon && my > 0) out = moon;
      else if (ring && v > 0) out = ink.pen;
      else if (ch === 'o' && lit) out = ink.accent;
      else if (ch === '#' || ch === 'o')
        out = neighbours(pose, frame, sx, sy) === 4 ? ink.line : ink.pen;
      else if (ch === 'w') out = ink.lit;
      else if (ch === ':') out = BAYER4[(sy % 4) * 4 + (sx % 4)] < 8 ? ink.line : ink.lit;
      else if (ch === 'y') out = ink.yellow;
      else if (neighbours(pose, frame, sx, sy) > 0) out = ink.paper;
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
