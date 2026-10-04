'use client';
import {
  createContext,
  Fragment,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import { useTranslations } from '@fuma-translate/react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { Menu } from '@base-ui/react/menu';
import { CheckIcon, ChevronRightIcon, FilterIcon, FilterXIcon, LinkIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Collapsible, CollapsibleContent } from '../collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';
import type { SchemaData, SchemaUIGeneratedData } from '@fumadocs/json-schema/react';

export interface SchemaPathItem {
  name: string;
  $ref: string;
}

interface PathItemState extends SchemaPathItem {
  /** the selected members of its unions */
  tabValues?: string[];
}

export interface SchemaUIContextType {
  rootId: string;
  /** the opened schemas, the first item is always the root */
  path: SchemaPathItem[];
  /** open the schema `$ref` of a property */
  open: (name: string, $ref: string) => void;
  /** go back to the path item at `index` */
  back: (index: number) => void;
  generated: SchemaUIGeneratedData;
}

interface State {
  path: PathItemState[];
  /** how the last path item was navigated to, its panel slides in from that side */
  motion?: 'forward' | 'back';
  /** the property of the last path item a link points to */
  highlighted?: string;
  /** the schemas opened from a root property are closed, `path` is kept for the exit animation */
  collapsed?: boolean;
}

interface SchemaUIState extends SchemaUIContextType {
  state: State;
  setState: (state: State) => void;
}

type UnionSchema = Extract<SchemaData, { type: 'or' | 'and' }>;

const SchemaUIContext = createContext<SchemaUIState | null>(null);
/** opens a schema in the card of a type trigger, unset for root properties as they expand the card */
const CardContext = createContext<SchemaUIContextType['open'] | null>(null);
/** roots that already restored their path from the URL */
const restored = new Set<string>();

export function SchemaUIProvider({
  rootId,
  name,
  generated,
  children,
}: {
  /** anchor ID of the root schema, links to a property are resolved against it */
  rootId: string;
  name: string;
  generated: SchemaUIGeneratedData;
  children: ReactNode;
}) {
  const [state, setState] = useState<State>(() => ({ path: [{ $ref: generated.$root, name }] }));

  useEffect(() => {
    if (restored.has(rootId)) return;
    const url = new URL(window.location.href);
    const param = url.searchParams.get('path');
    if (url.hash !== `#${rootId}` || !param) return;

    const path = decodePath(param);
    if (path.some((item) => !generated.refs[item.$ref])) return;

    const highlighted = url.searchParams.get('s-highlight') ?? undefined;
    setState({ path, highlighted });
    // avoid re-triggering it again
    restored.add(rootId);
    if (!highlighted) document.getElementById(rootId)?.scrollIntoView({ behavior: 'smooth' });
  }, [rootId, generated.refs]);

  return (
    <SchemaUIContext
      value={useMemo<SchemaUIState>(() => {
        const { path } = state;

        return {
          rootId,
          path,
          generated,
          state,
          setState,
          open: (name, $ref) => setState({ path: [...path, { name, $ref }], motion: 'forward' }),
          back: (index) => setState({ path: path.slice(0, index + 1), motion: 'back' }),
        };
      }, [rootId, generated, state])}
    >
      {children}
    </SchemaUIContext>
  );
}

function usePathState(): SchemaUIState {
  const ctx = use(SchemaUIContext);
  if (!ctx) throw new Error('Component must be used under <SchemaUIProvider />');

  return ctx;
}

export function useSchemaUI(): SchemaUIContextType {
  return usePathState();
}

/**
 * The unions of the path item at `pathIndex` with their selected members, and the schema they resolve to.
 */
function useSchemaUnions(pathIndex: number) {
  const {
    state,
    setState,
    generated: { refs },
  } = usePathState();
  const item = state.path[pathIndex];
  const unions: { schema: UnionSchema; value: string; select: (value: string) => void }[] = [];
  let schema = refs[item.$ref];

  while ((schema.type === 'or' || schema.type === 'and') && schema.items.length > 0) {
    const depth = unions.length;
    // empty for unselected parents restored from the URL
    const selected = item.tabValues?.[depth];
    const value = (schema.items.find((member) => member.$type === selected) ?? schema.items[0])
      .$type;

    unions.push({
      schema,
      value,
      select(value) {
        // selections of nested unions belong to the previous value
        const tabValues = item.tabValues?.slice(0, depth) ?? [];
        tabValues[depth] = value;
        setState({ ...state, path: state.path.with(pathIndex, { ...item, tabValues }) });
      },
    });
    schema = refs[value];
  }

  return { unions, schema };
}

/**
 * Whether the property `name` of the path item at `pathIndex` is the one a link points to.
 *
 * @returns the state and a ref to scroll it into view
 */
export function useSchemaHighlight(
  pathIndex: number,
  name: string,
): [highlighted: boolean, ref: (element: HTMLElement | null) => (() => void) | undefined] {
  const { state } = usePathState();
  const highlighted = state.highlighted === name && pathIndex === state.path.length - 1;
  const ref = useCallback(
    (element: HTMLElement | null) => {
      if (!element || !highlighted) return;
      // after the opened schemas expand
      const timer = window.setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      return () => window.clearTimeout(timer);
    },
    [highlighted],
  );

  return [highlighted, ref];
}

/**
 * Copy the link to the property `name` of the path item at `pathIndex`.
 */
export function useCopySchemaLink(pathIndex: number, name: string) {
  const { path, rootId } = usePathState();

  return useCopyButton(() => {
    const url = new URL(window.location.href);
    url.hash = `#${rootId}`;
    url.searchParams.set('s-highlight', name);
    url.searchParams.set('path', encodePath(path.slice(0, pathIndex + 1)));
    return navigator.clipboard.writeText(url.href);
  });
}

function encodePath(path: PathItemState[]): string {
  return path.map((item) => [item.name, item.$ref, ...(item.tabValues ?? [])].join('\0')).join('|');
}

function decodePath(param: string): PathItemState[] {
  const out: PathItemState[] = [];
  for (const part of param.split('|')) {
    const [name, $ref, ...tabValues] = part.split('\0');
    out.push({ name, $ref, tabValues });
  }

  return out;
}

export interface SchemaUIProps {
  /** anchor ID of the root schema, links to a property are resolved against it */
  rootId: string;
  name: string;
  required?: boolean;
  as?: 'property' | 'body';
  /** selects the variant of the root schema, like its media type, shown above the breadcrumbs */
  selector?: ReactNode;
  /** actions of the root schema, like copying its type definitions */
  actions?: ReactNode;

  generated: SchemaUIGeneratedData;
}

export function SchemaUI({
  rootId,
  name,
  required = false,
  as = 'property',
  selector,
  actions,
  generated,
}: SchemaUIProps) {
  const root = generated.refs[generated.$root];

  return (
    <SchemaUIProvider rootId={rootId} name={name} generated={generated}>
      {as === 'body' && root.type !== 'primitive' ? (
        <SchemaCard id={rootId} selector={selector} actions={actions} />
      ) : (
        <ObjectProperty
          id={rootId}
          name={name}
          $type={generated.$root}
          required={required}
          parentPathIndex={0}
          actions={
            (selector || actions) && (
              <>
                {selector}
                {actions}
              </>
            )
          }
        >
          {root.type !== 'primitive' && <OpenedSchemas />}
        </ObjectProperty>
      )}
    </SchemaUIProvider>
  );
}

/** the schemas opened from a root property, in a card below it */
function OpenedSchemas() {
  const { state } = usePathState();

  return (
    <Collapsible open={!state.collapsed && state.path.length > 1}>
      <CollapsibleContent>
        <SchemaCard from={1} className="mt-2.5" />
      </CollapsibleContent>
    </Collapsible>
  );
}

const typeClassName = 'font-mono text-xs text-fd-muted-foreground';

const crumbClassName =
  'truncate rounded-md px-1.5 py-1 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fd-ring data-popup-open:bg-fd-accent';

const chevronClassName = 'size-3.5 shrink-0 text-fd-muted-foreground/60';

/** below the sticky headers of docs layouts */
const scrollMarginClassName = 'scroll-mt-[calc(var(--fd-docs-row-3,0px)+0.5rem)]';

/**
 * The path from `from`, the crumbs between the first and last one collapse into a menu when they don't fit.
 */
function Breadcrumbs({
  from,
  onBack,
  children,
}: {
  from: number;
  onBack: (index: number) => void;
  /** shown after the crumbs */
  children?: ReactNode;
}) {
  const t = useTranslations({ note: 'schema UI' });
  const { path } = useSchemaUI();
  const last = path.length - 1;
  const [collapsed, setCollapsed] = useState(0);
  // the hidden copy of all crumbs is measured before paint, and again when resized
  const measure = useCallback((copy: HTMLElement | null) => {
    if (!copy) return;
    const element = copy.parentElement!;
    const after = element.children[2];
    const update = () =>
      setCollapsed(
        countCollapsed(copy, element.clientWidth - (after?.getBoundingClientRect().width ?? 0)),
      );
    const observer = new ResizeObserver(update);
    update();
    observer.observe(element);
    if (after) observer.observe(after);
    return () => observer.disconnect();
  }, []);
  const hidden = Math.min(collapsed, Math.max(0, last - from - 1));
  const crumbs: ReactNode[] = [];
  const all: ReactNode[] = [];
  let names = '';

  for (let i = from; i <= last; i++) {
    const name = formatName(path[i].name);
    names += `${name}\0`;
    all.push(
      <li key={i} className="flex items-center gap-0.5">
        {i > from && <ChevronRightIcon className={chevronClassName} />}
        <span className={cn('px-1.5 py-1', i === last && 'font-medium')}>{name}</span>
      </li>,
    );

    if (i > from && i <= from + hidden) continue;
    crumbs.push(
      <li
        key={i}
        className={cn(
          'flex items-center gap-0.5 overflow-hidden',
          i > from && 'motion-safe:transition-opacity motion-safe:starting:opacity-0',
        )}
      >
        {i > from && <ChevronRightIcon className={chevronClassName} />}
        {i < last ? (
          <button type="button" onClick={() => onBack(i)} className={crumbClassName}>
            {name}
          </button>
        ) : (
          <span aria-current="page" className="truncate px-1.5 py-1 font-medium">
            {name}
          </span>
        )}
      </li>,
    );

    if (i === from && hidden > 0) {
      const items: ReactNode[] = [];
      for (let j = from + 1; j <= from + hidden; j++) {
        items.push(
          <Menu.Item
            key={j}
            onClick={() => onBack(j)}
            className="truncate rounded-md px-2 py-1.5 outline-none data-highlighted:bg-fd-accent data-highlighted:text-fd-accent-foreground"
          >
            {formatName(path[j].name)}
          </Menu.Item>,
        );
      }

      crumbs.push(
        <li key="menu" className="flex items-center gap-0.5">
          <ChevronRightIcon className={chevronClassName} />
          <Menu.Root>
            <Menu.Trigger
              aria-label={t('Show Path', { note: 'aria-label' })}
              className={crumbClassName}
            >
              …
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner align="start" sideOffset={4} className="z-50">
                <Menu.Popup className="flex max-h-(--available-height) max-w-72 min-w-40 origin-(--transform-origin) flex-col overflow-y-auto rounded-xl border bg-fd-popover p-1 font-mono text-[0.8125rem] text-fd-popover-foreground shadow-lg outline-none transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
                  {items}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </li>,
      );
    }
  }

  return (
    <div className="relative flex min-w-0 flex-1 items-center">
      {/* remounted for other crumbs to measure them */}
      <ol key={names} ref={measure} aria-hidden className="invisible absolute top-0 flex w-max">
        {all}
        <li className="flex items-center gap-0.5">
          <ChevronRightIcon className={chevronClassName} />
          <span className="px-1.5 py-1">…</span>
        </li>
      </ol>
      {/* space is shared equally, so only the crumbs longer than their share truncate */}
      <ol className="grid min-w-0 auto-cols-[minmax(0,max-content)] grid-flow-col items-center">
        {crumbs}
      </ol>
      {children && <div className="flex min-w-0 items-center">{children}</div>}
    </div>
  );
}

/** the number of crumbs after the first one to collapse, measured from the hidden copy of all crumbs */
function countCollapsed(copy: HTMLElement, available: number): number {
  const widths = Array.from(copy.children, (child) => child.getBoundingClientRect().width);
  // the menu is measured last
  const menu = widths.pop()!;
  let total = 0;
  for (const width of widths) total += width;
  if (total <= available) return 0;

  // keep the crumbs closest to the last one
  let count = 0;
  total += menu;
  while (count < widths.length - 2 && total > available) total -= widths[++count];
  return count;
}

const motionClassNames = {
  forward: 'motion-safe:starting:translate-x-6',
  back: 'motion-safe:starting:-translate-x-6',
};

/** the last schema of the path, with the path from `from` as breadcrumbs */
function SchemaCard({
  from = 0,
  id,
  selector,
  actions,
  className,
}: {
  from?: number;
  id?: string;
  selector?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const t = useTranslations({ note: 'schema UI' });
  const { state, open, back } = usePathState();
  const { path, motion } = state;
  const pathIndex = path.length - 1;
  const item = path[pathIndex];
  const { unions, schema } = useSchemaUnions(pathIndex);
  const filterable = schema.type === 'object' && schema.props.length > 0;
  const panelKey = `${pathIndex}\0${item.name}\0${item.$ref}`;
  // the root property above already describes its own schema
  const described = from > 0 && pathIndex === from && item.$ref === path[0].$ref;
  // the filter of each panel starts empty
  const [search, setSearch] = useState({ key: panelKey, value: '' });
  const query = search.key === panelKey ? search.value : '';
  const headerRef = useRef<HTMLDivElement>(null);

  // the opened schema replaces the properties above, scroll back to the breadcrumbs
  function navigate(update: () => void) {
    flushSync(update);
    headerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  return (
    <div
      id={id}
      className={cn(
        '@container overflow-hidden rounded-xl border bg-fd-card text-fd-card-foreground',
        scrollMarginClassName,
        className,
      )}
    >
      <div
        ref={headerRef}
        className={cn('not-prose flex flex-wrap border-b', scrollMarginClassName)}
      >
        {selector && (
          <div className="flex h-9 basis-full items-center border-b ps-1.5 pe-1 text-[0.8125rem]">
            {selector}
          </div>
        )}
        <div className="flex h-9 min-w-0 flex-1 items-center ps-1.5 pe-1 font-mono text-[0.8125rem]">
          <Breadcrumbs from={from} onBack={(index) => navigate(() => back(index))}>
            {unions.length > 0 &&
              unions.map(({ schema, value, select }, depth) => (
                <div key={depth} className="flex min-w-0 items-center gap-0.5">
                  <ChevronRightIcon className={chevronClassName} />
                  <UnionSelect schema={schema} value={value} onSelect={select} />
                </div>
              ))}
          </Breadcrumbs>
        </div>
        {(filterable || actions) && (
          <div
            className={cn(
              'flex h-9 items-center gap-1 pe-1',
              // a row of its own in narrow cards, leaving the breadcrumbs room
              filterable && '@max-xl:basis-full @max-xl:border-t @max-xl:ps-1.5',
            )}
          >
            {filterable && (
              <label className="flex h-7 cursor-text items-center gap-1.5 rounded-md border bg-fd-secondary px-2 text-fd-muted-foreground transition-shadow focus-within:ring-1 focus-within:ring-fd-ring @max-xl:flex-1 @xl:w-40">
                <FilterIcon className="size-3.5 shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setSearch({ key: panelKey, value: e.target.value })}
                  aria-label={t('Filter Properties')}
                  placeholder={t('Filter Properties')}
                  className="min-w-0 flex-1 bg-transparent text-[0.8125rem] text-fd-foreground outline-none placeholder:text-fd-muted-foreground"
                />
              </label>
            )}
            {actions}
          </div>
        )}
      </div>
      <CardContext value={(name, $ref) => navigate(() => open(name, $ref))}>
        <div
          key={panelKey}
          className={cn(
            'px-3',
            motion &&
              'starting:opacity-0 motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]',
            motion && motionClassNames[motion],
          )}
        >
          <SchemaBody schema={schema} pathIndex={pathIndex} search={query} describe={!described} />
        </div>
      </CardContext>
    </div>
  );
}

function UnionSelect({
  schema,
  value,
  onSelect,
}: {
  schema: UnionSchema;
  value: string;
  onSelect: (value: string) => void;
}) {
  const items = schema.items.map((item) => ({ label: item.name, value: item.$type }));

  return (
    <Select items={items} value={value} onValueChange={(v) => v && onSelect(v)}>
      <SelectTrigger className="h-7 w-auto min-w-0 gap-1 border-0 bg-transparent px-1.5 py-0 text-[0.8125rem] font-medium text-fd-foreground hover:bg-fd-accent focus:ring-0 focus-visible:ring-2 focus-visible:ring-inset data-popup-open:bg-fd-accent">
        <SelectValue className="truncate" />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value} className="font-mono text-[0.8125rem]">
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SchemaBody({
  schema,
  pathIndex,
  search,
  describe,
}: {
  schema: SchemaData;
  pathIndex: number;
  search: string;
  describe: boolean;
}) {
  const t = useTranslations({ note: 'schema UI' });
  let children: ReactNode = null;

  if (schema.type === 'object') {
    const query = search.trim().toLowerCase();
    const props =
      query.length > 0
        ? schema.props.filter((prop) => prop.name.toLowerCase().includes(query))
        : schema.props;

    if (props.length > 0) {
      children = props.map((prop) => (
        <ObjectProperty
          key={prop.name}
          name={prop.name}
          $type={prop.$type}
          required={prop.required}
          parentPathIndex={pathIndex}
        />
      ));
    } else if (query.length > 0) {
      children = (
        <div className="not-prose my-3 flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-6 text-center text-fd-muted-foreground">
          <div className="rounded-lg border bg-fd-secondary p-2">
            <FilterXIcon className="size-4" />
          </div>
          <p>
            {t('No property matching')}{' '}
            <span className="font-medium break-all text-fd-foreground">{`"${search}"`}</span>
          </p>
        </div>
      );
    }
  } else if (schema.type === 'array') {
    children = (
      <ObjectProperty
        name="[index: integer]"
        $type={schema.item.$type}
        parentPathIndex={pathIndex}
      />
    );
  }

  return (
    <>
      {describe && <SchemaDescription schema={schema} className="py-2.5" />}
      {children}
    </>
  );
}

/** shorten the names of items and additional properties, like `[index]` */
function formatName(name: string): string {
  const match = /^\[(\w+): \w+]$/.exec(name);
  return match ? `[${match[1]}]` : name;
}

function ObjectProperty({
  id,
  name,
  $type,
  required = false,
  parentPathIndex,
  actions,
  children,
}: {
  id?: string;
  name: string;
  $type: string;
  required?: boolean;
  parentPathIndex: number;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const t = useTranslations({ note: 'schema UI' });
  const {
    generated: { refs },
  } = useSchemaUI();
  const schema = refs[$type];
  const [highlighted, ref] = useSchemaHighlight(parentPathIndex, name);
  const [isChecked, onCopy] = useCopySchemaLink(parentPathIndex, name);

  return (
    <div id={id} ref={ref} className="group/property scroll-m-20 border-t py-2.5 first:border-t-0">
      <div className="not-prose flex flex-wrap items-center gap-x-2 gap-y-1">
        <code className="text-[0.8125rem] font-medium">
          <span
            className={cn(
              highlighted
                ? 'rounded-sm bg-fd-primary text-fd-primary-foreground'
                : 'text-fd-primary',
              schema.deprecated && 'line-through opacity-80',
            )}
          >
            {name}
          </span>
          {required ? (
            <span className="text-red-400">*</span>
          ) : (
            <span className="text-fd-muted-foreground">?</span>
          )}
        </code>
        {schema.type === 'primitive' ? (
          <span className={typeClassName}>{schema.aliasName}</span>
        ) : (
          <TypeInfoTrigger pathName={name} $ref={$type}>
            {schema.aliasName}
          </TypeInfoTrigger>
        )}
        {schema.deprecated && (
          <span className="font-mono text-xs text-yellow-600 dark:text-yellow-400">
            {t('Deprecated')}
          </span>
        )}
        <button
          type="button"
          aria-live="polite"
          onClick={onCopy}
          className={cn(
            buttonVariants({ size: 'icon-xs', variant: 'ghost' }),
            '-my-1 ms-auto text-fd-muted-foreground opacity-0 transition-opacity group-hover/property:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 [&_svg]:size-3.5',
          )}
        >
          {isChecked ? <CheckIcon /> : <LinkIcon />}
          <span className="sr-only">
            {isChecked
              ? t('Copied Link', { note: 'aria-label' })
              : t('Copy Link', { note: 'aria-label' })}
          </span>
        </button>
        {actions}
      </div>
      <SchemaDescription schema={schema} className="mt-1" />
      {children}
    </div>
  );
}

interface TypeInfoTriggerProps {
  pathName: string;
  $ref: string;
  children: ReactNode;
}

function TypeInfoTrigger({ pathName, $ref, children }: TypeInfoTriggerProps) {
  const {
    generated: { refs },
  } = useSchemaUI();
  const schema = refs[$ref];

  if (
    schema.type === 'primitive' &&
    !schema.description &&
    (!schema.infoTags || schema.infoTags.length === 0)
  ) {
    return <span className={typeClassName}>{children}</span>;
  }

  if (schema.type === 'and' || schema.type === 'or') {
    const sep = schema.type === 'and' ? '&' : '|';
    return (
      <span className={cn(typeClassName, 'flex flex-row flex-wrap items-center gap-1.5')}>
        {schema.items.map((item, i) => (
          <Fragment key={item.$type}>
            {i > 0 && <span>{sep}</span>}
            <TypeInfoTrigger pathName={pathName} $ref={item.$type}>
              {item.name}
            </TypeInfoTrigger>
          </Fragment>
        ))}
      </span>
    );
  }

  if (schema.type === 'array') {
    return (
      <span className={cn(typeClassName, 'flex flex-row flex-wrap items-center')}>
        {'array<'}
        <TypeInfoTrigger pathName={`${pathName}[]`} $ref={schema.item.$type}>
          {refs[schema.item.$type].aliasName}
        </TypeInfoTrigger>
        {'>'}
      </span>
    );
  }

  return (
    <TypeButton pathName={pathName} $ref={$ref}>
      {children}
    </TypeButton>
  );
}

function TypeButton({ pathName, $ref, children }: TypeInfoTriggerProps) {
  const openInCard = use(CardContext);
  const { state, setState } = usePathState();
  const { path, collapsed } = state;
  const expanded =
    !collapsed && path.length > 1 && path[1].name === pathName && path[1].$ref === $ref;

  return (
    <button
      type="button"
      aria-expanded={openInCard ? undefined : expanded}
      onClick={() => {
        if (openInCard) openInCard(pathName, $ref);
        else if (expanded) setState({ ...state, collapsed: true });
        else setState({ path: [path[0], { name: pathName, $ref }] });
      }}
      className={cn(
        typeClassName,
        'text-start underline decoration-dotted underline-offset-4 transition-colors hover:text-fd-accent-foreground aria-expanded:text-fd-accent-foreground aria-expanded:decoration-solid',
      )}
    >
      {children}
    </button>
  );
}

function SchemaDescription({ schema, className }: { schema: SchemaData; className?: string }) {
  const { description, infoTags = [] } = schema;
  if (!description && infoTags.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-2 text-fd-muted-foreground', className)}>
      {description && <div className="prose-no-margin">{description}</div>}
      {infoTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {infoTags.map((tag, i) => (
            <Fragment key={i}>
              {'node' in tag ? (
                tag.node
              ) : 'list' in tag ? (
                <div className="not-prose flex w-full flex-wrap items-center gap-1.5 text-xs">
                  <span>{tag.label}</span>
                  {tag.list.map((item, i) => (
                    <code key={i} className={tagClassName}>
                      {item}
                    </code>
                  ))}
                </div>
              ) : tag.block ? (
                <BlockTag label={tag.label}>{tag.value}</BlockTag>
              ) : (
                <InlineTag label={tag.label} prose={tag.prose}>
                  {tag.value}
                </InlineTag>
              )}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

const tagClassName =
  'rounded-md border bg-fd-secondary px-1.5 py-0.5 text-xs text-fd-secondary-foreground';

export function InlineTag({
  label,
  prose = false,
  children,
}: {
  label: ReactNode;
  prose?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn(tagClassName, 'inline-flex max-w-full items-baseline gap-1.5')}>
      <span className="not-prose shrink-0 text-fd-muted-foreground">{label}</span>
      {prose ? (
        <div className="prose-sm prose-no-margin min-w-0 flex-1">{children}</div>
      ) : (
        <code className="not-prose min-w-0 wrap-break-word">{children}</code>
      )}
    </div>
  );
}

export function BlockTag({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="not-prose flex w-full flex-col gap-1.5 text-xs">
      <span>{label}</span>
      {children}
    </div>
  );
}
