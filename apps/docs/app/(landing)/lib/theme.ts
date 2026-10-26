/** the page shows its dark theme */
export function isDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

/** calls `callback` when the page's theme may have changed (`<html>`'s class); returns its stop */
export function onTheme(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}
