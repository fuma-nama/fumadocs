'use client';

import {
  FileText,
  Hash,
  LoaderCircle,
  Search as SearchIcon,
  Text,
} from 'lucide-react';
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useI18n } from '@/contexts/i18n';
import { cn, cvb } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogTitle,
} from '@radix-ui/react-dialog';
import type { SortedResult } from 'fumadocs-core/server';
import { useEffectEvent } from 'fumadocs-core/utils/use-effect-event';
import { createContext, useRouter } from 'fumadocs-core/framework';

export type SearchLink = [name: string, href: string];

type ReactSortedResult = Omit<SortedResult, 'content'> & {
  external?: boolean;
  content: ReactNode;
};

export interface TagItem {
  name: string;
  value: string;
}

export interface SharedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /**
   * Custom links to be displayed if search is empty
   */
  links?: SearchLink[];
}

interface SearchDialogProps extends SharedProps {
  search: string;
  onSearchChange: (v: string) => void;
  isLoading?: boolean;
  hideResults?: boolean;
  results: ReactSortedResult[] | 'empty';

  footer?: ReactNode;
}

export function SearchDialog({
  open,
  onOpenChange,
  footer,
  links = [],
  search,
  onSearchChange,
  isLoading,
  ...props
}: SearchDialogProps) {
  const { text } = useI18n();
  const [active, setActive] = useState<string>();
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
        className="fixed left-1/2 top-[10vh] z-50 w-[98vw] max-w-screen-sm -translate-x-1/2 rounded-lg border bg-fd-popover text-fd-popover-foreground shadow-lg data-[state=closed]:animate-fd-dialog-out data-[state=open]:animate-fd-dialog-in"
      >
        <DialogTitle className="hidden">{text.search}</DialogTitle>
        <div className="flex flex-row items-center gap-2 px-3">
          <LoadingIndicator isLoading={isLoading ?? false} />
          <input
            value={search}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setActive(undefined);
            }}
            placeholder={text.search}
            className="w-0 flex-1 bg-transparent py-3 text-base placeholder:text-fd-muted-foreground focus-visible:outline-none"
          />
          <button
            type="button"
            aria-label="Close Search"
            onClick={() => onOpenChange(false)}
            className={buttonVariants({
              color: 'outline',
              className: 'text-xs p-1.5',
            })}
          >
            Esc
          </button>
        </div>
        {props.results !== 'empty' || defaultItems.length > 0 ? (
          <SearchResults
            active={active}
            onActiveChange={setActive}
            items={props.results === 'empty' ? defaultItems : props.results}
            onSelect={() => onOpenChange(false)}
          />
        ) : null}
        <div className="mt-auto flex flex-col border-t p-3 empty:hidden">
          {footer}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const icons = {
  text: <Text className="size-4 text-fd-muted-foreground" />,
  heading: <Hash className="size-4 text-fd-muted-foreground" />,
  page: <FileText className="size-4 text-fd-muted-foreground" />,
};

function SearchResults({
  items,
  active = items.at(0)?.id,
  onActiveChange,
  onSelect,
  ...props
}: ComponentProps<'div'> & {
  active?: string;
  onActiveChange: (active: string | undefined) => void;

  items: ReactSortedResult[];
  onSelect?: (value: string) => void;
}) {
  const { text } = useI18n();
  const router = useRouter();

  const onOpen = ({ external, url }: ReactSortedResult) => {
    if (external) window.open(url, '_blank')?.focus();
    else router.push(url);
    onSelect?.(url);
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key == 'ArrowUp') {
      const idx = items.findIndex((item) => item.id === active);
      if (idx === -1) {
        onActiveChange(items.at(0)?.id);
      } else {
        onActiveChange(
          items.at((e.key === 'ArrowDown' ? idx + 1 : idx - 1) % items.length)
            ?.id,
        );
      }

      e.preventDefault();
    }

    if (e.key === 'Enter') {
      const selected = items.find((item) => item.id === active);

      if (selected) onOpen(selected);
      e.preventDefault();
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [onKey]);

  return (
    <div
      {...props}
      className={cn(
        'flex max-h-[460px] flex-col overflow-y-auto border-t p-2',
        props.className,
      )}
    >
      {items.length === 0 ? (
        <div className="py-12 text-center text-sm">{text.searchNoResult}</div>
      ) : null}

      {items.map((item) => (
        <CommandItem
          key={item.id}
          active={active === item.id}
          onPointerMove={() => onActiveChange(item.id)}
          onClick={() => {
            onOpen(item);
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
      <LoaderCircle
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
  active = false,
  ...props
}: ComponentProps<'button'> & {
  active?: boolean;
}) {
  return (
    <button
      ref={useCallback(
        (element: HTMLButtonElement | null) => {
          if (active && element) {
            element.scrollIntoView({
              block: 'nearest',
            });
          }
        },
        [active],
      )}
      type="button"
      aria-selected={active}
      {...props}
      className={cn(
        'flex min-h-10 select-none flex-row items-center gap-2.5 rounded-lg px-2 text-start text-sm',
        active && 'bg-fd-accent text-fd-accent-foreground',
        props.className,
      )}
    >
      {props.children}
    </button>
  );
}

export interface TagsListProps extends ComponentProps<'div'> {
  tag?: string;
  onTagChange: (tag: string | undefined) => void;
  allowClear?: boolean;
}

const itemVariants = cvb({
  base: 'rounded-md border px-2 py-0.5 text-xs font-medium text-fd-muted-foreground transition-colors',
  variants: {
    active: {
      true: 'bg-fd-accent text-fd-accent-foreground',
    },
  },
});

const TagsListContext = createContext<{
  value?: string;
  onValueChange: (value: string | undefined) => void;
  allowClear: boolean;
}>('TagsList');

export function TagsList({
  tag,
  onTagChange,
  allowClear = false,
  ...props
}: TagsListProps) {
  return (
    <div
      {...props}
      className={cn('flex items-center gap-1 flex-wrap', props.className)}
    >
      <TagsListContext.Provider
        value={useMemo(
          () => ({
            value: tag,
            onValueChange: onTagChange,
            allowClear,
          }),
          [allowClear, onTagChange, tag],
        )}
      >
        {props.children}
      </TagsListContext.Provider>
    </div>
  );
}

export function TagsListItem({
  value,
  className,
  ...props
}: ComponentProps<'button'> & {
  value: string;
}) {
  const ctx = TagsListContext.use();

  return (
    <button
      type="button"
      data-active={value === ctx.value}
      className={itemVariants({ active: value === ctx.value, className })}
      onClick={() => {
        ctx.onValueChange(
          ctx.value === value && ctx.allowClear ? undefined : value,
        );
      }}
      tabIndex={-1}
      {...props}
    >
      {props.children}
    </button>
  );
}
