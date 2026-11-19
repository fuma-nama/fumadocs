import type { HTMLAttributes } from 'react';
import { Badge, type BadgeColor } from 'shared-api/components/badge';

// reads are green, QUERY is a read with a body between GET and POST, others are gray
const colors: Record<string, BadgeColor> = {
  GET: 'green',
  HEAD: 'green',
  QUERY: 'cyan',
  POST: 'blue',
  PUT: 'yellow',
  PATCH: 'orange',
  DELETE: 'red',
};

export function MethodLabel({
  children,
  ...props
}: Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  children: string;
}) {
  const method = children.toUpperCase();

  return (
    <Badge {...props} color={colors[method] ?? 'gray'}>
      {method}
    </Badge>
  );
}
