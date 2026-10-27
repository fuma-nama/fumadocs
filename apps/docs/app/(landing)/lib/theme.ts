/** the page shows its dark theme */
export function isDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

const callbacks = new Set<() => void>();
let observer: MutationObserver | undefined;

/** calls `callback` when the page's theme may have changed (`<html>`'s class); returns its stop */
export function onTheme(callback: () => void): () => void {
  if (!observer) {
    observer = new MutationObserver(() => {
      for (const fn of callbacks) fn();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
  callbacks.add(callback);
  return () => {
    callbacks.delete(callback);
  };
}
