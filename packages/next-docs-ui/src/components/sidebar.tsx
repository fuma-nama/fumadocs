import { ScrollArea } from '@/components/ui/scroll-area'
import { SidebarContext } from '@/contexts/sidebar'
import { LayoutContext } from '@/contexts/tree'
import { cn } from '@/utils/cn'
import * as Collapsible from '@radix-ui/react-collapsible'
import { cva } from 'class-variance-authority'
import { ChevronDown } from 'lucide-react'
import type { FileNode, FolderNode, TreeNode } from 'next-docs-zeta/server'
import * as Base from 'next-docs-zeta/sidebar'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useContext, useEffect, useMemo, useState } from 'react'
import { ThemeToggle } from './theme-toggle'

export type SidebarProps = {
  banner?: ReactNode
  footer?: ReactNode
}

const itemVariants = cva(
  'nd-flex nd-flex-row nd-items-center nd-gap-2 nd-text-muted-foreground nd-px-2 nd-py-1.5 nd-rounded-md [&_svg]:nd-w-4 [&_svg]:nd-h-4',
  {
    variants: {
      active: {
        true: 'nd-text-primary nd-bg-primary/10 nd-font-medium',
        false: 'hover:nd-bg-accent/50'
      }
    }
  }
)

export function Sidebar({ banner, footer }: SidebarProps) {
  const [open] = useContext(SidebarContext)
  const { tree } = useContext(LayoutContext)

  return (
    <Base.SidebarList
      minWidth={1024} // lg
      className={cn(
        'nd-flex nd-flex-col',
        open
          ? 'lg:nd-w-[260px]'
          : 'lg:nd-w-0 lg:nd-overflow-hidden lg:nd-opacity-0',
        'lg:nd-sticky lg:nd-top-16 lg:nd-h-[calc(100vh-4rem)] lg:nd-transition-[width,opacity]',
        'max-lg:nd-w-full max-lg:nd-px-8 max-lg:nd-fixed max-lg:nd-inset-y-0 max-lg:nd-right-0 max-lg:nd-bg-background max-lg:nd-z-40 max-lg:nd-pt-16 max-lg:data-[open=false]:nd-hidden sm:max-lg:nd-max-w-sm sm:max-lg:nd-border-l'
      )}
    >
      <ScrollArea className="nd-flex-1 [mask-image:linear-gradient(to_top,transparent,white_40px)] max-lg:-nd-mr-4 lg:nd-w-[260px]">
        <div className="nd-flex nd-flex-col nd-pb-10 nd-pr-4 nd-pt-4 sm:nd-text-sm lg:nd-pt-12">
          {banner}
          {tree.children.map((item, i) => (
            <Node key={i} item={item} level={1} />
          ))}
        </div>
      </ScrollArea>
      <div
        className={cn(
          'nd-flex nd-flex-row nd-items-center nd-gap-2 nd-border-t nd-py-2',
          !footer && 'lg:nd-hidden'
        )}
      >
        {footer}
        <ThemeToggle className="lg:nd-hidden" />
      </div>
    </Base.SidebarList>
  )
}

function Node({ item, level }: { item: TreeNode; level: number }) {
  if (item.type === 'separator')
    return (
      <p className="nd-font-medium nd-px-2 nd-mt-8 nd-mb-2 first:nd-mt-0">
        {item.name}
      </p>
    )
  if (item.type === 'folder') return <Folder item={item} level={level} />

  return <Item item={item} />
}

function Item({ item }: { item: FileNode }) {
  const pathname = usePathname()
  const active = pathname === item.url

  return (
    <Link href={item.url} className={cn(itemVariants({ active }))}>
      {item.icon}
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

function Folder({
  item: { name, children, index, icon },
  level
}: {
  item: FolderNode
  level: number
}) {
  const { sidebarDefaultOpenLevel = 1 } = useContext(LayoutContext)

  const pathname = usePathname()
  const active = index != null && pathname === index.url
  const childActive = useMemo(() => hasActive(children, pathname), [pathname])
  const [animated, setAnimated] = useState(false)
  const [extend, setExtend] = useState(
    active || childActive || sidebarDefaultOpenLevel >= level
  )

  useEffect(() => {
    setAnimated(true)
  }, [])

  useEffect(() => {
    if (childActive) setExtend(true)
  }, [childActive])

  const content = (
    <>
      {icon}
      {name}
      <ChevronDown
        onClick={e => {
          setExtend(prev => !prev)
          e.preventDefault()
        }}
        className={cn(
          'nd-transition-transform nd-ml-auto',
          extend && '-nd-rotate-90'
        )}
      />
    </>
  )

  return (
    <Collapsible.Root
      open={extend}
      onOpenChange={index == null || active ? setExtend : undefined}
    >
      <Collapsible.Trigger
        className={cn(itemVariants({ active, className: 'nd-w-full' }))}
        asChild
      >
        {index ? (
          <Link href={index.url}>{content}</Link>
        ) : (
          <button>{content}</button>
        )}
      </Collapsible.Trigger>
      <Collapsible.Content
        className={cn(
          'nd-overflow-hidden data-[state=open]:nd-animate-collapsible-down data-[state=closed]:nd-animate-collapsible-up',
          !animated && '!nd-duration-0'
        )}
      >
        <div className="nd-flex nd-flex-col nd-ml-4 nd-pl-2 nd-border-l nd-py-2">
          {children.map((item, i) => (
            <Node key={i} item={item} level={level + 1} />
          ))}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}
