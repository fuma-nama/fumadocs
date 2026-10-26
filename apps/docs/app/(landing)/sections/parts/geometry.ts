import { LAYERS } from './data';

/**
 * The stack in its own units (px of the page on top): four trays of the same footprint with a gap
 * between them, a frame down their left side, the ground shadow under them. The camera is
 * orthographic, like a drawing, so a pose scales its bounds evenly and the first frame can fit
 * the stack to its box in CSS alone.
 */
export interface Scene {
  /** the page on top, the footprint of every tray */
  width: number;
  height: number;
  /** height of a tray's front */
  tray: number;
  /** between two trays at rest */
  gap: number;
  /** thickness of the frame down the left side */
  frame: number;
  /** how far a tray slides out toward the reader */
  pull: number;
  /** the camera at rest, degrees */
  pitch: number;
  yaw: number;
}

/** from a phone's width up to a tablet's, with the page at a phone's width on top */
export const NARROW: Scene = {
  width: 420,
  height: 520,
  tray: 72,
  gap: 40,
  frame: 22,
  pull: 185,
  pitch: 56,
  yaw: -13,
};

export const WIDE: Scene = {
  width: 969,
  height: 520,
  tray: 72,
  gap: 52,
  frame: 26,
  pull: 148,
  pitch: 46,
  yaw: -17,
};

/**
 * The part of the pull the camera keeps room for at rest: all of it beside the panel, where the
 * canvas has height to spare; a quarter above the panel, so no blank band sits between the stack
 * and the keys, and the camera eases back while a tray is out instead.
 */
export function roomOf(beside: boolean): number {
  return beside ? 1 : 0.25;
}

/** the shadow on the ground, offset from the footprint */
export const SHADOW = { x: -34, y: 26 } as const;

export interface Pose {
  pitch: number;
  yaw: number;
  /** 0 the trays touch, 1 they stand `gap` apart */
  spread: number;
  /** the part of the pull the camera keeps in view, 0 to 1 */
  reach: number;
}

/** z of the stack's bottom: the page is at 0 and the trays go down */
function bottomZ(scene: Scene, spread: number): number {
  return -LAYERS.length * scene.tray - (LAYERS.length - 1) * scene.gap * spread;
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The box the stack takes on the screen at scale 1, about the page's centre: frame, shadow and a
 * tray out included. The frame and the shadow come in with the first quarter of the turn, so the
 * box grows from the page's without a jump.
 */
function boundsOf(scene: Scene, pose: Pose): Bounds {
  const pitch = (pose.pitch * Math.PI) / 180;
  const yaw = (pose.yaw * Math.PI) / 180;
  const bottom = bottomZ(scene, pose.spread);
  const front = scene.height + scene.pull * pose.reach;
  const comes = Math.min(1, (pose.pitch / scene.pitch) * 4);
  const left = -scene.frame * comes;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  function add(x: number, y: number, z: number) {
    const px = x - scene.width / 2;
    const py = y - scene.height / 2;
    const sx = px * Math.cos(yaw) - py * Math.sin(yaw);
    const sy = (px * Math.sin(yaw) + py * Math.cos(yaw)) * Math.cos(pitch) - z * Math.sin(pitch);
    if (sx < x0) x0 = sx;
    if (sx > x1) x1 = sx;
    if (sy < y0) y0 = sy;
    if (sy > y1) y1 = sy;
  }
  for (let i = 0; i < 8; i++)
    add(i & 1 ? scene.width : left, i & 2 ? front : 0, i & 4 ? bottom : 0);
  for (let i = 0; i < 4; i++) {
    const x = SHADOW.x * comes + (i & 1 ? scene.width : 0);
    add(x, SHADOW.y * comes + (i & 2 ? scene.height : 0), bottom);
  }
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

export const FLAT: Pose = { pitch: 0, yaw: 0, spread: 0, reach: 0 };

export function restOf(scene: Scene, room: number): Pose {
  return { pitch: scene.pitch, yaw: scene.yaw, spread: 1, reach: room };
}

/** the camera as one CSS transform, its scale and centre given in px or CSS lengths */
function cameraCss(
  scene: Scene,
  pose: Pose,
  view: { x: string; y: string; scale: string },
): string {
  return `translate3d(${view.x}, ${view.y}, 0) rotateX(${pose.pitch}deg) rotateZ(${pose.yaw}deg) scale3d(${view.scale}, ${view.scale}, ${view.scale}) translate3d(${-scene.width / 2}px, ${-scene.height / 2}px, 0)`;
}

export interface Fit {
  box: Bounds;
  /** the scale that fits the box in the canvas */
  scale: number;
}

/** `pose` fit to a canvas of `width` by `height` px */
export function fitOf(scene: Scene, pose: Pose, width: number, height: number): Fit {
  const box = boundsOf(scene, pose);
  return { box, scale: Math.min(width / box.width, height / box.height) };
}

/**
 * The camera for `pose` at `fit`, centred across, the stack's top `top` px below the canvas' top:
 * the stack's top is the page's far edge in every pose.
 */
export function cameraAt(scene: Scene, pose: Pose, fit: Fit, width: number, top: number): string {
  return cameraCss(scene, pose, {
    x: `${width / 2 - (fit.box.x + fit.box.width / 2) * fit.scale}px`,
    y: `${top - fit.box.y * fit.scale}px`,
    scale: String(fit.scale),
  });
}

/** the canvas' aspect ratio: the stack's box at rest, which the rest pose fills */
export function aspectOf(scene: Scene, room: number): string {
  const box = boundsOf(scene, restOf(scene, room));
  return `${box.width} / ${box.height}`;
}

/**
 * `pose` in CSS alone, for the first frame before any JS: fit to the canvas from container units,
 * centred or with its top on the canvas' top
 */
export function poseCss(scene: Scene, pose: Pose, centred: boolean): string {
  const box = boundsOf(scene, pose);
  const scale = `min(tan(atan2(100cqw, ${box.width}px)), tan(atan2(100cqh, ${box.height}px)))`;
  return cameraCss(scene, pose, {
    x: `calc(50cqw - ${box.x + box.width / 2}px * ${scale})`,
    y: centred
      ? `calc(50cqh - ${box.y + box.height / 2}px * ${scale})`
      : `calc(${-box.y}px * ${scale})`,
    scale,
  });
}
