import { DITHER_MASKS, ditherKeyframes } from '../../lib/dither';
import { idle } from '../../lib/later';
import { TICK } from '../../lib/motion';
import { onTheme } from '../../lib/theme';
import {
  DEMOS,
  type DemoId,
  FRAME,
  LAYOUTS,
  type LayoutId,
  SHARED_ARGS,
  STORY_ARGS,
  type TabId,
  type ThemeId,
} from './data';
import type { InkTable } from './presets';

/** ms a story gets to land after a navigation in place, before its frame loads it in full */
const FALLBACK = 2500;
/** a screen or a theme prints in over 2 ticks, through a dither of 3px cells */
const PRINT = 2 * TICK;
const CELL = 3;
/** a narrower screen shows the layouts at a phone's width */
const PHONE_MAX = 480;
const PHONE_W = 390;
/** a wider one at this many times its own width, a desktop's at most */
const ZOOM_OUT = 2.2;

let KEYFRAMES = '@keyframes lp-print{';
for (let i = 0; i <= 16; i++) KEYFRAMES += `${(i / 16) * 100}%{mask-image:${DITHER_MASKS[i]}}`;
KEYFRAMES += '}';

function ditherIn(element: HTMLElement): Animation | undefined {
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
    return element.animate(ditherKeyframes(CELL), { duration: PRINT });
}

/**
 * A preset's CSS as `@import 'fumadocs-ui/css/<theme>.css'` gives it to the frame, a page of this
 * site; `still` frames never fade, the dither is the transition.
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
  // this site's section colour on `body` and neutral's sidebar rule are reset; it never scrolls
  return `:root{${light}}.dark{${dark}}
:root body{--color-fd-primary:inherit}
.dark #nd-sidebar{--color-fd-muted:inherit;--color-fd-secondary:inherit;--color-fd-muted-foreground:inherit}
html{overflow:hidden}
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
  if (!doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches)
    return update();
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

/**
 * A hands-on demo, a 1:1 frame of `/story/demo/<tab>`: hidden until its page has loaded in the
 * theme, so it never shows the page's own colours first.
 */
function createDemo(box: HTMLElement, table: InkTable, tab: DemoId, onReady: () => void) {
  const frame = document.createElement('iframe');
  frame.src = `/story/demo/${tab}`;
  frame.title = DEMOS[tab].title;
  frame.setAttribute('scrolling', 'no');
  frame.className = 'absolute inset-0 size-full border-0 bg-transparent';
  frame.style.visibility = 'hidden';
  box.append(frame);
  let doc: Document | null = null;
  let theme: ThemeId | null = null;
  let inked: ThemeId | null = null;

  function apply() {
    if (!doc || !theme || (inked === theme && theme !== 'shadcn')) return;
    adopt(doc, inkCss(table, theme, frame, false));
    inked = theme;
  }

  function onLoad() {
    const first = !doc;
    doc = frame.contentDocument;
    inked = null;
    apply();
    frame.style.visibility = '';
    if (first) onReady();
  }
  frame.addEventListener('load', onLoad);
  const stopTheme = onTheme(() => {
    if (theme === 'shadcn') apply();
  });

  return {
    /** `print` dithers the theme in over the one it wore */
    ink(next: ThemeId, print: boolean) {
      const same = theme === null || theme === next;
      theme = next;
      if (same || !print || !doc) apply();
      else printIn(doc, CELL, apply);
    },
    destroy() {
      stopTheme();
      frame.removeEventListener('load', onLoad);
      frame.remove();
    },
  };
}

interface Slot {
  frame: HTMLIFrameElement;
  wrapper: HTMLElement;
  layout?: LayoutId;
  /** its layout rendered, and a load waiting for that */
  ready?: boolean;
  waiting?: boolean;
  /** the story's document, kept while the story navigates in place */
  doc?: Document;
  /** the preset it should wear, and the one it wears */
  theme?: ThemeId;
  inked?: ThemeId;
  fallback?: number;
  /** cancels the other layouts' prefetch while it waits for the reader to pause */
  prefetch?: () => void;
}

/**
 * The monitor's screens. The layout on screen stays until the other frame has the next one
 * rendered in the theme, then that one prints in over it. A frame moves to the next story through
 * the story's router, in full only when that doesn't land. A demo's frame is made when first asked
 * for and kept, so it comes back as it was left.
 */
export function createFrames(root: HTMLElement, table: InkTable, onBusy: (busy: boolean) => void) {
  const boxes = new Map<TabId, HTMLElement>();
  for (const box of root.querySelectorAll<HTMLElement>('[data-screen]'))
    boxes.set(box.dataset.screen as TabId, box);
  const screen = boxes.get('layouts')!;
  const live = screen.querySelector<HTMLElement>('[data-live]')!;
  const demos = new Map<DemoId, ReturnType<typeof createDemo>>();
  const ready = new Set<TabId>();
  const slots: Slot[] = [];
  let current: TabId = 'layouts';
  let theme: ThemeId | null = null;
  let want: { layout: LayoutId; theme: ThemeId; instant: boolean } | null = null;
  let loading = false;
  /** the slot on screen, -1 while the blueprint shows */
  let front = -1;
  let scale = 1;
  let swap: Animation | undefined;

  function setLoading(next: boolean) {
    loading = next;
    if (current === 'layouts') onBusy(loading);
  }

  function demo(tab: DemoId) {
    let instance = demos.get(tab);
    if (instance) return instance;
    const box = boxes.get(tab)!;
    instance = createDemo(box, table, tab, () => {
      ready.add(tab);
      if (current !== tab) return;
      onBusy(false);
      ditherIn(box);
    });
    if (theme) instance.ink(theme, false);
    demos.set(tab, instance);
    return instance;
  }

  function reveal(tab: TabId) {
    for (const [key, box] of boxes) box.style.visibility = key === tab ? '' : 'hidden';
    if (tab === 'layouts' || ready.has(tab)) ditherIn(boxes.get(tab)!);
  }

  function fit(frame: HTMLIFrameElement) {
    const width =
      screen.clientWidth < PHONE_MAX
        ? PHONE_W
        : Math.min(FRAME.w, Math.round(screen.clientWidth * ZOOM_OUT));
    scale = screen.clientWidth / width || 1;
    frame.width = String(width);
    frame.height = String(Math.round(screen.clientHeight / scale));
    frame.style.transform = `scale(${scale})`;
  }

  function create() {
    for (let i = 0; i < 2; i++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'absolute inset-0 overflow-hidden';
      wrapper.style.visibility = 'hidden';
      const frame = document.createElement('iframe');
      frame.title = 'Live layout';
      frame.setAttribute('aria-hidden', 'true');
      frame.setAttribute('scrolling', 'no');
      frame.tabIndex = -1;
      frame.inert = true;
      frame.className = 'pointer-events-none origin-top-left border-0 bg-transparent';
      fit(frame);
      // Chrome latches a wheel to an iframe under the pointer even with `pointer-events: none`
      const shield = document.createElement('div');
      shield.className = 'pointer-events-auto absolute inset-0';
      wrapper.append(frame, shield);
      live.append(wrapper);
      slots.push({ frame, wrapper });
    }
    window.addEventListener('message', onMessage);
    sync();
  }

  /** the slot prints in over the one on screen, which hides once it is covered */
  function bringIn(index: number) {
    const before = front;
    front = index;
    swap?.finish();
    const { wrapper } = slots[index];
    wrapper.style.visibility = 'visible';
    wrapper.style.zIndex = '2';
    if (before >= 0) slots[before].wrapper.style.zIndex = '1';
    const covered = () => {
      if (before >= 0 && before !== index && front === index)
        slots[before].wrapper.style.visibility = 'hidden';
    };
    const animation = ditherIn(wrapper);
    if (!animation) return covered();
    swap = animation;
    animation.onfinish = () => {
      if (swap === animation) swap = undefined;
      covered();
    };
  }

  function sync() {
    if (!slots.length || !want) return;
    const { layout, theme, instant } = want;
    if (front >= 0 && slots[front].layout === layout && slots[front].ready) {
      setLoading(false);
      return print(slots[front], theme, instant);
    }
    // the slot off screen takes the next layout; before any is on screen, the one that has it
    const index = front >= 0 ? 1 - front : slots[1].layout === layout ? 1 : 0;
    const slot = slots[index];
    ink(slot, theme);
    if (slot.layout === layout && slot.ready) {
      setLoading(false);
      return bringIn(index);
    }
    setLoading(true);
    if (slot.layout === layout && slot.waiting) return;
    slot.layout = layout;
    slot.ready = false;
    slot.waiting = true;
    navigate(slot, layout);
  }

  /** a full load, replacing the frame's history entry so the back button leaves the page */
  function reload(slot: Slot, url: string) {
    const win = slot.frame.contentWindow;
    slot.doc = undefined;
    if (win && win.location.href !== 'about:blank') win.location.replace(url);
    else slot.frame.src = url;
  }

  function navigate(slot: Slot, layout: LayoutId) {
    const url = `/story/${layout}`;
    const win = slot.frame.contentWindow;
    clearTimeout(slot.fallback);
    if (!win || !slot.doc || slot.doc !== win.document) return reload(slot, url);
    // the story keeps its arguments across navigations: the ones every layout takes let the next
    // one render as it lands, its own follow once it is ready
    win.postMessage({ type: 'fumadocs-story:args', args: SHARED_ARGS }, location.origin);
    win.postMessage({ type: 'fumadocs-story:navigate', href: url }, location.origin);
    slot.fallback = window.setTimeout(() => reload(slot, url), FALLBACK);
  }

  function onMessage(e: MessageEvent) {
    if (e.origin !== location.origin || e.data?.type !== 'fumadocs-story:ready') return;
    const slot = slots.find((item) => item.frame.contentWindow === e.source);
    const layout = slot?.layout;
    if (!slot || !layout) return;
    const win = e.source as Window & typeof globalThis;
    // a story that isn't the one asked for lost a race with the newer navigation
    if (win.location.pathname !== `/story/${layout}`) return navigate(slot, layout);
    clearTimeout(slot.fallback);
    if (slot.doc !== win.document) {
      slot.doc = win.document;
      slot.inked = undefined;
      // a story arrives sooner when the router has it, and its code loads on this main thread
      slot.prefetch?.();
      slot.prefetch = idle(() => {
        for (const item of LAYOUTS) {
          if (item.id !== layout)
            win.postMessage(
              { type: 'fumadocs-story:prefetch', href: `/story/${item.id}` },
              location.origin,
            );
        }
      });
    }
    win.postMessage({ type: 'fumadocs-story:args', args: STORY_ARGS[layout] }, location.origin);
    apply(slot);

    // the layout is a lazy component: wait for its root, rendered with these arguments
    const root = LAYOUTS.find((item) => item.id === layout)!.root;
    let frames = 0;
    const poll = () => {
      if (slot.layout !== layout || !slot.waiting) return;
      const element = win.document.querySelector(root);
      if (frames > 1 && element && element.getBoundingClientRect().height > 0) {
        slot.ready = true;
        slot.waiting = false;
        apply(slot);
        if (want?.layout === layout && slot !== slots[front]) sync();
      } else if (frames++ < 600) requestAnimationFrame(poll);
      else slot.waiting = false;
    };
    requestAnimationFrame(poll);
  }

  function ink(slot: Slot, theme: ThemeId) {
    slot.theme = theme;
    apply(slot);
  }

  /** a theme prints in over the layout on screen, at once while the dial turns */
  function print(slot: Slot, theme: ThemeId, instant: boolean) {
    const same = slot.inked === theme && theme !== 'shadcn';
    if (same || instant || !slot.doc || !slot.ready) return ink(slot, theme);
    printIn(slot.doc, CELL / scale, () => ink(slot, theme));
  }

  /** shadcn borrows this page's palette, so it inks again */
  function apply(slot: Slot) {
    const { doc, theme } = slot;
    if (!doc || !theme || (slot.inked === theme && theme !== 'shadcn')) return;
    adopt(doc, inkCss(table, theme, slot.frame, true));
    slot.inked = theme;
  }

  const resize = new ResizeObserver(() => {
    for (const slot of slots) fit(slot.frame);
  });
  // the frames load pages of this site on this main thread: near, once the reader pauses
  let pending: (() => void) | undefined;
  const near = new IntersectionObserver(
    ([entry]) => {
      pending?.();
      pending = entry.isIntersecting && !slots.length ? idle(create) : undefined;
    },
    { rootMargin: '100% 0px' },
  );
  resize.observe(screen);
  near.observe(screen);
  const stopTheme = onTheme(() => {
    for (const slot of slots) if (slot.theme === 'shadcn') ink(slot, 'shadcn');
  });

  return {
    show(tab: TabId, layout: LayoutId, next: ThemeId, instant: boolean) {
      theme = next;
      const switched = tab !== current;
      current = tab;
      if (tab === 'layouts') {
        want = { layout, theme: next, instant };
        sync();
        onBusy(loading);
      } else {
        demo(tab).ink(next, !instant);
        onBusy(!ready.has(tab));
      }
      // the demos off screen take the theme at once
      for (const [key, instance] of demos) if (key !== tab) instance.ink(next, false);
      if (switched) reveal(tab);
    },
    /** the reader is about to open a demo */
    preload(tab: TabId) {
      if (tab !== 'layouts') demo(tab);
    },
    destroy() {
      pending?.();
      resize.disconnect();
      near.disconnect();
      stopTheme();
      swap?.cancel();
      window.removeEventListener('message', onMessage);
      for (const slot of slots) {
        clearTimeout(slot.fallback);
        slot.prefetch?.();
        slot.waiting = false;
      }
      live.replaceChildren();
      for (const instance of demos.values()) instance.destroy();
    },
  };
}

export type Frames = ReturnType<typeof createFrames>;
