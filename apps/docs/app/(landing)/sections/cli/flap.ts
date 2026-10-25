/** a flip takes this long, the top flap falls in the first half */
const FLIP = 110;

interface Cell {
  el: HTMLElement;
  value: string;
  /** the old glyph's bottom half, the falling top half, the new bottom half landing */
  under: HTMLElement;
  top: HTMLElement;
  bottom: HTMLElement;
  animations: Animation[];
}

export interface Flaps {
  /** show `value`, flipping the digits that change */
  set: (value: number, animate: boolean) => void;
  destroy: () => void;
}

/**
 * The split-flap counter in `root`: `[data-flap]` cells, one digit each, and the `[data-noun]`
 * after them. A flap folds toward its axle by scaling in the plane, it never turns in depth.
 */
export function createFlaps(root: HTMLElement): Flaps {
  const cells: Cell[] = [];
  const noun = root.querySelector<HTMLElement>('[data-noun]')!;
  for (const el of root.querySelectorAll<HTMLElement>('[data-flap]')) {
    const layer = (clip: string) => {
      const span = document.createElement('span');
      span.ariaHidden = 'true';
      span.style.cssText = `position:absolute;inset:0;display:grid;place-items:center;background:inherit;visibility:hidden;clip-path:${clip}`;
      el.append(span);
      return span;
    };
    cells.push({
      el,
      value: el.firstChild?.textContent ?? '',
      under: layer('inset(50% 0 0 0)'),
      top: layer('inset(0 0 50% 0)'),
      bottom: layer('inset(50% 0 0 0)'),
      animations: [],
    });
  }

  function flip(cell: Cell, next: string, animate: boolean) {
    if (cell.value === next) return;
    const previous = cell.value;
    cell.value = next;
    for (const animation of cell.animations) animation.cancel();
    cell.animations.length = 0;
    cell.el.firstChild!.textContent = next;
    if (!animate) {
      for (const layer of [cell.under, cell.top, cell.bottom]) layer.style.visibility = 'hidden';
      return;
    }
    cell.under.textContent = previous;
    cell.top.textContent = previous;
    cell.bottom.textContent = next;
    const fall = cell.top.animate(
      [
        { transform: 'scaleY(1)', visibility: 'visible' },
        { transform: 'scaleY(0)', visibility: 'visible' },
      ],
      { duration: FLIP / 2, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' },
    );
    const land = cell.bottom.animate(
      [
        { transform: 'scaleY(0)', visibility: 'visible' },
        { transform: 'scaleY(1.06)', visibility: 'visible', offset: 0.7 },
        { transform: 'scaleY(1)', visibility: 'visible' },
      ],
      { duration: FLIP / 2, delay: FLIP / 2, easing: 'cubic-bezier(0, 0.55, 0.45, 1)' },
    );
    const under = cell.under.animate([{ visibility: 'visible' }, { visibility: 'visible' }], {
      duration: FLIP,
    });
    cell.animations.push(fall, land, under);
  }

  return {
    set(value, animate) {
      const text = String(value).padStart(cells.length, ' ');
      for (let i = 0; i < cells.length; i++) flip(cells[i], text[i], animate);
      noun.textContent = value === 1 ? 'file' : 'files';
    },
    destroy() {
      for (const cell of cells) {
        for (const animation of cell.animations) animation.cancel();
        cell.under.remove();
        cell.top.remove();
        cell.bottom.remove();
      }
    },
  };
}
