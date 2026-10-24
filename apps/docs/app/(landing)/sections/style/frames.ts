import { DITHER_MASKS } from '../../lib/bayer';
import { LAYOUTS, STORY_ARGS, type LayoutId, type ThemeId } from './data';
import type { InkTable } from './presets';

/** a frame of `/story/<layout>`, inked with a preset */
export interface Slot {
  frame: HTMLIFrameElement;
  layout: LayoutId | null;
  /** the preset and extra CSS it should wear, and the ones it wears */
  theme: ThemeId | null;
  extra: string;
  inked: string | null;
  /** the layout rendered */
  ready: boolean;
  pending: Promise<boolean> | null;
  settle: ((ok: boolean) => void) | null;
  sheet: CSSStyleSheet | null;
}

export interface Frames {
  slots: Slot[];
  /** resolves `false` when the slot was given another layout before this one rendered */
  load: (slot: Slot, layout: LayoutId) => Promise<boolean>;
  /** wear a preset, and `extra` CSS like an edit of your copy would */
  ink: (slot: Slot, theme: ThemeId, extra?: string) => void;
  /**
   * Wear a preset in place, the new look dithering in over `ms` (a view transition inside the
   * frame); `cell` is the size of a dither cell in frame px. Instant without view transitions; one
   * asked for while another dithers prints next.
   */
  reink: (slot: Slot, theme: ThemeId, extra: string, ms: number, cell: number) => void;
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
function pageTheme(element: Element): string {
  const style = getComputedStyle(element);
  let vars = '';
  for (const name of SHADCN_VARS)
    vars += `--${name}:${style.getPropertyValue(`--color-fd-${name}`).trim()};`;
  return `${vars}--sidebar:var(--card);--sidebar-foreground:var(--foreground);--sidebar-border:var(--border);--sidebar-accent:var(--accent);--sidebar-accent-foreground:var(--accent-foreground);--sidebar-ring:var(--ring);--sidebar-primary-foreground:var(--primary-foreground);`;
}

/** the CSS of a preset as the frame would get it from `@import 'fumadocs-ui/css/<theme>.css'` */
function inkCss({ tokens, inks }: InkTable, theme: ThemeId, own: string): string {
  const ink = inks[theme];
  let light = '';
  let dark = '';
  for (let i = 0; i < tokens.length; i++) {
    light += `--color-fd-${tokens[i]}:${ink.light[i]};`;
    dark += `--color-fd-${tokens[i]}:${ink.dark[i]};`;
  }
  // the frame is a page of this site: reset its section colour on `body` and neutral's sidebar rule;
  // it never scrolls, nothing in it fades (the dither is the transition), the dev overlay stays out
  return `:root{${own}${light}}.dark{${dark}}
:root body{--color-fd-primary:inherit}
.dark #nd-sidebar{--color-fd-muted:inherit;--color-fd-secondary:inherit;--color-fd-muted-foreground:inherit}
html{overflow:hidden}
*,::before,::after{transition:none!important}
nextjs-portal{display:none}
html[data-lp-print]::view-transition-old(root),html[data-lp-print]::view-transition-new(root){animation:none;mix-blend-mode:normal}
html[data-lp-print]::view-transition-new(root){animation:lp-print var(--lp-print-ms) steps(8,end) both;mask-size:var(--lp-print-size) var(--lp-print-size)}
${PRINT}
${ink.rules}`;
}

/** load a story, replacing the frame's history entry so the back button leaves the page */
function navigate(frame: HTMLIFrameElement, layout: LayoutId) {
  const url = `/story/${layout}`;
  const win = frame.contentWindow;
  if (win && win.location.href !== 'about:blank') win.location.replace(url);
  else frame.src = url;
}

function emptySlot(frame: HTMLIFrameElement): Slot {
  return {
    frame,
    layout: null,
    theme: null,
    extra: '',
    inked: null,
    ready: false,
    pending: null,
    settle: null,
    sheet: null,
  };
}

/**
 * Same-origin frames of `/story/<layout>`. A frame is a page of this site and shares its storage,
 * its light/dark mode follows the page on its own; nothing here writes to the storage.
 */
export function createFrames(table: InkTable, elements: HTMLIFrameElement[]): Frames {
  const slots = elements.map(emptySlot);
  /** the look asked for while a slot prints */
  const queued = new Map<Slot, [theme: ThemeId, extra: string, ms: number, cell: number]>();

  function onMessage(e: MessageEvent) {
    if (e.origin !== location.origin || e.data?.type !== 'fumadocs-story:ready') return;
    const slot = slots.find((item) => item.frame.contentWindow === e.source);
    const layout = slot?.layout;
    if (!slot || !layout) return;
    const win = e.source as Window & typeof globalThis;
    // a navigation can lose a race with the one before it, ask for this layout again
    if (win.location.pathname !== `/story/${layout}`) return navigate(slot.frame, layout);
    win.postMessage({ type: 'fumadocs-story:args', args: STORY_ARGS[layout] }, location.origin);
    // a new document, also after an edit in development
    slot.sheet = null;
    slot.inked = null;

    // the layout is a lazy component, wait for its root element
    const root = LAYOUTS.find((item) => item.id === layout)!.root;
    let frames = 0;
    const poll = () => {
      if (slot.layout !== layout || !slot.settle) return;
      const element = win.document.querySelector(root);
      if (element && element.getBoundingClientRect().height > 0) {
        slot.ready = true;
        apply(slot);
        slot.settle(true);
        slot.settle = null;
      } else if (frames++ < 900) requestAnimationFrame(poll);
      else {
        slot.settle(false);
        slot.settle = null;
      }
    };
    requestAnimationFrame(poll);
  }

  function load(slot: Slot, layout: LayoutId): Promise<boolean> {
    if (slot.layout === layout && (slot.ready || slot.pending))
      return slot.ready ? Promise.resolve(true) : slot.pending!;
    slot.settle?.(false);
    queued.delete(slot);
    slot.layout = layout;
    slot.ready = false;
    slot.sheet = null;
    slot.inked = null;
    slot.pending = new Promise((resolve) => {
      slot.settle = resolve;
    });
    navigate(slot.frame, layout);
    return slot.pending;
  }

  function ink(slot: Slot, theme: ThemeId, extra = '') {
    slot.theme = theme;
    slot.extra = extra;
    apply(slot);
  }

  function reink(slot: Slot, theme: ThemeId, extra: string, ms: number, cell: number) {
    const doc = slot.frame.contentDocument;
    if (!doc || !slot.ready || !doc.startViewTransition || ms <= 0) {
      queued.delete(slot);
      ink(slot, theme, extra);
      return;
    }
    const root = doc.documentElement;
    // the newest look waits for the one printing, then prints: a sweep restyles the frame once
    // per print, not once per theme passed
    if (root.dataset.lpPrint !== undefined) {
      queued.set(slot, [theme, extra, ms, cell]);
      return;
    }
    if (slot.inked === `${theme}|${extra}` && theme !== 'shadcn') return;
    root.style.setProperty('--lp-print-ms', `${ms}ms`);
    root.style.setProperty('--lp-print-size', `${cell * 4}px`);
    root.dataset.lpPrint = '';
    const transition = doc.startViewTransition(() => ink(slot, theme, extra));
    transition.ready.catch(() => {});
    transition.finished
      .catch(() => {})
      .finally(() => {
        delete root.dataset.lpPrint;
        const next = queued.get(slot);
        queued.delete(slot);
        if (next) reink(slot, ...next);
      });
  }

  /** the wanted preset, once the layout rendered; shadcn borrows this page's palette, so it inks again */
  function apply(slot: Slot) {
    const win = slot.frame.contentWindow as (Window & typeof globalThis) | null;
    const theme = slot.theme;
    const key = `${theme}|${slot.extra}`;
    if (!win || !slot.ready || !theme || (slot.inked === key && theme !== 'shadcn')) return;
    if (!slot.sheet) {
      slot.sheet = new win.CSSStyleSheet();
      win.document.adoptedStyleSheets = [...win.document.adoptedStyleSheets, slot.sheet];
    }
    slot.sheet.replaceSync(
      inkCss(table, theme, theme === 'shadcn' ? pageTheme(slot.frame) : '') + slot.extra,
    );
    slot.inked = key;
  }

  window.addEventListener('message', onMessage);
  return {
    slots,
    load,
    ink,
    reink,
    destroy() {
      window.removeEventListener('message', onMessage);
      for (const slot of slots) slot.settle?.(false);
    },
  };
}
