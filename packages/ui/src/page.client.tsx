'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cva } from 'class-variance-authority';
import { cn } from '@/utils/cn';
import { useI18n } from './contexts/i18n';
import { useTreeContext } from './contexts/tree';

export * from '@/components/layout/toc';
export * from '@/components/layout/breadcrumb';

export function LastUpdate(props: { date: Date }): React.ReactElement {
  const { text } = useI18n();
  const [date, setDate] = useState('');

  useEffect(() => {
    // to the timezone of client
    setDate(props.date.toLocaleDateString());
  }, [props.date]);

  return (
    <p className="text-sm text-fd-muted-foreground">
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

const itemVariants = cva(
  'flex w-full flex-col gap-2 rounded-lg border bg-fd-card p-4 text-sm transition-colors hover:bg-fd-accent/80 hover:text-fd-accent-foreground',
);

const itemLabel = cva(
  'inline-flex items-center gap-0.5 text-fd-muted-foreground',
);

export function Footer({ items }: FooterProps): React.ReactElement {
  const tree = useTreeContext();
  const pathname = usePathname();
  const { text } = useI18n();

  const { previous, next } = useMemo(() => {
    if (items) return items;
    const neighbours = tree.getNeighbours(pathname);

    return {
      previous: neighbours[0],
      next: neighbours[1],
    };
  }, [items, pathname, tree]);

  return (
    <div className="grid grid-cols-2 gap-4 pb-6">
      {previous ? (
        <Link href={previous.url} className={cn(itemVariants())}>
          <div className={cn(itemLabel())}>
            <ChevronLeft className="-ms-1 size-4 shrink-0 rtl:rotate-180" />
            <p>{text.previousPage}</p>
          </div>
          <p className="font-medium">{previous.name}</p>
        </Link>
      ) : null}
      {next ? (
        <Link
          href={next.url}
          className={cn(itemVariants({ className: 'col-start-2 text-end' }))}
        >
          <div className={cn(itemLabel({ className: 'flex-row-reverse' }))}>
            <ChevronRight className="-me-1 size-4 shrink-0 rtl:rotate-180" />
            <p>{text.nextPage}</p>
          </div>
          <p className="font-medium">{next.name}</p>
        </Link>
      ) : null}
    </div>
  );
}
