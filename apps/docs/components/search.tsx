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
      <div className="flex flex-row gap-1 px-4 pt-2">
        <button
          className={cn(
            'border px-2 py-0.5 rounded-md text-xs text-muted-foreground font-medium transition-colors',
            value === 'headless' &&
              'text-purple-400 bg-purple-400/10 border-purple-400'
          )}
          onClick={() => setTag('headless')}
          tabIndex={-1}
        >
          Headless
        </button>
        <button
          className={cn(
            'border px-2 py-0.5 rounded-md text-xs text-muted-foreground font-medium transition-colors',
            value === 'ui' && 'text-blue-400 bg-blue-400/10 border-blue-400'
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
