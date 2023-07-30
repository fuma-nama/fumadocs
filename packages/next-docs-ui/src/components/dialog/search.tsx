import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/components/ui/command'
import { I18nContext } from '@/contexts/i18n'
import type { DialogProps } from '@radix-ui/react-dialog'
import { BookOpenIcon } from 'lucide-react'
import { useDocsSearch } from 'next-docs-zeta/search'
import { useRouter } from 'next/navigation'
import { useCallback, useContext } from 'react'

export type SearchOptions = {
  /**
   * links to be displayed in Search Dialog
   */
  links?: [name: string, link: string][]
}

export default function SearchDialog({
  links = [],
  ...props
}: DialogProps & SearchOptions) {
  const router = useRouter()
  const locale = useContext(I18nContext)?.locale
  const { search, setSearch, query } = useDocsSearch(locale)

  const onOpen = useCallback(
    (v: string) => {
      router.push(v)
      props.onOpenChange?.(false)
    },
    [router]
  )

  return (
    <CommandDialog {...props}>
      <CommandInput
        placeholder="Type a command or search..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {query.data != 'empty' &&
          query.data != null &&
          query.data.length !== 0 && (
            <CommandGroup heading="Documents">
              {query.data.map(item => (
                <CommandItem
                  key={item.id[0]}
                  value={item.doc.url}
                  onSelect={onOpen}
                >
                  {item.doc.title}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        <CommandSeparator />
        {query.data === 'empty' && links.length > 0 && (
          <CommandGroup heading="Links">
            {links.map(([name, url], i) => (
              <CommandItem key={i} value={url} onSelect={onOpen}>
                <BookOpenIcon className="nd-w-5 nd-h-5 nd-mr-2" />
                {name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
