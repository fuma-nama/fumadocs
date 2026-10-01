'use client';
import { Popover } from '@base-ui/react/popover';
import * as Base from '@/components/toc';
import * as TocDefault from '@/components/toc/default';
import * as TocClerk from '@/components/toc/clerk';
import * as TocBlock from '@/components/toc/block';
import { useTreePath } from '@/contexts/tree';
import { cn } from '@/utils/cn';
import { useTranslations } from '@fuma-translate/react';
import { ChevronDownIcon, TextIcon } from 'lucide-react';
import { type ComponentProps, type ReactNode, useState } from 'react';

const variants = { normal: TocDefault, clerk: TocClerk, block: TocBlock };

export type TOCProviderProps = Base.TOCProviderProps;

export function TOCProvider(props: TOCProviderProps) {
  return <Base.TOCProvider {...props} />;
}

type TOCStyle =
  | { style?: 'block'; list?: TocBlock.TOCItemsProps }
  | { style: 'normal'; list?: TocDefault.TOCItemsProps }
  | { style: 'clerk'; list?: TocClerk.TOCItemsProps };

export type TOCProps = {
  container?: ComponentProps<'div'>;
  /**
   * Custom content in TOC container, before the main TOC
   */
  header?: ReactNode;
  /**
   * Custom content in TOC container, after the main TOC
   */
  footer?: ReactNode;
} & TOCStyle;

export function TOC({ container, header, footer, style = 'block', list }: TOCProps) {
  const t = useTranslations({ note: 'table of contents' });
  const items = Base.useTOCItems();
  const { TOCItems, TOCItem } = variants[style];
  if (items.length === 0 && !header && !footer) return;

  return (
    <div
      id="nd-toc"
      {...container}
      className={cn(
        'sticky top-12 flex flex-col w-60 shrink-0 h-[calc(var(--fd-layout-height)-var(--spacing)*16-2px)] pt-10 pb-4 max-xl:hidden',
        container?.className,
      )}
    >
      {header}
      <h3 className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground">
        <TextIcon className="size-4" />
        {t('On this page')}
      </h3>
      <Base.TOCScrollArea>
        <TOCItems {...list}>
          {items.map((item) => (
            <TOCItem key={item.url} item={item} />
          ))}
        </TOCItems>
      </Base.TOCScrollArea>
      {footer}
    </div>
  );
}

export type TOCPopoverProps = {
  trigger?: ComponentProps<'button'>;
  content?: ComponentProps<'div'>;
  header?: ReactNode;
  footer?: ReactNode;
} & TOCStyle;

export function TOCPopover({
  trigger,
  content,
  header,
  footer,
  style = 'block',
  list,
}: TOCPopoverProps) {
  const t = useTranslations({ note: 'table of contents' });
  const items = Base.useItems();
  const page = useTreePath().at(-1);
  const [open, setOpen] = useState(false);
  const { TOCItems, TOCItem } = variants[style];
  const active = items.findLast((item) => item.active);
  if (items.length === 0 && !header && !footer) return;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        {...trigger}
        className={cn(
          'flex items-center gap-2.5 min-w-0 h-8 px-2 -mx-2 rounded-lg text-start text-sm text-fd-muted-foreground transition-colors hover:bg-fd-accent/60 hover:text-fd-accent-foreground data-popup-open:bg-fd-accent data-popup-open:text-fd-accent-foreground',
          trigger?.className,
        )}
      >
        <ProgressCircle
          value={(items.findLastIndex((item) => item.active) + 1) / Math.max(1, items.length)}
          className="shrink-0"
        />
        <span className="grid min-w-0 *:col-start-1 *:row-start-1 *:truncate">
          <span
            className={cn(
              'transition-[opacity,translate] duration-300',
              active && 'opacity-0 -translate-y-2',
            )}
          >
            {page?.name ?? t('On this page')}
          </span>
          <span
            className={cn(
              'text-fd-foreground transition-[opacity,translate] duration-300',
              !active && 'opacity-0 translate-y-2',
            )}
          >
            {active?.original.title}
          </span>
        </span>
        <ChevronDownIcon className="size-3.5 shrink-0" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="start"
          sideOffset={8}
          positionMethod="fixed"
          className="z-50"
        >
          <Popover.Popup
            {...content}
            className={cn(
              'flex flex-col w-[min(22rem,calc(100vw-1rem))] max-h-[min(28rem,var(--available-height))] p-3 rounded-2xl border bg-fd-popover text-fd-popover-foreground shadow-xl outline-none origin-(--transform-origin) transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-95',
              content?.className,
            )}
          >
            {header}
            <Base.TOCScrollArea className="py-1">
              <TOCItems {...list}>
                {items.map((item) => (
                  <TOCItem
                    key={item.original.url}
                    item={item.original}
                    onClick={() => setOpen(false)}
                  />
                ))}
              </TOCItems>
            </Base.TOCScrollArea>
            {footer}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ProgressCircle({ value, ...props }: ComponentProps<'svg'> & { value: number }) {
  const size = 16;
  const radius = size / 2 - 1.5;
  const circumference = 2 * Math.PI * radius;

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
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={1.5}
        className="stroke-current/25"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={1.5}
        stroke="currentColor"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - value)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-[stroke-dashoffset] duration-300"
      />
    </svg>
  );
}
