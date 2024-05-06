'use client';
import { MenuIcon, MoreVerticalIcon, SearchIcon } from 'lucide-react';
import Link from 'fumadocs-core/link';
import { SidebarTrigger } from 'fumadocs-core/sidebar';
import { usePathname } from 'next/navigation';
import {
  type AnchorHTMLAttributes,
  type ReactNode,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { cn } from '@/utils/cn';
import { useSearchContext } from '@/contexts/search';
import { useI18n } from '@/contexts/i18n';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { isActive } from '@/utils/shared';
import { buttonVariants } from '@/theme/variants';
import type { LinkItem } from '@/layout';

export interface NavProps {
  title?: ReactNode;

  /**
   * Redirect url of title
   * @defaultValue '/'
   */
  url?: string;

  items: LinkItem[];

  enableSidebar: boolean;
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
      <nav className="mx-auto flex size-full max-w-container flex-row items-center gap-4 px-4">
        <Link
          href={url}
          className="inline-flex items-center gap-3 font-semibold"
        >
          {title}
        </Link>
        {children}
        {items
          .filter((item) => item.type === 'main' || !item.type)
          .map((item) => (
            <NavItem key={item.url} item={item} className="max-lg:hidden" />
          ))}
        <div className="flex flex-1 flex-row items-center justify-end md:gap-2">
          {enableSearch ? <SearchToggle /> : null}
          {enableSidebar ? (
            <>
              <ThemeToggle className="max-md:hidden" />
              <SidebarTrigger
                aria-label="Toggle Sidebar"
                className={cn(
                  buttonVariants({
                    size: 'icon',
                    color: 'ghost',
                    className: 'md:hidden',
                  }),
                )}
              >
                <MenuIcon />
              </SidebarTrigger>
            </>
          ) : (
            <LinksMenu items={items} />
          )}
          {items
            .filter((item) => item.type === 'secondary')
            .map((item) => (
              <Link
                aria-label={item.text}
                key={item.url}
                href={item.url}
                external={item.external}
                className={cn(
                  buttonVariants({
                    size: 'icon',
                    color: 'ghost',
                    className: 'max-lg:hidden',
                  }),
                )}
              >
                {item.icon ?? item.text}
              </Link>
            ))}
        </div>
      </nav>
    </header>
  );
}

function LinksMenu({ items }: { items: LinkItem[] }): React.ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <ThemeToggle className="max-lg:hidden" />
      <PopoverTrigger
        className={cn(
          buttonVariants({
            size: 'icon',
            color: 'ghost',
            className: 'lg:hidden',
          }),
        )}
      >
        <MoreVerticalIcon />
      </PopoverTrigger>
      <PopoverContent className="flex min-w-[260px] flex-col px-3 py-1">
        {items.map((item) => (
          <NavItem
            key={item.url}
            item={item}
            showIcon
            className="text-base"
            onClick={() => {
              setOpen(false);
            }}
          />
        ))}
        <ThemeToggle className="w-fit" />
      </PopoverContent>
    </Popover>
  );
}

function SearchToggle(): React.ReactElement {
  const { setOpenSearch } = useSearchContext();
  const { text } = useI18n();

  const onClick = useCallback(() => {
    setOpenSearch(true);
  }, [setOpenSearch]);

  return (
    <>
      <button
        type="button"
        className={cn(
          buttonVariants({
            size: 'icon',
            color: 'ghost',
            className: 'md:hidden',
          }),
        )}
        aria-label="Open Search"
        onClick={onClick}
      >
        <SearchIcon />
      </button>
      <button
        type="button"
        className="inline-flex w-full max-w-[240px] items-center gap-2 rounded-full border bg-secondary/50 p-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground max-md:hidden"
        onClick={onClick}
      >
        <SearchIcon aria-label="Open Search" className="ms-1 size-4" />
        {text.search}
        <div className="ms-auto inline-flex gap-0.5 text-xs">
          {['⌘', 'K'].map((k) => (
            <kbd key={k} className="rounded-md border bg-background px-1.5">
              {k}
            </kbd>
          ))}
        </div>
      </button>
    </>
  );
}

function NavItem({
  item,
  showIcon = false,
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  item: LinkItem;
  showIcon?: boolean;
}): React.ReactElement {
  const pathname = usePathname();

  return (
    <Link
      href={item.url}
      external={item.external}
      className={cn(
        'inline-flex items-center gap-2 py-2 text-sm text-muted-foreground transition-colors [&_svg]:size-4',
        isActive(item.url, pathname)
          ? 'font-medium text-accent-foreground'
          : 'hover:text-accent-foreground',
        className,
      )}
      {...props}
    >
      {showIcon ? item.icon : null}
      {item.text}
    </Link>
  );
}
