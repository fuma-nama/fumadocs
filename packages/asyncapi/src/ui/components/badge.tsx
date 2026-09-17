import type { HTMLAttributes } from 'react';
import { Badge, type BadgeColor } from '@fumadocs/api-docs/components/badge';

function getActionColor(action: string): BadgeColor {
  switch (action.toLowerCase()) {
    case 'send':
      return 'blue';
    case 'receive':
      return 'green';
    default:
      return 'orange';
  }
}

export function ActionLabel({
  children,
  ...props
}: Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  children: string;
}) {
  return (
    <Badge {...props} color={getActionColor(children)}>
      {children.toUpperCase()}
    </Badge>
  );
}
