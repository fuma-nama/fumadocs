import { ScrollArea } from '@/components/ui/scroll-area'
import * as Collapsible from '@radix-ui/react-collapsible'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import type { FileNode, FolderNode, TreeNode } from 'next-docs-zeta/server'
import * as Base from 'next-docs-zeta/sidebar'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { cloneElement, useEffect, useMemo, useState } from 'react'
import { SearchBar } from './search-toggle'

export const { SidebarProvider, SidebarTrigger } = Base

export type SidebarProps = {
  items: TreeNode[]
  banner?: ReactNode
  children?: ReactNode
}

export function Sidebar({ items, banner, children }: SidebarProps) {
  return (
    <Base.SidebarList
      minWidth={1024} // lg
      className={clsx(
        'nd-flex nd-flex-col',
        'lg:nd-sticky lg:nd-top-16 lg:nd-w-[250px] lg:nd-h-[calc(100vh-4rem)] lg:nd-pr-4 lg:nd-pt-16',
        'max-lg:nd-fixed max-lg:nd-inset-0 max-lg:nd-px-8 max-lg:nd-bg-background/50 max-lg:nd-backdrop-blur-xl max-lg:nd-z-40 max-lg:nd-pt-20 max-lg:data-[open=false]:nd-hidden'
      )}
    >
      <SearchBar className="nd-py-2 md:nd-hidden" />
      {banner}
      <ScrollArea className="nd-flex-1 -nd-mr-4 [mask-image:linear-gradient(to_top,transparent,white_80px)]">
        <div className="nd-flex nd-flex-col nd-pb-24 nd-pr-4">
          {items.map((item, i) => (
            <Node key={i} item={item} />
          ))}
        </div>
      </ScrollArea>
      {children && (
        <div className="nd-border-t nd-pt-4 nd-pb-6">{children}</div>
      )}
    </Base.SidebarList>
  )
}

function Node({ item }: { item: TreeNode }) {
  if (item.type === 'separator')
    return (
      <p className="nd-font-medium nd-text-sm nd-px-2 nd-mt-8 nd-mb-2 lg:first:nd-mt-0">
        {item.name}
      </p>
    )
  if (item.type === 'folder') return <Folder item={item} />

  return <Item item={item} />
}

function Item({ item }: { item: FileNode }) {
  const pathname = usePathname()
  const active = pathname === item.url

  return (
    <Link
      href={item.url}
      className={clsx(
        'nd-inline-flex nd-flex-row nd-items-center nd-text-sm nd-px-2 nd-py-1.5 nd-rounded-md nd-transition-colors',
        active
          ? 'nd-text-primary nd-bg-primary/10 nd-font-medium'
          : 'nd-text-muted-foreground hover:nd-text-accent-foreground'
      )}
    >
      {item.icon &&
        cloneElement(item.icon, {
          className: 'nd-w-4 nd-h-4 nd-mr-2'
        })}
      {item.name}
    </Link>
  )
}

function hasActive(items: TreeNode[], url: string): boolean {
  return items.some(item => {
    if (item.type === 'page') {
      return item.url === url
    }
    if (item.type === 'folder') return hasActive(item.children, url)

    return false
  })
}

function Folder({ item }: { item: FolderNode }) {
  const { name, children, index } = item

  const pathname = usePathname()
  const active = index && pathname === index.url
  const childActive = useMemo(() => hasActive(children, pathname), [pathname])
  const [extend, setExtend] = useState(active || childActive)

  useEffect(() => {
    if (active || childActive) {
      setExtend(true)
    }
  }, [active, childActive])

  const onClick = () => {
    setExtend(prev => (item.index == null || active ? !prev : prev))
  }

  const content = (
    <>
      {item.icon &&
        cloneElement(item.icon, {
          className: 'nd-w-4 nd-h-4 nd-mr-2'
        })}
      {name}
    </>
  )

  return (
    <Collapsible.Root open={extend} onOpenChange={setExtend}>
      <Collapsible.Trigger
        className={clsx(
          'nd-flex nd-flex-row nd-w-full nd-text-sm nd-px-2 nd-py-1.5 nd-transition-colors nd-text-left nd-rounded-md',
          active
            ? 'nd-font-medium nd-text-primary nd-bg-primary/10'
            : 'nd-text-muted-foreground hover:nd-text-accent-foreground'
        )}
      >
        {index ? (
          <Link
            href={index.url}
            className="nd-inline-flex nd-flex-row nd-items-center nd-flex-1"
            onClick={onClick}
          >
            {content}
          </Link>
        ) : (
          content
        )}
        <ChevronDown
          className={clsx(
            'nd-w-4 nd-h-4 nd-transition-transform nd-ml-auto',
            extend ? 'nd-rotate-0' : '-nd-rotate-90'
          )}
        />
      </Collapsible.Trigger>
      <Collapsible.Content className="nd-overflow-hidden data-[state=closed]:nd-animate-collapsible-up data-[state=open]:nd-animate-collapsible-down">
        <div className="nd-flex nd-flex-col nd-ml-4 nd-pl-2 nd-border-l nd-py-2">
          {children.map((item, i) => (
            <Node key={i} item={item} />
          ))}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}
