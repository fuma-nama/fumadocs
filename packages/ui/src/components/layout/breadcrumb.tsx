'use client';
import { ChevronRight } from 'lucide-react';
import {
  type BreadcrumbOptions,
  getBreadcrumbItemsFromPath,
} from 'fumadocs-core/breadcrumb';
import Link from 'next/link';
import { Fragment, useMemo } from 'react';
import { useTreeContext, useTreePath } from '@/contexts/tree';

export interface BreadcrumbProps
  extends Omit<BreadcrumbOptions, 'includePage'> {
  /**
   * Show the full path to the current page
   *
   * @defaultValue false
   */
  full?: boolean;
}

export function Breadcrumb({ full = false, ...options }: BreadcrumbProps) {
  const path = useTreePath();
  const { root } = useTreeContext();
  const items = useMemo(() => {
    return getBreadcrumbItemsFromPath(root, path, {
      includePage: full,
      ...options,
    });
  }, [full, options, path, root]);

  if (items.length === 0) return null;

  return (
    <div className="-mb-3 flex flex-row items-center gap-1 text-sm font-medium text-fd-muted-foreground">
      {items.map((item, i) => (
        <Fragment key={i}>
          {i !== 0 && (
            <ChevronRight className="size-4 shrink-0 rtl:rotate-180" />
          )}
          {item.url ? (
            <Link
              href={item.url}
              className="truncate hover:text-fd-accent-foreground"
            >
              {item.name}
            </Link>
          ) : (
            <span className="truncate">{item.name}</span>
          )}
        </Fragment>
      ))}
    </div>
  );
}
