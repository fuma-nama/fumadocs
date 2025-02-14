'use client';
import type { TOCItemType } from 'fumadocs-core/server';
import * as Primitive from 'fumadocs-core/toc';
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  type ReactNode,
  use,
  useMemo,
  useRef,
} from 'react';
import { cn } from '@/utils/cn';
import { useI18n } from '@/contexts/i18n';
import { TocThumb } from '@/components/layout/toc-thumb';
import { ScrollArea, ScrollViewport } from '../ui/scroll-area';
import type {
  PopoverContentProps,
  PopoverTriggerProps,
} from '@radix-ui/react-popover';
import { ChevronRight, Text } from 'lucide-react';
import { usePageStyles } from '@/contexts/layout';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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

export function Toc(props: HTMLAttributes<HTMLDivElement>) {
  const { toc } = usePageStyles();

  return (
    <div
      id="nd-toc"
      {...props}
      className={cn(
        'sticky top-[calc(var(--fd-banner-height)+var(--fd-nav-height))] h-(--fd-toc-height) pb-2 pt-12',
        toc,
        props.className,
      )}
      style={
        {
          ...props.style,
          '--fd-toc-height':
            'calc(100dvh - var(--fd-banner-height) - var(--fd-nav-height))',
        } as object
      }
    >
      <div className="flex h-full w-(--fd-toc-width) max-w-full flex-col gap-3 pe-4">
        {props.children}
      </div>
    </div>
  );
}

export function TocItemsEmpty() {
  const { text } = useI18n();

  return (
    <div className="rounded-lg border bg-fd-card p-3 text-xs text-fd-muted-foreground">
      {text.tocNoHeadings}
    </div>
  );
}

export function TOCItems({
  items,
  isMenu,
}: {
  items: TOCItemType[];
  isMenu?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return <TocItemsEmpty />;

  return (
    <ScrollArea className="flex flex-col ps-px">
      <Primitive.ScrollProvider containerRef={viewRef}>
        <ScrollViewport
          className={cn(
            'relative min-h-0  text-sm',
            isMenu && 'mt-2 mb-4 mx-4 md:mx-6',
          )}
          ref={viewRef}
        >
          <TocThumb
            containerRef={containerRef}
            className="absolute start-0 mt-(--fd-top) h-(--fd-height) w-px bg-fd-primary transition-all"
          />
          <div
            ref={containerRef}
            className="flex flex-col border-s border-fd-foreground/10"
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

function TOCItem({ item }: { item: TOCItemType }) {
  return (
    <Primitive.TOCItem
      href={item.url}
      className={cn(
        'prose py-1.5 text-sm text-fd-muted-foreground transition-colors [overflow-wrap:anywhere] first:pt-0 last:pb-0 data-[active=true]:text-fd-primary',
        item.depth <= 2 && 'ps-3',
        item.depth === 3 && 'ps-6',
        item.depth >= 4 && 'ps-8',
      )}
    >
      {item.title}
    </Primitive.TOCItem>
  );
}

type MakeRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

const Context = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

export function TocPopover({
  open,
  onOpenChange,
  ref: _ref,
  ...props
}: MakeRequired<ComponentProps<typeof Collapsible>, 'open' | 'onOpenChange'>) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} {...props}>
      <Context
        value={useMemo(
          () => ({
            open,
            setOpen: onOpenChange,
          }),
          [onOpenChange, open],
        )}
      >
        {props.children}
      </Context>
    </Collapsible>
  );
}

export function TocPopoverTrigger({
  items,
  ...props
}: PopoverTriggerProps & { items: TOCItemType[] }) {
  const { text } = useI18n();
  const { open } = use(Context)!;
  const active = Primitive.useActiveAnchor();
  const current = useMemo(() => {
    return items.find((item) => active === item.url.slice(1))?.title;
  }, [items, active]);

  return (
    <CollapsibleTrigger
      {...props}
      className={cn(
        'inline-flex items-center text-sm gap-2 text-nowrap px-4 py-2 text-start md:px-6 md:py-3',
        props.className,
      )}
    >
      <Text className="size-4 shrink-0" />
      {text.toc}
      <ChevronRight
        className={cn(
          'size-4 shrink-0 text-fd-muted-foreground transition-all',
          !current && 'opacity-0',
          open ? 'rotate-90' : '-ms-1.5',
        )}
      />
      <span
        className={cn(
          'truncate text-fd-muted-foreground transition-opacity -ms-1.5',
          (!current || open) && 'opacity-0',
        )}
      >
        {current}
      </span>
    </CollapsibleTrigger>
  );
}

export function TocPopoverContent(props: PopoverContentProps) {
  return (
    <CollapsibleContent
      data-toc-popover=""
      className="flex flex-col max-h-[50vh]"
      {...props}
    >
      {props.children}
    </CollapsibleContent>
  );
}
