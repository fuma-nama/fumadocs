'use client'

import * as Collapsible from '@radix-ui/react-collapsible'
import { ChevronDown } from 'lucide-react'
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
          <button className="nd-inline-flex nd-items-center nd-justify-between nd-font-medium nd-p-4 nd-w-full [&[data-state=open]>svg]:nd-rotate-180">
            Table of Contents
            <ChevronDown className="nd-h-4 nd-w-4 nd-transition-transform nd-duration-200" />
          </button>
        )}
      </Collapsible.Trigger>
      <Collapsible.Content className="nd-overflow-hidden data-[state=open]:nd-animate-collapsible-down data-[state=closed]:nd-animate-collapsible-up">
        <div className="nd-flex nd-flex-col nd-px-4 nd-pb-4 nd-text-muted-foreground">
          {items.map(item => (
            <a
              key={item.url}
              href={item.url}
              className="nd-py-1.5 nd-border-l hover:nd-text-primary hover:nd-border-primary"
              style={{
                paddingLeft: 16 * Math.max(item.depth - 1, 1)
              }}
            >
              {item.title}
            </a>
          ))}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}
