import { SearchContext } from '@/contexts/search'
import { cn } from '@/utils/cn'
import { SearchIcon } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { useContext } from 'react'

export function SearchBar(props: ComponentPropsWithoutRef<'button'>) {
  const { setOpenSearch } = useContext(SearchContext)

  return (
    <button
      {...props}
      className={cn(
        'nd-flex nd-flex-row nd-items-center nd-border nd-border-input nd-rounded-md nd-text-muted-foreground nd-bg-background/50 nd-px-3 nd-py-2 nd-text-sm',
        props.className
      )}
      onClick={() => setOpenSearch(true)}
    >
      <SearchIcon className="nd-w-4 nd-h-4 nd-mr-2" />
      Search...
      <span className="nd-ml-auto nd-text-xs nd-px-2 nd-py-0.5 nd-border nd-rounded-md nd-bg-secondary nd-text-secondary-foreground">
        Ctrl K
      </span>
    </button>
  )
}
