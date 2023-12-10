import type { SharedProps } from '../components/dialog/search'
import type { DefaultSearchDialogProps } from '../components/dialog/search-default'
import dynamic from 'next/dynamic'
import type { ComponentType, ReactNode } from 'react'
import { createContext, useEffect, useState } from 'react'

const DefaultSearchDialog = dynamic(
  () => import('../components/dialog/search-default')
)

export type SearchProviderProps = {
  links?: DefaultSearchDialogProps['links']

  /**
   * Replace default search dialog, allowing you to use other solutions such as Algolia Search
   *
   * It receives the `open` and `onOpenChange` prop, shall be lazy loaded with `next/dynamic`
   */
  SearchDialog?: ComponentType<SharedProps>

  children: ReactNode
}

export const SearchContext = createContext<
  [setOpenSearch: (value: boolean) => void]
>([() => {}])

export function SearchProvider({
  SearchDialog,
  children,
  ...props
}: SearchProviderProps) {
  const [isOpen, setOpen] = useState<boolean>()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        setOpen(true)
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handler)

    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [])

  const Dialog = SearchDialog ?? DefaultSearchDialog

  return (
    <SearchContext.Provider value={[setOpen]}>
      {isOpen !== undefined && (
        <Dialog open={isOpen} onOpenChange={setOpen} {...props} />
      )}
      {children}
    </SearchContext.Provider>
  )
}
