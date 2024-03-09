import { FileTextIcon, HashIcon, TextIcon } from 'lucide-react';
import type { SortedResult } from 'fumadocs-core/search/shared';
import { useRouter } from 'next/navigation';
import { useMemo, type ReactNode } from 'react';
import { useI18n } from '@/contexts/i18n';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/utils/cn';
import { useSearchContext } from '@/contexts/search';
import { Dialog, DialogContent, DialogFooter } from '../ui/dialog';

export type SearchLink = [name: string, href: string];

export interface SharedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /**
   * Custom links to be displayed if search is empty
   */
  links?: SearchLink[];
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactNode;
}

export function SearchDialog(props: SearchDialogProps): JSX.Element {
  return <Dialog {...props}>{props.children}</Dialog>;
}

interface SearchContentProps {
  search: string;
  onSearchChange: (v: string) => void;
  results: SortedResult[] | 'empty';

  footer?: ReactNode;
  links?: SearchLink[];
}

export function SearchDialogContent({
  footer,
  ...props
}: SearchContentProps): JSX.Element {
  return (
    <DialogContent className="p-0">
      <Search {...props} />
      {footer ? (
        <DialogFooter className="border-t">{footer}</DialogFooter>
      ) : null}
    </DialogContent>
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
  links = [],
  results,
}: SearchContentProps): JSX.Element {
  const { text } = useI18n();
  const router = useRouter();
  const { setOpenSearch } = useSearchContext();

  const defaultItems = useMemo<SortedResult[]>(() => {
    return links.map(([name, link]) => ({
      type: 'page',
      id: name,
      content: name,
      url: link,
    }));
  }, [links]);

  const items = results === 'empty' ? defaultItems : results;
  const hideList = results === 'empty' && defaultItems.length === 0;

  const onOpen = (url: string): void => {
    router.push(url);
    setOpenSearch(false);
  };

  return (
    <Command>
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
    </Command>
  );
}
