'use client'

import { cn } from '@/utils/cn'
import * as Collapsible from '@radix-ui/react-collapsible'
import type { TOCItemType } from 'next-docs-zeta/server'
import type { ReactNode } from 'react'

export function InlineTOC({
  items,
  defaultOpen,
  children
}: {
  items: TOCItemType[]
  defaultOpen?: boolean
  children?: ReactNode
}) {
  return (
    <Collapsible.Root
      defaultOpen={defaultOpen}
      className="nd-not-prose nd-bg-card nd-border nd-text-card-foreground nd-rounded-lg nd-text-sm"
    >
      <Collapsible.Trigger asChild>
        {children ?? (
          <button className="nd-font-medium nd-p-4 nd-w-full nd-text-left">
            Table of Contents
          </button>
        )}
      </Collapsible.Trigger>
      <Collapsible.Content className="nd-overflow-hidden data-[state=open]:nd-animate-collapsible-down data-[state=closed]:nd-animate-collapsible-up">
        <div className="nd-flex nd-flex-col nd-px-4 nd-pb-4">
          {items.map(item => (
            <a
              key={item.url}
              href={item.url}
              className={cn(
                'nd-py-1.5 nd-border-l hover:nd-border-primary',
                item.depth <= 2 && 'nd-pl-4',
                item.depth === 3 && 'nd-pl-7',
                item.depth >= 4 && 'nd-pl-10'
              )}
            >
              {item.title}
            </a>
          ))}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}
