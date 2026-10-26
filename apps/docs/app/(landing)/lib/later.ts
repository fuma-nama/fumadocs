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

/** runs `task` once `element` comes on screen, by `init`'s terms; returns its cancel */
export function whenSeen(
  element: Element,
  task: () => void,
  init?: IntersectionObserverInit,
): () => void {
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    task();
  }, init);
  observer.observe(element);
  return () => observer.disconnect();
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
  function cancel() {
    clearTimeout(timer);
    if (window.cancelIdleCallback) window.cancelIdleCallback(callback);
    else clearTimeout(callback);
  }
  function wait() {
    cancel();
    timer = window.setTimeout(() => {
      // Safari has no idle callbacks: a task of its own instead
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
