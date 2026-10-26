import { DITHER_MASKS } from '../../lib/bayer';
import { idle } from '../../lib/later';
import { LAYOUTS, SHARED_ARGS, STORY_ARGS, type LayoutId, type ThemeId } from './data';
import type { InkTable } from './presets';

/** ms a story gets to land after a navigation in place, before the frame loads it in full */
const FALLBACK = 2500;

/** a frame of `/story/<layout>`, inked with a preset */
interface Slot {
  frame: HTMLIFrameElement;
  /** the layout asked for, whether it landed in the frame, and whether it rendered */
  layout: LayoutId | null;
  landed: boolean;
  ready: boolean;
  /** the story's document: it navigates in place and keeps the preset's sheet across stories */
  doc: Document | null;
  sheet: CSSStyleSheet | null;
  /** the preset it should wear, and the one it wears */
  theme: ThemeId | null;
  inked: ThemeId | null;
  settle: ((ok: boolean) => void) | null;
  pending: Promise<boolean> | null;
  fallback: number;
  /** the dither print running in the frame */
  printing: number;
  /** cancels the other layouts' prefetch while it waits for the reader to pause */
  prefetch: (() => void) | null;
}

export interface Frames {
  slots: Slot[];
  /** resolves `false` when the slot was given another layout before this one rendered */
  load: (slot: Slot, layout: LayoutId) => Promise<boolean>;
  /** wear a preset at once */
  ink: (slot: Slot, theme: ThemeId) => void;
  /**
   * Wear a preset, the new look dithering in over `ms` (a view transition inside the frame);
   * `cell` is a dither cell in frame px. A newer one prints at once, over the one printing; with
   * no `ms`, or no view transitions, it inks at once.
   */
  print: (slot: Slot, theme: ThemeId, ms: number, cell: number) => void;
  destroy: () => void;
}

/** the ordered dither as a CSS animation of the frame's view transition */
let PRINT = '@keyframes lp-print{';
for (let i = 0; i <= 16; i++) PRINT += `${(i / 16) * 100}%{mask-image:${DITHER_MASKS[i]}}`;
PRINT += '}';

const SHADCN_VARS = [
  'background',
  'foreground',
  'muted',
  'muted-foreground',
  'popover',
  'popover-foreground',
  'card',
  'card-foreground',
  'border',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'accent',
  'accent-foreground',
  'ring',
];

/** the shadcn preset adopts your theme variables, this page's palette stands in for them */
export function pageTheme(element: Element): string {
  const style = getComputedStyle(element);
  let vars = '';
  for (const name of SHADCN_VARS)
    vars += `--${name}:${style.getPropertyValue(`--color-fd-${name}`).trim()};`;
  return `${vars}--sidebar:var(--card);--sidebar-foreground:var(--foreground);--sidebar-border:var(--border);--sidebar-accent:var(--accent);--sidebar-accent-foreground:var(--accent-foreground);--sidebar-ring:var(--ring);--sidebar-primary-foreground:var(--primary-foreground);`;
}

/**
 * The CSS of a preset as the frame would get it from `@import 'fumadocs-ui/css/<theme>.css'`;
 * `still` frames are pictures, nothing in them fades (the dither is the transition).
 */
export function inkCss(
  { tokens, inks }: InkTable,
  theme: ThemeId,
  own: string,
  still = true,
): string {
  const ink = inks[theme];
  let light = '';
  let dark = '';
  for (let i = 0; i < tokens.length; i++) {
    light += `--color-fd-${tokens[i]}:${ink.light[i]};`;
    dark += `--color-fd-${tokens[i]}:${ink.dark[i]};`;
  }
  // the frame is a page of this site: reset its section colour on `body` and neutral's sidebar rule;
  // it never scrolls, the dev overlay stays out
  return `:root{${own}${light}}.dark{${dark}}
:root body{--color-fd-primary:inherit}
.dark #nd-sidebar{--color-fd-muted:inherit;--color-fd-secondary:inherit;--color-fd-muted-foreground:inherit}
html{overflow:hidden}
${still ? '*,::before,::after{transition:none!important}' : ''}
nextjs-portal{display:none}
html[data-lp-print]::view-transition-old(root),html[data-lp-print]::view-transition-new(root){animation:none;mix-blend-mode:normal}
html[data-lp-print]::view-transition-new(root){animation:lp-print var(--lp-print-ms) steps(8,end) both;mask-size:var(--lp-print-size) var(--lp-print-size)}
${PRINT}
${ink.rules}`;
}

function emptySlot(frame: HTMLIFrameElement): Slot {
  return {
    frame,
    layout: null,
    landed: false,
    ready: false,
    doc: null,
    sheet: null,
    theme: null,
    inked: null,
    settle: null,
    pending: null,
    fallback: 0,
    printing: 0,
    prefetch: null,
  };
}

/**
 * Same-origin frames of `/story/<layout>`. A frame with a story up moves to the next one in place
 * through the story page's router, loading it in full only when that doesn't land. A frame is a
 * page of this site and shares its storage, its light/dark mode follows the page on its own.
 */
export function createFrames(table: InkTable, elements: HTMLIFrameElement[]): Frames {
  const slots = elements.map(emptySlot);

  /** load the story in full, the frame's history entry replaced so the back button leaves the page */
  function reload(slot: Slot, url: string) {
    const win = slot.frame.contentWindow;
    slot.doc = null;
    if (win && win.location.href !== 'about:blank') win.location.replace(url);
    else slot.frame.src = url;
  }

  function navigate(slot: Slot, layout: LayoutId) {
    const url = `/story/${layout}`;
    const win = slot.frame.contentWindow;
    clearTimeout(slot.fallback);
    slot.landed = false;
    if (!win || !slot.doc || slot.doc !== win.document) return reload(slot, url);
    // the story keeps its arguments across navigations: the ones every layout takes let the next
    // one render as the navigation lands, its own follow once it is ready
    win.postMessage({ type: 'fumadocs-story:args', args: SHARED_ARGS }, location.origin);
    win.postMessage({ type: 'fumadocs-story:navigate', href: url }, location.origin);
    slot.fallback = window.setTimeout(() => {
      if (slot.layout === layout && !slot.landed) reload(slot, url);
    }, FALLBACK);
  }

  function onMessage(e: MessageEvent) {
    if (e.origin !== location.origin || e.data?.type !== 'fumadocs-story:ready') return;
    const slot = slots.find((item) => item.frame.contentWindow === e.source);
    const layout = slot?.layout;
    if (!slot || !layout) return;
    const win = e.source as Window & typeof globalThis;
    // a story that isn't the one asked for lost a race with the newer navigation
    if (win.location.pathname !== `/story/${layout}`) return navigate(slot, layout);
    slot.landed = true;
    if (slot.doc !== win.document) {
      slot.doc = win.document;
      slot.sheet = null;
      slot.inked = null;
      // a story arrives sooner when the router has it already; its code loads on this main
      // thread, once the reader pauses
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

    // the layout is a lazy component, wait for its root element, rendered with these arguments
    const root = LAYOUTS.find((item) => item.id === layout)!.root;
    let frames = 0;
    const poll = () => {
      if (slot.layout !== layout || !slot.settle) return;
      const element = win.document.querySelector(root);
      if (frames > 1 && element && element.getBoundingClientRect().height > 0) {
        slot.ready = true;
        clearTimeout(slot.fallback);
        apply(slot);
        done(slot, true);
      } else if (frames++ < 600) requestAnimationFrame(poll);
      else done(slot, false);
    };
    requestAnimationFrame(poll);
  }

  function done(slot: Slot, ok: boolean) {
    const settle = slot.settle;
    slot.settle = null;
    slot.pending = null;
    settle?.(ok);
  }

  function load(slot: Slot, layout: LayoutId): Promise<boolean> {
    if (slot.layout === layout && slot.ready) return Promise.resolve(true);
    if (slot.layout === layout && slot.pending) return slot.pending;
    done(slot, false);
    slot.layout = layout;
    slot.ready = false;
    slot.pending = new Promise((resolve) => {
      slot.settle = resolve;
    });
    navigate(slot, layout);
    return slot.pending;
  }

  function ink(slot: Slot, theme: ThemeId) {
    slot.theme = theme;
    apply(slot);
  }

  function print(slot: Slot, theme: ThemeId, ms: number, cell: number) {
    const doc = slot.doc;
    const same = slot.inked === theme && theme !== 'shadcn';
    if (same || ms <= 0 || !doc || !slot.ready || !doc.startViewTransition) {
      ink(slot, theme);
      return;
    }
    const root = doc.documentElement;
    const id = ++slot.printing;
    root.style.setProperty('--lp-print-ms', `${ms}ms`);
    root.style.setProperty('--lp-print-size', `${cell * 4}px`);
    root.dataset.lpPrint = '';
    const transition = doc.startViewTransition(() => ink(slot, theme));
    transition.ready.catch(() => {});
    transition.finished
      .catch(() => {})
      .finally(() => {
        if (slot.printing === id) delete root.dataset.lpPrint;
      });
  }

  /** the wanted preset; shadcn borrows this page's palette, so it inks again */
  function apply(slot: Slot) {
    const doc = slot.doc;
    const theme = slot.theme;
    if (!doc || !theme || (slot.inked === theme && theme !== 'shadcn')) return;
    if (!slot.sheet) {
      const win = doc.defaultView as (Window & typeof globalThis) | null;
      if (!win) return;
      slot.sheet = new win.CSSStyleSheet();
      doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, slot.sheet];
    }
    slot.sheet.replaceSync(inkCss(table, theme, theme === 'shadcn' ? pageTheme(slot.frame) : ''));
    slot.inked = theme;
  }

  window.addEventListener('message', onMessage);
  return {
    slots,
    load,
    ink,
    print,
    destroy() {
      window.removeEventListener('message', onMessage);
      for (const slot of slots) {
        clearTimeout(slot.fallback);
        slot.prefetch?.();
        done(slot, false);
      }
    },
  };
}
