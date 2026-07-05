import * as React from 'react';
import { cn } from '@/utils/cn';
import { cva } from 'class-variance-authority';

export type InputProps = React.ComponentProps<'input'>;

export const labelVariants = cva(
  'text-xs font-medium text-fd-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
);

function Input({ className, type, ref, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border bg-fd-secondary px-2 py-1.5 text-[0.8125rem] text-fd-secondary-foreground transition-colors placeholder:text-fd-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-fd-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
}

export { Input };
