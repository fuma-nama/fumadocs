import { FileTextIcon, HashIcon, TextIcon } from 'lucide-react';
import type { SortedResult } from 'fumadocs-core/search/shared';
import { useRouter } from 'next/navigation';
import { useMemo, type ReactNode } from 'react';
import { useI18n } from '@/contexts/i18n';
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandDialog,
} from '@/components/ui/command';
import { cn } from '@/utils/cn';
import { useSearchContext } from '@/contexts/search';

export type SearchLink = [name: string, href: string];

export interface SharedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /**
   * Custom links to be displayed if search is empty
   */
  links?: SearchLink[];
}

interface SearchDialogProps
  extends SharedProps,
    Omit<SearchContentProps, 'defaultItems'> {
  footer?: ReactNode;
}

interface SearchContentProps {
  search: string;
  onSearchChange: (v: string) => void;
  results: SortedResult[] | 'empty';

  defaultItems?: SortedResult[];
}

export function SearchDialog({
  open,
  onOpenChange,
  footer,
  links = [],
  ...props
}: SearchDialogProps): JSX.Element {
  const defaultItems = useMemo(
    () =>
      links.map<SortedResult>(([name, link]) => ({
        type: 'page',
        id: name,
        content: name,
        url: link,
      })),
    [links],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} footer={footer}>
      <Search defaultItems={defaultItems} {...props} />
    </CommandDialog>
  );
}

const icons = {
  text: <TextIcon />,
  heading: <HashIcon />,
  page: <FileTextIcon />,
};

function Search({
  search,
  onSearchChange,
  defaultItems = [],
  results,
}: SearchContentProps): JSX.Element {
  const { text } = useI18n();
  const router = useRouter();
  const { setOpenSearch } = useSearchContext();

  const items = results === 'empty' ? defaultItems : results;
  const hideList = results === 'empty' && defaultItems.length === 0;

  const onOpen = (url: string): void => {
    router.push(url);
    setOpenSearch(false);
  };

  return (
    <>
      <CommandInput
        value={search}
        onValueChange={onSearchChange}
        placeholder={text.search}
      />
      <CommandList className={cn(hideList && 'hidden')}>
        <CommandEmpty>{text.searchNoResult}</CommandEmpty>

        <CommandGroup value="result">
          {items.map((item) => (
            <CommandItem
              key={item.id}
              value={item.id}
              onSelect={() => {
                onOpen(item.url);
              }}
              icon={icons[item.type]}
              nested={item.type !== 'page'}
            >
              {item.content}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </>
  );
}
