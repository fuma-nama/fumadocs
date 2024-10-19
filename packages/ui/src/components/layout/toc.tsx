import { ChevronRight, Text } from 'lucide-react';
import type { TOCItemType } from 'fumadocs-core/server';
import * as Primitive from 'fumadocs-core/toc';
import {
  type ReactElement,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
} from 'react';
import { cn } from '@/utils/cn';
import { useI18n } from '@/contexts/i18n';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { TocThumb } from '@/components/layout/toc-thumb';
import { useSidebar } from '@/contexts/sidebar';
import { NavContext } from '@/components/layout/nav';
import { ScrollArea, ScrollViewport } from '../ui/scroll-area';

export interface TOCProps {
  /**
   * Custom content in TOC container, before the main TOC
   */
  header?: ReactNode;

  /**
   * Custom content in TOC container, after the main TOC
   */
  footer?: ReactNode;

  children: ReactNode;
}

export function Toc({ header, footer, children }: TOCProps): ReactElement {
  const { text } = useI18n();

  return (
    <div
      data-toc=""
      className="sticky top-fd-layout-top h-[var(--fd-toc-height)] flex-1 pb-2 pt-12 max-lg:hidden"
      style={
        {
          '--fd-toc-height':
            'calc(100dvh - var(--fd-banner-height) - var(--fd-nav-height))',
        } as object
      }
    >
      <div className="flex h-full w-[var(--fd-toc-width)] flex-col gap-3 pe-2">
        {header}
        <h3 className="-ms-0.5 inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground">
          <Text className="size-4" />
          {text.toc}
        </h3>
        {children}
        {footer}
      </div>
    </div>
  );
}

function TocNav(props: { className?: string; children: ReactNode }): ReactNode {
  const { open } = useSidebar();
  const { isTransparent } = useContext(NavContext);

  return (
    <div
      id="nd-tocnav"
      className={cn(
        'sticky top-fd-layout-top z-10 border-b border-fd-foreground/10 text-sm transition-colors md:top-[var(--fd-toc-top-with-offset)] md:mx-3 md:rounded-full md:border',
        !isTransparent && 'bg-fd-background/80 backdrop-blur-md md:shadow-md',
        open && 'opacity-0',
        props.className,
      )}
      style={
        {
          '--fd-toc-top-with-offset':
            'calc(4px + var(--fd-banner-height) + var(--fd-nav-height))',
        } as object
      }
    >
      {props.children}
    </div>
  );
}

export function TocPopover({
  items,
  ...props
}: TOCProps & { items: TOCItemType[]; className?: string }): ReactElement {
  const { text } = useI18n();
  const active = Primitive.useActiveAnchor();
  const current = useMemo(() => {
    return items.find((item) => active === item.url.slice(1))?.title;
  }, [items, active]);

  return (
    <TocNav {...props}>
      <Popover>
        <PopoverTrigger className="inline-flex size-full items-center gap-2 text-nowrap px-4 py-2 text-left md:px-3">
          <Text className="size-4 shrink-0" />
          {text.toc}
          {current ? (
            <>
              <ChevronRight className="-mx-1.5 size-4 shrink-0 text-fd-muted-foreground" />
              <span className="truncate text-fd-muted-foreground">
                {current}
              </span>
            </>
          ) : null}
        </PopoverTrigger>
        <PopoverContent
          hideWhenDetached
          alignOffset={16}
          align="start"
          side="bottom"
          className="flex max-h-[var(--radix-popover-content-available-height)] w-[260px] flex-col gap-4 p-3"
          data-toc-popover=""
        >
          {props.header}
          {props.children}
          {props.footer}
        </PopoverContent>
      </Popover>
    </TocNav>
  );
}

export function TOCItems({
  items,
  isMenu = false,
}: {
  items: TOCItemType[];
  isMenu?: boolean;
}): React.ReactElement {
  const { text } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  if (items.length === 0)
    return (
      <div className="rounded-lg border bg-fd-card p-3 text-xs text-fd-muted-foreground">
        {text.tocNoHeadings}
      </div>
    );

  return (
    <ScrollArea className={cn('flex flex-col', isMenu && '-ms-3')}>
      <Primitive.ScrollProvider containerRef={viewRef}>
        <ScrollViewport className="relative min-h-0 text-sm" ref={viewRef}>
          {!isMenu ? (
            <TocThumb
              containerRef={containerRef}
              className="absolute start-0 mt-[var(--fd-top)] h-[var(--fd-height)] w-px bg-fd-primary transition-all"
            />
          ) : null}
          <div
            ref={containerRef}
            className={cn(
              'flex flex-col',
              !isMenu && 'border-s border-fd-foreground/10',
            )}
          >
            {items.map((item) => (
              <TOCItem key={item.url} item={item} />
            ))}
          </div>
        </ScrollViewport>
      </Primitive.ScrollProvider>
    </ScrollArea>
  );
}

function TOCItem({ item }: { item: TOCItemType }): React.ReactElement {
  return (
    <Primitive.TOCItem
      href={item.url}
      className={cn(
        'prose py-1.5 text-sm text-fd-muted-foreground transition-colors [overflow-wrap:anywhere] first:pt-0 last:pb-0 data-[active=true]:text-fd-primary',
        item.depth <= 2 && 'ps-3.5',
        item.depth === 3 && 'ps-6',
        item.depth >= 4 && 'ps-8',
      )}
    >
      {item.title}
    </Primitive.TOCItem>
  );
}
