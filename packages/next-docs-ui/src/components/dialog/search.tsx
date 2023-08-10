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
import { BookOpenIcon, HeadingIcon, TextIcon } from 'lucide-react'
import { useDocsSearch } from 'next-docs-zeta/search'
import type { SortedResult } from 'next-docs-zeta/server'
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
  const { search, setSearch, query } = useDocsSearch<SortedResult[]>(locale)

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
                  key={item.id}
                  value={item.id}
                  onSelect={() => onOpen(item.url)}
                >
                  {
                    {
                      text: <TextIcon className="nd-ml-4 nd-mr-2" />,
                      heading: <HeadingIcon className="nd-ml-4 nd-mr-2" />,
                      page: <BookOpenIcon className="nd-mr-2" />
                    }[item.type]
                  }
                  {item.content}
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
