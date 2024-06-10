import { TextIcon } from 'lucide-react';
import type { TOCItemType } from 'fumadocs-core/server';
import * as Primitive from 'fumadocs-core/toc';
import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from 'react';
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

interface TOCProps {
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

export function TOC({ items, header, footer }: TOCProps): ReactElement {
  const { text } = useI18n();

  return (
    <div className="sticky top-0 flex h-dvh w-[220px] flex-col gap-4 pt-12 max-lg:hidden xl:w-[260px]">
      {header}
      <h3 className="-mb-1 -ms-0.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <TextIcon className="size-4" />
        {text.toc}
      </h3>
      {items.length > 0 && <TOCItems items={items} />}
      {footer}
    </div>
  );
}

export function SubTOC({ items, header, footer }: TOCProps): ReactElement {
  const { text } = useI18n();

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({
            className:
              'sticky px-4 justify-start rounded-full bottom-2 gap-2 shadow-lg shadow-background z-10 lg:hidden',
            color: 'secondary',
          }),
        )}
      >
        <TextIcon className="size-4" />
        {text.toc}
      </PopoverTrigger>
      <PopoverContent className="flex max-h-[300px] w-[var(--radix-popover-trigger-width)] flex-col gap-4">
        {header}
        {items.length > 0 && <TOCItems className="-me-2" items={items} />}
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
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);

  const setPos = useCallback(([top, height]: PosType) => {
    const element = markerRef.current;
    if (!element || containerRef.current?.clientHeight === 0) return;

    element.style.setProperty('top', `${top.toString()}px`);
    element.style.setProperty('height', `${height.toString()}px`);
    element.style.setProperty('display', 'block');
  }, []);

  return (
    <ScrollArea className={cn('flex flex-col', className)}>
      <ScrollViewport
        className="relative h-0 flex-1 text-sm"
        ref={containerRef}
      >
        <Primitive.TOCScrollProvider containerRef={containerRef} toc={items}>
          <div
            role="none"
            ref={markerRef}
            className="absolute start-0 hidden border-s-2 border-primary transition-all"
          />
          <div className="flex flex-col gap-1 border-s-2 text-muted-foreground">
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
}): React.ReactElement {
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
