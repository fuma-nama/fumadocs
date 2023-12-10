import { ThemeToggle } from './theme-toggle'
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
        'sticky top-0 z-50 h-16 border-b transition-colors',
        transparent
          ? 'border-transparent'
          : 'bg-background/80 border-foreground/10 backdrop-blur-sm'
      )}
    >
      <nav className="container flex h-full flex-row items-center gap-4">
        <Link href={url} className="inline-flex items-center font-medium">
          {title}
        </Link>
        {children}
        {items?.map((item, key) => <NavItem key={key} {...item} />)}
        <div className="ml-auto flex flex-row items-center md:gap-2">
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
        className="text-muted-foreground bg-secondary/50 hover:bg-accent hover:text-accent-foreground inline-flex w-[240px] items-center gap-2 rounded-full border p-1.5 text-sm transition-colors max-md:hidden"
        onClick={() => setOpenSearch(true)}
      >
        <SearchIcon aria-label="Open Search" className="ml-1 h-4 w-4" />
        {search}
        <div className="ml-auto inline-flex gap-0.5 text-xs">
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
          className="bg-secondary/50 hover:text-accent-foreground hover:bg-accent rounded-full border p-1.5 max-md:hidden"
        >
          {open ? (
            <SidebarCloseIcon className="h-5 w-5" />
          ) : (
            <SidebarOpenIcon className="h-5 w-5" />
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
        'text-muted-foreground text-sm max-lg:hidden',
        isActive
          ? 'text-accent-foreground font-medium'
          : 'hover:text-accent-foreground transition-colors'
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
