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
  createContext,
  Fragment,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { I18nLabel, useI18n } from '@/contexts/i18n';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogTitle,
} from '@radix-ui/react-dialog';
import type { SortedResult } from 'fumadocs-core/server';
import { cva } from 'class-variance-authority';
import { useEffectEvent } from 'fumadocs-core/utils/use-effect-event';
import { useRouter } from 'fumadocs-core/framework';
import type { SharedProps } from '@/contexts/search';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';

type ReactSortedResult = Omit<SortedResult, 'content'> & {
  external?: boolean;
  content: ReactNode;
};

// needed for backward compatible since some previous guides referenced it
export type { SharedProps };

export interface SearchDialogProps extends SharedProps {
  search: string;
  onSearchChange: (v: string) => void;
  isLoading?: boolean;

  children: ReactNode;
}

const Context = createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: string;
  onSearchChange: (v: string) => void;

  isLoading: boolean;
} | null>(null);

const ListContext = createContext<{
  active: string | null;
  setActive: (v: string | null) => void;
} | null>(null);

const TagsListContext = createContext<{
  value?: string;
  onValueChange: (value: string | undefined) => void;
  allowClear: boolean;
} | null>(null);

export function SearchDialog({
  open,
  onOpenChange,
  search,
  onSearchChange,
  isLoading = false,
  children,
}: SearchDialogProps) {
  const [active, setActive] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Context.Provider
        value={useMemo(
          () => ({
            open,
            onOpenChange,
            search,
            onSearchChange,
            active,
            setActive,
            isLoading,
          }),
          [active, isLoading, onOpenChange, onSearchChange, open, search],
        )}
      >
        {children}
      </Context.Provider>
    </Dialog>
  );
}

export function SearchDialogHeader(props: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn('flex flex-row items-center gap-2 px-3', props.className)}
    />
  );
}

export function SearchDialogInput(props: ComponentProps<'input'>) {
  const { text } = useI18n();
  const { search, onSearchChange } = useSearch();

  return (
    <input
      {...props}
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      placeholder={text.search}
      className="w-0 flex-1 bg-transparent py-3 text-base placeholder:text-fd-muted-foreground focus-visible:outline-none"
    />
  );
}

export function SearchDialogClose({
  children = 'Esc',
  className,
  ...props
}: ComponentProps<'button'>) {
  const { onOpenChange } = useSearch();

  return (
    <button
      type="button"
      onClick={() => onOpenChange(false)}
      className={cn(
        buttonVariants({
          color: 'outline',
          className: 'text-xs p-1.5',
        }),
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SearchDialogFooter(props: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn('mt-auto border-t p-3 empty:hidden', props.className)}
    />
  );
}

export function SearchDialogOverlay(
  props: ComponentProps<typeof DialogOverlay>,
) {
  return (
    <DialogOverlay
      {...props}
      className={cn(
        'fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-[state=closed]:animate-fd-fade-out data-[state=open]:animate-fd-fade-in',
        props.className,
      )}
    />
  );
}

export function SearchDialogContent({
  children,
  ...props
}: ComponentProps<typeof DialogContent>) {
  const { text } = useI18n();

  return (
    <DialogContent
      aria-describedby={undefined}
      {...props}
      className={cn(
        'fixed left-1/2 top-[10vh] z-50 w-[98vw] max-w-screen-sm -translate-x-1/2 rounded-lg border bg-fd-popover text-fd-popover-foreground shadow-lg data-[state=closed]:animate-fd-dialog-out data-[state=open]:animate-fd-dialog-in',
        props.className,
      )}
    >
      <DialogTitle className="hidden">{text.search}</DialogTitle>
      {children}
    </DialogContent>
  );
}

const icons = {
  text: <Text className="size-4 text-fd-muted-foreground" />,
  heading: <Hash className="size-4 text-fd-muted-foreground" />,
  page: <FileText className="size-4 text-fd-muted-foreground" />,
};

export function SearchDialogList({
  items,
  Empty = () => (
    <div className="py-12 text-center text-sm">
      <I18nLabel label="searchNoResult" />
    </div>
  ),
  Item = (props) => <SearchDialogListItem {...props} />,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  items: ReactSortedResult[];
  /**
   * Renderer for empty list UI
   */
  Empty?: () => ReactNode;
  /**
   * Renderer for items
   */
  Item?: (props: { item: ReactSortedResult; onClick: () => void }) => ReactNode;
}) {
  const [active, setActive] = useState<string | null>(items.at(0)?.id ?? null);
  const { onOpenChange } = useSearch();
  const router = useRouter();

  const onOpen = ({ external, url }: ReactSortedResult) => {
    if (external) window.open(url, '_blank')?.focus();
    else router.push(url);
    onOpenChange(false);
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key == 'ArrowUp') {
      let idx = items.findIndex((item) => item.id === active);
      if (idx === -1) idx = 0;
      else if (e.key === 'ArrowDown') idx++;
      else idx--;

      setActive(items.at(idx % items.length)?.id ?? null);
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

  useOnChange(items, () => {
    if (items.length > 0) setActive(items[0].id);
  });

  return (
    <div
      {...props}
      className={cn(
        'flex max-h-[460px] flex-col overflow-y-auto border-t p-2',
        props.className,
      )}
    >
      <ListContext.Provider
        value={useMemo(
          () => ({
            active,
            setActive,
          }),
          [active],
        )}
      >
        {items.length === 0 && Empty()}

        {items.map((item) => (
          <Fragment key={item.id}>
            {Item({ item, onClick: () => onOpen(item) })}
          </Fragment>
        ))}
      </ListContext.Provider>
    </div>
  );
}

export function SearchDialogListItem({
  item,
  className,
  children,
  ...props
}: ComponentProps<'button'> & {
  item: ReactSortedResult;
}) {
  const { active: activeId, setActive } = useSearchList();
  const active = item.id === activeId;

  return (
    <button
      type="button"
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
      aria-selected={active}
      className={cn(
        'flex min-h-10 select-none flex-row items-center gap-2.5 rounded-lg px-2 text-start text-sm',
        active && 'bg-fd-accent text-fd-accent-foreground',
        className,
      )}
      onPointerMove={() => setActive(item.id)}
      {...props}
    >
      {item.type !== 'page' && (
        <div role="none" className="ms-2 h-full min-h-10 w-px bg-fd-border" />
      )}
      {icons[item.type]}
      <p className="w-0 flex-1 truncate">{children ?? item.content}</p>
    </button>
  );
}

export function SearchDialogIcon(props: ComponentProps<'div'>) {
  const { isLoading } = useSearch();

  return (
    <div {...props} className={cn('relative size-4', props.className)}>
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

export interface TagsListProps extends ComponentProps<'div'> {
  tag?: string;
  onTagChange: (tag: string | undefined) => void;
  allowClear?: boolean;
}

const itemVariants = cva(
  'rounded-md border px-2 py-0.5 text-xs font-medium text-fd-muted-foreground transition-colors',
  {
    variants: {
      active: {
        true: 'bg-fd-accent text-fd-accent-foreground',
      },
    },
  },
);

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
  const { onValueChange, value: selectedValue, allowClear } = useTagsList();
  const selected = value === selectedValue;

  return (
    <button
      type="button"
      data-active={selected}
      className={cn(itemVariants({ active: selected, className }))}
      onClick={() => {
        onValueChange(selected && allowClear ? undefined : value);
      }}
      tabIndex={-1}
      {...props}
    >
      {props.children}
    </button>
  );
}

export function useSearch() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('Missing <SearchDialog />');
  return ctx;
}

export function useTagsList() {
  const ctx = useContext(TagsListContext);
  if (!ctx) throw new Error('Missing <TagsList />');
  return ctx;
}

export function useSearchList() {
  const ctx = useContext(ListContext);
  if (!ctx) throw new Error('Missing <SearchDialogList />');
  return ctx;
}
