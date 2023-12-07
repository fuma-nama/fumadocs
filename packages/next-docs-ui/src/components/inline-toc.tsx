'use client'

import { ChevronDown } from 'lucide-react'
import type { TOCItemType } from 'next-docs-zeta/server'
import type { ReactNode } from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from './ui/collapsible'

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
    <Collapsible
      defaultOpen={defaultOpen}
      className="not-prose bg-card border text-card-foreground rounded-lg text-sm"
    >
      <CollapsibleTrigger asChild>
        {children ?? (
          <button className="inline-flex items-center justify-between font-medium p-4 w-full [&[data-state=open]>svg]:rotate-180">
            Table of Contents
            <ChevronDown className="h-4 w-4 transition-transform duration-200" />
          </button>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col px-4 pb-4 text-muted-foreground">
          {items.map(item => (
            <a
              key={item.url}
              href={item.url}
              className="py-1.5 border-l hover:text-primary hover:border-primary"
              style={{
                paddingLeft: 16 * Math.max(item.depth - 1, 1)
              }}
            >
              {item.title}
            </a>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
