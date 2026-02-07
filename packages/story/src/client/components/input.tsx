import * as React from 'react';
import { cn } from '@/utils/cn';

export function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border bg-fd-secondary px-2 py-1.5 text-[0.8125rem] text-fd-secondary-foreground transition-colors placeholder:text-fd-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-fd-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
