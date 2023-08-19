import { SidebarContext } from '@/contexts/sidebar'
import clsx from 'clsx'
import { MenuIcon, SidebarCloseIcon, SidebarOpenIcon } from 'lucide-react'
import { SidebarTrigger } from 'next-docs-zeta/sidebar'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useContext, type ReactNode } from 'react'
import { SearchToggle } from './search-toggle'
import { ThemeToggle } from './theme-toggle'

export type NavLinkProps = {
  icon: ReactNode
  href: string
  external?: boolean
}

export type NavItemProps = {
  href: string
  children: ReactNode
  external?: boolean
}

type NavProps = {
  items?: NavItemProps[]
  links?: NavLinkProps[]
  enableSidebar?: boolean
  collapsibleSidebar?: boolean
  children: ReactNode
}

export function Nav({
  links,
  items,
  enableSidebar = true,
  collapsibleSidebar = true,
  children
}: NavProps) {
  const [open, setOpen] = useContext(SidebarContext)

  return (
    <nav className="nd-sticky nd-top-0 nd-inset-x-0 nd-z-50 nd-backdrop-blur-lg">
      <div className="nd-container nd-flex nd-flex-row nd-items-center nd-h-16 nd-gap-4 nd-border-b nd-border-foreground/10 nd-max-w-[1300px]">
        {children}
        {items?.map((item, key) => <NavItem key={key} {...item} />)}
        <div className="nd-flex nd-flex-row nd-justify-end nd-items-center nd-flex-1">
          <SearchToggle className="md:nd-mr-2" />
          {enableSidebar && collapsibleSidebar && (
            <button
              aria-label="Toggle Sidebar"
              onClick={() => setOpen(!open)}
              className="nd-mr-2 nd-p-2 nd-transition-colors nd-rounded-md nd-border nd-bg-secondary/50 nd-text-muted-foreground hover:nd-text-accent-foreground hover:nd-bg-accent max-lg:nd-hidden"
            >
              {open ? (
                <SidebarCloseIcon className="nd-w-5 nd-h-5" />
              ) : (
                <SidebarOpenIcon className="nd-w-5 nd-h-5" />
              )}
            </button>
          )}
          {links?.map((item, key) => <NavLink key={key} {...item} />)}
          <ThemeToggle className={clsx(enableSidebar && 'max-lg:nd-hidden')} />
          {enableSidebar && (
            <SidebarTrigger
              aria-label="Toggle Sidebar"
              className="nd-p-2 nd-rounded-md hover:nd-bg-accent lg:nd-hidden"
            >
              <MenuIcon className="nd-w-5 nd-h-5" />
            </SidebarTrigger>
          )}
        </div>
      </div>
    </nav>
  )
}

export function NavItem(props: NavItemProps) {
  const pathname = usePathname()
  const isActive =
    props.href === pathname || pathname.startsWith(props.href + '/')

  return (
    <Link
      href={props.href}
      target={props.external ? '_blank' : '_self'}
      rel={props.external ? 'noreferrer noopener' : undefined}
      className={clsx(
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

export function NavLink(props: NavLinkProps) {
  return (
    <Link
      href={props.href}
      target={props.external ? '_blank' : '_self'}
      rel={props.external ? 'noreferrer noopener' : undefined}
      className="nd-p-2 nd-rounded-md hover:nd-bg-accent max-md:nd-hidden"
    >
      {props.icon}
    </Link>
  )
}
