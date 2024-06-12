import { ChevronRight } from 'lucide-react';
import { useBreadcrumb } from 'fumadocs-core/breadcrumb';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';
import { cn } from '@/utils/cn';
import { useTreeContext } from '@/contexts/tree';

export interface BreadcrumbProps {
  /**
   * Show the full path to the current page
   *
   * @defaultValue false
   */
  full?: boolean;
}

export function Breadcrumb({
  full = false,
}: BreadcrumbProps): React.ReactElement {
  const { root } = useTreeContext();
  const pathname = usePathname();
  const items = useBreadcrumb(pathname, root);

  return (
    <div
      className={cn(
        'flex flex-row items-center gap-1 text-sm text-muted-foreground',
        items.length === 1 && 'hidden',
      )}
    >
      {items.map((item, i) => {
        const isLast = items.length === i + 1;
        if (isLast && !full) return;

        const style = cn(isLast ? 'text-foreground' : 'truncate');

        return (
          <Fragment key={i}>
            {i !== 0 && (
              <ChevronRight className="size-4 shrink-0 rtl:rotate-180" />
            )}
            {item.url ? (
              <Link href={item.url} className={style}>
                {item.name}
              </Link>
            ) : (
              <span className={style}>{item.name}</span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
