'use client';

import * as Base from '@/components/toc';
import { useI18n } from '@/contexts/i18n';
import { useTreePath } from '@/contexts/tree';
import { cn } from '@/utils/cn';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import {
  type ComponentProps,
  type ReactNode,
  createContext,
  use,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as TocDefault from '@/components/toc/default';
import * as TocClerk from '@/components/toc/clerk';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';

const TocPopoverContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

export type TOCProviderProps = Base.TOCProviderProps;

export const { TOCProvider } = Base;

export interface TOCProps {
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

export function TOC({ container, trigger, content, header, footer, style = 'normal' }: TOCProps) {
  const items = Base.useTOCItems();
  const { TOCItems, TOCEmpty, TOCItem } = style === 'clerk' ? TocClerk : TocDefault;

  return (
    <PageTOCPopover {...container}>
      <PageTOCPopoverContent {...content}>
        {header}
        <Base.TOCScrollArea>
          <TOCItems>
            {items.length === 0 && <TOCEmpty />}
            {items.map((item) => (
              <TOCItem key={item.url} item={item} />
            ))}
          </TOCItems>
        </Base.TOCScrollArea>
        {footer}
      </PageTOCPopoverContent>
      <PageTOCPopoverTrigger {...trigger} />
    </PageTOCPopover>
  );
}

function PageTOCPopover(props: ComponentProps<'div'>) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const element = document.getElementById('flux-layout-slot');
    if (!element) return;
    setContainer(element);
  }, []);

  if (!container) return;
  return createPortal(<PageTOCPopoverPhysical {...props} />, container);
}

function PageTOCPopoverPhysical({ className, children, ...rest }: ComponentProps<'div'>) {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

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
        className={cn('relative h-9 animate-fd-fade-in', className)}
        {...rest}
      >
        <header
          ref={ref}
          className={cn(
            'absolute w-full bottom-0 border rounded-xl transition-colors bg-fd-secondary text-fd-secondary-foreground backdrop-blur-sm',
            open && 'shadow-lg bg-fd-popover/80 text-fd-popover-foreground',
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
  const items = Base.useItems();
  const selectedIdx = items.findIndex((item) => item.active);
  const path = useTreePath().at(-1);
  const spanProps = {
    transition: {
      duration: 0.1,
    },
    initial: {
      opacity: 0,
      y: 10,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
    exit: {
      opacity: 0,
      y: -10,
    },
    className: cn(open && 'text-fd-popover-foreground'),
  };

  return (
    <CollapsibleTrigger
      className={cn(
        'flex w-full h-8.5 items-center text-sm text-fd-muted-foreground gap-2.5 px-2 text-start focus-visible:outline-none [&_svg]:size-4',
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
      <AnimatePresence mode="wait">
        {items[selectedIdx] && !open ? (
          <motion.span key={selectedIdx} {...spanProps}>
            {items[selectedIdx].original.title}
          </motion.span>
        ) : path ? (
          <motion.span key={path.$id ?? ':pathId'} {...spanProps}>
            {path.name}
          </motion.span>
        ) : (
          <motion.span key=":toc" {...spanProps}>
            {text.toc}
          </motion.span>
        )}
      </AnimatePresence>

      <ChevronDown className={cn('ms-auto shrink-0 transition-transform', open && 'rotate-180')} />
    </CollapsibleTrigger>
  );
}

interface ProgressCircleProps extends Omit<ComponentProps<'svg'>, 'strokeWidth'> {
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
      <div className="flex flex-col px-2 max-h-[50vh]">{props.children}</div>
    </CollapsibleContent>
  );
}
