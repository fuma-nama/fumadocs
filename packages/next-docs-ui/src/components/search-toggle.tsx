import { I18nContext } from '@/contexts/i18n'
import { SearchContext } from '@/contexts/search'
import { cn } from '@/utils/cn'
import { SearchIcon } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { useContext } from 'react'

export function SearchBarToggle(props: ComponentPropsWithoutRef<'button'>) {
  const { setOpenSearch } = useContext(SearchContext)
  const { search = 'Search' } = useContext(I18nContext).text ?? {}

  return (
    <button
      {...props}
      className={cn(
        'nd-inline-flex nd-items-center nd-text-sm nd-rounded-md nd-transition-colors nd-w-full nd-max-w-[250px] nd-px-3 nd-border nd-py-1.5 nd-text-muted-foreground nd-bg-secondary/70 hover:nd-bg-accent',
        props.className
      )}
      onClick={() => setOpenSearch(true)}
    >
      <SearchIcon aria-label="Open Search" className="nd-mr-2 nd-w-4 nd-h-4" />
      {search}
      <span className="nd-text-xs nd-ml-auto nd-px-2 nd-py-0.5 nd-border nd-rounded-md nd-bg-secondary nd-text-secondary-foreground">
        Ctrl K
      </span>
    </button>
  )
}
