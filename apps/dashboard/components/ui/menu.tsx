import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export function MenuContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'min-w-40 rounded-lg border border-fe-border bg-fe-popover p-1 text-sm text-fe-popover-foreground shadow-lg',
        className,
      )}
      {...props}
    />
  );
}

export function MenuItem({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={props.type ?? 'button'}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-fe-muted',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
