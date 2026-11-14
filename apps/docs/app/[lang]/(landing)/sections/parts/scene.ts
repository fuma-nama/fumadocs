import { FACING, MATERIAL, type Shape, type Vec3 } from '../../lib/mesh';
import type { Layer } from '../../ui/chip';
import type { Look } from './data';

/** units are CSS px at the drawing's full size: y up, z toward the viewer */
export const W = 380;
export const D = 150;
export const GAP = 10;
const FEET = 6;
const DOCK: Vec3 = [W + 40, 8, D + 36];
/** a nameplate's mount: its face is the page's nameplate, laid on it */
export const PLATE = { w: 216, h: 38, x: -W / 2 + 14 + 108, z: D / 2 + 2 } as const;

const CASES: Partial<Record<Look, number>> = {
  ink: MATERIAL.ink,
  paper: MATERIAL.paper,
  grey: MATERIAL.grey,
};

interface Screen {
  at: Readonly<Vec3>;
  size: readonly [number, number];
}

/** the screens the page lays its words on; the UI's about 120px tall at full size */
export const DISPLAYS = {
  framework: { at: [99, 0, D / 2 + 2.5], size: [118, 36] },
  core: { at: [101, 0, D / 2 + 2.5], size: [108, 66] },
  ui: { at: [0, 186 / 2 - 8 - (117 + 12) / 2, D / 2 + 3], size: [W - 32, 117] },
} as const satisfies Partial<Record<Layer, Screen>>;

/** a falling page, CSS px: its words keep their size at every width, so it does too */
export const CARD: readonly [number, number] = [96, 120];
/** CSS px a falling page keeps clear */
export const ROOM = 16;
/** the content's bin: walls this thick round a well this deep, open at the top */
const WALL = 8;
export const WELL = 24;
/** a page's sheet, units thick as it lies in the bin */
export const LEAF = 6;
/** where the pages fall onto the rim */
export const INLET: Vec3 = [160, 0, 0];
/** where a sheet lies in the bin: its front edge, just inside the front wall */
export const BED: Vec3 = [128, 0, D / 2 - WALL - 3 - LEAF];
/** how far back from its front edge a sheet may lie in the bin */
export const DEEP = BED[2] + D / 2 - WALL - 4;
/** the content's front window: a band of paper rises in it for each page landed, the pile's edge */
export const GAUGE: { at: Vec3; size: Vec3 } = { at: [106, 0, D / 2 + 1], size: [108, 32, 1] };

export interface Piece {
  shape: Shape;
  material: number;
  at: Vec3;
  size: Vec3;
  /** radians round x, then y, then z */
  turn?: Vec3;
  /** its own solid, inked round; else one with the body it sits on */
  solid?: boolean;
  looks?: Look[];
  dressed?: Partial<Record<Look, number>>;
  plate?: boolean;
  /** the window's band for page `band`, each over the window's bottom, the lower in front */
  band?: number;
}

interface Module {
  layer: Layer;
  height: number;
  pieces: Piece[];
}

function plate(y = 0): Piece {
  return {
    shape: 'box',
    material: MATERIAL.ink,
    at: [PLATE.x, y, PLATE.z - 1],
    size: [PLATE.w, PLATE.h, 2],
    solid: true,
    plate: true,
  };
}

function display({ at, size }: Screen): Piece[] {
  return [
    {
      shape: 'box',
      material: MATERIAL.grey,
      at: [at[0], at[1], at[2] - 1.5],
      size: [size[0] + 6, size[1] + 6, 2],
      solid: true,
    },
    {
      shape: 'box',
      material: MATERIAL.ink,
      at: [at[0], at[1], at[2] - 0.25],
      size: [size[0], size[1], 0.5],
    },
  ];
}

function posts(height: number): Piece[] {
  const out: Piece[] = [];
  for (const x of [-W / 2 + 22, W / 2 - 22]) {
    for (const z of [-D / 2 + 20, D / 2 - 20]) {
      out.push({
        shape: 'cylinder',
        material: MATERIAL.grey,
        at: [x, -height / 2 - GAP / 2, z],
        size: [10, GAP, 10],
        solid: true,
      });
    }
  }
  return out;
}

function ui(): Module {
  const height = 186;
  const { at, size } = DISPLAYS.ui;
  const knobs = -height / 2 + 8 + PLATE.h / 2;
  const pieces: Piece[] = [
    { shape: 'box', material: MATERIAL.paper, at: [0, 0, 0], size: [W, height, D] },
    {
      shape: 'box',
      material: MATERIAL.ink,
      at: [0, at[1], D / 2 + 1],
      size: [size[0] + 12, size[1] + 12, 2],
      solid: true,
    },
    { shape: 'box', material: MATERIAL.paper, at: [0, at[1], at[2] - 0.5], size: [...size, 1] },
    plate(knobs),
    {
      shape: 'cylinder',
      material: MATERIAL.ink,
      at: [118, knobs, D / 2 + 3],
      size: [18, 6, 18],
      turn: FACING,
      solid: true,
    },
    {
      shape: 'cylinder',
      material: MATERIAL.paper,
      at: [146, knobs, D / 2 + 2.5],
      size: [13, 5, 13],
      turn: FACING,
      solid: true,
    },
    {
      shape: 'sphere',
      material: MATERIAL.accent,
      at: [170, knobs, D / 2 + 1],
      size: [9, 9, 9],
      solid: true,
    },
  ];
  for (let i = 0; i < 9; i++) {
    pieces.push({
      shape: 'box',
      material: MATERIAL.ink,
      at: [-128 + i * 32, height / 2 + 0.5, -6],
      size: [14, 1, D - 50],
    });
  }
  return { layer: 'ui', height, pieces: [...pieces, ...posts(height)] };
}

function core(): Module {
  const height = 72;
  const pieces: Piece[] = [
    { shape: 'box', material: MATERIAL.ink, at: [0, 0, 0], size: [W, height, D] },
    plate(),
    ...display(DISPLAYS.core),
  ];
  // proud of the case on every face it shows, so neither face wins by a rounding
  for (const x of [-W / 2 + 6, W / 2 - 13.5]) {
    pieces.push({
      shape: 'box',
      material: MATERIAL.hazard,
      at: [x, 0, 0.5],
      size: [x < 0 ? 12 : 29, height + 1, D + 1],
      solid: true,
    });
  }
  return { layer: 'core', height, pieces: [...pieces, ...posts(height)] };
}

function content(): Module {
  const height = 60;
  const pieces: Piece[] = [
    {
      shape: 'box',
      material: MATERIAL.paper,
      at: [0, -WELL / 2, 0],
      size: [W - 2 * WALL, height - WELL, D - 2 * WALL],
    },
    plate(),
    { shape: 'box', material: MATERIAL.ink, at: [106, 0, D / 2 + 0.5], size: [112, 36, 1] },
    {
      shape: 'sphere',
      material: MATERIAL.accent,
      at: [W / 2 - 14, 14, D / 2 + 1],
      size: [8, 8, 8],
      solid: true,
    },
  ];
  for (let band = 0; band < 3; band++) {
    pieces.push({ shape: 'box', material: MATERIAL.paper, at: GAUGE.at, size: GAUGE.size, band });
  }
  for (const side of [-1, 1]) {
    pieces.push(
      {
        shape: 'box',
        material: MATERIAL.paper,
        at: [0, 0, side * (D / 2 - WALL / 2)],
        size: [W, height, WALL],
      },
      {
        shape: 'box',
        material: MATERIAL.paper,
        at: [side * (W / 2 - WALL / 2), 0, 0],
        size: [WALL, height, D - 2 * WALL],
      },
    );
  }
  return { layer: 'content', height, pieces: [...pieces, ...posts(height)] };
}

const FOLD = 14;
/** a page as a sheet, upright, CSS px of its card round its middle: its corner folded on a file, an
 * icon on a CMS page, and its two lines where the card has them */
function sheet(): Piece[] {
  const pieces: Piece[] = [
    {
      shape: 'box',
      material: MATERIAL.paper,
      at: [0, -FOLD / 2, 0],
      size: [CARD[0], CARD[1] - FOLD, LEAF],
    },
    {
      shape: 'box',
      material: MATERIAL.paper,
      at: [-FOLD / 2, CARD[1] / 2 - FOLD / 2, 0],
      size: [CARD[0] - FOLD, FOLD, LEAF],
    },
    {
      shape: 'box',
      material: MATERIAL.paper,
      at: [CARD[0] / 2 - FOLD / 2, CARD[1] / 2 - FOLD / 2, 0],
      size: [FOLD, FOLD, LEAF],
      looks: ['blocks'],
    },
    {
      shape: 'box',
      material: MATERIAL.grey,
      at: [CARD[0] / 2 - (3 * FOLD) / 4, CARD[1] / 2 - (3 * FOLD) / 4, 0],
      size: [FOLD * Math.SQRT2, FOLD / Math.SQRT2, LEAF - 1],
      turn: [0, 0, -Math.PI / 4],
      looks: ['files'],
    },
    {
      shape: 'box',
      material: MATERIAL.accent,
      at: [-CARD[0] / 2 + 15, CARD[1] / 2 - 15, LEAF / 2 + 0.5],
      size: [12, 12, 1],
      looks: ['blocks'],
    },
  ];
  // a line is as thin as a face's edge, so its paper draws all ink
  for (const [look, top] of [
    ['files', 33],
    ['blocks', 53],
  ] as const) {
    for (const [n, width] of [78, 65].entries()) {
      pieces.push({
        shape: 'box',
        material: MATERIAL.paper,
        at: [(width - 78) / 2, CARD[1] / 2 - top - 0.5 - 9 * n, LEAF / 2 + 0.5],
        size: [width, 1, 1],
        looks: [look],
      });
    }
  }
  return pieces;
}

export const SHEET = sheet();

function framework(): Module {
  const height = 64;
  const pieces: Piece[] = [
    {
      shape: 'box',
      material: MATERIAL.ink,
      at: [0, 0, 0],
      size: [W, height, D],
      dressed: CASES,
    },
    plate(),
    ...display(DISPLAYS.framework),
    {
      shape: 'cylinder',
      material: MATERIAL.accent,
      at: [W / 2 - 24, 13, D / 2 + 2],
      size: [12, 4, 12],
      turn: FACING,
      solid: true,
    },
    {
      shape: 'box',
      material: MATERIAL.paper,
      at: [W / 2 - 24, -11, D / 2 + 2],
      size: [12, 18, 4],
      solid: true,
    },
  ];
  for (const x of [-W / 2 + 30, W / 2 - 30]) {
    for (const z of [-D / 2 + 24, D / 2 - 24]) {
      pieces.push({
        shape: 'box',
        material: MATERIAL.ink,
        at: [x, -height / 2 - FEET / 2, z],
        size: [36, FEET, 28],
        solid: true,
      });
    }
  }
  return { layer: 'framework', height, pieces };
}

export const MODULES: Module[] = [framework(), content(), core(), ui()];

export const PLACES: number[] = (() => {
  const out: number[] = [];
  let y = DOCK[1] + FEET;
  for (const module of MODULES) {
    out.push(y + module.height / 2);
    y += module.height + GAP;
  }
  return out;
})();

export const STACK = PLACES[PLACES.length - 1] + MODULES[MODULES.length - 1].height / 2;

export const SHOULDER: [number, number] = [-510, 150];
export const BOOM = 236;
export const FOREARM = 200;
export const TOOL = 46;
const FOOT = 80;
export const RAM_FOOT: Vec3 = [SHOULDER[0] - 62, 80, 30];
export const RAM_HEAD: [number, number] = [82, 22];

export const BASE: Piece[] = [
  { shape: 'box', material: MATERIAL.paper, at: [0, DOCK[1] / 2, 0], size: DOCK },
  ...[-1, 1].map((side): Piece => ({
    shape: 'box',
    material: MATERIAL.ink,
    at: [side * (W / 2 + 6), DOCK[1] + 0.5, D / 2 + 6],
    size: [16, 1, 8],
  })),
  {
    shape: 'box',
    material: MATERIAL.hazard,
    at: [SHOULDER[0], 7, 0],
    size: [2 * FOOT, 14, 2 * FOOT],
  },
  { shape: 'box', material: MATERIAL.paper, at: [SHOULDER[0], 36, 0], size: [150, 44, 150] },
  {
    shape: 'cylinder',
    material: MATERIAL.grey,
    at: [SHOULDER[0], 66, 0],
    size: [124, 16, 124],
    solid: true,
  },
  {
    shape: 'box',
    material: MATERIAL.paper,
    at: [SHOULDER[0], 106, -34],
    size: [68, 70, 10],
    solid: true,
  },
  {
    shape: 'box',
    material: MATERIAL.paper,
    at: [SHOULDER[0], 106, 34],
    size: [68, 70, 10],
    solid: true,
  },
  {
    shape: 'box',
    material: MATERIAL.ink,
    at: [RAM_FOOT[0], RAM_FOOT[1] - 4, RAM_FOOT[2]],
    size: [16, 14, 14],
    solid: true,
  },
  ...[54, 18, -18].map((x): Piece => ({
    shape: 'prism',
    material: MATERIAL.ink,
    at: [SHOULDER[0] + x, 36, 76.5],
    size: [9, 3, 9],
    turn: FACING,
    solid: true,
  })),
  {
    shape: 'sphere',
    material: MATERIAL.accent,
    at: [SHOULDER[0] - 54, 36, 76],
    size: [10, 10, 10],
    solid: true,
  },
];

export const BOOM_PIECES: Piece[] = [
  { shape: 'cylinder', material: MATERIAL.grey, at: [0, 0, 0], size: [62, 88, 62], turn: FACING },
  {
    shape: 'cylinder',
    material: MATERIAL.accent,
    at: [0, 0, 45],
    size: [32, 3, 32],
    turn: FACING,
    solid: true,
  },
  { shape: 'box', material: MATERIAL.paper, at: [BOOM / 2, 0, 0], size: [BOOM, 36, 42] },
  ...[0.36, 0.6, 0.82].map((t): Piece => ({
    shape: 'cylinder',
    material: MATERIAL.ink,
    at: [BOOM * t, 0, 21.5],
    size: [15, 1, 15],
    turn: FACING,
  })),
  { shape: 'box', material: MATERIAL.ink, at: [-50, 0, 0], size: [56, 60, 50], solid: true },
  { shape: 'box', material: MATERIAL.hazard, at: [-50, 0, 25.5], size: [56, 15, 1] },
];

export const FOREARM_PIECES: Piece[] = [
  { shape: 'cylinder', material: MATERIAL.grey, at: [0, 0, 0], size: [48, 60, 48], turn: FACING },
  {
    shape: 'cylinder',
    material: MATERIAL.accent,
    at: [0, 0, 31],
    size: [26, 3, 26],
    turn: FACING,
    solid: true,
  },
  { shape: 'box', material: MATERIAL.paper, at: [FOREARM / 2, 0, 0], size: [FOREARM, 28, 32] },
  {
    shape: 'box',
    material: MATERIAL.ink,
    at: [FOREARM / 2 + 6, 0, 16.5],
    size: [FOREARM - 64, 6, 1],
  },
];

export const TOOL_PIECES: Piece[] = [
  { shape: 'cylinder', material: MATERIAL.grey, at: [0, 0, 0], size: [34, 42, 34], turn: FACING },
  { shape: 'box', material: MATERIAL.paper, at: [20, 0, 0], size: [26, 28, 38], solid: true },
  { shape: 'box', material: MATERIAL.ink, at: [TOOL - 3, 0, 0], size: [6, 46, 60], solid: true },
  {
    shape: 'cylinder',
    material: MATERIAL.ink,
    at: [18, 21, 12],
    size: [5, 18, 5],
    solid: true,
  },
];

export const RAM_PIECES: Piece[] = [
  { shape: 'cylinder', material: MATERIAL.ink, at: [0, 0, 0], size: [1, 1, 1], solid: true },
  { shape: 'cylinder', material: MATERIAL.ink, at: [0, 0, 0], size: [1, 1, 1], solid: true },
];

/** the boom's and forearm's angles that put the pad's face at `pad`, the elbow up */
export function reach(pad: readonly [number, number], out: [number, number]): [number, number] {
  const tx = pad[0] - TOOL - SHOULDER[0];
  const ty = pad[1] - SHOULDER[1];
  const d = Math.min(
    Math.max(Math.hypot(tx, ty), Math.abs(BOOM - FOREARM) + 1),
    BOOM + FOREARM - 1,
  );
  const toward = Math.atan2(ty, tx);
  const inner = Math.acos((BOOM * BOOM + d * d - FOREARM * FOREARM) / (2 * BOOM * d));
  const boom = toward + inner;
  const ex = Math.cos(boom) * BOOM;
  const ey = Math.sin(boom) * BOOM;
  out[0] = boom;
  out[1] = Math.atan2(ty - ey, tx - ex);
  return out;
}

export const FLOOR: Piece = {
  shape: 'box',
  material: MATERIAL.floor,
  at: [0, -0.5, 0],
  size: [2400, 1, 600],
};
export const BOUNDS: [Vec3, Vec3] = [
  [SHOULDER[0] - FOOT - 40, -1, -D / 2 - 120],
  [W / 2 + 60, STACK + 20, D / 2 + 40],
];

export const LIGHT: Vec3 = [0.2, 0.86, 0.47];

/** a unit back goes this far right and up: the 2:1 of a pixel line */
export const DEPTH: [number, number] = [0.447, 0.224];

export interface View {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const FRONT = -DEPTH[1] * (DOCK[2] / 2) - 2;

export const REST: [number, number] = [-250, 418];

/** the least the core and the UI lift as the content swaps: room for a page to fall in */
export const RACK = 130;

const TOP = STACK + RACK + DEPTH[1] * (D / 2) + 2;
/** from 768px the whole machine; on phones from just past the pedestal, the arm over the edge */
export const VIEWS: Record<'wide' | 'phone', View> = {
  wide: {
    left: SHOULDER[0] - FOOT - DEPTH[0] * FOOT - 2,
    right: DOCK[0] / 2 + DEPTH[0] * (DOCK[2] / 2) + 2,
    top: TOP,
    bottom: FRONT,
  },
  phone: { left: SHOULDER[0] + FOOT + DEPTH[0] * FOOT + 2, right: 300, top: TOP, bottom: FRONT },
};
