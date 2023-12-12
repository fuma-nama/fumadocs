import { ChevronRightIcon } from 'lucide-react';
import { useBreadcrumb } from 'next-docs-zeta/breadcrumb';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, useContext } from 'react';
import { cn } from '@/utils/cn';
import { LayoutContext } from '@/contexts/tree';

export function Breadcrumb(): JSX.Element {
  const { tree } = useContext(LayoutContext);
  const pathname = usePathname();
  const items = useBreadcrumb(pathname, tree);
  // eslint-disable-next-line react/jsx-no-useless-fragment -- render nothing
  if (items.length === 1) return <></>;

  return (
    <div className="flex flex-row items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, i) => {
        const active = items.length === i + 1;
        const style = cn(
          'overflow-hidden whitespace-nowrap',
          active ? 'text-foreground' : 'text-ellipsis',
        );

        return (
          // eslint-disable-next-line react/no-array-index-key -- Won't re-render
          <Fragment key={i}>
            {i !== 0 && <ChevronRightIcon className="h-4 w-4 shrink-0" />}
            {item.url ? (
              <Link href={item.url} className={style}>
                {item.name}
              </Link>
            ) : (
              <p className={style}>{item.name}</p>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
