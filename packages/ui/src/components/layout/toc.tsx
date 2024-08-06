import { ChevronRight, Text } from 'lucide-react';
import type { TOCItemType } from 'fumadocs-core/server';
import * as Primitive from 'fumadocs-core/toc';
import {
  type ReactElement,
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/utils/cn';
import { useI18n } from '@/contexts/i18n';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
    <div
      data-toc=""
      className="sticky top-0 flex h-dvh w-[220px] shrink-0 flex-col gap-4 pr-3 pt-12 max-lg:hidden xl:w-[260px] rtl:pl-3"
    >
      {header}
      <h3 className="-mb-1 -ms-0.5 inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground">
        <Text className="size-4" />
        {text.toc}
      </h3>
      <TOCItems items={items} />
      {footer}
    </div>
  );
}

export function TocPopover({ items, header, footer }: TOCProps): ReactElement {
  const { text } = useI18n();
  const active = Primitive.useActiveAnchor();
  const current = useMemo(() => {
    if (!active) return;
    return items.find((item) => item.url === `#${active}`)?.title;
  }, [items, active]);

  return (
    <Popover>
      <PopoverTrigger className="inline-flex items-center gap-2 text-nowrap px-4 py-2 text-left max-md:size-full md:px-3 md:text-fd-muted-foreground">
        <Text className="size-4 shrink-0" />
        {text.toc}
        {current ? (
          <>
            <ChevronRight className="-mx-1.5 size-4 shrink-0 text-fd-muted-foreground" />
            <span className="truncate text-fd-muted-foreground">{current}</span>
          </>
        ) : null}
      </PopoverTrigger>
      <PopoverContent
        hideWhenDetached
        alignOffset={16}
        align="start"
        side="bottom"
        className="flex max-h-[80vh] w-[260px] flex-col gap-4 p-3"
        data-toc-popover=""
      >
        {header}
        <TOCItems items={items} isMenu />
        {footer}
      </PopoverContent>
    </Popover>
  );
}

function TOCItems({
  items,
  isMenu = false,
}: {
  items: TOCItemType[];
  isMenu?: boolean;
}): React.ReactElement {
  const { text } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<PosType>();
  const active = Primitive.useActiveAnchor();

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!active || !container) return;

    const element: HTMLElement | null = container.querySelector(
      `a[href="#${active}"]`,
    );
    if (!element) return;
    setPos([element.offsetTop, element.clientHeight]);
  }, [active]);

  if (items.length === 0)
    return (
      <div className="rounded-lg border bg-fd-card p-3 text-xs text-fd-muted-foreground">
        {text.tocNoHeadings}
      </div>
    );

  return (
    <ScrollArea className={cn('flex flex-col', isMenu && '-mx-3')}>
      <ScrollViewport className="relative min-h-0 text-sm" ref={containerRef}>
        <div
          role="none"
          className="absolute start-0 w-0.5 bg-fd-primary transition-all"
          style={{
            top: pos ? `${pos[0].toString()}px` : undefined,
            height: pos ? `${pos[1].toString()}px` : undefined,
            display: pos ? 'block' : 'hidden',
          }}
        />
        <Primitive.ScrollProvider containerRef={containerRef}>
          <div
            className={cn(
              'flex flex-col gap-1 text-fd-muted-foreground',
              !isMenu && 'border-s-2 border-fd-foreground/10',
            )}
          >
            {items.map((item) => (
              <TOCItem key={item.url} item={item} />
            ))}
          </div>
        </Primitive.ScrollProvider>
      </ScrollViewport>
    </ScrollArea>
  );
}

function TOCItem({ item }: { item: TOCItemType }): React.ReactElement {
  return (
    <Primitive.TOCItem
      href={item.url}
      className={cn(
        'py-1 transition-colors [overflow-wrap:anywhere] data-[active=true]:font-medium data-[active=true]:text-fd-primary',
        item.depth <= 2 && 'ps-4',
        item.depth === 3 && 'ps-7',
        item.depth >= 4 && 'ps-10',
      )}
    >
      {item.title}
    </Primitive.TOCItem>
  );
}
