'use client'

import { cn } from '@/utils/cn'
import SearchDialog, {
  type SearchDialogProps
} from 'next-docs-ui/components/dialog/search'
import { useParams } from 'next/navigation'
import { useState } from 'react'

export default function CustomSearchDialog(props: SearchDialogProps) {
  const { mode } = useParams()
  const defaultTag = mode === 'headless' ? 'headless' : 'ui'
  const [tag, setTag] = useState<string>()
  const value = tag ?? defaultTag

  return (
    <SearchDialog {...props} tag={value}>
      <div className="flex flex-row gap-1 px-4 py-2">
        <button
          className={cn(
            'border px-2 py-0.5 rounded-md text-xs text-muted-foreground font-medium transition-colors',
            value === 'headless' && 'text-secondary-foreground bg-secondary'
          )}
          onClick={() => setTag('headless')}
          tabIndex={-1}
        >
          Headless
        </button>
        <button
          className={cn(
            'border px-2 py-0.5 rounded-md text-xs text-muted-foreground font-medium transition-colors',
            value === 'ui' && 'text-secondary-foreground bg-secondary'
          )}
          onClick={() => setTag('ui')}
          tabIndex={-1}
        >
          UI
        </button>
      </div>
    </SearchDialog>
  )
}
