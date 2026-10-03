'use client';
import { Popover } from '@base-ui/react/popover';
import { type TOCItemInfo, useTOCSelector } from 'fumadocs-core/toc';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import * as Base from '@/components/toc';
import * as TocDefault from '@/components/toc/default';
import * as TocClerk from '@/components/toc/clerk';
import * as TocBlock from '@/components/toc/block';
import { cn } from '@/utils/cn';
import { useTranslations } from '@fuma-translate/react';
import { ChevronDownIcon, TextIcon } from 'lucide-react';
import {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useTreePath } from '@/contexts/tree';

const variants = { normal: TocDefault, clerk: TocClerk, block: TocBlock };

// selectors to re-render only when the value changes
const selectTopmost = (items: TOCItemInfo[]) => items.find((item) => item.active)?.original;
const selectProgress = (items: TOCItemInfo[]) =>
  (items.findLastIndex((item) => item.active) + 1) / Math.max(1, items.length);

export type TOCProviderProps = Base.TOCProviderProps;

export function TOCProvider(props: TOCProviderProps) {
  return <Base.TOCProvider {...props} />;
}

type TOCStyle =
  | { style?: 'block'; list?: TocBlock.TOCItemsProps }
  | { style: 'normal'; list?: TocDefault.TOCItemsProps }
  | { style: 'clerk'; list?: TocClerk.TOCItemsProps };

type TOCContent = {
  /**
   * Custom content in TOC container, before the main TOC
   */
  header?: ReactNode;
  /**
   * Custom content in TOC container, after the main TOC
   */
  footer?: ReactNode;
} & TOCStyle;

export type TOCProps = TOCContent & { container?: ComponentProps<'div'> };

export function TOC({ container, header, footer, ...props }: TOCProps) {
  const t = useTranslations({ note: 'table of contents' });
  const items = Base.useTOCItems();
  if (items.length === 0 && !header && !footer) return;

  return (
    <div
      id="nd-toc"
      {...container}
      className={cn(
        'sticky top-0 flex flex-col w-60 shrink-0 h-[calc(var(--fd-layout-height)-var(--spacing)*18-2px)] pt-6 pb-4 overflow-clip *:min-w-60 transition-[opacity,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none max-md:hidden',
        // collapse on narrower panel, not animated as some browsers (e.g. Firefox) resolve container queries after the initial render
        '@max-[62rem]:invisible @max-[62rem]:w-0 @max-[62rem]:-ms-16 @max-[62rem]:opacity-0 @max-[62rem]:not-in-data-[ai-chat]:transition-none',
        // or along with the panel when opening AI chat, before it squeezes the content
        'in-data-[ai-chat]:invisible in-data-[ai-chat]:w-0 in-data-[ai-chat]:-ms-16 in-data-[ai-chat]:opacity-0',
        container?.className,
      )}
    >
      {header}
      <h3 className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground">
        <TextIcon className="size-4" />
        {t('On this page')}
      </h3>
      <TOCList {...props} />
      {footer}
    </div>
  );
}

export type TOCDropdownProps = TOCContent & {
  trigger?: ComponentProps<'button'>;
  content?: ComponentProps<'div'>;
};

export type TOCPopoverProps = TOCDropdownProps & { container?: ComponentProps<'div'> };

/** the TOC bar for mobile */
export function TOCPopover({
  container,
  trigger,
  content,
  header,
  footer,
  ...props
}: TOCPopoverProps) {
  const t = useTranslations({ note: 'table of contents' });
  const items = Base.useTOCItems();
  const page = useTreePath().at(-1);
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (e.target instanceof Node && !ref.current?.contains(e.target)) setOpen(false);
    };

    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [open]);

  if (items.length === 0 && !header && !footer) return;
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      {...container}
      // expand over the content below
      className={cn('sticky top-14 z-10 h-10 md:hidden', container?.className)}
    >
      <header
        ref={ref}
        className={cn(
          'border-b bg-fd-background/80 backdrop-blur-sm transition-shadow',
          open && 'shadow-lg',
        )}
      >
        <CollapsibleTrigger
          {...trigger}
          className={cn(
            'flex w-full h-10 items-center gap-2.5 px-4 text-start text-sm text-fd-muted-foreground focus-visible:outline-none',
            trigger?.className,
          )}
        >
          <TOCProgress size={18} className={cn('shrink-0', open && 'text-fd-primary')} />
          {/* the page title is no longer visible after scrolling */}
          <ActiveHeading
            fallback={page?.name ?? t('On this page')}
            className={cn('flex-1 transition-colors', open && 'text-fd-foreground')}
          />
          <ChevronDownIcon
            className={cn('size-4 shrink-0 mx-0.5 transition-transform', open && 'rotate-180')}
          />
        </CollapsibleTrigger>
        <CollapsibleContent {...content}>
          <div className="flex flex-col px-4 max-h-[50vh]">
            {header}
            <TOCList {...props} onSelect={() => setOpen(false)} />
            {footer}
          </div>
        </CollapsibleContent>
      </header>
    </Collapsible>
  );
}

/** the TOC dropdown for page header */
export function TOCDropdown({ trigger, content, header, footer, ...props }: TOCDropdownProps) {
  const t = useTranslations({ note: 'table of contents' });
  const items = Base.useTOCItems();
  const [open, setOpen] = useState(false);
  if (items.length === 0 && !header && !footer) return;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        {...trigger}
        className={cn(
          'flex items-center gap-2 min-w-0 h-8 px-1.5 -mx-1.5 rounded-lg text-start text-sm text-fd-muted-foreground transition-colors hover:bg-fd-accent/60 hover:text-fd-accent-foreground data-popup-open:bg-fd-accent data-popup-open:text-fd-accent-foreground',
          trigger?.className,
        )}
      >
        <TOCProgress className="shrink-0" />
        <ActiveHeading
          fallback={t('On this page')}
          className="data-[active=true]:text-fd-foreground"
        />
        <ChevronDownIcon
          className={cn('size-3.5 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align="start" sideOffset={8} positionMethod="fixed" className="z-50">
          <Popover.Popup
            {...content}
            className={cn(
              'flex flex-col w-[min(22rem,calc(100vw-1rem))] max-h-[min(28rem,var(--available-height))] p-3 rounded-2xl border bg-fd-popover text-fd-popover-foreground shadow-xl outline-none origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-95 motion-reduce:transition-none',
              content?.className,
            )}
          >
            {header}
            <TOCList {...props} className="py-1" onSelect={() => setOpen(false)} />
            {footer}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function TOCList({
  style = 'block',
  list,
  className,
  onSelect,
}: TOCStyle & { className?: string; onSelect?: () => void }) {
  const items = Base.useTOCItems();
  const { TOCItems, TOCItem } = variants[style];

  return (
    <Base.TOCScrollArea className={className}>
      <TOCItems {...list}>
        {items.map((item) => (
          <TOCItem key={item.url} item={item} onClick={onSelect} />
        ))}
      </TOCItems>
    </Base.TOCScrollArea>
  );
}

/**
 * The active heading, settled so fast scrolling won't flicker it.
 */
function ActiveHeading({ fallback, className }: { fallback: ReactNode; className?: string }) {
  const items = Base.useTOCItems();
  const active = useTOCSelector(selectTopmost);
  const [shown, setShown] = useState({ item: active, roll: 1 });
  const ref = useRef<HTMLSpanElement>(null);
  const width = useRef(0);
  const pendingSince = useRef<number | null>(null);

  useEffect(() => {
    if (active === shown.item) {
      pendingSince.current = null;
      return;
    }

    // wait 150ms to settle, but don't hold it for over 600ms during a long scroll
    pendingSince.current ??= performance.now();
    const delay = Math.min(150, pendingSince.current + 600 - performance.now());
    const timer = window.setTimeout(() => {
      pendingSince.current = null;
      // the visible width before swapping, it can be in the middle of a glide
      width.current = ref.current?.offsetWidth ?? 0;
      // roll in from the direction of scrolling
      const roll = items.indexOf(active!) >= items.indexOf(shown.item!) ? 1 : -1;
      setShown({ item: active, roll });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [items, active, shown]);

  // glide to the width of new heading
  useLayoutEffect(() => {
    const element = ref.current;
    const from = width.current;
    if (!element || from === 0) return;
    for (const animation of element.getAnimations()) animation.cancel();
    element.removeAttribute('data-gliding');
    const to = element.offsetWidth;
    if (from === to || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // clip instead of ellipsis while gliding
    element.setAttribute('data-gliding', '');
    element.animate([{ width: `${from}px` }, { width: `${to}px` }], {
      duration: 320,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    }).onfinish = () => element.removeAttribute('data-gliding');
  }, [shown]);

  return (
    <span
      ref={ref}
      data-active={shown.item !== undefined}
      className={cn('flex min-w-0 overflow-hidden', className)}
    >
      <span
        key={shown.item?.url}
        className="truncate in-data-gliding:text-clip motion-safe:animate-fd-roll-in"
        style={{ '--fd-roll': shown.roll } as CSSProperties}
      >
        {shown.item ? shown.item.title : fallback}
      </span>
    </span>
  );
}

/** the reading progress of page */
function TOCProgress({ size = 16, ...props }: ComponentProps<'svg'> & { size?: number }) {
  const value = useTOCSelector(selectProgress);
  const circle = { cx: size / 2, cy: size / 2, r: size / 2 - 1.5, fill: 'none', strokeWidth: 1.5 };
  const circumference = 2 * Math.PI * circle.r;

  return (
    <svg
      role="progressbar"
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={1}
      {...props}
    >
      <circle {...circle} className="stroke-current/25" />
      <circle
        {...circle}
        stroke="currentColor"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - value)}
        transform={`rotate(-90 ${circle.cx} ${circle.cy})`}
        className="transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  );
}
