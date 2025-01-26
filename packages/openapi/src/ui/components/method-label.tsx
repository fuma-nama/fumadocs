import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from 'fumadocs-ui/components/api';

const variants = cva('font-mono font-medium', {
  variants: {
    color: {
      green: 'text-green-600 dark:text-green-400',
      yellow: 'text-yellow-600 dark:text-yellow-400',
      red: 'text-red-600 dark:text-red-400',
      blue: 'text-blue-600 dark:text-blue-400',
      orange: 'text-orange-600 dark:text-orange-400',
    },
  },
});

function getBadgeColor(method: string): VariantProps<typeof variants>['color'] {
  switch (method.toUpperCase()) {
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

export function MethodLabel({
  children,
  ...props
}: Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  children: string;
}) {
  return (
    <span
      {...props}
      className={cn(
        variants({
          color: getBadgeColor(children),
        }),
        props.className,
      )}
    >
      {children.toUpperCase()}
    </span>
  );
}
