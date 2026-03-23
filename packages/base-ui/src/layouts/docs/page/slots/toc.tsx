'use client';
import * as TocDefault from '@/components/toc/default';
import * as TocClerk from '@/components/toc/clerk';
import * as Base from '@/components/toc';
import { I18nLabel, useI18n } from '@/contexts/i18n';
import { cn } from '@/utils/cn';
import { ChevronDown, Text } from 'lucide-react';
import {
  createContext,
  use,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { useTreePath } from '@/contexts/tree';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { useDocsLayout } from '../..';

export type TOCProviderProps = Base.TOCProviderProps;

export function TOCProvider(props: TOCProviderProps) {
  return <Base.TOCProvider {...props} />;
}

export interface TOCProps {
  container?: ComponentProps<'div'>;
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

export function TOC({ container, header, footer, style = 'normal' }: TOCProps) {
  const items = Base.useTOCItems();
  const { TOCItems, TOCEmpty, TOCItem } = style === 'clerk' ? TocClerk : TocDefault;

  return (
    <div
      id="nd-toc"
      {...container}
      className={cn(
        'sticky top-(--fd-docs-row-1) h-[calc(var(--fd-docs-height)-var(--fd-docs-row-1))] flex flex-col [grid-area:toc] w-(--fd-toc-width) pt-12 pe-4 pb-2 max-xl:hidden',
        container?.className,
      )}
    >
      {header}
      <h3
        id="toc-title"
        className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground"
      >
        <Text className="size-4" />
        <I18nLabel label="toc" />
      </h3>
      <Base.TOCScrollArea>
        <TOCItems>
          {items.length === 0 && <TOCEmpty />}
          {items.map((item) => (
            <TOCItem key={item.url} item={item} />
          ))}
        </TOCItems>
      </Base.TOCScrollArea>
      {footer}
    </div>
  );
}

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
  style = 'normal',
}: TOCPopoverProps) {
  const items = Base.useTOCItems();
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const { isNavTransparent } = useDocsLayout();
  const { TOCItems, TOCItem, TOCEmpty } = style === 'clerk' ? TocClerk : TocDefault;

  const onClickOutside = useEffectEvent((e: Event) => {
    if (!open || !(e.target instanceof HTMLElement)) return;

    if (ref.current && !ref.current.contains(e.target)) setOpen(false);
  });

  const onClickItem = () => {
    setOpen(false);
  };

  useEffect(() => {
    window.addEventListener('click', onClickOutside);

    return () => {
      window.removeEventListener('click', onClickOutside);
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
        {...container}
        className={cn(
          'sticky top-(--fd-docs-row-2) z-10 [grid-area:toc-popover] h-(--fd-toc-popover-height) xl:hidden max-xl:layout:[--fd-toc-popover-height:--spacing(10)]',
          container?.className,
        )}
      >
        <header
          ref={ref}
          className={cn(
            'border-b backdrop-blur-sm transition-colors',
            (!isNavTransparent || open) && 'bg-fd-background/80',
            open && 'shadow-lg',
          )}
        >
          <PageTOCPopoverTrigger {...trigger} />
          <PageTOCPopoverContent {...content}>
            {header}
            <Base.TOCScrollArea>
              <TOCItems>
                {items.length === 0 && <TOCEmpty />}
                {items.map((item) => (
                  <TOCItem key={item.url} item={item} onClick={onClickItem} />
                ))}
              </TOCItems>
            </Base.TOCScrollArea>
            {footer}
          </PageTOCPopoverContent>
        </header>
      </Collapsible>
    </TocPopoverContext>
  );
}

function PageTOCPopoverTrigger({ className, ...props }: ComponentProps<'button'>) {
  const { text } = useI18n();
  const { open } = use(TocPopoverContext)!;
  const items = Base.useItems();
  const selectedIdx = items.findIndex((item) => item.active);
  const path = useTreePath().at(-1);
  const showItem = selectedIdx !== -1 && !open;

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
        value={(selectedIdx + 1) / Math.max(1, items.length)}
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
          {items[selectedIdx]?.original.title}
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
    <CollapsibleContent data-toc-popover-content="" {...props}>
      <div className="flex flex-col px-4 max-h-[50vh] md:px-6">{props.children}</div>
    </CollapsibleContent>
  );
}
