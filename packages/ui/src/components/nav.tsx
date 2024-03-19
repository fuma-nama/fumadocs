'use client';
import { cva } from 'class-variance-authority';
import {
  MenuIcon,
  MoreVerticalIcon,
  SearchIcon,
  SidebarCloseIcon,
  SidebarOpenIcon,
} from 'lucide-react';
import Link from 'fumadocs-core/link';
import { SidebarTrigger } from 'fumadocs-core/sidebar';
import { usePathname } from 'next/navigation';
import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ReactNode,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { cn } from '@/utils/cn';
import { useSidebarCollapse } from '@/contexts/sidebar';
import { useSearchContext } from '@/contexts/search';
import { useI18n } from '@/contexts/i18n';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from '@/components/ui/popover';
import { isActive } from '../utils/shared';
import { buttonVariants } from '../theme/variants';
import type { LinkItem } from '../layout';

export interface NavLinkProps {
  icon: ReactNode;
  href: string;
  label: string;
  external?: boolean;
}

export interface NavProps {
  title: ReactNode;

  /**
   * Redirect url of title
   * @defaultValue '/'
   */
  url?: string;

  items: LinkItem[];
  links: NavLinkProps[];
  enableSidebar: boolean;
  collapsibleSidebar: boolean;

  /**
   * When to use transparent navbar
   * @defaultValue none
   */
  transparentMode?: 'always' | 'top' | 'none';
  children?: ReactNode;
}

export function Nav({
  title,
  url = '/',
  links,
  items,
  transparentMode = 'none',
  enableSidebar,
  collapsibleSidebar,
  children,
}: NavProps): JSX.Element {
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
      <nav className="container flex h-full flex-row items-center gap-4">
        <Link
          href={url}
          className="inline-flex items-center gap-3 font-semibold"
        >
          {title}
        </Link>
        {children}
        {items.map((item) => (
          <NavItem key={item.url} item={item} className="max-lg:hidden" />
        ))}
        <div className="flex flex-1 flex-row items-center justify-end md:gap-2">
          <SearchToggle />
          {enableSidebar ? (
            <>
              <ThemeToggle className="max-md:hidden" />
              <SidebarToggle collapsible={collapsibleSidebar} />
            </>
          ) : (
            <Popover>
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
                  <PopoverClose key={item.url} asChild>
                    <NavItem item={item} className="py-2 text-lg font-medium" />
                  </PopoverClose>
                ))}
                <ThemeToggle className="w-fit" />
              </PopoverContent>
            </Popover>
          )}
          <div
            className={cn(
              'flex flex-row items-center border-s ps-2 max-md:hidden',
              links.length === 0 && 'hidden',
            )}
          >
            {links.map((item) => (
              <Link
                aria-label={item.label}
                key={item.href}
                href={item.href}
                external={item.external}
                className={cn(buttonVariants({ size: 'icon', color: 'ghost' }))}
              >
                {item.icon}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}

const shortcut = cva('rounded-md border bg-background px-1.5');

function SearchToggle(): JSX.Element {
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
          <kbd className={shortcut()}>⌘</kbd>
          <kbd className={shortcut()}>K</kbd>
        </div>
      </button>
    </>
  );
}

function SidebarToggle({ collapsible }: { collapsible: boolean }): JSX.Element {
  const [open, setOpen] = useSidebarCollapse();

  return (
    <>
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
      {collapsible ? (
        <button
          type="button"
          aria-label="Toggle Sidebar"
          onClick={() => {
            setOpen(!open);
          }}
          className={cn(
            buttonVariants({
              color: 'outline',
              size: 'icon',
              className: 'rounded-full max-md:hidden',
            }),
          )}
        >
          {open ? <SidebarCloseIcon /> : <SidebarOpenIcon />}
        </button>
      ) : null}
    </>
  );
}

const NavItem = forwardRef<
  HTMLAnchorElement,
  AnchorHTMLAttributes<HTMLAnchorElement> & { item: LinkItem }
>(({ item, className, ...props }, ref) => {
  const { text, url, external } = item;
  const pathname = usePathname();

  return (
    <Link
      ref={ref}
      href={url}
      external={external}
      className={cn(
        'text-sm text-muted-foreground transition-colors',
        isActive(url, pathname)
          ? 'font-medium text-accent-foreground'
          : 'hover:text-accent-foreground',
        className,
      )}
      {...props}
    >
      {text}
    </Link>
  );
});

NavItem.displayName = 'NavItem';
