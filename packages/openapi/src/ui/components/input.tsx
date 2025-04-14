import * as React from 'react';
import { cn } from 'fumadocs-ui/utils/cn';
import { cva } from 'class-variance-authority';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const labelVariants = cva(
  'text-xs font-medium text-fd-foreground/80 peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
);

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border bg-fd-secondary px-2 py-1.5 text-[13px] text-fd-secondary-foreground transition-colors placeholder:text-fd-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-fd-ring disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
