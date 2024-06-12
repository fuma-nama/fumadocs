import { ChevronRight } from 'lucide-react';
import { BreadcrumbOptions, useBreadcrumb } from 'fumadocs-core/breadcrumb';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';
import { cn } from '@/utils/cn';
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
}: BreadcrumbProps): React.ReactElement {
  const { root } = useTreeContext();
  const pathname = usePathname();
  const items = useBreadcrumb(pathname, root, {
    includePage: full,
    ...options,
  });

  return (
    <div
      className={cn(
        '-mb-3 flex flex-row items-center gap-1 text-sm font-medium text-muted-foreground',
        items.length === 0 && 'hidden',
      )}
    >
      {items.map((item, i) => {
        return (
          <Fragment key={i}>
            {i !== 0 && (
              <ChevronRight className="size-4 shrink-0 rtl:rotate-180" />
            )}
            {item.url ? (
              <Link
                href={item.url}
                className="truncate hover:text-accent-foreground"
              >
                {item.name}
              </Link>
            ) : (
              <span className="truncate">{item.name}</span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
