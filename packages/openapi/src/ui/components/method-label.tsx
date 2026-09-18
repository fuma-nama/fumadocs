import type { HTMLAttributes } from 'react';
import { Badge, type BadgeColor } from 'shared-api/components/badge';

function getMethodColor(method: string): BadgeColor {
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
    <Badge {...props} color={getMethodColor(children)}>
      {children.toUpperCase()}
    </Badge>
  );
}
