import { SearchContext } from '@/contexts/search'
import { cn } from '@/utils/cn'
import { SearchIcon } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { useContext } from 'react'

export function SearchToggle(props: ComponentPropsWithoutRef<'button'>) {
  const { setOpenSearch } = useContext(SearchContext)

  return (
    <button
      {...props}
      className={cn(
        'nd-w-9 nd-h-9 nd-inline-flex nd-justify-center nd-items-center nd-text-sm nd-rounded-md max-md:hover:nd-bg-accent max-md:hover:nd-text-accent-foreground',
        'md:nd-w-full md:nd-max-w-[240px] md:nd-h-fit md:nd-px-2 md:nd-border md:nd-py-1.5 md:nd-text-muted-foreground md:nd-bg-secondary/50',
        props.className
      )}
      onClick={() => setOpenSearch(true)}
    >
      <SearchIcon className="nd-w-5 nd-h-5 md:nd-mr-2 md:nd-w-4 md:nd-h-4" />
      <span className="nd-flex-1 nd-text-left max-md:nd-hidden">Search</span>
      <span className="nd-text-xs nd-px-2 nd-py-0.5 nd-border nd-rounded-md nd-bg-secondary nd-text-secondary-foreground max-md:nd-hidden">
        Ctrl K
      </span>
    </button>
  )
}
