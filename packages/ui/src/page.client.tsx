'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';
import { useI18n } from './contexts/i18n';
import { useTreeContext } from './contexts/tree';

export * from '@/components/layout/toc';
export * from '@/components/breadcrumb';

export function LastUpdate(props: { date: Date }): React.ReactElement {
  const { text } = useI18n();
  const [date, setDate] = useState('');

  useEffect(() => {
    // to the timezone of client
    setDate(props.date.toLocaleDateString());
  }, [props.date]);

  return (
    <p className="mt-8 text-xs text-muted-foreground">
      {text.lastUpdate} {date}
    </p>
  );
}

export interface FooterProps {
  /**
   * Items including information for the next and previous page
   */
  items?: {
    previous?: { name: string; url: string };
    next?: { name: string; url: string };
  };
}

export function Footer({ items }: FooterProps): React.ReactElement {
  const tree = useTreeContext();
  const pathname = usePathname();
  const { nextPage, previousPage } = useI18n().text;

  const { previous = items?.previous, next = items?.next } = useMemo(() => {
    const currentIndex = tree.navigation.findIndex(
      (item) => item.url === pathname,
    );

    return {
      previous: tree.navigation[currentIndex - 1],
      next: tree.navigation[currentIndex + 1],
    };
  }, [pathname, tree.navigation]);

  const footerItem =
    'flex flex-col gap-2 rounded-lg p-4 text-sm transition-colors hover:bg-accent hover:text-accent-foreground';

  return (
    <div className="mt-auto flex flex-row flex-wrap gap-1 border-t py-4">
      {previous ? (
        <Link href={previous.url} className={footerItem}>
          <div className="inline-flex items-center gap-0.5 text-muted-foreground">
            <ChevronLeft className="-ms-1 size-4 shrink-0 rtl:rotate-180" />
            <p>{previousPage}</p>
          </div>
          <p className="font-medium">{previous.name}</p>
        </Link>
      ) : null}
      {next ? (
        <Link href={next.url} className={cn(footerItem, 'ms-auto text-end')}>
          <div className="inline-flex flex-row-reverse items-center gap-0.5 text-muted-foreground">
            <ChevronRight className="-me-1 size-4 shrink-0 rtl:rotate-180" />
            <p>{nextPage}</p>
          </div>
          <p className="font-medium">{next.name}</p>
        </Link>
      ) : null}
    </div>
  );
}
