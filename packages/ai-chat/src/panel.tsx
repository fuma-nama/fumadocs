'use client';
import { useTranslations } from '@fuma-translate/react';
import { cn } from 'cn';
import type { ComponentProps, ReactNode } from 'react';
import { stagger } from './utils/motion';

export function ChatHeader({
  title,
  className,
  children,
  ...props
}: ComponentProps<'div'> & { title: string }) {
  return (
    <div
      className={cn('flex h-12 shrink-0 items-center gap-0.5 ps-3 pe-1.5', className)}
      {...props}
    >
      <p
        key={title}
        className="flex-1 truncate text-sm text-fd-muted-foreground motion-safe:animate-fd-roll-in"
      >
        {title}
      </p>
      {children}
    </div>
  );
}

/**
 * The intro of a new chat, resting above the composer.
 */
export function ChatEmpty({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mt-auto flex flex-col">
      <p className="text-lg font-medium tracking-tight motion-safe:animate-fd-roll-in">{title}</p>
      {description && (
        <p
          className="mt-1 text-sm text-fd-muted-foreground motion-safe:animate-fd-roll-in"
          style={stagger(60)}
        >
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

export function ChatSuggestions({ className, ...props }: ComponentProps<'ul'>) {
  const t = useTranslations({ note: 'AI chat' });

  return (
    <ul
      aria-label={t('Suggestions', { note: 'aria-label' })}
      className={cn('mt-4 flex flex-wrap gap-1.5', className)}
      {...props}
    />
  );
}

export function ChatSuggestion({ className, ...props }: ComponentProps<'button'>) {
  return (
    <li className="motion-safe:animate-fd-roll-in" style={stagger(140)}>
      <button
        type="button"
        className={cn(
          'flex h-7 items-center rounded-lg border px-3 text-[13px] text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground',
          className,
        )}
        {...props}
      />
    </li>
  );
}
