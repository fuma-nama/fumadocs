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
