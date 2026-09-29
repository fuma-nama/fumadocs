'use client';
import * as Primitive from 'fumadocs-core/toc';
import { type ComponentProps, useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';
import { mergeRefs } from '@/utils/merge-refs';

export { TOCEmpty } from './default';

export type TOCItemsProps = ComponentProps<'div'>;

export function TOCItems({ ref, className, children, ...props }: TOCItemsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const tocInfo = Primitive.useTOC();

  useEffect(() => {
    const container = containerRef.current;
    const block = blockRef.current;
    if (!container || !block) return;
    // measured on resize only, so active changes never read layout
    const positions = new Map<string, [top: number, bottom: number]>();
    let height = 0;

    const update = (items: Primitive.TOCItemInfo[]) => {
      let top = -1;
      let bottom = -1;
      for (const item of items) {
        if (!item.active) continue;
        const pos = positions.get(item.original.url);
        if (!pos) continue;
        if (top === -1) top = pos[0];
        bottom = pos[1];
      }

      if (top !== -1) block.style.clipPath = `inset(${top}px 0 ${height - bottom}px round 8px)`;
    };

    const observer = new ResizeObserver(() => {
      positions.clear();
      for (const anchor of container.getElementsByTagName('a')) {
        const href = anchor.getAttribute('href');
        if (href) positions.set(href, [anchor.offsetTop, anchor.offsetTop + anchor.offsetHeight]);
      }
      height = container.clientHeight;
      update(tocInfo.get());
    });

    observer.observe(container);
    tocInfo.listen(update);
    return () => {
      observer.disconnect();
      tocInfo.unlisten(update);
    };
  }, [tocInfo]);

  return (
    <div
      ref={mergeRefs(containerRef, ref)}
      className={cn('relative flex flex-col', className)}
      {...props}
    >
      <div
        ref={blockRef}
        className="absolute inset-0 bg-linear-to-r from-fd-primary/10 [clip-path:inset(0_0_100%)] transition-[clip-path] duration-300 ease-out"
      />
      {children}
    </div>
  );
}

function getItemOffset(depth: number): number {
  if (depth <= 2) return 8;
  if (depth === 3) return 20;
  return 32;
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
        'group prose relative py-1 pe-2 text-[0.8125rem]/5 scroll-m-4 text-fd-muted-foreground hover:text-fd-accent-foreground transition-colors wrap-anywhere data-[active=true]:text-fd-primary',
        props.className,
      )}
      style={{
        paddingInlineStart: getItemOffset(item.depth),
        ...props.style,
      }}
    >
      {item._step !== undefined && (
        <span className="inline-flex size-4 me-1.5 items-center justify-center rounded-full align-text-bottom bg-fd-muted text-fd-muted-foreground font-mono font-medium text-[10px] transition-colors group-data-[active=true]:bg-fd-primary group-data-[active=true]:text-fd-primary-foreground">
          {item._step}
        </span>
      )}
      {item.title}
    </Primitive.TOCItem>
  );
}
