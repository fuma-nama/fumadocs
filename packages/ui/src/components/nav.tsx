import { cva } from 'class-variance-authority';
import {
  MenuIcon,
  SearchIcon,
  SidebarCloseIcon,
  SidebarOpenIcon,
} from 'lucide-react';
import Link from 'next-docs-zeta/link';
import { SidebarTrigger } from 'next-docs-zeta/sidebar';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { useSidebarCollapse } from '@/contexts/sidebar';
import { useSearchContext } from '@/contexts/search';
import { useI18n } from '@/contexts/i18n';
import { ThemeToggle } from './theme-toggle';

export interface NavLinkProps {
  icon: ReactNode;
  href: string;
  label: string;
  external?: boolean;
}

export interface NavItemProps {
  href: string;
  children: ReactNode;
  external?: boolean;
}

interface NavProps {
  title: ReactNode;

  url?: string;
  items?: NavItemProps[];
  links?: NavLinkProps[];
  enableSidebar?: boolean;
  collapsibleSidebar?: boolean;
  transparent?: boolean;
  children?: ReactNode;
}

export const itemVariants = cva(
  'rounded-md p-1.5 hover:bg-accent hover:text-accent-foreground [&_svg]:h-5 [&_svg]:w-5',
);

export function Nav({
  title,
  url = '/',
  links,
  items,
  transparent = false,
  enableSidebar = true,
  collapsibleSidebar = true,
  children,
}: NavProps): JSX.Element {
  return (
    <header
      className={cn(
        'sticky top-0 z-50 h-16 border-b transition-colors',
        transparent
          ? 'border-transparent'
          : 'border-foreground/10 bg-background/80 backdrop-blur-sm',
      )}
    >
      <nav className="container flex h-full flex-row items-center gap-4">
        <Link href={url} className="inline-flex items-center font-medium">
          {title}
        </Link>
        {children}
        {items?.map((item) => <NavItem key={item.href} {...item} />)}
        <div className="ml-auto flex flex-row items-center md:gap-2">
          <SearchToggle />
          <ThemeToggle className={cn(enableSidebar && 'max-md:hidden')} />
          {enableSidebar ? (
            <SidebarToggle collapsible={collapsibleSidebar} />
          ) : null}
          <div className="flex flex-row items-center border-l pl-2 max-md:hidden">
            {links?.map((item) => <NavLink key={item.href} {...item} />)}
          </div>
        </div>
      </nav>
    </header>
  );
}

const shortcut = cva('rounded-md border bg-background px-1.5');

function SearchToggle(): JSX.Element {
  const [setOpenSearch] = useSearchContext();
  const { search = 'Search' } = useI18n().text;

  return (
    <>
      <button
        type="button"
        className={cn(itemVariants({ className: 'md:hidden' }))}
        aria-label="Open Search"
        onClick={() => {
          setOpenSearch(true);
        }}
      >
        <SearchIcon />
      </button>
      <button
        type="button"
        className="inline-flex w-[240px] items-center gap-2 rounded-full border bg-secondary/50 p-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground max-md:hidden"
        onClick={() => {
          setOpenSearch(true);
        }}
      >
        <SearchIcon aria-label="Open Search" className="ml-1 h-4 w-4" />
        {search}
        <div className="ml-auto inline-flex gap-0.5 text-xs">
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
        className={cn(itemVariants({ className: 'md:hidden' }))}
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
          className="rounded-full border bg-secondary/50 p-1.5 hover:bg-accent hover:text-accent-foreground max-md:hidden"
        >
          {open ? (
            <SidebarCloseIcon className="h-5 w-5" />
          ) : (
            <SidebarOpenIcon className="h-5 w-5" />
          )}
        </button>
      ) : null}
    </>
  );
}

function NavItem(props: NavItemProps): JSX.Element {
  const pathname = usePathname();
  const isActive =
    props.href === pathname || pathname.startsWith(`${props.href}/`);

  return (
    <Link
      href={props.href}
      external={props.external}
      className={cn(
        'text-sm text-muted-foreground max-lg:hidden',
        isActive
          ? 'font-medium text-accent-foreground'
          : 'transition-colors hover:text-accent-foreground',
      )}
    >
      {props.children}
    </Link>
  );
}

function NavLink(props: NavLinkProps): JSX.Element {
  return (
    <Link
      aria-label={props.label}
      href={props.href}
      external={props.external}
      className={cn(itemVariants())}
    >
      {props.icon}
    </Link>
  );
}
