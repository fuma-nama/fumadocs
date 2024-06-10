import { TextIcon } from 'lucide-react';
import type { TOCItemType } from 'fumadocs-core/server';
import * as Primitive from 'fumadocs-core/toc-internal';
import { type ReactElement, type ReactNode, useCallback, useRef } from 'react';
import { cn } from '@/utils/cn';
import { useI18n } from '@/contexts/i18n';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { buttonVariants } from '@/theme/variants';
import { ScrollArea, ScrollViewport } from '../ui/scroll-area';

type PosType = [top: number, height: number];

export interface TOCProps {
  items: TOCItemType[];

  /**
   * Custom content in TOC container, before the main TOC
   */
  header?: ReactNode;
  /**
   * Custom content in TOC container, after the main TOC
   */
  footer?: ReactNode;
}

export const TocProvider = Primitive.AnchorProvider;

export function Toc({ items, header, footer }: TOCProps): ReactElement {
  const { text } = useI18n();

  return (
    <div className="sticky top-0 flex h-dvh w-[220px] flex-col gap-4 pe-2 pt-12 max-lg:hidden xl:w-[260px]">
      {header}
      <h3 className="-mb-1 -ms-0.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <TextIcon className="size-4" />
        {text.toc}
      </h3>
      <TOCItems items={items} />
      {footer}
    </div>
  );
}

export function SubToc({ items, header, footer }: TOCProps): ReactElement {
  const { text } = useI18n();

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({
            className:
              'sticky ms-auto bottom-4 gap-2 shadow-lg shadow-background z-10 lg:hidden',
            color: 'secondary',
          }),
        )}
      >
        <TextIcon className="size-4" />
        {text.toc}
      </PopoverTrigger>
      <PopoverContent
        hideWhenDetached
        side="top"
        align="end"
        avoidCollisions={false}
        className="flex max-h-[300px] w-[260px] flex-col gap-4 p-3"
      >
        {header}
        <TOCItems className="-me-1" items={items} />
        {footer}
      </PopoverContent>
    </Popover>
  );
}

function TOCItems({
  items,
  className,
}: {
  items: TOCItemType[];
  className?: string;
}): React.ReactElement {
  const { text } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);

  const setPos = useCallback(([top, height]: PosType) => {
    const element = markerRef.current;
    if (!element || containerRef.current?.clientHeight === 0) return;

    element.style.setProperty('top', `${top.toString()}px`);
    element.style.setProperty('height', `${height.toString()}px`);
    element.style.setProperty('display', 'block');
  }, []);

  if (items.length === 0)
    return (
      <div className="rounded-lg border bg-card p-3 text-xs text-muted-foreground">
        {text.tocNoHeadings}
      </div>
    );

  return (
    <ScrollArea className={cn('flex flex-col', className)}>
      <ScrollViewport
        className="relative h-0 flex-1 text-sm"
        ref={containerRef}
      >
        <div
          role="none"
          ref={markerRef}
          className="absolute start-0 hidden w-0.5 bg-primary transition-all"
        />
        <Primitive.ScrollProvider containerRef={containerRef}>
          <div className="flex flex-col gap-1 border-s-2 text-muted-foreground">
            {items.map((item) => (
              <TOCItem key={item.url} item={item} setMarker={setPos} />
            ))}
          </div>
        </Primitive.ScrollProvider>
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
}): React.ReactElement {
  const ref = useRef<HTMLAnchorElement>(null);

  return (
    <Primitive.TOCItem
      ref={ref}
      href={item.url}
      onActiveChange={(active) => {
        const element = ref.current;
        if (active && element)
          setMarker([element.offsetTop, element.clientHeight]);
      }}
      className={cn(
        'py-1 transition-colors data-[active=true]:font-medium data-[active=true]:text-primary',
        item.depth <= 2 && 'ps-4',
        item.depth === 3 && 'ps-7',
        item.depth >= 4 && 'ps-10',
      )}
    >
      {item.title}
    </Primitive.TOCItem>
  );
}
