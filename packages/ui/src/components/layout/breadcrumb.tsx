import { ChevronRight } from 'lucide-react';
import {
  type BreadcrumbOptions,
  useBreadcrumb,
} from 'fumadocs-core/breadcrumb';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';
import { useTreeContext } from '@/contexts/tree';

export interface BreadcrumbProps
  extends Omit<BreadcrumbOptions, 'includePage'> {
  /**
   * Show the full path to the current page
   *
   * @defaultValue false
   */
  full?: boolean;
}

export function Breadcrumb({
  full = false,
  ...options
}: BreadcrumbProps): React.ReactNode {
  const { root } = useTreeContext();
  const pathname = usePathname();
  const items = useBreadcrumb(pathname, root, {
    includePage: full,
    ...options,
  });

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
