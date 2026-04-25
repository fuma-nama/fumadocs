import type { ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

export const buttonVariants = cva(
  'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        secondary:
          'border border-fe-border bg-fe-secondary text-fe-secondary-foreground hover:bg-fe-accent',
        primary: 'bg-fe-primary text-fe-primary-foreground hover:opacity-90',
      },
    },
    defaultVariants: {
      variant: 'secondary',
    },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ variant = 'secondary', className, ...props }: ButtonProps) {
  return (
    <button
      type={props.type ?? 'button'}
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  );
}
