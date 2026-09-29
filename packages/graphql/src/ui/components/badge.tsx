import type { HTMLAttributes } from 'react';
import { Badge, type BadgeColor } from 'shared-api/components/badge';

function getKindColor(kind: string): BadgeColor {
  switch (kind.toLowerCase()) {
    case 'query':
      return 'green';
    case 'mutation':
      return 'blue';
    case 'subscription':
      return 'orange';
    default:
      return 'gray';
  }
}

export function KindLabel({
  children,
  ...props
}: Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  children: string;
}) {
  return (
    <Badge {...props} color={getKindColor(children)}>
      {children.toUpperCase()}
    </Badge>
  );
}
