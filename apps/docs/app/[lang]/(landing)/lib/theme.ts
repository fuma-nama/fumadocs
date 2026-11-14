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

/** a computed CSS colour, `#rgb`, `#rrggbb`, `#rrggbbaa` or `rgb(r g b / a)`, as 0-1 channels */
export function cssRgb(value: string): [r: number, g: number, b: number] {
  const text = value.trim();
  if (text.startsWith('#')) {
    const hex = text.length < 6 ? text.slice(1).replace(/./g, '$&$&') : text.slice(1);
    const n = (i: number) => Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return [n(0), n(2), n(4)];
  }
  // a token read while the page that defines it unmounts is empty
  const [r = 0, g = 0, b = 0] = (text.match(/[\d.]+/g) ?? []).map(Number);
  return [r / 255, g / 255, b / 255];
}
