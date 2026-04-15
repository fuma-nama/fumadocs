'use client';
import { useI18n } from '@/contexts/i18n';
import { cn } from '@/utils/cn';
import { type ComponentProps, useCallback, useEffect, useRef, useState } from 'react';
import { mergeRefs } from '@/utils/merge-refs';
import * as Primitive from 'fumadocs-core/toc';
import { useTOCItems } from '.';

export type TOCItemsProps = ComponentProps<'div'>;

interface ComputedData {
  positions: [top: number, bottom: number][];
}

export function TOCItems({ ref, className, ...props }: TOCItemsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const items = useTOCItems();
  const [computed, setComputed] = useState<ComputedData | null>(null);

  const onCompute = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (items.length === 0) {
      setComputed(null);
      return;
    }

    const positions: [top: number, bottom: number][] = [];

    for (const item of items) {
      const element = container.querySelector<HTMLElement>(`a[href="${item.url}"]`);
      if (!element) continue;

      const styles = getComputedStyle(element);
      positions.push([
        element.offsetTop + parseFloat(styles.paddingTop),
        element.offsetTop + element.clientHeight - parseFloat(styles.paddingBottom),
      ]);
    }

    setComputed({ positions });
  }, [items]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(onCompute);
    observer.observe(container);
    onCompute();

    return () => {
      observer.disconnect();
    };
  }, [onCompute]);

  return (
    <div className="relative">
      {computed && <TocThumb computed={computed} />}
      <div
        ref={mergeRefs(ref, containerRef)}
        className={cn('flex flex-col border-s border-fd-foreground/10', className)}
        {...props}
      />
    </div>
  );
}

function TocThumb({ computed }: { computed: ComputedData }) {
  const ref = useRef<HTMLDivElement>(null);
  const tocInfo = Primitive.useTOC();
  function calculate(items: Primitive.TOCItemInfo[]) {
    const out: Record<string, string> = {};
    const startIdx = items.findIndex((item) => item.active);
    if (startIdx === -1) return out;
    const endIdx = items.findLastIndex((item) => item.active);

    out['--track-top'] = `${computed.positions[startIdx][0]}px`;
    out['--track-bottom'] = `${computed.positions[endIdx][1]}px`;
    return out;
  }

  Primitive.useTOCListener((items) => {
    const element = ref.current;
    if (!element) return;

    for (const [k, v] of Object.entries(calculate(items))) {
      element.style.setProperty(k, v);
    }
  });

  return (
    <div
      ref={ref}
      className="absolute inset-y-0 inset-s-0 bg-fd-primary w-px transition-[clip-path]"
      style={{
        clipPath: `polygon(0 var(--track-top,0), 100% var(--track-top,0), 100% var(--track-bottom,0), 0 var(--track-bottom,0))`,
        ...calculate(tocInfo.get()),
      }}
    />
  );
}

export function TOCEmpty() {
  const { text } = useI18n();

  return (
    <div className="rounded-lg border bg-fd-card p-3 text-xs text-fd-muted-foreground">
      {text.tocNoHeadings}
    </div>
  );
}

export function TOCItem({
  item,
  ...props
}: Primitive.TOCItemProps & { item: Primitive.TOCItemType }) {
  return (
    <Primitive.TOCItem
      href={item.url}
      {...props}
      className={cn(
        'prose py-1.5 text-sm text-fd-muted-foreground scroll-m-4 transition-colors wrap-anywhere first:pt-0 last:pb-0 data-[active=true]:text-fd-primary hover:text-fd-accent-foreground',
        item.depth <= 2 && 'ps-3',
        item.depth === 3 && 'ps-6',
        item.depth >= 4 && 'ps-8',
        props.className,
      )}
    >
      {item.title}
    </Primitive.TOCItem>
  );
}
