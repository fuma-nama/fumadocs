/** fixed physics step (s) of the springs and the cables: the same motion at any frame rate */
export const STEP = 1 / 120;

/**
 * Springs for things that move under the pointer: each value chases its target with a stiffness
 * and a damping (per second), stepped at a fixed rate so the motion is the same at any frame rate.
 */
export interface Springs {
  value: Float64Array;
  velocity: Float64Array;
  target: Float64Array;
}

export function createSprings(count: number, initial = 0): Springs {
  return {
    value: new Float64Array(count).fill(initial),
    velocity: new Float64Array(count),
    target: new Float64Array(count).fill(initial),
  };
}

/** one step of `dt` s; returns how far from rest the springs are */
export function stepSprings(s: Springs, dt: number, stiffness: number, damping: number): number {
  let energy = 0;
  for (let i = 0; i < s.value.length; i++) {
    const a = -stiffness * (s.value[i] - s.target[i]) - damping * s.velocity[i];
    s.velocity[i] += a * dt;
    s.value[i] += s.velocity[i] * dt;
    energy = Math.max(energy, Math.abs(s.value[i] - s.target[i]), Math.abs(s.velocity[i]) * dt);
  }
  return energy;
}

/** jump to the targets, for reduced motion */
export function settleSprings(s: Springs) {
  s.value.set(s.target);
  s.velocity.fill(0);
}

/** a fixed-step motion's last frame time (0 before its first frame) and time not yet stepped */
interface Clock {
  last: number;
  acc: number;
}

/**
 * The fixed steps due at the frame time `now`. A frame shorter than a step (a 120 Hz screen) gets
 * none, so it settles nothing either.
 */
export function due(clock: Clock, now: number): number {
  clock.acc += clock.last === 0 ? STEP : Math.min(0.05, (now - clock.last) / 1000);
  clock.last = now;
  let steps = 0;
  while (clock.acc >= STEP) {
    clock.acc -= STEP;
    steps++;
  }
  return steps;
}
