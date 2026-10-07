'use client';

import { ChevronRight, Hash, SearchIcon } from 'lucide-react';
import {
  type ComponentProps,
  createContext,
  Fragment,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import { useTranslations, T } from '@fuma-translate/react';
import { cn } from '@/utils/cn';
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from '@radix-ui/react-dialog';
import type { ReactSortedResult as BaseResultType } from 'fumadocs-core/search';
import {
  useHighlightQuery,
  type SearchResult,
  type SearchResultItem,
  type SearchResultRecord,
  type SearchResultTable,
} from 'fumadocs-core/search/client';
import { type Options, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import * as JsxRuntime from 'react/jsx-runtime';
import { cva } from 'class-variance-authority';
import { useRouter } from 'fumadocs-core/framework';
import type { SharedProps } from '@/contexts/search';
import scrollIntoView from 'scroll-into-view-if-needed';
import { buttonVariants } from '@/components/ui/button';

export type SearchItemType =
  | ((BaseResultType | SearchResultRecord) & {
      external?: boolean;
    })
  | {
      id: string;
      type: 'action';
      node: ReactNode;
      onSelect: () => void;
    };

type ItemRenderer = (props: {
  item: SearchItemType;
  table?: SearchResultTable;
  onClick: () => void;
}) => ReactNode;

interface TableProps {
  table: SearchResultTable;
  Item: ItemRenderer;
  onSelect: (item: SearchItemType) => void;
}

// needed for backward compatible since some previous guides referenced it
export type { SharedProps };

export interface SearchDialogProps extends SharedProps {
  search: string;
  onSearchChange: (v: string) => void;
  onSelect?: (item: SearchItemType) => void;
  isLoading?: boolean;
  /** the last successful search, `<SearchDialogList />` shows its results */
  data?: SearchResult;

  children: ReactNode;
}

const RootContext = createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: string;
  onSearchChange: (v: string) => void;
  onSelect: (item: SearchItemType) => void;
  isLoading: boolean;
  data?: SearchResult;
  /** the query to highlight */
  query: string;
  /** the id of the active item */
  getActive: () => string | null;
  setActive: (id: string | null) => void;
  subscribeActive: (listener: () => void) => () => void;
} | null>(null);

const TagsListContext = createContext<{
  value?: string;
  onValueChange: (value: string | undefined) => void;
  allowClear: boolean;
} | null>(null);

const PreContext = createContext(false);

const mdComponents = {
  // from the deprecated `highlightMarkdown()` of custom search clients
  mark(props: ComponentProps<'mark'>) {
    return <span {...props} className="text-fd-primary underline" />;
  },
  a: 'span',
  p(props: ComponentProps<'p'>) {
    return <p {...props} className="min-w-0" />;
  },
  strong(props: ComponentProps<'strong'>) {
    return <strong {...props} className="text-fd-accent-foreground font-medium" />;
  },
  code(props: ComponentProps<'pre'>) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- this is a component
    const inPre = use(PreContext);
    if (inPre)
      return (
        <code
          {...props}
          className="mask-[linear-gradient(to_bottom,white,white_30px,transparent_80px)]"
        />
      );

    return (
      <code
        {...props}
        className="border rounded-md px-px bg-fd-secondary text-fd-secondary-foreground"
      />
    );
  },
  custom({
    tagName,
    children,
    ...rest
  }: Record<string, unknown> & { tagName: string; children?: ReactNode }) {
    return (
      <span className="inline-flex max-w-full items-center border p-0.5 rounded-md bg-fd-card text-fd-card-foreground divide-x divide-fd-border">
        <code
          data-highlight-ignore=""
          className="rounded-sm px-0.5 me-1 bg-fd-primary font-medium text-xs text-fd-primary-foreground border-none"
        >
          {tagName}
        </code>
        {Object.entries(rest).map(([k, v]) => {
          if (typeof v !== 'string') return;

          return (
            <code
              key={k}
              data-highlight-ignore=""
              className="truncate text-xs text-fd-muted-foreground px-1"
            >
              <span className="text-fd-card-foreground">{k}: </span>
              {v}
            </code>
          );
        })}
        {children && <span className="ps-1">{children}</span>}
      </span>
    );
  },
  pre(props: ComponentProps<'pre'>) {
    return (
      <pre
        {...props}
        className={cn(
          'flex flex-col border rounded-md my-0.5 p-2 bg-fd-secondary text-fd-secondary-foreground max-h-20 overflow-hidden',
          props.className,
        )}
      >
        <PreContext value={true}>{props.children}</PreContext>
      </pre>
    );
  },
};

const renderOptions: Options = { development: false, components: mdComponents, ...JsxRuntime };

function Children({ children }: { children?: ReactNode }) {
  return children;
}

function TableCell(props: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className="min-w-0 not-last:truncate last:line-clamp-2 [&_code]:border-0 [&_code]:bg-transparent [&_code]:px-0 [&_code]:text-inherit"
    />
  );
}

// tables of cards render their cells only, the grid of `<SearchDialogListTable />` lays them out
const tableRenderOptions: Options = {
  ...renderOptions,
  components: {
    ...mdComponents,
    table: Children,
    thead: Children,
    tbody: Children,
    tr: Children,
    th: TableCell,
    td: TableCell,
  },
};

// rows of tables with header, `<SearchDialogListTable />` shows the header once
const rowRenderOptions: Options = {
  ...tableRenderOptions,
  components: { ...tableRenderOptions.components, thead: () => null },
};

export function SearchDialog({
  open,
  onOpenChange,
  search,
  onSearchChange,
  isLoading = false,
  data,
  onSelect: onSelectProp,
  children,
}: SearchDialogProps) {
  const router = useRouter();
  const onOpenChangeCallback = useRef(onOpenChange);
  onOpenChangeCallback.current = onOpenChange;
  const onSearchChangeCallback = useRef(onSearchChange);
  onSearchChangeCallback.current = onSearchChange;
  const onSelect = (item: SearchItemType) => {
    if (item.type === 'action') {
      item.onSelect();
    } else if (item.external) {
      window.open(item.url, '_blank')?.focus();
    } else {
      router.push(item.url);
    }

    onOpenChange(false);
    onSelectProp?.(item);
  };
  const onSelectCallback = useRef(onSelect);
  onSelectCallback.current = onSelect;
  // the input and items subscribe to the active item, so only they re-render when it changes
  const activeItem = useMemo(() => {
    let active: string | null = null;
    const listeners = new Set<() => void>();

    return {
      getActive: () => active,
      setActive(id: string | null) {
        active = id;
        for (const listener of listeners) listener();
      },
      subscribeActive(listener: () => void) {
        listeners.add(listener);
        return () => void listeners.delete(listener);
      },
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <RootContext
        value={useMemo(
          () => ({
            ...activeItem,
            open,
            search,
            isLoading,
            data,
            query: data ? data.query : search,
            onOpenChange: (v) => onOpenChangeCallback.current(v),
            onSearchChange: (v) => onSearchChangeCallback.current(v),
            onSelect: (v) => onSelectCallback.current(v),
          }),
          [activeItem, isLoading, open, search, data],
        )}
      >
        {children}
      </RootContext>
    </Dialog>
  );
}

export function SearchDialogHeader(props: ComponentProps<'div'>) {
  return <div {...props} className={cn('flex flex-row items-center gap-2 p-3', props.className)} />;
}

export function SearchDialogInput(props: ComponentProps<'input'>) {
  const t = useTranslations({ note: 'search dialog' });
  const { search, onSearchChange, getActive, subscribeActive } = useSearch();
  const active = useSyncExternalStore(subscribeActive, getActive, getActive);

  return (
    <input
      role="combobox"
      aria-expanded={active !== null}
      aria-activedescendant={active !== null ? `fd-search-option-${active}` : undefined}
      aria-label={t('Search')}
      aria-autocomplete="list"
      aria-controls="fd-search-list"
      {...props}
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      placeholder={t('Search')}
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
  const t = useTranslations({ note: 'search dialog' });

  return (
    <button
      type="button"
      aria-label={t('Close Search', { note: 'aria-label' })}
      onClick={() => onOpenChange(false)}
      className={cn(
        buttonVariants({
          variant: 'outline',
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
  return <div {...props} className={cn('bg-fd-secondary/50 p-3 empty:hidden', props.className)} />;
}

export function SearchDialogOverlay(props: ComponentProps<typeof DialogOverlay>) {
  return (
    <DialogOverlay
      {...props}
      className={cn(
        'fixed inset-0 z-50 backdrop-blur-xs bg-fd-overlay data-[state=open]:animate-fd-fade-in data-[state=closed]:animate-fd-fade-out',
        props.className,
      )}
    />
  );
}

export function SearchDialogContent({ children, ...props }: ComponentProps<typeof DialogContent>) {
  const t = useTranslations({ note: 'search dialog' });

  return (
    <DialogContent
      aria-describedby={undefined}
      {...props}
      className={cn(
        'fixed left-1/2 top-4 md:top-[calc(50%-250px)] z-50 w-[calc(100%-1rem)] max-w-screen-sm -translate-x-1/2 rounded-xl border bg-fd-popover text-fd-popover-foreground shadow-2xl shadow-black/50 overflow-hidden data-[state=closed]:animate-fd-dialog-out data-[state=open]:animate-fd-dialog-in',
        '*:border-b *:has-[+:last-child[data-empty=true]]:border-b-0 *:data-[empty=true]:border-b-0 *:last:border-b-0',
        props.className,
      )}
    >
      <DialogTitle className="hidden">{t('Search')}</DialogTitle>
      {children}
    </DialogContent>
  );
}

export function SearchDialogList({
  items: itemsProp,
  defaultItems = null,
  Empty = () => (
    <div role="status" className="py-12 text-center text-sm text-fd-muted-foreground">
      <T text="No results found" note="search dialog" />
    </div>
  ),
  Item = (props) => <SearchDialogListItem {...props} />,
  Table = (props) => <SearchDialogListTable {...props} />,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  /** @defaultValue the results of `data` from `<SearchDialog />` */
  items?: (SearchItemType | SearchResultItem)[] | null;
  /** shown without results */
  defaultItems?: (SearchItemType | SearchResultItem)[] | null;
  /**
   * Renderer for empty list UI
   */
  Empty?: () => ReactNode;
  /**
   * Renderer for items
   */
  Item?: ItemRenderer;
  /**
   * Renderer for tables, `Item` and `onSelect` render their rows
   */
  Table?: (props: TableProps) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useTranslations({ note: 'search dialog' });
  const { onSelect, data, getActive, setActive } = useSearch();
  const items = itemsProp === undefined ? (data?.items ?? defaultItems) : itemsProp;
  useLayoutEffect(() => setActive(items?.[0]?.id ?? null), [setActive, items]);

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (!items || e.isComposing || e.keyCode === 229) return;
    const list = flattenItems(items);

    if (e.key === 'ArrowDown' || e.key == 'ArrowUp') {
      let idx = list.findIndex((item) => item.id === getActive());
      if (idx === -1) idx = 0;
      else if (e.key === 'ArrowDown') idx++;
      else idx--;

      setActive(list.at(idx % list.length)?.id ?? null);
      e.preventDefault();
    }

    if (e.key === 'Enter') {
      const selected = list.find((item) => item.id === getActive());

      if (selected) onSelect(selected);
      e.preventDefault();
    }
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(() => {
      const viewport = element.firstElementChild!;

      element.style.setProperty('--fd-animated-height', `${viewport.clientHeight}px`);
    });

    const viewport = element.firstElementChild;
    if (viewport) observer.observe(viewport);

    window.addEventListener('keydown', onKey);
    return () => {
      observer.disconnect();
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div
      {...props}
      ref={ref}
      data-empty={items === null}
      className={cn(
        'overflow-hidden h-(--fd-animated-height) transition-[height] [&_::highlight(fd-search)]:text-fd-primary [&_::highlight(fd-search)]:underline',
        props.className,
      )}
    >
      <div
        id="fd-search-list"
        // an empty listbox is invalid, expose it only with options
        role={items?.length ? 'listbox' : undefined}
        aria-label={items?.length ? t('Search') : undefined}
        className={cn('w-full flex flex-col overflow-y-auto max-h-[460px] p-1', !items && 'hidden')}
      >
        {items?.length === 0 && Empty()}

        {items?.map((item) => (
          <Fragment key={item.id}>
            {item.type === 'table'
              ? Table({ table: item, Item, onSelect })
              : Item({ item, onClick: () => onSelect(item) })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function flattenItems(items: (SearchItemType | SearchResultItem)[]): SearchItemType[] {
  const out: SearchItemType[] = [];
  for (const item of items) {
    if (item.type === 'table') out.push(...item.rows);
    else out.push(item);
  }

  return out;
}

export function SearchDialogListTable({ table, Item, onSelect }: TableProps) {
  const { query } = useSearch();
  const highlightRef = useHighlightQuery(query);
  const headerId = `fd-search-table-${table.id}`;
  const header = useMemo(
    () => table.header && toJsxRuntime(table.header, tableRenderOptions),
    [table.header],
  );

  return (
    <div
      // the header names the rows
      role={table.header ? 'group' : undefined}
      aria-labelledby={table.header ? headerId : undefined}
      className="ms-3 shrink-0 border-s py-2 ps-3.25 pe-2.5"
    >
      <div
        className="grid gap-x-3 overflow-hidden rounded-lg border bg-fd-card text-sm"
        style={{
          gridTemplateColumns: `${'fit-content(30%) '.repeat(table.columns - 1)}minmax(30%, 1fr)`,
        }}
      >
        {header && (
          <div
            id={headerId}
            ref={highlightRef}
            aria-hidden
            className="col-span-full grid grid-cols-subgrid bg-fd-secondary px-3 py-1 text-xs text-fd-muted-foreground"
          >
            {header}
          </div>
        )}
        {table.rows.map((row) => (
          <Fragment key={row.id}>
            {Item({ item: row, table, onClick: () => onSelect(row) })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export function SearchDialogListItem({
  item,
  table,
  className,
  children,
  renderMarkdown,
  ...props
}: ComponentProps<'div'> & {
  /** the table of a row */
  table?: SearchResultTable;
  /** render the Markdown `content` of items, instead of their `hastContent` */
  renderMarkdown?: (v: string) => ReactNode;
  item: SearchItemType;
}) {
  const { query, getActive, setActive, subscribeActive } = useSearch();
  const isActive = () => getActive() === item.id;
  const active = useSyncExternalStore(subscribeActive, isActive, isActive);
  const highlightRef = useHighlightQuery(query);
  const content = useMemo(() => {
    if (item.type === 'action') return item.node;
    if (renderMarkdown && typeof item.content === 'string') return renderMarkdown(item.content);
    if (!('hastContent' in item)) return item.content;
    if (!table) return toJsxRuntime(item.hastContent, renderOptions);
    return toJsxRuntime(item.hastContent, table.header ? rowRenderOptions : tableRenderOptions);
  }, [item, renderMarkdown, table]);

  if (item.type === 'action') {
    children ??= content;
  } else if (table) {
    children ??= (
      <div
        ref={highlightRef}
        className={cn(
          'contents',
          // rows without header, like the props of type tables
          !table.header &&
            '*:first:font-medium *:first:text-fd-primary *:nth-2:text-xs *:not-first:text-fd-muted-foreground',
        )}
      >
        {content}
      </div>
    );
  } else {
    children ??= (
      <>
        <div className="inline-flex items-center text-fd-muted-foreground text-xs empty:hidden">
          {item.breadcrumbs?.map((item, i) => (
            <Fragment key={i}>
              {i > 0 && <ChevronRight className="size-4 rtl:rotate-180" />}
              {item}
            </Fragment>
          ))}
        </div>

        {item.type !== 'page' && (
          <div role="none" className="absolute inset-s-3 inset-y-0 w-px bg-fd-border" />
        )}
        {item.type === 'heading' && (
          <Hash className="absolute inset-s-6 top-2.5 size-4 text-fd-muted-foreground" />
        )}
        <div
          ref={highlightRef}
          className={cn(
            'min-w-0',
            item.type === 'text' && 'ps-4',
            item.type === 'heading' && 'ps-8',
            item.type === 'page' || item.type === 'heading'
              ? 'font-medium'
              : 'text-fd-popover-foreground/80',
          )}
        >
          {content}
        </div>
      </>
    );
  }

  return (
    <div
      id={`fd-search-option-${item.id}`}
      role="option"
      ref={useCallback(
        (element: HTMLDivElement | null) => {
          if (active && element) {
            scrollIntoView(element, {
              scrollMode: 'if-needed',
              block: 'nearest',
              boundary: element.closest('[role="listbox"]'),
            });
          }
        },
        [active],
      )}
      aria-selected={active}
      className={cn(
        'cursor-default',
        table
          ? 'col-span-full grid grid-cols-subgrid items-baseline px-3 py-1.5 not-first:border-t'
          : 'relative shrink-0 px-2.5 py-2 text-sm overflow-hidden rounded-lg',
        active && 'bg-fd-accent text-fd-accent-foreground',
        className,
      )}
      onPointerMove={() => setActive(item.id)}
      {...props}
    >
      {children}
    </div>
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

export function TagsList({ tag, onTagChange, allowClear = false, ...props }: TagsListProps) {
  const onTagChangeCallback = useRef(onTagChange);
  onTagChangeCallback.current = onTagChange;
  return (
    <div {...props} className={cn('flex items-center gap-1 flex-wrap', props.className)}>
      <TagsListContext
        value={useMemo(
          () => ({
            value: tag,
            onValueChange: (v) => onTagChangeCallback.current(v),
            allowClear,
          }),
          [allowClear, tag],
        )}
      >
        {props.children}
      </TagsListContext>
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
      onClick={() => onValueChange(selected && allowClear ? undefined : value)}
      tabIndex={-1}
      {...props}
    >
      {props.children}
    </button>
  );
}

export function useSearch() {
  const ctx = use(RootContext);
  if (!ctx) throw new Error('Missing <SearchDialog />');
  return ctx;
}

export function useTagsList() {
  const ctx = use(TagsListContext);
  if (!ctx) throw new Error('Missing <TagsList />');
  return ctx;
}
