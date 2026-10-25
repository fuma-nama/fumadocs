/** ms the pointer rests on a target, or lingers on it while still moving, before it counts */
const REST = 120;
const LINGER = 320;

interface Intent<T> {
  /** the pointer moved over `target`, `null` when it is over none */
  move: (target: T | null) => void;
  cancel: () => void;
}

/**
 * Hover intent: a target counts once the pointer comes to rest on it, or lingers on it; a sweep
 * across many counts none of them.
 */
export function createIntent<T>(commit: (target: T) => void): Intent<T> {
  let current: T | null = null;
  let counted = false;
  let rest = 0;
  let linger = 0;

  function fire() {
    clearTimeout(rest);
    clearTimeout(linger);
    if (current === null || counted) return;
    counted = true;
    commit(current);
  }

  return {
    move(target) {
      if (target !== current) {
        clearTimeout(linger);
        current = target;
        counted = false;
        if (target !== null) linger = window.setTimeout(fire, LINGER);
      }
      clearTimeout(rest);
      if (target !== null && !counted) rest = window.setTimeout(fire, REST);
    },
    cancel() {
      clearTimeout(rest);
      clearTimeout(linger);
      current = null;
    },
  };
}
