'use client';

import { FileText, Hash, Search as SearchIcon } from 'lucide-react';
import {
  type ComponentProps,
  createContext,
  Fragment,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { I18nLabel, useI18n } from '@/contexts/i18n';
import { cn } from '@/utils/cn';
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
import scrollIntoView from 'scroll-into-view-if-needed';
import { buttonVariants } from '@/components/ui/button';

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
      className={cn('flex flex-row items-center gap-2 p-3', props.className)}
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
      className="w-0 flex-1 bg-transparent text-lg placeholder:text-fd-muted-foreground focus-visible:outline-none"
    />
  );
}

export function SearchDialogClose({
  children = 'ESC',
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
          size: 'sm',
          className: 'font-mono text-fd-muted-foreground',
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
      className={cn('bg-fd-secondary/50 p-3 empty:hidden', props.className)}
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
        'fixed inset-0 z-50 max-md:backdrop-blur-xs data-[state=open]:animate-fd-fade-in data-[state=closed]:animate-fd-fade-out',
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
        'fixed left-1/2 top-4 md:top-[calc(50%-250px)] z-50 w-[calc(100%-2*var(--spacing))] max-w-screen-sm -translate-x-1/2 rounded-2xl border bg-fd-popover/60 backdrop-blur-xl text-fd-popover-foreground shadow-2xl shadow-black/40 overflow-hidden data-[state=closed]:animate-fd-dialog-out data-[state=open]:animate-fd-dialog-in',
        '*:border-b *:has-[+:last-child[data-empty=true]]:border-b-0 *:data-[empty=true]:border-b-0 *:last:border-b-0',
        props.className,
      )}
    >
      <DialogTitle className="hidden">{text.search}</DialogTitle>
      {children}
    </DialogContent>
  );
}

export function SearchDialogList({
  items = null,
  Empty = () => (
    <div className="py-12 text-center text-sm text-fd-muted-foreground">
      <I18nLabel label="searchNoResult" />
    </div>
  ),
  Item = (props) => <SearchDialogListItem {...props} />,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  items: ReactSortedResult[] | null | undefined;
  /**
   * Renderer for empty list UI
   */
  Empty?: () => ReactNode;
  /**
   * Renderer for items
   */
  Item?: (props: { item: ReactSortedResult; onClick: () => void }) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(() =>
    items && items.length > 0 ? items[0].id : null,
  );
  const { onOpenChange } = useSearch();
  const router = useRouter();

  const onOpen = ({ external, url }: ReactSortedResult) => {
    if (external) window.open(url, '_blank')?.focus();
    else router.push(url);
    onOpenChange(false);
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (!items) return;

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
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(() => {
      const viewport = element.firstElementChild!;

      element.style.setProperty(
        '--fd-animated-height',
        `${viewport.clientHeight}px`,
      );
    });

    const viewport = element.firstElementChild;
    if (viewport) observer.observe(viewport);

    window.addEventListener('keydown', onKey);
    return () => {
      observer.disconnect();
      window.removeEventListener('keydown', onKey);
    };
  }, [onKey]);

  useOnChange(items, () => {
    if (items && items.length > 0) {
      setActive(items[0].id);
    }
  });

  return (
    <div
      {...props}
      ref={ref}
      data-empty={items === null}
      className={cn(
        'overflow-hidden h-(--fd-animated-height) transition-[height]',
        props.className,
      )}
    >
      <div
        className={cn(
          'w-full flex flex-col overflow-y-auto max-h-[460px] p-1',
          !items && 'hidden',
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
          {items?.length === 0 && Empty()}

          {items?.map((item) => (
            <Fragment key={item.id}>
              {Item({ item, onClick: () => onOpen(item) })}
            </Fragment>
          ))}
        </ListContext.Provider>
      </div>
    </div>
  );
}

const icons = {
  text: null,
  heading: <Hash className="size-4 shrink-0 text-fd-muted-foreground" />,
  page: (
    <FileText className="size-6 text-fd-muted-foreground bg-fd-muted border p-0.5 rounded-sm shadow-sm shrink-0" />
  ),
};

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
            scrollIntoView(element, {
              scrollMode: 'if-needed',
              block: 'nearest',
              boundary: element.parentElement,
            });
          }
        },
        [active],
      )}
      aria-selected={active}
      className={cn(
        'relative flex select-none flex-row items-center gap-2 p-2 text-start text-sm rounded-lg',
        item.type !== 'page' && 'ps-8',
        item.type === 'page' || item.type === 'heading'
          ? 'font-medium'
          : 'text-fd-popover-foreground/80',
        active && 'bg-fd-accent text-fd-accent-foreground',
        className,
      )}
      onPointerMove={() => setActive(item.id)}
      {...props}
    >
      {children ?? (
        <>
          {item.type !== 'page' && (
            <div
              role="none"
              className="absolute start-4.5 inset-y-0 w-px bg-fd-border"
            />
          )}
          {icons[item.type]}
          <p className="min-w-0 truncate">{item.content}</p>
        </>
      )}
    </button>
  );
}

export function SearchDialogIcon(props: ComponentProps<'svg'>) {
  const { isLoading } = useSearch();

  return (
    <SearchIcon
      {...props}
      className={cn(
        'size-5 text-fd-muted-foreground',
        isLoading && 'animate-pulse duration-400',
        props.className,
      )}
    />
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
