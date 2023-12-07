'use client'

import { cn } from '@/utils/cn'
import { cva } from 'class-variance-authority'
import { FileIcon, FolderIcon, FolderOpenIcon } from 'lucide-react'
import type { HTMLAttributes, ReactNode } from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from './ui/collapsible'

const item = cva(
  'flex flex-row items-center gap-2 text-sm rounded-md px-2 py-1.5 [&_svg]:w-4 [&_svg]:h-4 transition-colors hover:bg-accent hover:text-accent-foreground'
)

export function Files({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('not-prose border rounded-md bg-card p-2', className)}
      {...props}
    >
      {props.children}
    </div>
  )
}

export function File({
  title,
  icon,
  defaultOpen,
  children
}: {
  title: string
  icon?: ReactNode
  defaultOpen?: boolean
  children?: ReactNode
}) {
  if (children == null) {
    return (
      <p className={cn(item())}>
        {icon ?? <FileIcon />}
        {title}
      </p>
    )
  }

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className={cn(item({ className: 'group w-full' }))}>
        <FolderIcon className="group-data-[state=open]:hidden" />
        <FolderOpenIcon className="group-data-[state=closed]:hidden" />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col ml-4 pl-2 border-l py-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}
