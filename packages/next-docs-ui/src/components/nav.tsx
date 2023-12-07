import { I18nContext } from '@/contexts/i18n'
import { SearchContext } from '@/contexts/search'
import { useSidebarCollapse } from '@/contexts/sidebar'
import { cn } from '@/utils/cn'
import { cva } from 'class-variance-authority'
import {
  MenuIcon,
  SearchIcon,
  SidebarCloseIcon,
  SidebarOpenIcon
} from 'lucide-react'
import Link from 'next-docs-zeta/link'
import { SidebarTrigger } from 'next-docs-zeta/sidebar'
import { usePathname } from 'next/navigation'
import { useContext, type ReactNode } from 'react'
import { ThemeToggle } from './theme-toggle'

export type NavLinkProps = {
  icon: ReactNode
  href: string
  label: string
  external?: boolean
}

export type NavItemProps = {
  href: string
  children: ReactNode
  external?: boolean
}

type NavProps = {
  title: ReactNode

  url?: string
  items?: NavItemProps[]
  links?: NavLinkProps[]
  enableSidebar?: boolean
  collapsibleSidebar?: boolean
  transparent?: boolean
  children?: ReactNode
}

export const itemVariants = cva(
  'p-1.5 rounded-md [&_svg]:w-5 [&_svg]:h-5 hover:bg-accent hover:text-accent-foreground'
)

export function Nav({
  title,
  url = '/',
  links,
  items,
  transparent = false,
  enableSidebar = true,
  collapsibleSidebar = true,
  children
}: NavProps) {
  return (
    <header
      className={cn(
        'sticky top-0 h-16 z-50 border-b transition-colors',
        transparent
          ? 'border-transparent'
          : 'bg-background/80 border-foreground/10 backdrop-blur-sm'
      )}
    >
      <nav className="container flex flex-row items-center h-full gap-4">
        <Link href={url} className="inline-flex items-center font-medium">
          {title}
        </Link>
        {children}
        {items?.map((item, key) => <NavItem key={key} {...item} />)}
        <div className="flex flex-row ml-auto items-center md:gap-2">
          <SearchToggle />
          <ThemeToggle className={cn(enableSidebar && 'max-md:hidden')} />
          {enableSidebar && <SidebarToggle collapsible={collapsibleSidebar} />}
          <div className="flex flex-row items-center border-l pl-2 max-md:hidden">
            {links?.map((item, key) => <NavLink key={key} {...item} />)}
          </div>
        </div>
      </nav>
    </header>
  )
}

const shortcut = cva('border rounded-md bg-background px-1.5')

function SearchToggle() {
  const [setOpenSearch] = useContext(SearchContext)
  const { search = 'Search' } = useContext(I18nContext).text ?? {}

  return (
    <>
      <button
        className={cn(itemVariants({ className: 'md:hidden' }))}
        aria-label="Open Search"
        onClick={() => setOpenSearch(true)}
      >
        <SearchIcon />
      </button>
      <button
        className="inline-flex items-center text-sm gap-2 rounded-full transition-colors w-[240px] p-1.5 border text-muted-foreground bg-secondary/50 hover:bg-accent hover:text-accent-foreground max-md:hidden"
        onClick={() => setOpenSearch(true)}
      >
        <SearchIcon aria-label="Open Search" className="ml-1 w-4 h-4" />
        {search}
        <div className="inline-flex text-xs gap-0.5 ml-auto">
          <kbd className={shortcut()}>⌘</kbd>
          <kbd className={shortcut()}>K</kbd>
        </div>
      </button>
    </>
  )
}

function SidebarToggle({ collapsible }: { collapsible: boolean }) {
  const [open, setOpen] = useSidebarCollapse()

  return (
    <>
      <SidebarTrigger
        aria-label="Toggle Sidebar"
        className={cn(itemVariants({ className: 'md:hidden' }))}
      >
        <MenuIcon />
      </SidebarTrigger>
      {collapsible && (
        <button
          aria-label="Toggle Sidebar"
          onClick={() => setOpen(!open)}
          className="p-1.5 border bg-secondary/50 rounded-full hover:text-accent-foreground hover:bg-accent max-md:hidden"
        >
          {open ? (
            <SidebarCloseIcon className="w-5 h-5" />
          ) : (
            <SidebarOpenIcon className="w-5 h-5" />
          )}
        </button>
      )}
    </>
  )
}

function NavItem(props: NavItemProps) {
  const pathname = usePathname()
  const isActive =
    props.href === pathname || pathname.startsWith(props.href + '/')

  return (
    <Link
      href={props.href}
      external={props.external}
      className={cn(
        'text-sm text-muted-foreground max-lg:hidden',
        isActive
          ? 'text-accent-foreground font-medium'
          : 'transition-colors hover:text-accent-foreground'
      )}
    >
      {props.children}
    </Link>
  )
}

function NavLink(props: NavLinkProps) {
  return (
    <Link
      aria-label={props.label}
      href={props.href}
      external={props.external}
      className={cn(itemVariants())}
    >
      {props.icon}
    </Link>
  )
}
