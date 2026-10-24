/** 120 bpm, graphic beats (pops, flashes, stagger) snap to sixteenths */
export const BEAT = 500;
export const TICK = BEAT / 4;

/** the one easing for things that move: a long exponential settle */
export const settle = [0.16, 1, 0.3, 1] as const;
export const settleCss = 'cubic-bezier(0.16, 1, 0.3, 1)';

/** symmetric curve for camera moves (stage pans and zooms) */
export const camera = [0.65, 0, 0.35, 1] as const;
