/** runs a figure's setup in a task of its own, out of the page's hydration; returns its cleanup */
export function later(setup: () => (() => void) | undefined): () => void {
  let cleanup: (() => void) | undefined;
  const timer = window.setTimeout(() => {
    cleanup = setup();
  });
  return () => {
    clearTimeout(timer);
    cleanup?.();
  };
}

/** ms without a scroll event before the page counts as still */
const STILL = 150;

/**
 * Runs `task` once the page is still and the main thread idle, for work too heavy for a frame of
 * a scroll (another page in a frame, its prefetches); returns its cancel.
 */
export function idle(task: () => void): () => void {
  let timer = 0;
  let callback = 0;
  // Safari has no idle callbacks: a task of its own instead
  function cancel() {
    clearTimeout(timer);
    if (window.cancelIdleCallback) window.cancelIdleCallback(callback);
    else clearTimeout(callback);
  }
  function wait() {
    cancel();
    timer = window.setTimeout(() => {
      if (window.requestIdleCallback) callback = window.requestIdleCallback(run);
      else callback = window.setTimeout(run);
    }, STILL);
  }
  function run() {
    removeEventListener('scroll', wait);
    task();
  }
  addEventListener('scroll', wait, { passive: true });
  wait();
  return () => {
    cancel();
    removeEventListener('scroll', wait);
  };
}
