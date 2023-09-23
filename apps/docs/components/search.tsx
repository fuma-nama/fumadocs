'use client'

import { cn } from '@/utils/cn'
import { cva } from 'class-variance-authority'
import SearchDialog, {
  type SearchDialogProps
} from 'next-docs-ui/components/dialog/search'
import { useParams } from 'next/navigation'
import { useState } from 'react'

const itemVariants = cva(
  'border px-2 py-0.5 rounded-md text-xs text-muted-foreground font-medium transition-colors',
  {
    variants: {
      active: {
        true: 'text-accent-foreground bg-accent'
      }
    }
  }
)
export default function CustomSearchDialog(props: SearchDialogProps) {
  const { mode } = useParams()
  const defaultTag = mode === 'headless' ? 'headless' : 'ui'
  const [tag, setTag] = useState<string>()
  const value = tag ?? defaultTag

  return (
    <SearchDialog {...props} tag={value}>
      <div className="flex flex-row gap-1 px-4 py-2">
        <button
          className={cn(itemVariants({ active: value === 'headless' }))}
          onClick={() => setTag('headless')}
          tabIndex={-1}
        >
          Headless
        </button>
        <button
          className={cn(itemVariants({ active: value === 'ui' }))}
          onClick={() => setTag('ui')}
          tabIndex={-1}
        >
          UI
        </button>
      </div>
    </SearchDialog>
  )
}
