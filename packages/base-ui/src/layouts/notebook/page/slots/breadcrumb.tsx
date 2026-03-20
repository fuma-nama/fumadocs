'use client';

import { useTreeContext, useTreePath } from '@/contexts/tree';
import { cn } from '@/utils/cn';
import { type BreadcrumbOptions, getBreadcrumbItemsFromPath } from 'fumadocs-core/breadcrumb';
import { ChevronRight } from 'lucide-react';
import Link from 'fumadocs-core/link';
import { type ComponentProps, useMemo, Fragment } from 'react';

export type BreadcrumbProps = BreadcrumbOptions & ComponentProps<'div'>;

export function Breadcrumb({
  includeRoot,
  includeSeparator,
  includePage,
  ...props
}: BreadcrumbProps) {
  const path = useTreePath();
  const { root } = useTreeContext();
  const items = useMemo(() => {
    return getBreadcrumbItemsFromPath(root, path, {
      includePage,
      includeSeparator,
      includeRoot,
    });
  }, [includePage, includeRoot, includeSeparator, path, root]);

  if (items.length === 0) return null;

  return (
    <div
      {...props}
      className={cn('flex items-center gap-1.5 text-sm text-fd-muted-foreground', props.className)}
    >
      {items.map((item, i) => {
        const className = cn('truncate', i === items.length - 1 && 'text-fd-primary font-medium');

        return (
          <Fragment key={i}>
            {i !== 0 && <ChevronRight className="size-3.5 shrink-0" />}
            {item.url ? (
              <Link
                href={item.url}
                className={cn(className, 'transition-opacity hover:opacity-80')}
              >
                {item.name}
              </Link>
            ) : (
              <span className={className}>{item.name}</span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
