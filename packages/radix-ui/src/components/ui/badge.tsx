import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@fumadocs/ui/cn';

export const badgeVariants = cva(
  'inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset',
  {
    variants: {
      variant: {
        default:
          'bg-fd-primary/10 text-fd-primary ring-fd-primary/20',
        new: 'bg-green-500/10 text-green-600 ring-green-500/20 dark:text-green-400',
        beta: 'bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400',
        deprecated:
          'bg-red-500/10 text-red-600 ring-red-500/20 dark:text-red-400',
        experimental:
          'bg-yellow-500/10 text-yellow-600 ring-yellow-500/20 dark:text-yellow-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export type BadgeVariants = VariantProps<typeof badgeVariants>;

export interface BadgeProps extends ComponentProps<'span'>, BadgeVariants {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
