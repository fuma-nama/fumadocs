import {
  type HTMLAttributes,
  type RefObject,
  useEffect,
  useEffectEvent,
  useRef,
} from 'react';
import { useActiveAnchors } from 'fumadocs-core/toc';

type TocThumb = [top: number, height: number];

interface RefProps {
  containerRef: RefObject<HTMLElement | null>;
}

export function TocThumb({
  containerRef,
  ...props
}: HTMLAttributes<HTMLDivElement> & RefProps) {
  const thumbRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div ref={thumbRef} role="none" {...props} />
      <Updater containerRef={containerRef} thumbRef={thumbRef} />
    </>
  );
}

function Updater({
  containerRef,
  thumbRef,
}: RefProps & { thumbRef: RefObject<HTMLElement | null> }) {
  const active = useActiveAnchors();
  const onPrint = useEffectEvent(() => {
    if (!containerRef.current || !thumbRef.current) return;

    update(thumbRef.current, calc(containerRef.current, active));
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const observer = new ResizeObserver(onPrint);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [containerRef]);

  if (containerRef.current && thumbRef.current) {
    update(thumbRef.current, calc(containerRef.current, active));
  }

  return null;
}

function calc(container: HTMLElement, active: string[]): TocThumb {
  if (active.length === 0 || container.clientHeight === 0) {
    return [0, 0];
  }

  let upper = Number.MAX_VALUE,
    lower = 0;

  for (const item of active) {
    const element = container.querySelector<HTMLElement>(`a[href="#${item}"]`);
    if (!element) continue;

    const styles = getComputedStyle(element);
    upper = Math.min(upper, element.offsetTop + parseFloat(styles.paddingTop));
    lower = Math.max(
      lower,
      element.offsetTop +
        element.clientHeight -
        parseFloat(styles.paddingBottom),
    );
  }

  return [upper, lower - upper];
}

function update(element: HTMLElement, info: TocThumb): void {
  element.style.setProperty('--fd-top', `${info[0]}px`);
  element.style.setProperty('--fd-height', `${info[1]}px`);
}
