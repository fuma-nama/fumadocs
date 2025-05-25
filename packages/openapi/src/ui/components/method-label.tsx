import { type VariantProps } from 'cvb';
import type { HTMLAttributes } from 'react';
import { cvb } from 'fumadocs-ui/utils/cn';

export const badgeVariants = cvb({
  base: 'font-mono font-medium',
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

function getMethodColor(
  method: string,
): VariantProps<typeof badgeVariants>['color'] {
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

export function Badge({
  className,
  color,
  ...props
}: Omit<HTMLAttributes<HTMLSpanElement>, 'color'> &
  VariantProps<typeof badgeVariants>) {
  return (
    <span
      className={badgeVariants({
        color,
        className,
      })}
      {...props}
    >
      {props.children}
    </span>
  );
}

export function MethodLabel({
  children,
  ...props
}: Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  children: string;
}) {
  return (
    <Badge {...props} color={getMethodColor(children)}>
      {children.toUpperCase()}
    </Badge>
  );
}
