import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export const badgeVariants = cva('font-mono font-medium', {
  variants: {
    color: {
      green: 'text-green-600 dark:text-green-400',
      yellow: 'text-yellow-600 dark:text-yellow-400',
      red: 'text-red-600 dark:text-red-400',
      blue: 'text-blue-600 dark:text-blue-400',
      orange: 'text-orange-600 dark:text-orange-400',
      gray: 'text-fd-muted-foreground',
    },
  },
});

export type BadgeColor = NonNullable<VariantProps<typeof badgeVariants>['color']>;

export function Badge({
  className,
  color,
  ...props
}: Omit<HTMLAttributes<HTMLSpanElement>, 'color'> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ color }), className)} {...props}>
      {props.children}
    </span>
  );
}
