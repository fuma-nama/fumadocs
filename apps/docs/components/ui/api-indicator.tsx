import { type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const badgeVariants = cva('rounded-full border px-1.5 text-xs font-medium', {
  variants: {
    color: {
      green: 'bg-green-400/20 text-green-600 dark:text-green-400',
      yellow: 'bg-yellow-400/20 text-yellow-600 dark:text-yellow-400',
      red: 'bg-red-400/20 text-red-600 dark:text-red-400',
      blue: 'bg-blue-400/20 text-blue-600 dark:text-blue-400',
      orange: 'bg-orange-400/20 text-orange-600 dark:text-orange-400',
    },
  },
});

export function getBadgeColor(
  method: string,
): VariantProps<typeof badgeVariants>['color'] {
  switch (method) {
    case 'PUT':
      return 'yellow';
    case 'PATCH':
      return 'orange';
    case 'POST':
      return 'blue';
    case 'DELETE':
      return 'red';
    default:
      return 'green';
  }
}

export function ApiIndicator({ method }: { method: string }): ReactNode {
  const color = getBadgeColor(method);

  return (
    <span className={cn(badgeVariants({ className: 'ms-auto', color }))}>
      {method}
    </span>
  );
}
