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
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslations, T } from '@fuma-translate/react';
import { cn } from '@/utils/cn';
import { Dialog } from '@base-ui/react/dialog';
import { useHighlightQuery, type ReactSortedResult } from 'fumadocs-core/search';
import { cva } from 'class-variance-authority';
import { useRouter } from 'fumadocs-core/framework';
import type { SharedProps } from '@/contexts/search';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import scrollIntoView from 'scroll-into-view-if-needed';
import { buttonVariants } from '@/components/ui/button';
import { createMarkdownRenderer } from 'fumadocs-core/content/md';
import rehypeRaw from 'rehype-raw';
import { visit } from 'unist-util-visit';
import type { Processor, Transformer } from 'unified';
import { gfmTable } from 'micromark-extension-gfm-table';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import type { Root } from 'hast';
import { mergeRefs } from '@/utils/merge-refs';

export type SearchItemType =
  | (ReactSortedResult & {
      external?: boolean;
    })
  | {
      id: string;
      type: 'action';
      node: ReactNode;
      onSelect: () => void;
    };

/** @deprecated needed for backward compatibility since some previous guides referenced it */
export type { SharedProps };

export interface SearchDialogProps extends SharedProps {
  search: string;
  onSearchChange: (v: string) => void;
  onSelect?: (item: SearchItemType) => void;
  isLoading?: boolean;

  children: ReactNode;
}

const RootContext = createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: string;
  onSearchChange: (v: string) => void;
  onSelect: (item: SearchItemType) => void;
  isLoading: boolean;
} | null>(null);

const ListContext = createContext<{
  active: string | null;
  setActive: (v: string | null) => void;
  /** highlighted in items */
  query: string;
} | null>(null);

const TagsListContext = createContext<{
  value?: string;
  onValueChange: (value: string | undefined) => void;
  allowClear: boolean;
} | null>(null);

/** where inline code is rendered */
const CodeContext = createContext<'pre' | 'cell' | null>(null);

/** in a table of search results: whether its rows have a header row */
const TableContext = createContext<boolean | null>(null);

const mdRenderer = createMarkdownRenderer({
  remarkPlugins: [remarkTable],
  remarkRehypeOptions: {
    allowDangerousHtml: true,
  },
  rehypePlugins: [rehypeRaw, rehypeCustomElements],
});

const tableCell = 'min-w-0 text-start font-normal not-last:truncate last:line-clamp-2';

// rows without header, like the props of type tables
const propRow =
  '[&_th:first-child]:font-medium [&_th:first-child]:text-fd-primary [&_th:nth-child(2)]:text-xs [&_th:not(:first-child)]:text-fd-muted-foreground';

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
    const scope = use(CodeContext);
    if (scope === 'cell') return <code {...props} />;
    if (scope === 'pre')
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
    _tagName = 'fragment',
    children,
    ...rest
  }: Record<string, unknown> & { _tagName: string; children: ReactNode }) {
    return (
      <span className="inline-flex max-w-full items-center border p-0.5 rounded-md bg-fd-card text-fd-card-foreground divide-x divide-fd-border">
        <code
          data-highlight-ignore=""
          className="rounded-sm px-0.5 me-1 bg-fd-primary font-medium text-xs text-fd-primary-foreground border-none"
        >
          {_tagName}
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
  // the cells are laid out by the grid of `SearchTable`
  table: (props: ComponentProps<'table'>) => <table {...props} className="contents" />,
  thead: (props: ComponentProps<'thead'>) => <thead {...props} className="contents" />,
  tbody: (props: ComponentProps<'tbody'>) => <tbody {...props} className="contents" />,
  tr: (props: ComponentProps<'tr'>) => <tr {...props} className="contents" />,
  th({ children, ...props }: ComponentProps<'th'>) {
    return (
      <th {...props} className={tableCell}>
        <CodeContext value="cell">{children}</CodeContext>
      </th>
    );
  },
  td({ children, ...props }: ComponentProps<'td'>) {
    return (
      <td {...props} className={tableCell}>
        <CodeContext value="cell">{children}</CodeContext>
      </td>
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
        <CodeContext value="pre">{props.children}</CodeContext>
      </pre>
    );
  },
};

function remarkTable(this: Processor) {
  const data = this.data() as {
    micromarkExtensions?: unknown[];
    fromMarkdownExtensions?: unknown[];
  };
  (data.micromarkExtensions ??= []).push(gfmTable());
  (data.fromMarkdownExtensions ??= []).push(gfmTableFromMarkdown());
}

function rehypeCustomElements(): Transformer<Root, Root> {
  return (tree) => {
    visit(tree, (node) => {
      if (
        node.type === 'element' &&
        document.createElement(node.tagName) instanceof HTMLUnknownElement
      ) {
        node.properties._tagName = node.tagName;
        node.tagName = 'custom';
      }
    });
  };
}

export function SearchDialog({
  open,
  onOpenChange,
  search,
  onSearchChange,
  isLoading = false,
  onSelect: onSelectProp,
  children,
  dialogHandle,
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

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} handle={dialogHandle}>
      <RootContext
        value={useMemo(
          () => ({
            open,
            search,
            isLoading,
            onOpenChange: (v) => onOpenChangeCallback.current(v),
            onSearchChange: (v) => onSearchChangeCallback.current(v),
            onSelect: (v) => onSelectCallback.current(v),
          }),
          [isLoading, open, search],
        )}
      >
        {children}
      </RootContext>
    </Dialog.Root>
  );
}

export function SearchDialogHeader(props: ComponentProps<'div'>) {
  return <div {...props} className={cn('flex flex-row items-center gap-2 p-3', props.className)} />;
}

export function SearchDialogInput(props: ComponentProps<'input'>) {
  const t = useTranslations({ note: 'search dialog' });
  const { search, onSearchChange } = useSearch();

  return (
    <input
      data-fd-search-dialog-input=""
      role="combobox"
      aria-label={t('Search')}
      aria-autocomplete="list"
      aria-controls="fd-search-list"
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      placeholder={t('Search')}
      {...props}
      className={cn(
        'w-0 flex-1 bg-transparent text-lg placeholder:text-fd-muted-foreground focus-visible:outline-none',
        props.className,
      )}
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

export function SearchDialogOverlay({
  className,
  ...props
}: ComponentProps<typeof Dialog.Backdrop>) {
  return (
    <Dialog.Backdrop
      {...props}
      className={(s) =>
        cn(
          'fixed inset-0 z-50 backdrop-blur-xs bg-fd-overlay data-open:animate-fd-fade-in data-closed:animate-fd-fade-out',
          typeof className === 'function' ? className(s) : className,
        )
      }
    />
  );
}

export function SearchDialogContent({
  ref,
  children,
  className,
  ...props
}: ComponentProps<typeof Dialog.Popup>) {
  const t = useTranslations({ note: 'search dialog' });
  const localRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog.Portal>
      <Dialog.Popup
        id="fd-search-dialog-content"
        ref={mergeRefs(ref, localRef)}
        aria-describedby={undefined}
        initialFocus={(s) => {
          const input = localRef.current?.querySelector<HTMLInputElement>(
            'input[data-fd-search-dialog-input]',
          );
          if (s === 'touch') {
            input?.focus({ preventScroll: true });
            return false;
          }
          return input;
        }}
        className={(s) =>
          cn(
            'fixed left-1/2 top-4 md:top-[calc(50%-250px)] z-50 w-[calc(100%-1rem)] max-w-screen-sm -translate-x-1/2 rounded-xl border bg-fd-popover text-fd-popover-foreground shadow-2xl overflow-hidden data-closed:animate-fd-dialog-out data-open:animate-fd-dialog-in focus-visible:outline-none',
            '*:border-b *:has-[+:last-child[data-empty=true]]:border-b-0 *:data-[empty=true]:border-b-0 *:last:border-b-0',
            typeof className === 'function' ? className(s) : className,
          )
        }
        {...props}
      >
        <Dialog.Title className="hidden">{t('Search')}</Dialog.Title>
        {children}
      </Dialog.Popup>
    </Dialog.Portal>
  );
}

export function SearchDialogList({
  items = null,
  query,
  Empty = () => (
    <div role="status" className="py-12 text-center text-sm text-fd-muted-foreground">
      <T text="No results found" note="search dialog" />
    </div>
  ),
  Item = (props) => <SearchDialogListItem {...props} />,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  items: SearchItemType[] | null | undefined;
  /**
   * The search query of `items`, its matches are highlighted.
   *
   * @defaultValue the search input
   */
  query?: string;
  /**
   * Renderer for empty list UI
   */
  Empty?: () => ReactNode;
  /**
   * Renderer for items
   */
  Item?: (props: { item: SearchItemType; onClick: () => void }) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useTranslations({ note: 'search dialog' });
  const { onSelect, search } = useSearch();
  const highlight = query ?? search;
  const [active, setActive] = useState<string | null>(() =>
    items && items.length > 0 ? items[0].id : null,
  );

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (!items || e.isComposing || e.keyCode === 229) return;

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

    const content: Pick<Window, 'addEventListener' | 'removeEventListener'> =
      document.getElementById('fd-search-dialog-content') ?? window;
    content.addEventListener('keydown', onKey);
    return () => {
      observer.disconnect();
      content.removeEventListener('keydown', onKey);
    };
  }, []);

  useOnChange(items, () => {
    setActive(items?.[0]?.id ?? null);
  });

  // the combobox input is a sibling, sync its state here
  useEffect(() => {
    const input = ref.current?.closest('[role="dialog"]')?.querySelector('[role="combobox"]');
    if (!input) return;

    input.setAttribute('aria-expanded', String(active !== null));
    if (active !== null) input.setAttribute('aria-activedescendant', `fd-search-option-${active}`);
    else input.removeAttribute('aria-activedescendant');
  }, [active]);

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
        id="fd-search-list"
        // an empty listbox is invalid, expose it only with options
        role={items?.length ? 'listbox' : undefined}
        aria-label={items?.length ? t('Search') : undefined}
        className={cn('w-full flex flex-col overflow-y-auto max-h-[460px] p-1', !items && 'hidden')}
      >
        <ListContext
          value={useMemo(
            () => ({
              active,
              setActive,
              query: highlight,
            }),
            [active, highlight],
          )}
        >
          {items?.length === 0 && Empty()}

          {items && renderItems(items, (item) => Item({ item, onClick: () => onSelect(item) }))}
        </ListContext>
      </div>
    </div>
  );
}

/** consecutive rows of a table share a table */
function renderItems(
  items: SearchItemType[],
  render: (item: SearchItemType) => ReactNode,
): ReactNode[] {
  const out: ReactNode[] = [];
  for (let i = 0; i < items.length;) {
    const header = tableOf(items[i]);
    let end = i + 1;
    if (header !== undefined) {
      while (end < items.length && tableOf(items[end]) === header) end++;
    }

    const rows: ReactNode[] = [];
    for (let j = i; j < end; j++) {
      rows.push(<Fragment key={items[j].id}>{render(items[j])}</Fragment>);
    }

    if (header === undefined) out.push(...rows);
    else {
      // the header row, or the row of a table without header
      const { content } = items[i] as { content: string };
      out.push(
        <SearchTable key={items[i].id} header={header} columns={columnsOf(content)}>
          {rows}
        </SearchTable>,
      );
    }
    i = end;
  }

  return out;
}

/** the header row of a table record, or an empty string for a row without header */
function tableOf(item: SearchItemType): string | undefined {
  if (item.type === 'action' || typeof item.content !== 'string' || !item.content.startsWith('|'))
    return;

  const end = item.content.indexOf('\n');
  // records pad their cells to their own widths
  return item.content.includes('\n', end + 1) ? item.content.slice(0, end).replace(/ +/g, ' ') : '';
}

/** the number of cells in the first row of a Markdown table */
function columnsOf(table: string): number {
  let count = -1;
  for (let i = 0; i < table.length && table[i] !== '\n'; i++) {
    if (table[i] === '|' && table[i - 1] !== '\\') count++;
  }

  return Math.max(count, 1);
}

function SearchTable({
  header,
  columns,
  children,
}: {
  header: string;
  columns: number;
  children: ReactNode;
}) {
  return (
    <div role="group" className="relative shrink-0 px-2.5 py-2">
      <div role="none" className="absolute inset-s-3 inset-y-0 w-px bg-fd-border" />
      <div
        className="ms-4 grid gap-x-3 overflow-hidden rounded-lg border bg-fd-card text-sm"
        style={{ gridTemplateColumns: `${'fit-content(30%) '.repeat(columns - 1)}minmax(0, 1fr)` }}
      >
        {header && (
          <div className="col-span-full grid grid-cols-subgrid bg-fd-secondary px-3 py-1 text-xs text-fd-muted-foreground">
            <mdRenderer.Markdown components={mdComponents}>
              {`${header}\n|${' --- |'.repeat(columns)}`}
            </mdRenderer.Markdown>
          </div>
        )}
        <TableContext value={header.length > 0}>{children}</TableContext>
      </div>
    </div>
  );
}

export function SearchDialogListItem({
  item,
  className,
  children,
  renderMarkdown = (s) => <mdRenderer.Markdown components={mdComponents}>{s}</mdRenderer.Markdown>,
  ...props
}: ComponentProps<'button'> & {
  renderMarkdown?: (v: string) => ReactNode;
  item: SearchItemType;
}) {
  const { active: activeId, setActive, query } = useSearchList();
  const table = use(TableContext);
  const active = item.id === activeId;
  const highlightRef = useHighlightQuery(query);

  if (item.type === 'action') {
    children ??= item.node;
  } else if (table !== null) {
    children ??= (
      <div ref={highlightRef} className={cn('contents', table ? '[&_thead]:hidden' : propRow)}>
        {typeof item.content === 'string' ? renderMarkdown(item.content) : item.content}
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
          {typeof item.content === 'string' ? renderMarkdown(item.content) : item.content}
        </div>
      </>
    );
  }

  return (
    <button
      type="button"
      id={`fd-search-option-${item.id}`}
      role="option"
      tabIndex={-1}
      ref={useCallback(
        (element: HTMLButtonElement | null) => {
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
        'text-start [&_::highlight(fd-search)]:text-fd-primary [&_::highlight(fd-search)]:underline',
        table === null
          ? 'relative shrink-0 px-2.5 py-2 text-sm overflow-hidden rounded-lg'
          : 'col-span-full grid grid-cols-subgrid items-baseline px-3 py-1.5 not-first:border-t',
        active && 'bg-fd-accent text-fd-accent-foreground',
        className,
      )}
      onPointerMove={() => setActive(item.id)}
      {...props}
    >
      {children}
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

export function useSearchList() {
  const ctx = use(ListContext);
  if (!ctx) throw new Error('Missing <SearchDialogList />');
  return ctx;
}
