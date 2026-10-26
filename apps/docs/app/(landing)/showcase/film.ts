import { clamp } from '../lib/math';

/**
 * The projector's deck, drawn in its own units: 640 wide, y down from the viewer's bottom edge.
 * The deck scales with its column, so every part keeps its place at any width.
 */
export const W = 640;
export const H = 164;

/** the strip's centre line and band, a frame, and the pitch from frame to frame (4 perforations) */
export const STRIP_Y = 78;
export const BAND = 48;
export const FRAME_W = 63;
export const FRAME_H = 33;
export const PITCH = 72;
/** where the strip shows, between the drums' light traps; the gate holds the frame in its middle */
export const TRACK_LEFT = 136;
export const TRACK_RIGHT = 504;
export const GATE = (TRACK_LEFT + TRACK_RIGHT) / 2;

/** the drums the reels turn in, and the radius of film wound on a reel: empty to full */
export const DRUM_R = 56;
export const DRUMS = { take: [68, STRIP_Y], feed: [572, STRIP_Y] } as const;
const HUB = 12;
export const FULL = 44;

/** the Geneva drive under the gate: its wheel, the driver beside it, their centre distance */
export const GENEVA_C = 30;
/** the crank's radius, the slots' reach: for 4 slots, both are the centre distance over √2 */
export const CRANK = GENEVA_C / Math.SQRT2;
export const LOCK = 14;
export const WHEEL = [GATE - 26, 136] as const;
export const DRIVER = [WHEEL[0] + GENEVA_C, WHEEL[1]] as const;

/** the motor's pulley, belted to the driver's, and the gauge of its speed on top of it */
export const MOTOR = [GATE + 72, 138] as const;
export const PULLEY = 5;
export const DRIVER_PULLEY = 7.5;
export const GAUGE = [MOTOR[0] + 39, MOTOR[1] - 13.5] as const;
/** the needle's angle from upright when the motor stands, and its sweep to flat out */
export const NEEDLE_REST = -70;
export const NEEDLE_SWEEP = 140;

/** idler rollers under the strip, by the light traps */
export const ROLLER = 8;
export const ROLLERS = [
  [TRACK_LEFT + 22, STRIP_Y + BAND / 2 + ROLLER],
  [TRACK_RIGHT - 22, STRIP_Y + BAND / 2 + ROLLER],
] as const;

/** the dancer arm: a spring holds its roller on the strip's top edge */
export const DANCER = { pivot: [TRACK_LEFT + 30, 34] as const, length: 34, rest: 24, roller: 6 };

/** the slots' engagement: a quarter turn of the driver either side of the line of centres */
const ENGAGE = Math.PI / 4;

/**
 * The Geneva drive's wheel for a driver angle `alpha` within one turn, 0 when the pin points at
 * the wheel: how far the strip has moved, 0 to 1 frame, and the wheel's turn in degrees, 0 to -90.
 * The pin enters a slot at -45°, turns the wheel a quarter, leaves at 45°; the rest of the turn the
 * driver's locking disc holds the wheel still.
 */
function geneva(alpha: number): { progress: number; turn: number } {
  if (alpha <= -ENGAGE) return { progress: 0, turn: 0 };
  if (alpha >= ENGAGE) return { progress: 1, turn: -90 };
  const slot = Math.atan2(-CRANK * Math.sin(alpha), GENEVA_C - CRANK * Math.cos(alpha));
  const progress = (Math.PI / 4 - slot) / (Math.PI / 2);
  return { progress, turn: -90 * progress };
}

/**
 * Where the strip stands for a total driver angle: whole frames from the turns completed, plus the
 * part of the current engagement. The driver rests with its pin away from the wheel, at -π + 2πn,
 * frame n in the gate.
 */
export function framesAt(alpha: number): number {
  const turn = Math.round(alpha / (2 * Math.PI));
  return turn + geneva(alpha - turn * 2 * Math.PI).progress;
}

/** the driver angle at rest with frame `n` in the gate */
export function restAt(n: number): number {
  return -Math.PI + n * 2 * Math.PI;
}

/** blank frames of leader at each end of the reel */
export const LEADER = 3;

/** the radius of film on a reel holding `share` of the reel, the area of film kept */
function wound(share: number): number {
  return Math.sqrt(HUB * HUB + clamp(share) * (FULL * FULL - HUB * HUB));
}

/** the film wound on the take-up and the feed reel, as radii, with frame `position` in the gate */
export function reels(position: number, count: number): [take: number, feed: number] {
  const taken = (position + LEADER) / (count + LEADER * 2);
  return [wound(taken), wound(1 - taken)];
}
