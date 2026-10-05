'use client';
import { Collapsible } from '@base-ui/react/collapsible';
import { useTranslations } from '@fuma-translate/react';
import { cn } from 'cn';
import Link from 'fumadocs-core/link';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { ChevronRightIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Spinner, stagger } from './utils/motion';

export function ChatMessage({
  from,
  className,
  children,
  ...props
}: ComponentProps<'div'> & { from: 'user' | 'assistant' }) {
  if (from === 'user') {
    return (
      <div className={cn('flex justify-end motion-safe:animate-fd-roll-in', className)} {...props}>
        <p className="max-w-[85%] rounded-xl bg-fd-secondary px-3 py-1.5 text-sm whitespace-pre-wrap wrap-break-word text-fd-secondary-foreground">
          {children}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('group/message flex flex-col gap-3 empty:hidden', className)} {...props}>
      {children}
    </div>
  );
}

export function ChatSources({ className, ...props }: ComponentProps<'ol'>) {
  const t = useTranslations({ note: 'AI chat' });

  return (
    <ol
      aria-label={t('Sources', { note: 'aria-label' })}
      className={cn('flex flex-wrap gap-1.5', className)}
      {...props}
    />
  );
}

export function ChatSource({
  label,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { label: string }) {
  return (
    <li className="motion-safe:animate-fd-roll-in" style={stagger()}>
      <Link
        className={cn(
          'flex h-7 max-w-56 items-center gap-1.5 rounded-lg border bg-fd-card ps-1.5 pe-2 text-xs text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground',
          className,
        )}
        {...props}
      >
        <span className="flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-md bg-fd-secondary px-1 font-mono text-[10.5px] tabular-nums">
          {label}
        </span>
        <span className="truncate">{children}</span>
      </Link>
    </li>
  );
}

/** shown a beat late, so quick answers never flash it */
export function ChatThinking({ children }: { children?: ReactNode }) {
  const t = useTranslations({ note: 'AI chat' });

  return (
    <div
      role="status"
      className="flex items-center gap-2 text-sm text-fd-muted-foreground motion-safe:animate-fd-fade-in"
      style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
    >
      <Spinner />
      <span className="motion-safe:animate-pulse">{children ?? t('Thinking')}</span>
    </div>
  );
}

/**
 * A step the assistant took, such as a search, expandable to its details.
 */
export function ChatActivity({
  icon,
  running = false,
  label,
  detail,
  meta,
  children,
}: {
  icon: ReactNode;
  running?: boolean;
  label: ReactNode;
  detail?: string;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Collapsible.Root disabled={!children} className="motion-safe:animate-fd-fade-in">
      <Collapsible.Trigger className="group/trigger -ms-1 flex max-w-full items-center gap-2 rounded-md py-0.5 ps-1 pe-1.5 text-start text-sm text-fd-muted-foreground transition-colors not-data-disabled:hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring">
        <span className="flex w-4 shrink-0 justify-center [&_svg]:size-3.5">
          {running ? <Spinner /> : icon}
        </span>
        <span className={cn('shrink-0', running && 'motion-safe:animate-pulse')}>{label}</span>
        {detail && <span className="truncate text-fd-muted-foreground/75">{detail}</span>}
        {meta && (
          <span className="shrink-0 text-xs text-fd-muted-foreground/75 tabular-nums">{meta}</span>
        )}
        <ChevronRightIcon className="size-3.5 shrink-0 opacity-50 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-disabled/trigger:hidden group-data-panel-open/trigger:rotate-90 rtl:rotate-180 motion-reduce:transition-none" />
      </Collapsible.Trigger>
      <Collapsible.Panel className="h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0 data-starting-style:opacity-0 motion-reduce:transition-none">
        <div className="ms-[7.5px] mt-1.5 flex flex-col gap-1 border-s ps-4 pb-1 text-xs text-fd-muted-foreground">
          {children}
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

/**
 * A failed answer, with the reason as its children.
 */
export function ChatError({ children, onRetry }: { children?: ReactNode; onRetry?: () => void }) {
  const t = useTranslations({ note: 'AI chat' });

  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-lg bg-fd-error/5 py-2 ps-3 pe-2 text-sm ring-1 ring-fd-error/15 motion-safe:animate-fd-roll-in"
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-fd-error" />
      <div className="min-w-0 flex-1">
        <p>{t('Something went wrong.')}</p>
        {children && (
          <p className="line-clamp-2 text-xs wrap-break-word text-fd-muted-foreground">
            {children}
          </p>
        )}
      </div>
      {onRetry && (
        <button
          type="button"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}
          onClick={onRetry}
        >
          {t('Try again')}
        </button>
      )}
    </div>
  );
}
