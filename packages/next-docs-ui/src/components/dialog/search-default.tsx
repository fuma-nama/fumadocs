'use client'

import { CommandGroup, CommandItem } from '@/components/ui/command'
import { I18nContext } from '@/contexts/i18n'
import { ExternalLinkIcon } from 'lucide-react'
import { useDocsSearch } from 'next-docs-zeta/search'
import { useRouter } from 'next/navigation'
import { useContext, type ReactNode } from 'react'
import { SearchDialog, type SharedProps } from './search'

export type DefaultSearchDialogProps = SharedProps & {
  /**
   * Custom links to be displayed if search is empty
   */
  links?: [name: string, link: string][]

  /**
   * Search tag
   */
  tag?: string
  footer?: ReactNode
}

export default function DefaultSearchDialog({
  tag,
  links = [],
  ...props
}: DefaultSearchDialogProps) {
  const { locale } = useContext(I18nContext)
  const { search, setSearch, query } = useDocsSearch(locale, tag)
  const router = useRouter()

  const onSelect = (v: string) => {
    router.push(v)
    props.onOpenChange?.(false)
  }

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      data={query.data}
      {...props}
    >
      {query.data === 'empty' && links.length > 0 && (
        <CommandGroup>
          {links.map(([name, link], i) => (
            <CommandItem key={i} value={link} onSelect={onSelect}>
              <ExternalLinkIcon />
              {name}
            </CommandItem>
          ))}
        </CommandGroup>
      )}
    </SearchDialog>
  )
}
