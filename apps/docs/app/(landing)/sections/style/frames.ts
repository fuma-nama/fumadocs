import { DITHER_MASKS, ditherKeyframes } from '../../lib/dither';
import { TICK } from '../../lib/motion';
import { onTheme } from '../../lib/theme';
import { DEMOS, FRAME, type LayoutId, STORY_ARGS, type TabId, type ThemeId } from './data';
import type { InkTable } from './presets';

/** a page or a theme prints in over 2 ticks, through a dither of 3px cells */
const PRINT = 2 * TICK;
const CELL = 3;
const STORY = '/story/';
const DEMO = '/story/demo/';

let KEYFRAMES = '@keyframes lp-print{';
for (let i = 0; i <= 16; i++) KEYFRAMES += `${(i / 16) * 100}%{mask-image:${DITHER_MASKS[i]}}`;
KEYFRAMES += '}';

/**
 * A preset's CSS as `@import 'fumadocs-ui/css/<theme>.css'` gives it to the frame, a page of this
 * site; a layout story is `still`, the dither is its only transition.
 */
function inkCss(table: InkTable, theme: ThemeId, frame: Element, still: boolean): string {
  const ink = table.inks[theme];
  let light = '';
  let dark = '';
  if (theme === 'shadcn') {
    // shadcn's preset reads your own variables, the ones its values name: this page's stand in
    const style = getComputedStyle(frame);
    for (const value of ink.light) {
      if (!value.startsWith('var(--')) continue;
      const name = value.slice(6, -1);
      light += `--${name}:${style.getPropertyValue(`--color-fd-${name}`).trim()};`;
    }
    light +=
      '--sidebar:var(--card);--sidebar-foreground:var(--foreground);--sidebar-border:var(--border);--sidebar-accent:var(--accent);--sidebar-accent-foreground:var(--accent-foreground);--sidebar-ring:var(--ring);--sidebar-primary-foreground:var(--primary-foreground);';
  }
  for (let i = 0; i < table.tokens.length; i++) {
    light += `--color-fd-${table.tokens[i]}:${ink.light[i]};`;
    dark += `--color-fd-${table.tokens[i]}:${ink.dark[i]};`;
  }
  // this site's section colour on `body` and neutral's sidebar rule are reset; it never scrolls,
  // so it keeps no gutter for a scrollbar either
  return `:root{${light}}.dark{${dark}}
:root body{--color-fd-primary:inherit}
.dark #nd-sidebar{--color-fd-muted:inherit;--color-fd-secondary:inherit;--color-fd-muted-foreground:inherit}
html{overflow:hidden;scrollbar-gutter:auto}
${still ? '*,::before,::after{transition:none!important}' : ''}
nextjs-portal{display:none}
html[data-lp-print]::view-transition-old(root),html[data-lp-print]::view-transition-new(root){animation:none;mix-blend-mode:normal}
html[data-lp-print]::view-transition-new(root){animation:lp-print var(--lp-print-ms) steps(8,end) both;mask-size:var(--lp-print-size) var(--lp-print-size)}
${KEYFRAMES}
${ink.rules}`;
}

/** each document's own sheet: it stays when the story navigates in place */
const sheets = new WeakMap<Document, CSSStyleSheet>();

function adopt(doc: Document, css: string) {
  let sheet = sheets.get(doc);
  if (!sheet) {
    const win = doc.defaultView as (Window & typeof globalThis) | null;
    if (!win) return;
    sheet = new win.CSSStyleSheet();
    doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet];
    sheets.set(doc, sheet);
  }
  sheet.replaceSync(css);
}

let prints = 0;

/** `update` in a view transition of `doc` that prints the new look in, in `cell` px cells */
function printIn(doc: Document, cell: number, update: () => void) {
  if (!doc.startViewTransition) return update();
  const root = doc.documentElement;
  // the newest print holds the attribute until it ends
  const id = String(++prints);
  root.style.setProperty('--lp-print-ms', `${PRINT}ms`);
  root.style.setProperty('--lp-print-size', `${cell * 4}px`);
  root.dataset.lpPrint = id;
  const transition = doc.startViewTransition(update);
  transition.ready.catch(() => {});
  transition.finished
    .catch(() => {})
    .finally(() => {
      if (root.dataset.lpPrint === id) delete root.dataset.lpPrint;
    });
}

interface View {
  tab: TabId;
  layout: LayoutId;
  theme: ThemeId;
  /** the theme goes on at once, without the print: while the dial turns */
  instant: boolean;
}

/** the page of this site a view shows: a layout's story, or a demo */
function pathOf({ tab, layout }: View): string {
  return tab === 'layouts' ? `${STORY}${layout}` : `${DEMO}${tab}`;
}

/**
 * The screen's one frame, made when the screen comes into view and kept: loading its page again each
 * time the reader came back cost a phone a whole app.
 * It shows the view's page once that has rendered in the theme, dithered in over the screen; until
 * then the screen shows the layout's plan. A layout story moves to the next layout in place, through
 * the story's router; anything else loads in full.
 */
export function createFrames(
  screen: HTMLElement,
  table: InkTable,
  onBusy: (busy: boolean) => void,
) {
  const live = screen.querySelector<HTMLElement>('[data-live]')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let view: View | null = null;
  let frame: HTMLIFrameElement | null = null;
  // Chrome latches a wheel to an iframe under the pointer, even an inert one
  let shield: HTMLElement | null = null;
  let visible = false;
  /** the page on screen, rendered and inked, and the one the frame is on its way to */
  let shown: string | null = null;
  let going: string | null = null;
  /** the story in the frame takes navigations */
  let listening = false;
  let inked: ThemeId | null = null;
  let scale = 1;

  function fit() {
    if (!frame) return;
    const { clientWidth: w, clientHeight: h } = screen;
    // the screen's own ratio, before a short window caps it: a landscape one shows a desktop's
    // viewport, a portrait one a phone's at its own size
    const [x, y] = getComputedStyle(screen).aspectRatio.split('/');
    const width = Number.parseFloat(x) > Number.parseFloat(y) ? FRAME.w : w;
    scale = w / width;
    frame.width = String(width);
    frame.height = String(Math.round(h / scale));
    frame.style.transform = `scale(${scale})`;
  }

  function post(message: object) {
    frame?.contentWindow?.postMessage(message, location.origin);
  }

  function create() {
    frame = document.createElement('iframe');
    frame.setAttribute('scrolling', 'no');
    frame.className = 'absolute top-0 left-0 origin-top-left border-0 bg-transparent';
    frame.addEventListener('load', onLoad);
    shield = document.createElement('div');
    shield.className = 'absolute inset-0';
    fit();
    sync();
    live.append(frame, shield);
  }

  function release() {
    if (going) onBusy(false);
    frame?.remove();
    shield?.remove();
    frame = shield = null;
    shown = going = inked = null;
    listening = false;
    live.style.visibility = '';
  }

  /** sets the frame on its way to the view's page, hidden until that has rendered */
  function sync() {
    if (!frame || !view) return;
    const path = pathOf(view);
    if (shown === path) return ink(!view.instant);
    if (going === path) return;
    going = path;
    shown = null;
    live.style.visibility = '';
    onBusy(true);
    const { tab } = view;
    const still = tab === 'layouts';
    frame.title = tab === 'layouts' ? 'Live layout' : DEMOS[tab];
    frame.inert = still;
    shield!.hidden = !still;
    if (listening && still) {
      // the next story's arguments travel with it, so it renders as it lands
      post({ type: 'fumadocs-story:navigate', href: path, args: STORY_ARGS[view.layout] });
    } else if (frame.src) {
      listening = false;
      inked = null;
      // in place of the frame's entry, so the back button leaves the page
      frame.contentWindow!.location.replace(path);
    } else frame.src = path;
  }

  /** the page the frame was on its way to has rendered: it dithers in */
  function arrive() {
    shown = going;
    going = null;
    ink(false);
    live.style.visibility = 'visible';
    if (!reduce.matches) live.animate(ditherKeyframes(CELL), { duration: PRINT });
    onBusy(false);
  }

  /** the view's theme on the page on screen; `print` dithers it in over the one it wore */
  function ink(print: boolean) {
    const doc = frame?.contentDocument;
    if (!doc || !view || !shown || (inked === view.theme && inked !== 'shadcn')) return;
    const css = inkCss(table, view.theme, frame!, !shown.startsWith(DEMO));
    const apply = () => adopt(doc, css);
    if (print && inked !== null && !reduce.matches) printIn(doc, CELL / scale, apply);
    else apply();
    inked = view.theme;
  }

  /** a demo is rendered on the server: it has rendered once it loads */
  function onLoad() {
    const path = frame?.contentWindow?.location.pathname;
    if (path === going && path.startsWith(DEMO)) arrive();
  }

  function onMessage(e: MessageEvent) {
    if (!frame || e.source !== frame.contentWindow || e.origin !== location.origin) return;
    const { type, path } = e.data ?? {};
    if (path !== going) return;
    if (type === 'fumadocs-story:ready' && !listening) {
      listening = true;
      post({ type: 'fumadocs-story:args', args: STORY_ARGS[path.slice(STORY.length) as LayoutId] });
    } else if (type === 'fumadocs-story:rendered') arrive();
  }

  const resize = new ResizeObserver(fit);
  const near = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible && !frame && view) create();
  });
  resize.observe(screen);
  near.observe(screen);
  window.addEventListener('message', onMessage);
  // shadcn borrows this page's palette, so it inks again with the page's theme
  const stopTheme = onTheme(() => {
    if (view?.theme !== 'shadcn') return;
    inked = null;
    ink(false);
  });

  return {
    show(next: View) {
      view = next;
      if (visible && !frame) create();
      else sync();
    },
    destroy() {
      release();
      resize.disconnect();
      near.disconnect();
      window.removeEventListener('message', onMessage);
      stopTheme();
    },
  };
}

export type Frames = ReturnType<typeof createFrames>;
