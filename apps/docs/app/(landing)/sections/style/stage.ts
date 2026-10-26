import { TICK } from '../../lib/motion';
import { ditherKeyframes } from '../../ui/dither';
import type { DemoId, LayoutId, TabId, ThemeId } from './data';
import { createDemo, type Demo } from './demo';
import type { InkTable } from './presets';
import { createScreen } from './screen';

export interface Stage {
  /** what the monitor shows; a demo's frame is made the first time it is asked for */
  show: (tab: TabId, layout: LayoutId, theme: ThemeId, instant: boolean) => void;
  /** make a demo's frame ahead, the reader is about to open it */
  preload: (tab: TabId) => void;
  destroy: () => void;
}

/**
 * The monitor's screens: the layouts, and a frame per demo made when it is first asked for and
 * kept, so it comes back as it was left. A screen coming on dithers in over the one leaving.
 * `onBusy` tells whether the screen on shows is still on its way.
 */
export function createStage(
  root: HTMLElement,
  table: InkTable,
  titles: Record<DemoId, string>,
  onBusy: (busy: boolean) => void,
): Stage {
  const boxes = new Map<TabId, HTMLElement>();
  for (const box of root.querySelectorAll<HTMLElement>('[data-screen]'))
    boxes.set(box.dataset.screen as TabId, box);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const demos = new Map<DemoId, Demo>();
  const ready = new Set<TabId>();
  let current: TabId = 'layouts';
  let theme: ThemeId | null = null;
  let loading = false;

  const screen = createScreen(boxes.get('layouts')!, table, (next) => {
    loading = next !== null;
    if (current === 'layouts') onBusy(loading);
  });

  function demo(tab: DemoId): Demo {
    let instance = demos.get(tab);
    if (instance) return instance;
    const box = boxes.get(tab)!;
    instance = createDemo(box, table, tab, titles[tab], () => {
      ready.add(tab);
      if (current !== tab) return;
      onBusy(false);
      instance!.show();
    });
    if (theme) instance.ink(theme, false);
    demos.set(tab, instance);
    return instance;
  }

  function reveal(tab: TabId) {
    for (const [key, box] of boxes) box.style.visibility = key === tab ? '' : 'hidden';
    const box = boxes.get(tab)!;
    if (!reduce.matches && (tab === 'layouts' || ready.has(tab)))
      box.animate(ditherKeyframes(3), { duration: 2 * TICK });
  }

  return {
    show(tab, layout, nextTheme, instant) {
      theme = nextTheme;
      const switched = tab !== current;
      current = tab;
      if (tab === 'layouts') {
        screen.show(layout, nextTheme, instant);
        onBusy(loading);
      } else {
        demo(tab).ink(nextTheme, !instant);
        onBusy(!ready.has(tab));
      }
      // a theme re-inks every demo made so far, the ones off screen at once
      for (const [key, instance] of demos) if (key !== tab) instance.ink(nextTheme, false);
      if (switched) reveal(tab);
    },
    preload(tab) {
      if (tab !== 'layouts') demo(tab);
    },
    destroy() {
      screen.destroy();
      for (const instance of demos.values()) instance.destroy();
    },
  };
}
