'use client';
import { type BreadcrumbOptions, getBreadcrumbItemsFromPath } from 'fumadocs-core/breadcrumb';
import Link from 'fumadocs-core/link';
import { type ComponentProps, Fragment, useMemo } from 'react';
import { useTreeContext, useTreePath } from '@/contexts/tree';
import { cn } from '@/utils/cn';

export type BreadcrumbProps = BreadcrumbOptions & ComponentProps<'nav'>;

export function Breadcrumb({
  includeRoot,
  includeSeparator,
  includePage = true,
  className,
  ...props
}: BreadcrumbProps) {
  const path = useTreePath();
  const { root } = useTreeContext();
  const items = useMemo(
    () => getBreadcrumbItemsFromPath(root, path, { includePage, includeSeparator, includeRoot }),
    [includePage, includeRoot, includeSeparator, path, root],
  );
  if (items.length === 0) return;

  return (
    <nav
      className={cn(
        'flex items-center gap-1.5 min-w-0 text-sm text-fd-muted-foreground',
        className,
      )}
      {...props}
    >
      {items.map((item, i) => {
        const last = i === items.length - 1;
        const className = cn('truncate', last && 'text-fd-foreground font-medium');

        return (
          <Fragment key={i}>
            {i > 0 && <span className="text-fd-muted-foreground/50">/</span>}
            {item.url && !last ? (
              <Link
                href={item.url}
                className={cn(className, 'transition-colors hover:text-fd-accent-foreground')}
              >
                {item.name}
              </Link>
            ) : (
              <span className={className}>{item.name}</span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
