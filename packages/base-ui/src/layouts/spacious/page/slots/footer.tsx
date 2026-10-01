'use client';
import { useTranslations } from '@fuma-translate/react';
import { usePathname } from 'fumadocs-core/framework';
import Link from 'fumadocs-core/link';
import type * as PageTree from 'fumadocs-core/page-tree';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import { type ComponentProps, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { isActive } from '@/utils/urls';
import { useFooterItems } from '@/utils/use-footer-items';

type Item = Pick<PageTree.Item, 'name' | 'description' | 'url'>;

export interface FooterProps extends ComponentProps<'nav'> {
  /**
   * Items including information for the next and previous page
   */
  items?: {
    previous?: Item;
    next?: Item;
  };
}

export function Footer({ items, className, ...props }: FooterProps) {
  const footerList = useFooterItems();
  const pathname = usePathname();
  const { previous, next } = useMemo(() => {
    if (items) return items;
    const idx = footerList.findIndex((item) => isActive(item.url, pathname));
    if (idx === -1) return {};

    return { previous: footerList[idx - 1], next: footerList[idx + 1] };
  }, [footerList, items, pathname]);

  if (!previous && !next) return;
  return (
    <nav className={cn('@container grid grid-cols-2 gap-3 mt-8', className)} {...props}>
      {previous && <FooterItem item={previous} next={false} />}
      {next && <FooterItem item={next} next />}
    </nav>
  );
}

function FooterItem({ item, next }: { item: Item; next: boolean }) {
  const t = useTranslations({ note: 'pagination' });
  const Icon = next ? ArrowRightIcon : ArrowLeftIcon;

  return (
    <Link
      href={item.url}
      className={cn(
        'group flex flex-col gap-1 rounded-2xl border p-4 text-sm transition-colors hover:bg-fd-accent/40 @max-md:col-span-full',
        next && 'col-start-2 items-end text-end',
      )}
    >
      <span className="inline-flex items-center gap-1.5 text-fd-muted-foreground">
        {!next && (
          <Icon className="size-3.5 transition-transform group-hover:-translate-x-0.5 rtl:rotate-180" />
        )}
        {next ? t('Next Page') : t('Previous Page')}
        {next && (
          <Icon className="size-3.5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
        )}
      </span>
      <span className="font-medium">{item.name}</span>
    </Link>
  );
}
