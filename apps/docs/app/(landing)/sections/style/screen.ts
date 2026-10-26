import { TICK } from '../../lib/motion';
import { ditherKeyframes } from '../../ui/dither';
import { FRAME_W, type LayoutId, type ThemeId } from './data';
import type { InkTable } from './presets';
import { createFrames, type Frames } from './frames';

export interface Screen {
  /** what the screen shows; the newest wins. `instant` inks a theme without the print */
  show: (layout: LayoutId, theme: ThemeId, instant: boolean) => void;
  destroy: () => void;
}

/** a layout prints in over the one on screen, a theme re-inks in place */
const PRINT = 2 * TICK;
const INK = 2 * TICK;
/** a dither cell, in screen px */
const CELL = 3;
/** a screen narrower than this shows the layouts as a phone does, at its width */
const PHONE_MAX = 480;
const PHONE_W = 390;
/** a wider screen shows them at this many times its width, a desktop's at most */
const ZOOM_OUT = 2.2;

/**
 * The width the frames lay out at: a phone's on a narrow screen, else as wide as the screen
 * shows legibly, up to a desktop's.
 */
function frameWidth(screen: HTMLElement): number {
  const width = screen.clientWidth;
  return width < PHONE_MAX ? PHONE_W : Math.min(FRAME_W, Math.round(width * ZOOM_OUT));
}

/**
 * The live preview: two same-origin frames of `/story/<layout>`. The one on screen stays until the
 * other has the next layout rendered in the current theme, then that one prints in over it, once.
 * A theme re-inks the one on screen in place. `onLoading` names the layout on its way, or `null`.
 */
export function createScreen(
  screen: HTMLElement,
  table: InkTable,
  onLoading: (layout: LayoutId | null) => void,
): Screen {
  const live = screen.querySelector<HTMLElement>('[data-live]')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const wrappers: HTMLElement[] = [];
  let frames: Frames | null = null;
  /** the slot on screen, -1 while the blueprint shows */
  let front = -1;
  let want: { layout: LayoutId; theme: ThemeId; instant: boolean } | null = null;
  /** frames are as wide as a desktop (or a phone) and as tall as the screen shows, at this scale */
  let width = frameWidth(screen);
  let scale = screen.clientWidth / width || 1;
  let height = Math.round(screen.clientHeight / scale);
  let swap: Animation | null = null;
  /** counts the asks, a load that lands after a newer one is ignored */
  let asks = 0;

  function create() {
    if (frames) return;
    const elements: HTMLIFrameElement[] = [];
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
      frame.width = String(width);
      frame.height = String(height);
      frame.className = 'pointer-events-none origin-top-left border-0 bg-transparent';
      frame.style.transform = `scale(${scale})`;
      // what the pointer hits: Chrome latches a wheel to an iframe under the pointer even with
      // `pointer-events: none`, and the page stops scrolling
      const shield = document.createElement('div');
      shield.className = 'pointer-events-auto absolute inset-0';
      wrapper.append(frame, shield);
      live.append(wrapper);
      wrappers.push(wrapper);
      elements.push(frame);
    }
    frames = createFrames(table, elements);
    sync();
  }

  /** the slot prints in over the one on screen, which hides once it is covered */
  function bringIn(index: number) {
    const before = front;
    front = index;
    swap?.finish();
    const wrapper = wrappers[index];
    wrapper.style.visibility = 'visible';
    wrapper.style.zIndex = '2';
    if (before >= 0) wrappers[before].style.zIndex = '1';
    const covered = () => {
      if (before >= 0 && before !== index && front === index)
        wrappers[before].style.visibility = 'hidden';
    };
    if (reduce.matches) return covered();
    const animation = wrapper.animate(ditherKeyframes(CELL), { duration: PRINT });
    swap = animation;
    animation.onfinish = () => {
      if (swap === animation) swap = null;
      covered();
    };
  }

  function sync() {
    if (!frames || !want) return;
    const { layout, theme, instant } = want;
    const slots = frames.slots;
    const ask = ++asks;
    if (front >= 0 && slots[front].layout === layout && slots[front].ready) {
      onLoading(null);
      frames.print(slots[front], theme, instant || reduce.matches ? 0 : INK, CELL / scale);
      return;
    }
    // the slot off screen takes the next layout; before any is on screen, the one that has it
    const index = front >= 0 ? 1 - front : slots[1].layout === layout ? 1 : 0;
    const slot = slots[index];
    frames.ink(slot, theme);
    if (slot.layout === layout && slot.ready) {
      onLoading(null);
      bringIn(index);
      return;
    }
    onLoading(layout);
    void frames.load(slot, layout).then((ok) => {
      if (!ok || !frames || !want || ask !== asks) return;
      frames.ink(slot, want.theme);
      onLoading(null);
      bringIn(index);
    });
  }

  const resize = new ResizeObserver(() => {
    width = frameWidth(screen);
    scale = screen.clientWidth / width || 1;
    height = Math.round(screen.clientHeight / scale);
    for (const wrapper of wrappers) {
      const frame = wrapper.querySelector('iframe')!;
      frame.style.transform = `scale(${scale})`;
      frame.width = String(width);
      frame.height = String(height);
    }
  });
  const near = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) create();
    },
    { rootMargin: '100% 0px' },
  );
  // shadcn takes this page's palette, its frames ink again when the page's theme changes
  const mode = new MutationObserver(() => {
    if (!frames) return;
    for (const slot of frames.slots) if (slot.theme === 'shadcn') frames.ink(slot, 'shadcn');
  });
  resize.observe(screen);
  near.observe(screen);
  mode.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  return {
    show(layout, theme, instant) {
      want = { layout, theme, instant };
      sync();
    },
    destroy() {
      resize.disconnect();
      near.disconnect();
      mode.disconnect();
      swap?.cancel();
      frames?.destroy();
      live.replaceChildren();
    },
  };
}
