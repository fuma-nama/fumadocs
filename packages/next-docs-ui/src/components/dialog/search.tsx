import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { I18nContext } from '@/contexts/i18n'
import { FileTextIcon, HashIcon, TextIcon } from 'lucide-react'
import { useDocsSearch } from 'next-docs-zeta/search'
import type { SortedResult } from 'next-docs-zeta/server'
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

export type InternalDialogProps = SearchOptions & {
  open: boolean
  onOpenChange(open: boolean): void

  search: string
  setSearch: (v: string) => void
  data: SortedResult[] | 'empty' | undefined
  children?: ReactNode
}

export function InternalDialog({
  links = [],
  search,
  setSearch,
  data,
  ...props
}: InternalDialogProps) {
  const router = useRouter()
  const { text } = useContext(I18nContext)

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
        placeholder={text?.search ?? 'Search'}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        {data != 'empty' && (
          <CommandEmpty>
            {text?.searchNoResult ?? 'No results found.'}
          </CommandEmpty>
        )}

        {data != 'empty' && data != null && data.length !== 0 && (
          <CommandGroup>
            {data.map(item => (
              <CommandItem
                key={item.id}
                value={item.id}
                onSelect={() => onOpen(item.url)}
                nested={item.type !== 'page'}
              >
                {
                  {
                    text: <TextIcon />,
                    heading: <HashIcon />,
                    page: <FileTextIcon />
                  }[item.type]
                }
                <p className="nd-w-0 nd-flex-1 nd-whitespace-nowrap nd-overflow-hidden nd-overflow-ellipsis">
                  {item.content}
                </p>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {data === 'empty' && links.length > 0 && (
          <CommandGroup>
            {links.map(([name, url], i) => (
              <CommandItem key={i} value={url} onSelect={onOpen}>
                <FileTextIcon />
                {name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
      {props.children}
    </CommandDialog>
  )
}

export default function SearchDialog({ tag, ...props }: SearchDialogProps) {
  const { locale } = useContext(I18nContext)
  const { search, setSearch, query } = useDocsSearch(locale, tag)

  return (
    <InternalDialog
      search={search}
      setSearch={setSearch}
      data={query.data}
      {...props}
    />
  )
}
