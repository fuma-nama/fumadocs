import { SearchContext } from '@/contexts/search'
import { SidebarContext } from '@/contexts/sidebar'
import { cn } from '@/utils/cn'
import { cva } from 'class-variance-authority'
import {
  MenuIcon,
  SearchIcon,
  SidebarCloseIcon,
  SidebarOpenIcon
} from 'lucide-react'
import { SidebarTrigger } from 'next-docs-zeta/sidebar'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useContext, type ReactNode } from 'react'
import { SearchBarToggle } from './search-toggle'
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
  children?: ReactNode
}

const itemVariants = cva(
  'nd-p-2 nd-rounded-md hover:nd-bg-accent hover:nd-text-accent-foreground'
)

export function Nav({
  title,
  url = '/',
  links,
  items,
  enableSidebar = true,
  collapsibleSidebar = true,
  children
}: NavProps) {
  return (
    <nav className="nd-sticky nd-top-0 nd-inset-x-0 nd-z-50 nd-backdrop-blur-lg">
      <div className="nd-container nd-flex nd-flex-row nd-items-center nd-h-16 nd-gap-4 nd-border-b nd-border-foreground/10 nd-max-w-[1300px]">
        <Link
          href={url}
          className="nd-font-medium hover:nd-text-muted-foreground"
        >
          {title}
        </Link>
        {children}
        {items?.map((item, key) => <NavItem key={key} {...item} />)}
        <div className="nd-flex nd-flex-row nd-justify-end nd-items-center nd-flex-1">
          <SearchToggle />
          <SearchBarToggle className="nd-mr-2 max-md:nd-hidden" />
          {enableSidebar && collapsibleSidebar && <DesktopSidebarToggle />}
          <ThemeToggle className={cn(enableSidebar && 'max-lg:nd-hidden')} />
          {links?.map((item, key) => <NavLink key={key} {...item} />)}
          {enableSidebar && <SidebarToggle />}
        </div>
      </div>
    </nav>
  )
}

function SearchToggle() {
  const { setOpenSearch } = useContext(SearchContext)

  return (
    <button
      className={cn(itemVariants({ className: 'md:nd-hidden' }))}
      aria-label="Open Search"
      onClick={() => setOpenSearch(true)}
    >
      <SearchIcon className="nd-w-5 nd-h-5" />
    </button>
  )
}

function SidebarToggle() {
  return (
    <SidebarTrigger
      aria-label="Toggle Sidebar"
      className={cn(itemVariants({ className: 'lg:nd-hidden' }))}
    >
      <MenuIcon className="nd-w-5 nd-h-5" />
    </SidebarTrigger>
  )
}

function DesktopSidebarToggle() {
  const [open, setOpen] = useContext(SidebarContext)

  return (
    <button
      aria-label="Toggle Sidebar"
      onClick={() => setOpen(!open)}
      className={cn(itemVariants({ className: 'max-lg:nd-hidden' }))}
    >
      {open ? (
        <SidebarCloseIcon className="nd-w-5 nd-h-5" />
      ) : (
        <SidebarOpenIcon className="nd-w-5 nd-h-5" />
      )}
    </button>
  )
}

function NavItem(props: NavItemProps) {
  const pathname = usePathname()
  const isActive =
    props.href === pathname || pathname.startsWith(props.href + '/')

  return (
    <Link
      href={props.href}
      target={props.external ? '_blank' : '_self'}
      rel={props.external ? 'noreferrer noopener' : undefined}
      className={cn(
        'nd-text-sm max-lg:nd-hidden',
        isActive
          ? 'nd-text-accent-foreground nd-font-medium'
          : 'nd-text-muted-foreground nd-transition-colors hover:nd-text-accent-foreground'
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
      target={props.external ? '_blank' : '_self'}
      rel={props.external ? 'noreferrer noopener' : undefined}
      className={cn(itemVariants({ className: 'max-md:nd-hidden' }))}
    >
      {props.icon}
    </Link>
  )
}
