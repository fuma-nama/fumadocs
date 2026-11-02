/** the 4x4 ordered dither matrix, values 0 to 15 */
export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** the cells an ordered dither keeps at `level` / 16, as an SVG path over a 4x4 tile of 1px cells */
export function ditherPath(level: number): string {
  let d = '';
  for (let i = 0; i < 16; i++) {
    if (BAYER4[i] < level) d += `M${i % 4} ${Math.floor(i / 4)}h1v1h-1z`;
  }
  return d;
}

/** `mask-image` values that keep `n` of 16 cells of every 4x4 tile; `mask-size` sizes the tile */
export const DITHER_MASKS: readonly string[] = Array.from(
  { length: 17 },
  (_, level) =>
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Cpath d='${ditherPath(level)}'/%3E%3C/svg%3E")`,
);

/** WAAPI keyframes that dither an element in, `cell` CSS px per dither pixel */
export function ditherKeyframes(cell: number): Keyframe[] {
  const size = `${cell * 4}px ${cell * 4}px`;
  const frames: Keyframe[] = [];
  for (let i = 0; i <= 16; i++) frames.push({ maskImage: DITHER_MASKS[i], maskSize: size });
  return frames;
}

/** an element dithered out, 2px cells: `ditherKeyframes(2)` the other way, ending on nothing */
export const DISSOLVE = ditherKeyframes(2).reverse();

/** GLSL `bayer8(p)`, paste with `${bayer8}`: the 8x8 dither threshold in (0, 1) at pixel `p` */
export const bayer8 = `
const int BAYER8[64] = int[64](
  0, 32, 8, 40, 2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37,
  63, 31, 55, 23, 61, 29, 53, 21
);

float bayer8(vec2 p) {
  ivec2 i = ivec2(mod(p, 8.0));
  return (float(BAYER8[i.y * 8 + i.x]) + 0.5) / 64.0;
}
`;
