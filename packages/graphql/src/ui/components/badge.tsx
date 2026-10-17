import type { HTMLAttributes } from 'react';
import { Badge, type BadgeColor } from 'shared-api/components/badge';

/** the color of an operation kind or named type kind */
export function getKindColor(kind: string): BadgeColor {
  switch (kind) {
    case 'query':
    case 'object':
    case 'interface':
    case 'union':
      return 'green';
    case 'mutation':
    case 'input':
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
