import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@fumadocs/ui/cn';

export const badgeVariants = cva(
  'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
  {
    variants: {
      variant: {
        default:
          'bg-fd-primary/10 text-fd-primary ',
        new: 'bg-green-500/10 text-green-600 dark:text-green-400',
        beta: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        deprecated:
          'bg-red-500/10 text-red-600 dark:text-red-400',
        experimental:
          'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 truncate max-w-[100px]',
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
