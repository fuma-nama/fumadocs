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
import { FileTextIcon, HashIcon, TextIcon } from 'lucide-react'
import { useDocsSearch } from 'next-docs-zeta/search'
import { useRouter } from 'next/navigation'
import { useCallback, useContext, type ReactNode } from 'react'

export type SearchOptions = {
  /**
   * links to be displayed in Search Dialog
   */
  links?: [name: string, link: string][]
}

export type SearchDialogProps = SearchOptions & {
  open: boolean
  onOpenChange(open: boolean): void
  /**
   * Search tag
   */
  tag?: string
  children?: ReactNode
}

export default function SearchDialog({
  links = [],
  tag,
  ...props
}: SearchDialogProps) {
  const router = useRouter()
  const { locale, text } = useContext(I18nContext)
  const { search, setSearch, query } = useDocsSearch(locale, tag)

  const onOpen = useCallback(
    (v: string) => {
      router.push(v)
      props.onOpenChange?.(false)
    },
    [router]
  )

  return (
    <CommandDialog {...props}>
      {props.children}
      <CommandInput
        placeholder={text?.search ?? 'Search'}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {query.data != 'empty' &&
          query.data != null &&
          query.data.length !== 0 && (
            <CommandGroup>
              {query.data.map(item => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={() => onOpen(item.url)}
                >
                  {item.type !== 'page' && (
                    <div className="nd-absolute nd-inset-y-0 nd-left-6 nd-w-[2px] nd-bg-border" />
                  )}
                  {
                    {
                      text: <TextIcon className="nd-ml-6 nd-mr-2" />,
                      heading: <HashIcon className="nd-ml-6 nd-mr-2" />,
                      page: <FileTextIcon className="nd-mr-2" />
                    }[item.type]
                  }
                  <p className="nd-w-0 nd-flex-1 nd-whitespace-nowrap nd-overflow-hidden nd-overflow-ellipsis">
                    {item.content}
                  </p>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        <CommandSeparator />
        {query.data === 'empty' && links.length > 0 && (
          <CommandGroup heading="Links">
            {links.map(([name, url], i) => (
              <CommandItem key={i} value={url} onSelect={onOpen}>
                <FileTextIcon className="nd-mr-2" />
                {name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
