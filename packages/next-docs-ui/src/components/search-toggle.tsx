import { I18nContext } from '@/contexts/i18n'
import { SearchContext } from '@/contexts/search'
import { cn } from '@/utils/cn'
import { cva } from 'class-variance-authority'
import { SearchIcon } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { useContext } from 'react'

const shortcut = cva(
  'nd-border nd-rounded-md nd-bg-background nd-px-1.5 nd-py-0.5'
)

export function SearchBarToggle(props: ComponentPropsWithoutRef<'button'>) {
  const [setOpenSearch] = useContext(SearchContext)
  const { search = 'Search' } = useContext(I18nContext).text ?? {}

  return (
    <button
      {...props}
      className={cn(
        'nd-inline-flex nd-items-center nd-text-sm nd-gap-2 nd-rounded-md nd-transition-colors nd-w-full nd-max-w-[250px] nd-p-1.5 nd-border nd-text-muted-foreground nd-bg-secondary/50 hover:nd-bg-accent hover:nd-text-accent-foreground',
        props.className
      )}
      onClick={() => setOpenSearch(true)}
    >
      <SearchIcon aria-label="Open Search" className="nd-ml-1 nd-w-4 nd-h-4" />
      {search}
      <div className="nd-inline-flex nd-items-center nd-text-xs nd-gap-0.5 nd-ml-auto">
        <kbd className={shortcut()}>⌘</kbd>
        <kbd className={shortcut()}>K</kbd>
      </div>
    </button>
  )
}
