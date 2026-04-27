import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export function IconButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={props.type ?? 'button'}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md border border-transparent text-fe-muted-foreground transition',
        'hover:border-fe-border hover:bg-fe-muted hover:text-fe-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fe-ring/40',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
