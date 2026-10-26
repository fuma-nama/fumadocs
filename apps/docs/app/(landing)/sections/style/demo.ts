import { TICK } from '../../lib/motion';
import { ditherKeyframes } from '../../ui/dither';
import type { ThemeId } from './data';
import { inkCss, pageTheme } from './frames';
import type { InkTable } from './presets';

/** a new theme dithers in over the old one, a cell 3px on screen */
const PRINT = 2 * TICK;
const CELL = 3;

export interface Demo {
  /** the frame wears the theme; `print` dithers it in over the one it wore */
  ink: (theme: ThemeId, print: boolean) => void;
  /** dither the demo in over what is on screen */
  show: () => void;
  destroy: () => void;
}

/**
 * A hands-on demo: a 1:1 frame of `/story/demo/<name>` in `box`. It stays hidden until its page
 * has loaded and wears the theme, so it never shows the page's own colours first.
 */
export function createDemo(
  box: HTMLElement,
  table: InkTable,
  name: string,
  title: string,
  onReady: () => void,
): Demo {
  const frame = document.createElement('iframe');
  frame.src = `/story/demo/${name}`;
  frame.title = title;
  frame.setAttribute('scrolling', 'no');
  frame.className = 'absolute inset-0 size-full border-0 bg-transparent';
  frame.style.visibility = 'hidden';
  box.append(frame);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let sheet: CSSStyleSheet | null = null;
  let doc: Document | null = null;
  let theme: ThemeId | null = null;
  let ready = false;
  let printing = 0;

  function apply() {
    const win = doc?.defaultView as (Window & typeof globalThis) | null | undefined;
    if (!doc || !win || !theme) return;
    if (!sheet) {
      sheet = new win.CSSStyleSheet();
      doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet];
    }
    sheet.replaceSync(inkCss(table, theme, theme === 'shadcn' ? pageTheme(frame) : '', false));
  }

  function onLoad() {
    doc = frame.contentDocument;
    sheet = null;
    apply();
    frame.style.visibility = '';
    if (!ready) {
      ready = true;
      onReady();
    }
  }
  frame.addEventListener('load', onLoad);

  // shadcn takes this page's palette, the demo inks again when the page's theme changes
  const mode = new MutationObserver(() => {
    if (theme === 'shadcn') apply();
  });
  mode.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  return {
    ink(next, print) {
      const same = theme === null || theme === next;
      theme = next;
      const root = doc?.documentElement;
      if (same || !print || !doc || !root || !doc.startViewTransition || reduce.matches)
        return apply();
      const id = ++printing;
      root.style.setProperty('--lp-print-ms', `${PRINT}ms`);
      root.style.setProperty('--lp-print-size', `${CELL * 4}px`);
      root.dataset.lpPrint = '';
      const transition = doc.startViewTransition(apply);
      transition.ready.catch(() => {});
      transition.finished
        .catch(() => {})
        .finally(() => {
          if (printing === id) delete root.dataset.lpPrint;
        });
    },
    show() {
      if (reduce.matches) return;
      box.animate(ditherKeyframes(CELL), { duration: PRINT });
    },
    destroy() {
      mode.disconnect();
      frame.removeEventListener('load', onLoad);
      frame.remove();
    },
  };
}
