import type { Layer } from '../../ui/spec';

/** the page, the top face of the block: real sidebar and TOC widths, in CSS px */
export const PAGE = { width: 969, height: 500 } as const;

/** the drawers top down, the page is the top of the first; the framework is the base */
export const DRAWERS: Layer[] = ['ui', 'core', 'content', 'framework'];
/** height of each drawer's front */
export const TIERS: Record<Layer, number> = { ui: 72, core: 72, content: 72, framework: 56 };
/** how far a drawer comes out toward the reader when it is swapped */
export const PULL = 150;

/** distance of the eye from the canvas, CSS `perspective` */
export const PERSPECTIVE = 2600;

/** KF1, the plan: the room the labels take around the page, in page px */
export const MARGIN = { left: 204, top: 64, right: 168, bottom: 8 } as const;

export interface Pose {
  /** canvas px of the page's centre */
  x: number;
  y: number;
  /** tilt back and turn, degrees */
  pitch: number;
  yaw: number;
  scale: number;
}

type Vec3 = readonly [x: number, y: number, z: number];

export interface Size {
  width: number;
  height: number;
}

interface Box extends Size {
  x: number;
  y: number;
}

/** z of a drawer's top face: the page is at 0 and the block goes down */
export function drawerZ(index: number) {
  let z = 0;
  for (let i = 0; i < index; i++) z -= TIERS[DRAWERS[i]];
  return z;
}

export const DEPTH = -drawerZ(DRAWERS.length);

/** the camera as one CSS transform, the same functions in every pose so they interpolate */
export function cameraTransform({ x, y, pitch, yaw, scale }: Pose): string {
  return `translate3d(${x}px, ${y}px, 0) rotateX(${pitch}deg) rotateZ(${yaw}deg) scale3d(${scale}, ${scale}, ${scale}) translate3d(${-PAGE.width / 2}px, ${-PAGE.height / 2}px, 0)`;
}

/** where a point of the block (page px, z toward the reader) lands on the canvas */
function project(canvas: Size, pose: Pose, [px, py, pz]: Vec3): [number, number] {
  const a = (pose.pitch * Math.PI) / 180;
  const b = (pose.yaw * Math.PI) / 180;
  const sx = (px - PAGE.width / 2) * pose.scale;
  const sy = (py - PAGE.height / 2) * pose.scale;
  const sz = pz * pose.scale;
  const rx = sx * Math.cos(b) - sy * Math.sin(b);
  const ry = sx * Math.sin(b) + sy * Math.cos(b);
  const ty = ry * Math.cos(a) - sz * Math.sin(a);
  const tz = ry * Math.sin(a) + sz * Math.cos(a);
  // CSS perspective from the canvas centre
  const ox = canvas.width / 2;
  const oy = canvas.height / 2;
  const w = 1 - tz / PERSPECTIVE;
  return [ox + (pose.x + rx - ox) / w, oy + (pose.y + ty - oy) / w];
}

/** the page and its labels' margins */
export const PLAN = {
  width: MARGIN.left + PAGE.width + MARGIN.right,
  height: MARGIN.top + PAGE.height + MARGIN.bottom,
} as const;

/** KF1, the plan: the page and its labels straight on, as large as the canvas allows, at most 1 */
export function planPose(canvas: Size): Pose {
  const scale = Math.min(1, canvas.width / PLAN.width, canvas.height / PLAN.height);
  return {
    x: canvas.width / 2 + ((MARGIN.left - MARGIN.right) / 2) * scale,
    y: canvas.height / 2 + ((MARGIN.top - MARGIN.bottom) / 2) * scale,
    pitch: 0,
    yaw: 0,
    scale,
  };
}

/** the plan's camera in CSS from the canvas' container units: the first frame, before any JS */
export function planTransformCss(): string {
  const k = `min(1, tan(atan2(100cqw, ${PLAN.width}px)), tan(atan2(100cqh, ${PLAN.height}px)))`;
  const x = `calc(50cqw + ${(MARGIN.left - MARGIN.right) / 2}px * ${k})`;
  const y = `calc(50cqh + ${(MARGIN.top - MARGIN.bottom) / 2}px * ${k})`;
  return `translate3d(${x}, ${y}, 0) rotateX(0deg) rotateZ(0deg) scale3d(${k}, ${k}, ${k}) translate3d(${-PAGE.width / 2}px, ${-PAGE.height / 2}px, 0)`;
}

/** the shadow of the block on the ground, offset from its footprint */
export const SHADOW = { x: -28, y: 20 } as const;

/** the corners of the block with a drawer out, and of its shadow */
const CORNERS: Vec3[] = [];
for (const z of [0, -DEPTH])
  for (const x of [0, PAGE.width]) for (const y of [0, PAGE.height + PULL]) CORNERS.push([x, y, z]);
for (const x of [SHADOW.x, PAGE.width + SHADOW.x])
  for (const y of [SHADOW.y, PAGE.height + SHADOW.y]) CORNERS.push([x, y, -DEPTH]);

/** the box the block takes on the canvas, its shadow and a drawer out included */
export function blockBounds(canvas: Size, pose: Pose) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const corner of CORNERS) {
    const [x, y] = project(canvas, pose, corner);
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return [x0, y0, x1, y1] as const;
}

/**
 * The block from the front left and above, as large as it fits in `box`; `pitch` tilts it further
 * back to face its fronts.
 */
export function blockPose(canvas: Size, box: Box, pitch = 56): Pose {
  const pose: Pose = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
    pitch,
    yaw: -20,
    scale: 1,
  };
  let lo = 0.1;
  let hi = 1.2;
  for (let i = 0; i < 24; i++) {
    pose.scale = (lo + hi) / 2;
    const [x0, y0, x1, y1] = blockBounds(canvas, pose);
    if (x1 - x0 > box.width || y1 - y0 > box.height) hi = pose.scale;
    else lo = pose.scale;
  }
  pose.scale = lo;
  // centre it, twice: perspective moves the bounds a little with the position
  for (let i = 0; i < 2; i++) {
    const [x0, y0, x1, y1] = blockBounds(canvas, pose);
    pose.x += box.x + box.width / 2 - (x0 + x1) / 2;
    pose.y += box.y + box.height / 2 - (y0 + y1) / 2;
  }
  return pose;
}

export function mixPose(a: Pose, b: Pose, k: number): Pose {
  return {
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
    pitch: a.pitch + (b.pitch - a.pitch) * k,
    yaw: a.yaw + (b.yaw - a.yaw) * k,
    scale: a.scale + (b.scale - a.scale) * k,
  };
}
