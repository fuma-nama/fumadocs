import { I18nContext } from '@/contexts/i18n'
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
  'nd-p-1.5 nd-rounded-md [&_svg]:nd-w-5 [&_svg]:nd-h-5 hover:nd-bg-accent hover:nd-text-accent-foreground'
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
        'nd-sticky nd-top-0 nd-h-16 nd-z-50 nd-border-b nd-transition-colors',
        transparent
          ? 'nd-border-transparent'
          : 'nd-bg-background/80 nd-border-foreground/10 nd-backdrop-blur-sm'
      )}
    >
      <nav className="nd-container nd-flex nd-flex-row nd-items-center nd-h-full nd-gap-4">
        <Link
          href={url}
          className="nd-inline-flex nd-items-center nd-font-medium"
        >
          {title}
        </Link>
        {children}
        {items?.map((item, key) => <NavItem key={key} {...item} />)}
        <div className="nd-flex nd-flex-row nd-ml-auto nd-items-center md:nd-gap-2">
          <SearchToggle />
          <ThemeToggle className={cn(enableSidebar && 'max-md:nd-hidden')} />
          {enableSidebar && <SidebarToggle collapsible={collapsibleSidebar} />}
          <div className="nd-flex nd-flex-row nd-items-center nd-border-l nd-pl-2 max-md:nd-hidden">
            {links?.map((item, key) => <NavLink key={key} {...item} />)}
          </div>
        </div>
      </nav>
    </header>
  )
}

const shortcut = cva('nd-border nd-rounded-md nd-bg-background nd-px-1.5')

function SearchToggle() {
  const [setOpenSearch] = useContext(SearchContext)
  const { search = 'Search' } = useContext(I18nContext).text ?? {}

  return (
    <>
      <button
        className={cn(itemVariants({ className: 'md:nd-hidden' }))}
        aria-label="Open Search"
        onClick={() => setOpenSearch(true)}
      >
        <SearchIcon />
      </button>
      <button
        className="nd-inline-flex nd-items-center nd-text-sm nd-gap-2 nd-rounded-full nd-transition-colors nd-w-[240px] nd-p-1.5 nd-border nd-text-muted-foreground nd-bg-secondary/50 hover:nd-bg-accent hover:nd-text-accent-foreground max-md:nd-hidden"
        onClick={() => setOpenSearch(true)}
      >
        <SearchIcon
          aria-label="Open Search"
          className="nd-ml-1 nd-w-4 nd-h-4"
        />
        {search}
        <div className="nd-inline-flex nd-text-xs nd-gap-0.5 nd-ml-auto">
          <kbd className={shortcut()}>⌘</kbd>
          <kbd className={shortcut()}>K</kbd>
        </div>
      </button>
    </>
  )
}

function SidebarToggle({ collapsible }: { collapsible: boolean }) {
  const [open, setOpen] = useContext(SidebarContext)

  return (
    <>
      <SidebarTrigger
        aria-label="Toggle Sidebar"
        className={cn(itemVariants({ className: 'md:nd-hidden' }))}
      >
        <MenuIcon />
      </SidebarTrigger>
      {collapsible && (
        <button
          aria-label="Toggle Sidebar"
          onClick={() => setOpen(!open)}
          className="nd-p-1.5 nd-border nd-bg-secondary/50 nd-rounded-full hover:nd-text-accent-foreground hover:nd-bg-accent max-md:nd-hidden"
        >
          {open ? (
            <SidebarCloseIcon className="nd-w-5 nd-h-5" />
          ) : (
            <SidebarOpenIcon className="nd-w-5 nd-h-5" />
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
      target={props.external ? '_blank' : '_self'}
      rel={props.external ? 'noreferrer noopener' : undefined}
      className={cn(
        'nd-text-sm nd-text-muted-foreground max-lg:nd-hidden',
        isActive
          ? 'nd-text-accent-foreground nd-font-medium'
          : 'nd-transition-colors hover:nd-text-accent-foreground'
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
      className={cn(itemVariants())}
    >
      {props.icon}
    </Link>
  )
}
