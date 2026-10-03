'use client';
import { type BreadcrumbOptions, getBreadcrumbItemsFromPath } from 'fumadocs-core/breadcrumb';
import Link from 'fumadocs-core/link';
import { type ComponentProps, Fragment, useMemo } from 'react';
import { useTreeContext, useTreePath } from '@/contexts/tree';
import { cn } from '@/utils/cn';

export type BreadcrumbProps = BreadcrumbOptions & ComponentProps<'nav'>;

const separator = <span className="shrink-0 text-fd-muted-foreground/50">/</span>;

export function useBreadcrumbItems({
  includeRoot,
  includeSeparator,
  includePage,
}: BreadcrumbOptions = {}) {
  const path = useTreePath();
  const { root } = useTreeContext();

  return useMemo(
    () => getBreadcrumbItemsFromPath(root, path, { includePage, includeSeparator, includeRoot }),
    [includePage, includeRoot, includeSeparator, path, root],
  );
}

/**
 * The folders of current page, `children` is appended after them.
 */
export function Breadcrumb({
  includeRoot,
  includeSeparator,
  includePage,
  className,
  children,
  ...props
}: BreadcrumbProps) {
  const items = useBreadcrumbItems({ includeRoot, includeSeparator, includePage });
  if (items.length === 0 && !children) return;

  return (
    <nav
      className={cn(
        'flex items-center gap-1.5 min-w-0 text-sm text-fd-muted-foreground',
        className,
      )}
      {...props}
    >
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && separator}
          {item.url ? (
            <Link
              href={item.url}
              className="truncate transition-colors hover:text-fd-accent-foreground"
            >
              {item.name}
            </Link>
          ) : (
            <span className="truncate">{item.name}</span>
          )}
        </Fragment>
      ))}
      {children}
    </nav>
  );
}
