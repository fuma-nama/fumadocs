import { TextIcon } from 'lucide-react';
import type { TOCItemType } from 'fumadocs-core/server';
import * as Primitive from 'fumadocs-core/toc';
import { useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';
import { useI18n } from '@/contexts/i18n';
import { ScrollArea, ScrollViewport } from './ui/scroll-area';

type PosType = [top: number, height: number];

export function TOCItems({ items }: { items: TOCItemType[] }): JSX.Element {
  const { text } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);

  const setPos = ([top, height]: PosType): void => {
    const element = markerRef.current;
    if (!element) return;

    element.style.setProperty('top', `${top}px`);
    element.style.setProperty('height', `${height}px`);
    element.style.setProperty('display', `block`);
  };

  return (
    <ScrollArea className="pt-4 text-sm first:pt-0">
      <ScrollViewport className="relative" ref={containerRef}>
        <Primitive.TOCScrollProvider containerRef={containerRef} toc={items}>
          <div
            role="none"
            ref={markerRef}
            className="absolute left-0 hidden border-l-2 border-primary transition-all"
          />
          <h3 className="mb-4 inline-flex items-center gap-2">
            <TextIcon className="size-4" />
            {text.toc}
          </h3>
          <div className="flex flex-col gap-1 border-l-2 text-muted-foreground">
            {items.map((item) => (
              <TOCItem key={item.url} item={item} setMarker={setPos} />
            ))}
          </div>
        </Primitive.TOCScrollProvider>
      </ScrollViewport>
    </ScrollArea>
  );
}

function TOCItem({
  item,
  setMarker,
}: {
  item: TOCItemType;
  setMarker: (v: PosType) => void;
}): JSX.Element {
  const active = Primitive.useActiveAnchor(item.url);
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (active && ref.current) {
      setMarker([ref.current.offsetTop, ref.current.clientHeight]);
    }
  }, [active, setMarker]);

  return (
    <Primitive.TOCItem
      ref={ref}
      href={item.url}
      className={cn(
        'overflow-hidden text-ellipsis py-1 transition-colors data-[active=true]:font-medium data-[active=true]:text-primary',
        item.depth <= 2 && 'pl-4',
        item.depth === 3 && 'pl-7',
        item.depth >= 4 && 'pl-10',
      )}
    >
      {item.title}
    </Primitive.TOCItem>
  );
}
