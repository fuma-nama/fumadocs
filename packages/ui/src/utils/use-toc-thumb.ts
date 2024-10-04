import { type RefObject, useEffect, useState } from 'react';
import * as Primitive from 'fumadocs-core/toc';

export type TOCThumb = [top: number, height: number];

export function useTocThumb(containerRef: RefObject<HTMLElement>): TOCThumb {
  const active = Primitive.useActiveAnchors();
  const [pos, setPos] = useState<TOCThumb>([0, 0]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    function onResize(): void {
      if (active.length === 0 || container.clientHeight === 0) {
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
    }

    onResize();
    const observer = new ResizeObserver(onResize);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [active, containerRef]);

  return pos;
}
