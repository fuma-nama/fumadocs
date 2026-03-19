'use client';
import { TOCScrollArea, useTOCItems } from '@/components/toc';
import { useI18n } from '@/contexts/i18n';
import { useTreePath } from '@/contexts/tree';
import { cn } from '@/utils/cn';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { useActiveAnchor } from 'fumadocs-core/toc';
import { ChevronDown } from 'lucide-react';
import {
  ComponentProps,
  useRef,
  useState,
  useEffectEvent,
  useEffect,
  useMemo,
  use,
  createContext,
  ReactNode,
} from 'react';
import { useDocsLayout } from '@/layouts/docs/client';
import * as TocDefault from '@/components/toc/default';
import * as TocClerk from '@/components/toc/clerk';

const TocPopoverContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

export interface TOCPopoverProps {
  container?: ComponentProps<'div'>;
  trigger?: ComponentProps<'button'>;
  content?: ComponentProps<'div'>;

  /**
   * Custom content in TOC container, before the main TOC
   */
  header?: ReactNode;

  /**
   * Custom content in TOC container, after the main TOC
   */
  footer?: ReactNode;

  /**
   * @defaultValue 'normal'
   */
  style?: 'normal' | 'clerk';
}

export function TOCPopover({
  container,
  trigger,
  content,
  header,
  footer,
  style,
}: TOCPopoverProps) {
  return (
    <PageTOCPopover {...container}>
      <PageTOCPopoverTrigger {...trigger} />
      <PageTOCPopoverContent {...content}>
        {header}
        <TOCScrollArea>
          {style === 'clerk' ? <TocClerk.TOCItems /> : <TocDefault.TOCItems />}
        </TOCScrollArea>
        {footer}
      </PageTOCPopoverContent>
    </PageTOCPopover>
  );
}

function PageTOCPopover({ className, children, ...rest }: ComponentProps<'div'>) {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const { isNavTransparent } = useDocsLayout();

  const onClick = useEffectEvent((e: Event) => {
    if (!open) return;

    if (ref.current && !ref.current.contains(e.target as HTMLElement)) setOpen(false);
  });

  useEffect(() => {
    window.addEventListener('click', onClick);

    return () => {
      window.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <TocPopoverContext
      value={useMemo(
        () => ({
          open,
          setOpen,
        }),
        [setOpen, open],
      )}
    >
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        data-toc-popover=""
        className={cn(
          'sticky top-(--fd-docs-row-2) z-10 [grid-area:toc-popover] h-(--fd-toc-popover-height) xl:hidden max-xl:layout:[--fd-toc-popover-height:--spacing(10)]',
          className,
        )}
        {...rest}
      >
        <header
          ref={ref}
          className={cn(
            'border-b backdrop-blur-sm transition-colors',
            (!isNavTransparent || open) && 'bg-fd-background/80',
            open && 'shadow-lg',
          )}
        >
          {children}
        </header>
      </Collapsible>
    </TocPopoverContext>
  );
}

function PageTOCPopoverTrigger({ className, ...props }: ComponentProps<'button'>) {
  const { text } = useI18n();
  const { open } = use(TocPopoverContext)!;
  const items = useTOCItems();
  const active = useActiveAnchor();
  const selected = useMemo(
    () => items.findIndex((item) => active === item.url.slice(1)),
    [items, active],
  );
  const path = useTreePath().at(-1);
  const showItem = selected !== -1 && !open;

  return (
    <CollapsibleTrigger
      className={cn(
        'flex w-full h-10 items-center text-sm text-fd-muted-foreground gap-2.5 px-4 py-2.5 text-start focus-visible:outline-none [&_svg]:size-4 md:px-6',
        className,
      )}
      data-toc-popover-trigger=""
      {...props}
    >
      <ProgressCircle
        value={(selected + 1) / Math.max(1, items.length)}
        max={1}
        className={cn('shrink-0', open && 'text-fd-primary')}
      />
      <span className="grid flex-1 *:my-auto *:row-start-1 *:col-start-1">
        <span
          className={cn(
            'truncate transition-[opacity,translate,color]',
            open && 'text-fd-foreground',
            showItem && 'opacity-0 -translate-y-full pointer-events-none',
          )}
        >
          {path?.name ?? text.toc}
        </span>
        <span
          className={cn(
            'truncate transition-[opacity,translate]',
            !showItem && 'opacity-0 translate-y-full pointer-events-none',
          )}
        >
          {items[selected]?.title}
        </span>
      </span>
      <ChevronDown className={cn('shrink-0 transition-transform mx-0.5', open && 'rotate-180')} />
    </CollapsibleTrigger>
  );
}

interface ProgressCircleProps extends Omit<React.ComponentProps<'svg'>, 'strokeWidth'> {
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

function PageTOCPopoverContent(props: ComponentProps<'div'>) {
  return (
    <CollapsibleContent
      data-toc-popover-content=""
      {...props}
      className={cn('flex flex-col px-4 max-h-[50vh] md:px-6', props.className)}
    >
      {props.children}
    </CollapsibleContent>
  );
}
