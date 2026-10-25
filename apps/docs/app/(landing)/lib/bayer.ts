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

function mask(level: number): string {
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' shape-rendering='crispEdges'%3E%3Cpath d='${ditherPath(level)}'/%3E%3C/svg%3E")`;
}

/**
 * `mask-image` values for an ordered dither: index `n` keeps `n` of 16 cells of every 4x4 tile.
 * Set `mask-size` to four cells, e.g. `16px` for 4px pixels.
 */
export const DITHER_MASKS: readonly string[] = Array.from({ length: 17 }, (_, level) =>
  mask(level),
);
