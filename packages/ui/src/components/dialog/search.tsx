'use client';

import { FileText, Hash, Loader2, SearchIcon, Text } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useMemo,
  type ReactNode,
  useEffect,
  useState,
  useRef,
  type ButtonHTMLAttributes,
  useCallback,
} from 'react';
import { useI18n } from '@/contexts/i18n';
import { cn } from '@/utils/cn';
import { useSearchContext } from '@/contexts/search';
import { useSidebar } from '@/contexts/sidebar';
import { buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogTitle,
} from '@radix-ui/react-dialog';
import type { SortedResult } from 'fumadocs-core/server';

export type SearchLink = [name: string, href: string];

type ReactSortedResult = SortedResult & {
  content: ReactNode;
};

export interface SharedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /**
   * Custom links to be displayed if search is empty
   */
  links?: SearchLink[];
}

type SearchDialogProps = SharedProps &
  SearchValueProps &
  Omit<SearchResultProps, 'items'> & {
    results: ReactSortedResult[] | 'empty';

    footer?: ReactNode;
  };

interface SearchValueProps {
  search: string;
  onSearchChange: (v: string) => void;
  isLoading?: boolean;
}

interface SearchResultProps {
  items: SortedResult[];
  hideResults?: boolean;
}

export function SearchDialog({
  open,
  onOpenChange,
  footer,
  links = [],
  ...props
}: SearchDialogProps) {
  const { text } = useI18n();
  const defaultItems = useMemo<ReactSortedResult[]>(
    () =>
      links.map(([name, link]) => ({
        type: 'page',
        id: name,
        content: name,
        url: link,
      })),
    [links],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-[state=closed]:animate-fd-fade-out data-[state=open]:animate-fd-fade-in" />
      <DialogContent
        aria-describedby={undefined}
        className="fixed left-1/2 top-[10vh] z-50 w-[98vw] max-w-screen-sm origin-left -translate-x-1/2 rounded-lg border bg-fd-popover text-fd-popover-foreground shadow-lg data-[state=closed]:animate-fd-dialog-out data-[state=open]:animate-fd-dialog-in"
      >
        <DialogTitle className="hidden">{text.search}</DialogTitle>
        <SearchInput
          search={props.search}
          onSearchChange={props.onSearchChange}
          isLoading={props.isLoading}
        />
        <SearchList
          items={props.results === 'empty' ? defaultItems : props.results}
          hideResults={props.results === 'empty' && defaultItems.length === 0}
        />
        {footer ? (
          <div className="mt-auto flex flex-col border-t p-3">{footer}</div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

const icons = {
  text: <Text className="size-4 text-fd-muted-foreground" />,
  heading: <Hash className="size-4 text-fd-muted-foreground" />,
  page: <FileText className="size-4 text-fd-muted-foreground" />,
};

function SearchInput({ search, onSearchChange, isLoading }: SearchValueProps) {
  const { text } = useI18n();
  const { setOpenSearch } = useSearchContext();

  return (
    <div className="flex flex-row items-center gap-2 px-3">
      <LoadingIndicator isLoading={isLoading ?? false} />
      <input
        value={search}
        onChange={(e) => {
          onSearchChange(e.target.value);
        }}
        placeholder={text.search}
        className="w-0 flex-1 bg-transparent py-3 text-base placeholder:text-fd-muted-foreground focus-visible:outline-none"
      />
      <button
        type="button"
        aria-label="Close Search"
        onClick={() => {
          setOpenSearch(false);
        }}
        className={cn(
          buttonVariants({
            color: 'outline',
            className: 'text-xs p-1.5',
          }),
        )}
      >
        Esc
      </button>
    </div>
  );
}

function SearchList({ items, hideResults = false }: SearchResultProps) {
  const [active, setActive] = useState<string>();
  const { text } = useI18n();
  const router = useRouter();
  const sidebar = useSidebar();
  const { setOpenSearch } = useSearchContext();

  if (
    items.length > 0 &&
    (!active || items.every((item) => item.id !== active))
  ) {
    setActive(items[0].id);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key == 'ArrowUp') {
      setActive((cur) => {
        const idx = items.findIndex((item) => item.id === cur);
        if (idx === -1) return items.at(0)?.id;

        return items.at(
          (e.key === 'ArrowDown' ? idx + 1 : idx - 1) % items.length,
        )?.id;
      });

      e.preventDefault();
    }

    if (e.key === 'Enter') {
      const selected = items.find((item) => item.id === active);

      if (selected) onOpen(selected.url);
      e.preventDefault();
    }
  }

  const listenerRef = useRef(onKey);
  listenerRef.current = onKey;

  useEffect(() => {
    const listener = (e: KeyboardEvent) => listenerRef.current?.(e);

    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, []);

  const onOpen = (url: string) => {
    router.push(url);
    setOpenSearch(false);
    sidebar.setOpen(false);
  };

  return (
    <div
      className={cn(
        'flex max-h-[460px] flex-col overflow-y-auto border-t p-2',
        hideResults && 'hidden',
      )}
    >
      {items.length === 0 ? (
        <div className="py-12 text-center text-sm">{text.searchNoResult}</div>
      ) : null}

      {items.map((item) => (
        <CommandItem
          key={item.id}
          value={item.id}
          active={active}
          onActiveChange={setActive}
          onClick={() => {
            onOpen(item.url);
          }}
        >
          {item.type !== 'page' ? (
            <div
              role="none"
              className="ms-2 h-full min-h-10 w-px bg-fd-border"
            />
          ) : null}
          {icons[item.type]}
          <p className="w-0 flex-1 truncate">{item.content}</p>
        </CommandItem>
      ))}
    </div>
  );
}

function LoadingIndicator({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="relative size-4">
      <Loader2
        className={cn(
          'absolute size-full animate-spin text-fd-primary transition-opacity',
          !isLoading && 'opacity-0',
        )}
      />
      <SearchIcon
        className={cn(
          'absolute size-full text-fd-muted-foreground transition-opacity',
          isLoading && 'opacity-0',
        )}
      />
    </div>
  );
}

function CommandItem({
  active,
  onActiveChange,
  value,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
  active?: string;
  onActiveChange: (value: string) => void;
}) {
  return (
    <button
      ref={useCallback(
        (element: HTMLButtonElement | null) => {
          if (active === value && element) {
            element.scrollIntoView({
              block: 'nearest',
            });
          }
        },
        [active, value],
      )}
      type="button"
      aria-selected={active === value}
      onPointerMove={() => onActiveChange(value)}
      {...props}
      className={cn(
        'flex min-h-10 select-none flex-row items-center gap-2.5 rounded-lg px-2 text-start text-sm',
        active === value && 'bg-fd-accent text-fd-accent-foreground',
        props.className,
      )}
    >
      {props.children}
    </button>
  );
}
