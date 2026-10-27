/** runs `task` once `element` comes on screen, by `init`'s terms; returns its cancel */
export function whenSeen(
  element: Element,
  task: () => void,
  init?: IntersectionObserverInit,
): () => void {
  // the first record reports any overlap, not only one past the threshold
  const least = typeof init?.threshold === 'number' ? init.threshold : 0;
  const observer = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    if (!entry.isIntersecting || entry.intersectionRatio < least) return;
    observer.disconnect();
    task();
  }, init);
  observer.observe(element);
  return () => observer.disconnect();
}
