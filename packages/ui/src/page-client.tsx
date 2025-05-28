'use client';

import {
  type ComponentProps,
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'fumadocs-core/link';
import { cn } from '@/utils/cn';
import { useI18n } from './contexts/i18n';
import { useTreeContext, useTreePath } from './contexts/tree';
import type { PageTree, TOCItemType } from 'fumadocs-core/server';
import { createContext, usePathname } from 'fumadocs-core/framework';
import {
  type BreadcrumbOptions,
  getBreadcrumbItemsFromPath,
} from 'fumadocs-core/breadcrumb';
import { useNav, usePageStyles } from '@/contexts/layout';
import { isActive } from '@/utils/is-active';
import { useEffectEvent } from 'fumadocs-core/utils/use-effect-event';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import * as Primitive from 'fumadocs-core/toc';
import { useSidebar } from '@/contexts/sidebar';

const TocPopoverContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>('TocPopoverContext');

export function TocPopoverTrigger({
  items,
  ...props
}: ComponentProps<'button'> & { items: TOCItemType[] }) {
  const { text } = useI18n();
  const { open } = TocPopoverContext.use();
  const active = Primitive.useActiveAnchor();
  const selected = useMemo(
    () => items.findIndex((item) => active === item.url.slice(1)),
    [items, active],
  );
  const path = useTreePath().at(-1);
  const showItem = selected !== -1 && !open;

  return (
    <CollapsibleTrigger
      {...props}
      className={cn(
        'flex flex-row items-center text-sm text-fd-muted-foreground gap-2.5 px-4 py-2.5 text-start focus-visible:outline-none [&_svg]:shrink-0 [&_svg]:size-4 md:px-6',
        props.className,
      )}
    >
      <ProgressCircle
        value={(selected + 1) / items.length}
        max={1}
        className={cn(open && 'text-fd-primary')}
      />
      <span className="grid flex-1 *:my-auto *:row-start-1 *:col-start-1">
        <span
          className={cn(
            'truncate transition-all',
            open && 'text-fd-foreground',
            showItem && 'opacity-0 -translate-y-full pointer-events-none',
          )}
        >
          {path?.name ?? text.toc}
        </span>
        <span
          className={cn(
            'truncate transition-all',
            !showItem && 'opacity-0 translate-y-full pointer-events-none',
          )}
        >
          {items[selected]?.title}
        </span>
      </span>
      <ChevronDown
        className={cn('transition-transform mx-0.5', open && 'rotate-180')}
      />
    </CollapsibleTrigger>
  );
}

interface ProgressCircleProps
  extends Omit<React.ComponentProps<'svg'>, 'strokeWidth'> {
  value: number;
  strokeWidth?: number;
  size?: number;
  min?: number;
  max?: number;
}

function clamp(input: number, min: number, max: number): number {
  if (input < min) return min;
  if (input > max) return max;
  return input;
}

function ProgressCircle({
  value,
  strokeWidth = 2,
  size = 24,
  min = 0,
  max = 100,
  ...restSvgProps
}: ProgressCircleProps) {
  const normalizedValue = clamp(value, min, max);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (normalizedValue / max) * circumference;
  const circleProps = {
    cx: size / 2,
    cy: size / 2,
    r: radius,
    fill: 'none',
    strokeWidth,
  };

  return (
    <svg
      role="progressbar"
      viewBox={`0 0 ${size} ${size}`}
      aria-valuenow={normalizedValue}
      aria-valuemin={min}
      aria-valuemax={max}
      {...restSvgProps}
    >
      <circle {...circleProps} className="stroke-current/25" />
      <circle
        {...circleProps}
        stroke="currentColor"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - progress}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all"
      />
    </svg>
  );
}

export function TocPopoverContent(props: ComponentProps<'div'>) {
  return (
    <CollapsibleContent
      data-toc-popover=""
      {...props}
      className={cn('flex flex-col max-h-[50vh]', props.className)}
    >
      {props.children}
    </CollapsibleContent>
  );
}

export function TocPopover(props: ComponentProps<'div'>) {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const { collapsed } = useSidebar();
  const { tocNav } = usePageStyles();
  const { isTransparent } = useNav();

  const onClick = useEffectEvent((e: Event) => {
    if (!open) return;

    if (ref.current && !ref.current.contains(e.target as HTMLElement))
      setOpen(false);
  });

  useEffect(() => {
    window.addEventListener('click', onClick);

    return () => {
      window.removeEventListener('click', onClick);
    };
  }, [onClick]);

  return (
    <div
      {...props}
      className={cn(
        'fixed inset-x-0 top-[calc(var(--fd-banner-height)+var(--fd-nav-height))] overflow-visible z-10',
        tocNav,
        props.className,
      )}
      style={{
        ...props.style,
        insetInlineStart: collapsed
          ? '0px'
          : 'calc(var(--fd-sidebar-width) + var(--fd-layout-offset))',
      }}
    >
      <TocPopoverContext.Provider
        value={useMemo(
          () => ({
            open,
            setOpen,
          }),
          [setOpen, open],
        )}
      >
        <Collapsible open={open} onOpenChange={setOpen} asChild>
          <header
            ref={ref}
            id="nd-tocnav"
            {...props}
            className={cn(
              'border-b backdrop-blur-sm transition-colors',
              (!isTransparent || open) && 'bg-fd-background/80',
              open && 'shadow-lg',
            )}
          >
            {props.children}
          </header>
        </Collapsible>
      </TocPopoverContext.Provider>
    </div>
  );
}

export function PageBody({
  className,
  style,
  children,
  ...props
}: ComponentProps<'div'>) {
  const { page } = usePageStyles();
  const { collapsed } = useSidebar();

  return (
    <div
      id="nd-page"
      {...props}
      className={cn(className, page)}
      style={{
        maxWidth: collapsed
          ? 'var(--fd-page-width)'
          : 'min(var(--fd-page-width),calc(var(--fd-layout-width) - var(--fd-sidebar-width)))',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function PageArticle(props: ComponentProps<'article'>) {
  const { article } = usePageStyles();

  return (
    <article
      {...props}
      className={cn(
        'flex min-w-0 w-full flex-col gap-6 px-4 pt-8 md:px-6 md:pt-12 xl:px-12 xl:mx-auto',
        article,
        props.className,
      )}
    >
      {props.children}
    </article>
  );
}

export function LastUpdate(props: { date: Date }) {
  const { text } = useI18n();
  const [date, setDate] = useState('');

  useEffect(() => {
    // to the timezone of client
    setDate(props.date.toLocaleDateString());
  }, [props.date]);

  return (
    <p className="text-sm text-fd-muted-foreground">
      {text.lastUpdate} {date}
    </p>
  );
}

type Item = Pick<PageTree.Item, 'name' | 'description' | 'url'>;
export interface FooterProps {
  /**
   * Items including information for the next and previous page
   */
  items?: {
    previous?: Item;
    next?: Item;
  };
}

function scanNavigationList(tree: PageTree.Node[]) {
  const list: PageTree.Item[] = [];

  tree.forEach((node) => {
    if (node.type === 'folder') {
      if (node.index) {
        list.push(node.index);
      }

      list.push(...scanNavigationList(node.children));
      return;
    }

    if (node.type === 'page' && !node.external) {
      list.push(node);
    }
  });

  return list;
}

const listCache = new WeakMap<PageTree.Root, PageTree.Item[]>();

export function Footer({ items }: FooterProps) {
  const { root } = useTreeContext();
  const pathname = usePathname();

  const { previous, next } = useMemo(() => {
    if (items) return items;

    const cached = listCache.get(root);
    const list = cached ?? scanNavigationList(root.children);
    listCache.set(root, list);

    const idx = list.findIndex((item) => isActive(item.url, pathname, false));

    if (idx === -1) return {};
    return {
      previous: list[idx - 1],
      next: list[idx + 1],
    };
  }, [items, pathname, root]);

  return (
    <div
      className={cn(
        '@container grid gap-4 pb-6',
        previous && next ? 'grid-cols-2' : 'grid-cols-1',
      )}
    >
      {previous ? <FooterItem item={previous} index={0} /> : null}
      {next ? <FooterItem item={next} index={1} /> : null}
    </div>
  );
}

function FooterItem({ item, index }: { item: Item; index: 0 | 1 }) {
  const { text } = useI18n();
  const Icon = index === 0 ? ChevronLeft : ChevronRight;

  return (
    <Link
      href={item.url}
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-4 text-sm transition-colors hover:bg-fd-accent/80 hover:text-fd-accent-foreground @max-lg:col-span-full',
        index === 1 && 'text-end',
      )}
    >
      <div
        className={cn(
          'inline-flex items-center gap-1.5 font-medium',
          index === 1 && 'flex-row-reverse',
        )}
      >
        <Icon className="-mx-1 size-4 shrink-0 rtl:rotate-180" />
        <p>{item.name}</p>
      </div>
      <p className="text-fd-muted-foreground truncate">
        {item.description ?? (index === 0 ? text.previousPage : text.nextPage)}
      </p>
    </Link>
  );
}

export type BreadcrumbProps = BreadcrumbOptions;

export function Breadcrumb(options: BreadcrumbProps) {
  const path = useTreePath();
  const { root } = useTreeContext();
  const items = useMemo(() => {
    return getBreadcrumbItemsFromPath(root, path, {
      includePage: options.includePage ?? false,
      ...options,
    });
  }, [options, path, root]);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-row items-center gap-1.5 text-[15px] text-fd-muted-foreground">
      {items.map((item, i) => {
        const className = cn(
          'truncate',
          i === items.length - 1 && 'text-fd-primary font-medium',
        );

        return (
          <Fragment key={i}>
            {i !== 0 && <span className="text-fd-foreground/30">/</span>}
            {item.url ? (
              <Link
                href={item.url}
                className={cn(className, 'transition-opacity hover:opacity-80')}
              >
                {item.name}
              </Link>
            ) : (
              <span className={className}>{item.name}</span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
