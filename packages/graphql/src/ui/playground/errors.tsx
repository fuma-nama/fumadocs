'use client';
import { TriangleAlert } from 'lucide-react';
import { isPlainObject } from '@fumari/stf/lib/utils';
import { cn } from '@/utils/cn';

export interface ResponseError {
  message: string;
  /** like `customer.orders.0.total` */
  path?: string;
  /** like `3:5` */
  location?: string;
}

/** the `errors` of a GraphQL response */
export function getResponseErrors(body: unknown): ResponseError[] {
  const out: ResponseError[] = [];
  if (!isPlainObject(body) || !Array.isArray(body.errors)) return out;

  for (const item of body.errors) {
    if (!isPlainObject(item)) continue;
    const { message, path, locations } = item;
    const location = Array.isArray(locations) ? locations[0] : undefined;

    out.push({
      message: typeof message === 'string' ? message : JSON.stringify(message),
      path: Array.isArray(path) ? path.join('.') : undefined,
      location: isPlainObject(location) ? `${location.line}:${location.column}` : undefined,
    });
  }

  return out;
}

export function ErrorList({ errors, className }: { errors: ResponseError[]; className?: string }) {
  return (
    <ul className={cn('flex flex-col gap-1.5 bg-amber-500/5 px-4 py-2.5 text-xs', className)}>
      {errors.map((error, i) => (
        <li key={i} className="flex gap-2">
          <TriangleAlert className="mt-px size-3.5 shrink-0 text-amber-500" />
          <p className="min-w-0 flex-1 wrap-break-word text-amber-700 dark:text-amber-300">
            {error.message}
            {error.path && (
              <span className="ms-2 font-mono break-all text-fd-muted-foreground">
                {error.path}
              </span>
            )}
            {error.location && (
              <span className="ms-2 font-mono text-fd-muted-foreground tabular-nums">
                {error.location}
              </span>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
