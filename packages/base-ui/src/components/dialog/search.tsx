'use client';

import { ChevronRight, Hash, Search as SearchIcon } from 'lucide-react';
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
import { I18nLabel, useI18n } from '@/contexts/i18n';
import { cn } from '@/utils/cn';
import { Dialog } from '@base-ui/react/dialog';
import type { HighlightedText, ReactSortedResult as BaseResultType } from 'fumadocs-core/search';
import { cva } from 'class-variance-authority';
import { useRouter } from 'fumadocs-core/framework';
import type { SharedProps } from '@/contexts/search';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import scrollIntoView from 'scroll-into-view-if-needed';
import { buttonVariants } from '@/components/ui/button';
import { createMarkdownRenderer } from 'fumadocs-core/content/md';
import rehypeRaw from 'rehype-raw';
import { visit } from 'unist-util-visit';
import type { Transformer } from 'unified';
import type { Root } from 'hast';

export type SearchItemType =
  | (BaseResultType & {
      external?: boolean;
    })
  | {
      id: string;
      type: 'action';
      node: ReactNode;
      onSelect: () => void;
    };

// needed for backward compatible since some previous guides referenced it
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
} | null>(null);

const TagsListContext = createContext<{
  value?: string;
  onValueChange: (value: string | undefined) => void;
  allowClear: boolean;
} | null>(null);

const PreContext = createContext(false);

const mdRenderer = createMarkdownRenderer({
  remarkRehypeOptions: {
    allowDangerousHtml: true,
  },
  rehypePlugins: [rehypeRaw, rehypeCustomElements],
});

const mdComponents = {
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
    _tagName = 'fragment',
    children,
    ...rest
  }: Record<string, unknown> & { _tagName: string; children: ReactNode }) {
    return (
      <span className="inline-flex max-w-full items-center border p-0.5 rounded-md bg-fd-card text-fd-card-foreground divide-x divide-fd-border">
        <code className="rounded-sm px-0.5 me-1 bg-fd-primary font-medium text-xs text-fd-primary-foreground border-none">
          {_tagName}
        </code>
        {Object.entries(rest).map(([k, v]) => {
          if (typeof v !== 'string') return;

          return (
            <code key={k} className="truncate text-xs text-fd-muted-foreground px-1">
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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
  children,
  className,
  ...props
}: ComponentProps<typeof Dialog.Popup>) {
  const { text } = useI18n();

  return (
    <Dialog.Portal>
      <Dialog.Popup
        aria-describedby={undefined}
        {...props}
        className={(s) =>
          cn(
            'fixed left-1/2 top-4 md:top-[calc(50%-250px)] z-50 w-[calc(100%-1rem)] max-w-screen-sm -translate-x-1/2 rounded-xl border bg-fd-popover text-fd-popover-foreground shadow-2xl shadow-black/50 overflow-hidden data-closed:animate-fd-dialog-out dataopen:animate-fd-dialog-in',
            '*:border-b *:has-[+:last-child[data-empty=true]]:border-b-0 *:data-[empty=true]:border-b-0 *:last:border-b-0',
            typeof className === 'function' ? className(s) : className,
          )
        }
      >
        <Dialog.Title className="hidden">{text.search}</Dialog.Title>
        {children}
      </Dialog.Popup>
    </Dialog.Portal>
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
  items: SearchItemType[] | null | undefined;
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
  const { onSelect } = useSearch();
  const [active, setActive] = useState<string | null>(() =>
    items && items.length > 0 ? items[0].id : null,
  );

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (!items || e.isComposing) return;

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

    window.addEventListener('keydown', onKey);
    return () => {
      observer.disconnect();
      window.removeEventListener('keydown', onKey);
    };
  }, []);

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
        className={cn('w-full flex flex-col overflow-y-auto max-h-[460px] p-1', !items && 'hidden')}
      >
        <ListContext
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
            <Fragment key={item.id}>{Item({ item, onClick: () => onSelect(item) })}</Fragment>
          ))}
        </ListContext>
      </div>
    </div>
  );
}

export function SearchDialogListItem({
  item,
  className,
  children,
  renderMarkdown = (s) => <mdRenderer.Markdown components={mdComponents}>{s}</mdRenderer.Markdown>,
  renderHighlights: _,
  ...props
}: ComponentProps<'button'> & {
  renderMarkdown?: (v: string) => ReactNode;
  /** @deprecated highlight blocks is now wrapped in `<mark />`, use `renderMarkdown` to handle instead. */
  renderHighlights?: (blocks: HighlightedText<ReactNode>[]) => ReactNode;
  item: SearchItemType;
}) {
  const { active: activeId, setActive } = useSearchList();
  const active = item.id === activeId;

  if (item.type === 'action') {
    children ??= item.node;
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
          <div role="none" className="absolute start-3 inset-y-0 w-px bg-fd-border" />
        )}
        {item.type === 'heading' && (
          <Hash className="absolute start-6 top-2.5 size-4 text-fd-muted-foreground" />
        )}
        <div
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
        'relative select-none shrink-0 px-2.5 py-2 text-start text-sm overflow-hidden rounded-lg',
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
