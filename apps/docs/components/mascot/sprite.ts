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
  '.....#wwwww###yy###wwwww#.....',
  '.....#wwwww########wwwww#.....',
  '......#wwww#wwwwww#www####....',
  '......#wwww#wwwwww#www#ww##...',
  '...#######yywwwwwwyy#w#yy##...',
  '....#www##yywwwwwwyy#######...',
  '....#wwww#w#wwwwww#w#wwww#....',
  '....#wwwww##wwwwww##wwwww#....',
  '....#wwwww##wwwwww##wwwww#....',
  '...#######w#wwwwww#w#######...',
  '...#######w########w#######...',
  '....#wwww############wwww#....',
  '....#wwww############wwww#....',
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

/** her sitting on the moon's crown, from her skirt down: her lap on its rim, her legs down its face */
const LAP = [
  '...########################...',
  '..##########################..',
  '..#w##w################w##w#..',
  '.....#wwwww#......#wwwww#.....',
  '.....#wwwww#......#wwwww#.....',
  '......#####........#####......',
  '.......####........####.......',
  '.......####........####.......',
  '.......####........####.......',
  '.......####........####.......',
  '......######......######......',
  '......#y####......####y#......',
  '......#wwww#......#wwww#......',
  '.......####........####.......',
];
/** her sprite sitting */
const SITTING = [...SPRITE.slice(0, SPRITE.length - LAP.length), ...LAP];

/** a run of cells along a row of hers: its row, its first cell, the cells; a space keeps hers */
type Run = readonly [row: number, x: number, cells: string];

/** her body where an arm rests, that arm lifted to work her remote: her left (on the right as you
 * look at her), then her right; . clears a cell */
const LIFTED: readonly (readonly Run[])[] = [
  [
    [30, 19, '##'],
    [31, 20, '#'],
    [32, 20, '# w ..'],
    [33, 20, '# w#...'],
    [34, 22, 'w#...'],
    [35, 21, 'ww ...'],
    [36, 23, '#..'],
    [37, 19, 'w#  #..'],
    [38, 19, 'w#  #..'],
    [39, 21, 'ww ...'],
    [40, 21, 'ww ...'],
    [41, 21, '#....'],
    [42, 21, '#....'],
  ],
  [
    [30, 9, '##'],
    [31, 9, '#'],
    [32, 9, '#'],
    [33, 9, '#'],
    [34, 3, '... ww'],
    [35, 4, '..# w'],
    [36, 4, '..#'],
    [37, 4, '..#  #w'],
    [38, 4, '..#  #w'],
    [39, 3, '... ww'],
    [40, 3, '... ww'],
    [41, 4, '....#'],
    [42, 4, '....#'],
  ],
];

/** her left arm working her remote, over her body, from shoulder to hand: ready (the remote in her
 * resting hand), low, out and up; her right arm is its mirror, o the remote's light */
const ARMS: readonly (readonly Run[])[] = [
  [
    [41, 25, 'w###o'],
    [42, 25, 'w##'],
  ],
  [
    [30, 19, 'wwww'],
    [31, 19, 'wwwww'],
    [32, 20, 'wwww#'],
    [33, 20, 'wwwww#'],
    [34, 21, 'www#w##'],
    [35, 21, '##ww#ww####'],
    [36, 24, 'wwwwww####'],
    [37, 24, '#wwwww##w##'],
    [38, 25, '#wwww##w###o'],
    [39, 26, '##ww##w##'],
    [40, 28, '######'],
    [41, 30, '##'],
  ],
  [
    [28, 21, 'w'],
    [29, 21, 'www       ###'],
    [30, 21, 'wwww######w####'],
    [31, 21, 'wwwww##wwww##w##'],
    [32, 21, 'wwwwwwwwwww##w###o'],
    [33, 22, '#wwwwwwwww##w##'],
    [34, 24, '##wwwwww####'],
    [35, 26, '########'],
  ],
  [
    [11, 31, 'o'],
    [12, 31, '#'],
    [13, 31, '#'],
    [14, 30, '##'],
    [15, 30, '##'],
    [16, 30, '##'],
    [17, 29, '####'],
    [18, 29, 'w###'],
    [19, 29, 'www#'],
    [20, 29, '#####'],
    [21, 28, '######'],
    [22, 27, '#wwww#'],
    [23, 27, '#wwww#'],
    [24, 26, '#wwww#'],
    [25, 26, '#wwww#'],
    [26, 25, '#wwww#'],
    [27, 22, 'ww#w#www#'],
    [28, 21, 'wwwww#ww#'],
    [29, 21, 'wwwwww###'],
    [30, 21, 'wwwww#'],
    [31, 21, 'www###'],
  ],
];

/** cells her head leans toward her working arm at each height */
const LEAN = [0, 0, 1, 1];

export const SPRITE_W = 30;
export const SPRITE_H = 57;
/** sprite cells: the one over her seat on the rig, and the middle of her crown, which her moon rings */
export const SEAT_CELL = [15, 45] as const;
export const CROWN_CELL = [14.5, 6] as const;
/** canvas cells round the sprite for her moon's ring; it reaches MATE_RISE of those above her */
export const MATE_PAD = [9, 6] as const;
export const MATE_RISE = 3;
export const MATE_W = SPRITE_W + 2 * MATE_PAD[0];
export const MATE_H = SPRITE_H + MATE_PAD[1] + 1;
/** her eyes, rows 21 to 23 of each: shut, both looking left, both looking right */
const EYES = [
  ['wwww', '####', 'wwww'],
  ['####', '#w#w', '###w'],
  ['####', 'w#w#', 'w###'],
];

/** her poses: 0 idle, else her remote in hand (0 her left, 1 her right) at height (0 ready, 1 low,
 * 2 out, 3 up), pose 1 + HEIGHTS * hand + height */
export const HEIGHTS = 4;
export const POSES = 1 + 2 * HEIGHTS;
export function poseOf(hand: number, height: number): number {
  return 1 + HEIGHTS * hand + height;
}
/** her sitting, her seat on the moon's rim: a pose after the remote's */
export const SIT = POSES;

export function leanOf(pose: number): number {
  if (pose === 0 || pose === SIT) return 0;
  const lean = LEAN[(pose - 1) % HEIGHTS];
  return pose <= HEIGHTS ? lean : -lean;
}

/** her canvas cells under `runs`, mirrored onto her right side with `mirror` */
function eachCell(
  runs: readonly Run[],
  mirror: boolean,
  visit: (x: number, y: number, cell: string) => void,
) {
  for (const [y, x0, cells] of runs) {
    for (let k = 0; k < cells.length; k++) {
      if (cells[k] === ' ') continue;
      const x = mirror ? SPRITE_W - 1 - (x0 + k) : x0 + k;
      visit(x + MATE_PAD[0], y + MATE_PAD[1], cells[k]);
    }
  }
}

const grids: string[][] = [];

/** her cells in `pose`, a row of her canvas each: her sprite, her head leaned, the working arm's
 * side lifted, the arm */
function gridOf(pose: number): string[] {
  const cached = grids[pose];
  if (cached) return cached;
  const rows: string[][] = [];
  const lean = leanOf(pose);
  const sprite = pose === SIT ? SITTING : SPRITE;
  for (let y = 0; y < MATE_H; y++) {
    const row: string[] = [];
    for (let x = 0; x < MATE_W; x++) {
      const sy = y - MATE_PAD[1];
      const sx = x - MATE_PAD[0] - (sy <= 28 ? lean : 0);
      row.push(sx >= 0 && sy >= 0 && sx < SPRITE_W && sy < SPRITE_H ? sprite[sy][sx] : '.');
    }
    rows.push(row);
  }
  if (pose > 0 && pose !== SIT) {
    const hand = Math.floor((pose - 1) / HEIGHTS);
    const height = (pose - 1) % HEIGHTS;
    const put = (x: number, y: number, cell: string) => {
      rows[y][x] = cell;
    };
    if (height > 0) eachCell(LIFTED[hand], false, put);
    eachCell(ARMS[height], hand === 1, put);
  }
  grids[pose] = rows.map((row) => row.join(''));
  return grids[pose];
}

type Box = readonly [number, number, number, number];

/** the sprite cells [x0, y0, x1, y1) a test takes in of each pose */
function boxOf(pose: number, take: (x: number, y: number) => boolean): Box {
  const grid = gridOf(pose);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let y = 0; y < MATE_H; y++) {
    for (let x = 0; x < MATE_W; x++) {
      if (grid[y][x] === '.' || !take(x, y)) continue;
      x0 = Math.min(x0, x - MATE_PAD[0]);
      y0 = Math.min(y0, y - MATE_PAD[1]);
      x1 = Math.max(x1, x - MATE_PAD[0] + 1);
      y1 = Math.max(y1, y - MATE_PAD[1] + 1);
    }
  }
  return x0 === Infinity ? [0, 0, 0, 0] : [x0, y0, x1, y1];
}

/** each pose's cells, sprite cells: what the rig's clip takes in */
export const POSE_BOX: readonly Box[] = Array.from({ length: POSES }, (_, pose) =>
  boxOf(pose, () => true),
);

/** each pose's arm, sprite cells: what keeps clear of a tab; idle has none */
export const ARM_BOX: readonly Box[] = Array.from({ length: POSES }, (_, pose) => {
  if (pose === 0) return [0, 0, 0, 0];
  const arm = new Set<number>();
  // her right hand's poses follow her left's
  eachCell(ARMS[(pose - 1) % HEIGHTS], pose > HEIGHTS, (x, y) => arm.add(y * MATE_W + x));
  return boxOf(pose, (x, y) => arm.has(y * MATE_W + x));
});

/** her cell in `pose` with eyes `frame`: 0 open, 1 shut, 2 looking left, 3 looking right */
export function cellOf(pose: number, frame: number, x: number, y: number): string {
  if (frame > 0 && y >= 21 && y <= 23) {
    const ex = x - leanOf(pose);
    if (ex >= 9 && ex <= 12) return EYES[frame - 1][y - 21][ex - 9];
    if (ex >= 17 && ex <= 20) return EYES[frame - 1][y - 21][ex - 17];
  }
  const gx = x + MATE_PAD[0];
  const gy = y + MATE_PAD[1];
  if (gx < 0 || gy < 0 || gx >= MATE_W || gy >= MATE_H) return '.';
  return gridOf(pose)[gy][gx];
}

/** her outline in `pose` as the rig's shader casts it, over her canvas: 255 where she is */
export function silhouette(pose: number): ImageData {
  const grid = gridOf(pose);
  const image = new ImageData(MATE_W, MATE_H);
  for (let y = 0; y < MATE_H; y++) {
    for (let x = 0; x < MATE_W; x++) {
      const i = (y * MATE_W + x) * 4;
      image.data[i] = grid[y][x] === '.' ? 0 : 255;
      image.data[i + 3] = 255;
    }
  }
  return image;
}
