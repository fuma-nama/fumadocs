'use client'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from './ui/collapsible'
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
    <Collapsible
      defaultOpen={defaultOpen}
      className="not-prose bg-card text-card-foreground rounded-lg border text-sm"
    >
      <CollapsibleTrigger asChild>
        {children ?? (
          <button className="inline-flex w-full items-center justify-between p-4 font-medium [&[data-state=open]>svg]:rotate-180">
            Table of Contents
            <ChevronDown className="h-4 w-4 transition-transform duration-200" />
          </button>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="text-muted-foreground flex flex-col px-4 pb-4">
          {items.map(item => (
            <a
              key={item.url}
              href={item.url}
              className="hover:text-primary hover:border-primary border-l py-1.5"
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
