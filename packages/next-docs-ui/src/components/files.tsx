'use client'

import * as Collapsible from '@radix-ui/react-collapsible'
import clsx from 'clsx'
import { ChevronDown, FileIcon, FolderIcon, FolderOpenIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function Files({ children }: { children: ReactNode }) {
  return (
    <div className="nd-flex nd-flex-col nd-not-prose nd-border nd-rounded-md nd-p-2">
      {children}
    </div>
  )
}

export function File({
  title,
  defaultOpen,
  children
}: {
  title: string
  defaultOpen?: boolean
  children?: ReactNode
}) {
  if (children == null) {
    return (
      <p className="nd-flex nd-flex-row nd-items-center nd-text-sm nd-rounded-md nd-px-2 nd-py-1.5 nd-transition-colors hover:nd-bg-accent hover:nd-text-accent-foreground">
        <FileIcon className="nd-w-4 nd-h-4 nd-mr-2" />
        {title}
      </p>
    )
  }

  return (
    <Collapsible.Root defaultOpen={defaultOpen}>
      <Collapsible.Trigger className="nd-group nd-flex nd-w-full nd-flex-row nd-items-center nd-text-sm nd-px-2 nd-py-1.5 nd-transition-colors nd-rounded-md hover:nd-bg-accent hover:nd-text-accent-foreground">
        <FolderIcon className="nd-w-4 nd-h-4 nd-mr-2 group-data-[state=open]:nd-hidden" />
        <FolderOpenIcon className="nd-w-4 nd-h-4 nd-mr-2 group-data-[state=closed]:nd-hidden" />
        {title}
        <ChevronDown
          className={clsx(
            'nd-w-4 nd-h-4 nd-transition-transform nd-ml-auto group-data-[state=open]:nd-rotate-180'
          )}
        />
      </Collapsible.Trigger>
      <Collapsible.Content className="nd-overflow-hidden data-[state=closed]:nd-animate-collapsible-up data-[state=open]:nd-animate-collapsible-down">
        <div className="nd-flex nd-flex-col nd-ml-4 nd-pl-2 nd-border-l nd-py-2">
          {children}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}
