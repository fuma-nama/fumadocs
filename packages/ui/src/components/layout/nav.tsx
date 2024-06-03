'use client';
import { MenuIcon, MoreVertical, X } from 'lucide-react';
import Link from 'fumadocs-core/link';
import { SidebarTrigger } from 'fumadocs-core/sidebar';
import { type ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';
import { useSearchContext } from '@/contexts/search';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { buttonVariants } from '@/theme/variants';
import type { LinkItemType } from '@/layout';
import {
  LargeSearchToggle,
  SearchToggle,
} from '@/components/layout/search-toggle';
import { LinkItem } from '../link-item';

export interface NavProps {
  title?: ReactNode;

  /**
   * Redirect url of title
   * @defaultValue '/'
   */
  url?: string;

  items: LinkItemType[];

  enableSidebar: boolean;

  /**
   * Show/hide search toggle
   *
   * Note: Enable/disable search from root provider instead
   */
  enableSearch?: boolean;

  /**
   * When to use transparent navbar
   * @defaultValue none
   */
  transparentMode?: 'always' | 'top' | 'none';
  children?: ReactNode;
}

export function Nav({
  title = 'My App',
  url = '/',
  items,
  transparentMode = 'none',
  enableSidebar,
  enableSearch = true,
  children,
}: NavProps): React.ReactElement {
  const search = useSearchContext();
  const [transparent, setTransparent] = useState(transparentMode !== 'none');

  useEffect(() => {
    if (transparentMode !== 'top') return;

    const listener = (): void => {
      setTransparent(window.scrollY < 10);
    };

    listener();
    window.addEventListener('scroll', listener);
    return () => {
      window.removeEventListener('scroll', listener);
    };
  }, [transparentMode]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 h-16 border-b transition-colors',
        transparent
          ? 'border-transparent'
          : 'border-foreground/10 bg-background/50 backdrop-blur-md',
      )}
    >
      <nav className="mx-auto flex size-full max-w-container flex-row items-center gap-6 px-4">
        <Link
          href={url}
          className="inline-flex items-center gap-3 font-semibold"
        >
          {title}
        </Link>
        {children}
        {items
          .filter((item) => item.type !== 'secondary')
          .map((item, i) => (
            <LinkItem
              key={i}
              item={item}
              className="-mx-2 text-sm max-lg:hidden"
            />
          ))}
        <div className="flex flex-1 flex-row items-center justify-end md:gap-2">
          {enableSearch && search.enabled ? (
            <>
              <SearchToggle className="md:hidden" />
              <LargeSearchToggle className="w-full max-w-[240px] max-md:hidden" />
            </>
          ) : null}
          <ThemeToggle className="max-lg:hidden" />
          {enableSidebar ? (
            <SidebarTrigger
              aria-label="Toggle Sidebar"
              className={cn(
                buttonVariants({
                  size: 'icon',
                  color: 'ghost',
                  className: 'group md:hidden',
                }),
              )}
            >
              <MenuIcon className="group-data-[open=true]:hidden" />
              <X className="hidden group-data-[open=true]:block" />
            </SidebarTrigger>
          ) : null}
          <LinksMenu
            items={items}
            className={cn('lg:hidden', enableSidebar && 'max-md:hidden')}
          />
          {items
            .filter((item) => item.type === 'secondary')
            .map((item, i) => (
              <LinkItem key={i} item={item} className="max-lg:hidden" />
            ))}
        </div>
      </nav>
    </header>
  );
}

interface LinksMenuProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  items: LinkItemType[];
}

function LinksMenu({ items, ...props }: LinksMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        {...props}
        className={cn(
          buttonVariants({
            size: 'icon',
            color: 'ghost',
            className: props.className,
          }),
        )}
      >
        <MoreVertical />
      </PopoverTrigger>
      <PopoverContent className="flex flex-col">
        {items.map((item, i) => (
          <LinkItem key={i} item={item} on="menu" />
        ))}
        <div className="flex flex-row items-center justify-between px-2 py-1">
          <p className="font-medium">Theme</p>
          <ThemeToggle />
        </div>
      </PopoverContent>
    </Popover>
  );
}
