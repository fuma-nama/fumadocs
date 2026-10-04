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
  useRef,
  useState,
} from 'react';
import { useTreePath } from '@/contexts/tree';
import { useSpaciousLayout } from '../..';

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
  const {
    props: { aiChat },
  } = useSpaciousLayout();
  if (items.length === 0 && !header && !footer) return;

  return (
    <div
      id="nd-toc"
      {...container}
      className={cn(
        'sticky top-0 flex flex-col shrink-0 w-(--fd-toc-width) h-full ps-16 pt-6 pb-4 overflow-clip *:min-w-[calc(var(--fd-toc-width)---spacing(16))] layout:[--fd-toc-width:--spacing(76)] transition-[width,padding,opacity,visibility] duration-300 ease-in-out motion-reduce:transition-none max-md:hidden',
        // collapse along with AI chat
        aiChat?.open && aiChat.panel
          ? 'invisible w-0 ps-0 opacity-0'
          : // not animated, container queries may resolve after the initial render
            '@max-5xl:invisible @max-5xl:w-0 @max-5xl:ps-0 @max-5xl:opacity-0 @max-5xl:transition-none',
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

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      {...container}
      className={cn('max-md:layout:[--fd-toc-popover-height:--spacing(10)]', container?.className)}
    >
      <header ref={ref} className="bg-fd-card">
        <CollapsibleTrigger
          {...trigger}
          className={cn(
            'flex w-full h-10 items-center gap-2.5 px-4 text-start text-sm text-fd-muted-foreground focus-visible:outline-none',
            trigger?.className,
          )}
        >
          <TOCProgress size={18} className={cn('shrink-0', open && 'text-fd-primary')} />
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
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        {...trigger}
        className={cn(
          'flex items-center gap-2 min-w-0 h-8 px-1.5 -mx-1.5 rounded-lg text-start text-sm transition-colors',
          open
            ? 'bg-fd-accent text-fd-accent-foreground'
            : 'text-fd-muted-foreground hover:bg-fd-accent/60 hover:text-fd-accent-foreground',
          trigger?.className,
        )}
      >
        <TOCProgress className="shrink-0" />
        <ActiveHeading fallback={t('On this page')} activeClassName="text-fd-foreground" />
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
  const { TOCItems, TOCItem, TOCEmpty } = variants[style];

  return (
    <Base.TOCScrollArea className={className}>
      <TOCItems {...list}>
        {items.length === 0 && <TOCEmpty />}
        {items.map((item) => (
          <TOCItem key={item.url} item={item} onClick={onSelect} />
        ))}
      </TOCItems>
    </Base.TOCScrollArea>
  );
}

/** rolls in from the direction of scrolling */
function ActiveHeading({
  fallback,
  className,
  activeClassName,
}: {
  fallback: ReactNode;
  className?: string;
  activeClassName?: string;
}) {
  const items = Base.useTOCItems();
  const active = useTOCSelector(selectTopmost);
  const [shown, setShown] = useState({ item: active, roll: 1 });
  if (shown.item !== active) {
    setShown({ item: active, roll: items.indexOf(active!) >= items.indexOf(shown.item!) ? 1 : -1 });
  }

  return (
    <span className={cn('flex min-w-0 overflow-hidden', active && activeClassName, className)}>
      <span
        key={active?.url}
        className="truncate motion-safe:animate-fd-roll-in"
        style={{ '--fd-roll': shown.roll } as CSSProperties}
      >
        {active ? active.title : fallback}
      </span>
    </span>
  );
}

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
