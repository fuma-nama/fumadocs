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
