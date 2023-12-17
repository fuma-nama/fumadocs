import { FileTextIcon, HashIcon, TextIcon } from 'lucide-react';
import type { SortedResult } from 'next-docs-zeta/search/shared';
import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { useI18n } from '@/contexts/i18n';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

export interface SharedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export type SearchDialogProps = SharedProps & {
  search: string;
  onSearchChange: (v: string) => void;
  data: SortedResult[] | 'empty' | undefined;
  /**
   * displayed at bottom
   */
  footer?: ReactNode;
  /**
   * displayed in item list
   */
  children?: ReactNode;

  showOnEmpty?: boolean;
};

export function SearchDialog({
  search,
  onSearchChange,
  data,
  showOnEmpty = false,
  ...props
}: SearchDialogProps): JSX.Element {
  const router = useRouter();
  const { text } = useI18n();
  const showList = data !== 'empty' || showOnEmpty;

  const onOpen = (url: string): void => {
    router.push(url);
    props.onOpenChange(false);
  };

  return (
    <CommandDialog {...props}>
      <Command label="Search Dialog" shouldFilter={false} loop>
        <CommandInput
          value={search}
          onValueChange={onSearchChange}
          placeholder={text.search ?? 'Search'}
        />
        {showList ? (
          <CommandList>
            <CommandEmpty>
              {text.searchNoResult ?? 'No results found'}
            </CommandEmpty>
            <CommandGroup value="result">
              {Array.isArray(data) &&
                data.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => {
                      onOpen(item.url);
                    }}
                    nested={item.type !== 'page'}
                  >
                    {
                      {
                        text: <TextIcon />,
                        heading: <HashIcon />,
                        page: <FileTextIcon />,
                      }[item.type]
                    }
                    <p className="w-0 flex-1 truncate">{item.content}</p>
                  </CommandItem>
                ))}
            </CommandGroup>
            {props.children}
          </CommandList>
        ) : null}
        {props.footer}
      </Command>
    </CommandDialog>
  );
}
