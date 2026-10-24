import { TICK } from '../../lib/motion';
import { ditherKeyframes } from '../../ui/dither';
import { FRAME_H, FRAME_W, type LayoutId, type ThemeId } from './data';
import { createFrames, type Frames } from './frames';
import type { InkTable } from './presets';

export interface Screen {
  /** what the screen shows; the newest wins */
  show: (layout: LayoutId, theme: ThemeId, extra?: string) => void;
  destroy: () => void;
}

/** a theme re-inks in place, a layout prints in over its blueprint, an old one prints out */
const INK = 2 * TICK;
const PRINT = 3 * TICK;
const OUT = 2 * TICK;
/** hovering past a window doesn't load it */
const LOAD = TICK;
/** a dither cell, in screen px */
const CELL = 3;

/**
 * The live preview: two same-origin frames of `/story/<layout>`. The one on screen re-inks in
 * place for a new theme; a new layout loads in the other one, over its blueprint, and prints in.
 */
export function createScreen(screen: HTMLElement, table: InkTable): Screen {
  const live = screen.querySelector<HTMLElement>('[data-live]')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const wrappers: HTMLElement[] = [];
  let frames: Frames | null = null;
  /** the slot on screen, -1 while the blueprint shows */
  let front = -1;
  /** the slot shown last, the other one loads */
  let recent = 0;
  let want: { layout: LayoutId; theme: ThemeId; extra: string } | null = null;
  let scale = screen.clientWidth / FRAME_W || 1;
  let timer = 0;
  const animations: (Animation | null)[] = [null, null];

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
      frame.width = String(FRAME_W);
      frame.height = String(FRAME_H);
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

  function animate(index: number, frames: Keyframe[], duration: number, then: () => void) {
    animations[index]?.cancel();
    if (reduce.matches) {
      then();
      return;
    }
    const animation = wrappers[index].animate(frames, { duration });
    animations[index] = animation;
    animation.onfinish = () => {
      animations[index] = null;
      then();
    };
  }

  function hide(index: number) {
    wrappers[index].style.visibility = 'hidden';
  }

  /** the slot prints in over the blueprint and whatever was on screen */
  function printIn(index: number) {
    const before = front;
    front = index;
    recent = index;
    wrappers[index].style.visibility = 'visible';
    wrappers[index].style.zIndex = '2';
    if (before >= 0 && before !== index) wrappers[before].style.zIndex = '1';
    animate(index, ditherKeyframes(CELL), PRINT, () => {
      if (before >= 0 && before !== index && front === index) hide(before);
    });
  }

  /** the slot on screen prints out, its layout isn't the one shown anymore */
  function printOut() {
    if (front < 0) return;
    const index = front;
    front = -1;
    animate(index, ditherKeyframes(CELL, true), OUT, () => {
      if (front !== index) hide(index);
    });
  }

  function sync() {
    if (!frames || !want) return;
    const { layout, theme, extra } = want;
    const slots = frames.slots;
    const ink = reduce.matches ? 0 : INK;
    // the layout on screen: a new theme re-inks in place
    if (front >= 0 && slots[front].layout === layout && slots[front].ready) {
      frames.reink(slots[front], theme, extra, ink, CELL / scale);
      return;
    }
    printOut();
    // the other slot has it already
    for (let i = 0; i < 2; i++) {
      if (slots[i].layout !== layout || !slots[i].ready) continue;
      frames.ink(slots[i], theme, extra);
      printIn(i);
      return;
    }
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (!frames || !want || want.layout !== layout) return;
      const index = front === -1 ? 1 - recent : 1 - front;
      const slot = frames.slots[index];
      frames.ink(slot, want.theme, want.extra);
      void frames.load(slot, layout).then((ok) => {
        if (!ok || !want || want.layout !== layout || slot.layout !== layout) return;
        frames!.ink(slot, want.theme, want.extra);
        printIn(index);
      });
    }, LOAD);
  }

  const resize = new ResizeObserver(() => {
    scale = screen.clientWidth / FRAME_W || 1;
    for (const wrapper of wrappers)
      wrapper.querySelector('iframe')!.style.transform = `scale(${scale})`;
  });
  const near = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) create();
    },
    { rootMargin: '50% 0px' },
  );
  // shadcn takes this page's palette, its frames ink again when the page's theme changes
  const theme = new MutationObserver(() => {
    if (!frames) return;
    for (const slot of frames.slots)
      if (slot.theme === 'shadcn') frames.ink(slot, 'shadcn', slot.extra);
  });
  resize.observe(screen);
  near.observe(screen);
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  return {
    show(layout, theme, extra = '') {
      want = { layout, theme, extra };
      sync();
    },
    destroy() {
      clearTimeout(timer);
      resize.disconnect();
      near.disconnect();
      theme.disconnect();
      for (const animation of animations) animation?.cancel();
      frames?.destroy();
      live.replaceChildren();
    },
  };
}
