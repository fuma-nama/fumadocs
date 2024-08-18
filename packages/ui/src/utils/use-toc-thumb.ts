import { type RefObject, useLayoutEffect, useState } from 'react';
import * as Primitive from 'fumadocs-core/toc';

export type TOCThumb = [top: number, height: number];

export function useTocThumb(containerRef: RefObject<HTMLElement>): TOCThumb {
  const active = Primitive.useActiveAnchors();
  const [pos, setPos] = useState<TOCThumb>([0, 0]);

  // effect is required to render TOC thumb at the correct position
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (active.length === 0 || !container || container.clientHeight === 0) {
      setPos([0, 0]);
      return;
    }

    let upper = Number.MAX_VALUE,
      lower = 0;

    for (const item of active) {
      const element = container.querySelector<HTMLElement>(
        `a[href="#${item}"]`,
      );
      if (!element) continue;

      const styles = getComputedStyle(element);
      upper = Math.min(
        upper,
        element.offsetTop + parseFloat(styles.paddingTop),
      );
      lower = Math.max(
        lower,
        element.offsetTop +
          element.clientHeight -
          parseFloat(styles.paddingBottom),
      );
    }

    setPos([upper, lower - upper]);
  }, [active, containerRef]);

  return pos;
}
