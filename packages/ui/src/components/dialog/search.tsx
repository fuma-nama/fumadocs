import { FileText, Hash, Text } from 'lucide-react';
import type { SortedResult } from 'fumadocs-core/search/shared';
import { useRouter } from 'next/navigation';
import {
  useMemo,
  useCallback,
  type ReactNode,
  type HTMLAttributes,
} from 'react';
import { cva } from 'class-variance-authority';
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
import { useSidebar } from '@/contexts/sidebar';

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
    Omit<SearchContentProps, 'items'> {
  results: SortedResult[] | 'empty';

  footer?: ReactNode;
}

interface SearchContentProps {
  search: string;
  onSearchChange: (v: string) => void;
  items: SortedResult[];
}

export function SearchDialog({
  open,
  onOpenChange,
  footer,
  links = [],
  ...props
}: SearchDialogProps): React.ReactElement {
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
      <Search
        {...props}
        items={props.results === 'empty' ? defaultItems : props.results}
      />
    </CommandDialog>
  );
}

const icons = {
  text: <Text />,
  heading: <Hash />,
  page: <FileText />,
};

function Search({
  search,
  onSearchChange,
  items,
}: SearchContentProps): React.ReactElement {
  const { text } = useI18n();
  const router = useRouter();
  const { setOpenSearch } = useSearchContext();
  const sidebar = useSidebar();

  const onOpen = (url: string): void => {
    router.push(url);
    setOpenSearch(false);

    if (location.pathname === url.split('#')[0]) {
      sidebar.setOpen(false);
    } else {
      sidebar.closeOnRedirect.current = true;
    }
  };

  return (
    <>
      <CommandInput
        value={search}
        onValueChange={onSearchChange}
        onClose={useCallback(() => {
          setOpenSearch(false);
        }, [setOpenSearch])}
        placeholder={text.search}
      />
      <CommandList className={cn(items.length === 0 && 'hidden')}>
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

const itemVariants = cva(
  'rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors',
  {
    variants: {
      active: {
        true: 'bg-accent text-accent-foreground',
      },
    },
  },
);

export interface TagItem {
  name: string;
  value: string;
}

export interface TagsListProps extends HTMLAttributes<HTMLDivElement> {
  tag?: string;
  onTagChange: (tag: string) => void;

  items: TagItem[];
}

export function TagsList({
  tag,
  onTagChange,
  items,
  ...props
}: TagsListProps): ReactNode {
  return (
    <div
      {...props}
      className={cn('flex flex-row items-center gap-1', props.className)}
    >
      {items.map((item) => (
        <button
          type="button"
          key={item.value}
          className={cn(itemVariants({ active: tag === item.value }))}
          onClick={() => {
            onTagChange(item.value);
          }}
          tabIndex={-1}
        >
          {item.name}
        </button>
      ))}
      {props.children}
    </div>
  );
}
