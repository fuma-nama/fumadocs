'use client';
import {
  type ComponentProps,
  createContext,
  Fragment,
  type ReactNode,
  type RefObject,
  Suspense,
  use,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'fumadocs-ui/components/tabs';
import { useTranslations } from '@/ui/client/i18n';
import type {
  InfoTag as InfoTagData,
  SchemaData,
  SchemaDataObjectProperty,
  SchemaUIGeneratedData,
} from '@/ui/schema';
import { slugifyPropertyName } from '@/ui/schema';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'fumadocs-ui/components/ui/collapsible';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { Check, ChevronDown, FilterIcon, LinkIcon } from 'lucide-react';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { Badge } from '@/ui/components/method-label';
import { Popover, PopoverContent, PopoverTrigger } from 'fumadocs-ui/components/ui/popover';
import { cn } from '@/utils/cn';
import { cva } from 'class-variance-authority';

type DataContextType = SchemaUIGeneratedData;

interface PopoverContextType {
  renderTrigger: (props: {
    pathName: ReactNode;
    $ref: string;
    children: ReactNode;
    topLevelId?: string;
  }) => ReactNode;
}

interface DeepLinkTarget {
  /** the DOM id of the top-level Property that matched the hash */
  topLevelId: string;
  /** slugified schema-property segments after the top-level id */
  segments: string[];
  /** original hash value (without the leading `#`) */
  fullHash: string;
}

interface DeepLinkContextValue {
  target: DeepLinkTarget | null;
}

const DeepLinkContext = createContext<DeepLinkContextValue>({ target: null });

function useDeepLink() {
  return use(DeepLinkContext);
}

const typeVariants = cva('text-sm text-start text-fd-muted-foreground font-mono', {
  variants: {
    variant: {
      trigger:
        'underline hover:text-fd-accent-foreground data-[state=open]:text-fd-accent-foreground',
    },
  },
});

const PopoverContext = createContext<PopoverContextType>({
  renderTrigger: (props) => <RootPopoverTrigger {...props} />,
});

const DataContext = createContext<DataContextType | null>(null);

function useData() {
  return use(DataContext)!;
}

function usePopover() {
  return use(PopoverContext);
}

export interface SchemaUIProps {
  name: string;
  required?: boolean;
  as?: 'property' | 'body';

  /**
   * Anchor id prefix for inline-rendered properties. When provided, every
   * property visible inline gets an `id` and a hover-revealed link icon that
   * resolves to `#${idPrefix}-${slug(propPath)}`, allowing writers to deep-link
   * to a specific property of a request / response / parameter from prose.
   *
   * If the root schema renders as a single property (e.g. a primitive
   * parameter), its id is `idPrefix`; for object roots, the prefix is treated
   * as the path *to* the root, so its top-level props become `${idPrefix}-${propName}`.
   */
  idPrefix?: string;

  generated: SchemaUIGeneratedData;
}

export function SchemaUI({
  name,
  required = false,
  as = 'property',
  idPrefix,
  generated,
}: SchemaUIProps) {
  return (
    <DataContext value={generated}>
      <DeepLinkProvider idPrefix={idPrefix}>
        <SchemaUIProperty
          name={name}
          $type={generated.$root}
          path={idPrefix}
          topLevelId={idPrefix}
          overrides={{
            required,
          }}
          variant={
            as === 'property' || generated.refs[generated.$root].type === 'primitive'
              ? 'default'
              : 'expand'
          }
        />
      </DeepLinkProvider>
    </DataContext>
  );
}

function DeepLinkProvider({
  idPrefix,
  children,
}: {
  idPrefix?: string;
  children: ReactNode;
}) {
  const [target, setTarget] = useState<DeepLinkTarget | null>(null);

  useEffect(() => {
    if (!idPrefix) return;

    function resolve() {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (!hash || (hash !== idPrefix && !hash.startsWith(`${idPrefix}.`))) {
        setTarget((prev) => (prev ? null : prev));
        return;
      }

      // Find the longest dotted prefix that is a real DOM id; the remainder
      // (if any) is the schema-internal path to walk.
      const parts = hash.split('.');
      for (let i = parts.length; i >= 1; i--) {
        const candidate = parts.slice(0, i).join('.');
        if (document.getElementById(candidate)) {
          setTarget({
            topLevelId: candidate,
            segments: parts.slice(i),
            fullHash: hash,
          });
          return;
        }
      }
      setTarget(null);
    }

    resolve();
    window.addEventListener('hashchange', resolve);
    return () => window.removeEventListener('hashchange', resolve);
  }, [idPrefix]);

  // After a deep target is set, scroll the page to the inline anchor first so
  // the popover (or array collapsible) appears in a sensible spot, then wait
  // for the deep element to mount and scroll *that* into view (which the
  // browser doesn't do for hashes whose element isn't in the DOM on load).
  useEffect(() => {
    if (!target) return;

    const topEl = document.getElementById(target.topLevelId);
    topEl?.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });

    if (target.segments.length === 0) return;

    let attempts = 0;
    let raf: number | null = null;

    function tryScroll() {
      if (!target) return;
      const el = document.getElementById(target.fullHash);
      if (el && el !== topEl) {
        el.scrollIntoView({ block: 'nearest', behavior: 'instant' as ScrollBehavior });
        return;
      }
      if (attempts++ < 30) raf = requestAnimationFrame(tryScroll);
    }
    tryScroll();
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [target]);

  return <DeepLinkContext value={{ target }}>{children}</DeepLinkContext>;
}

function walkDeepSchemaPath(
  refs: Record<string, SchemaData>,
  startRef: string,
  segments: string[],
): PathItemType[] {
  const extra: PathItemType[] = [];
  let current = startRef;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const remaining = segments.slice(i);

    let schema: SchemaData | undefined = refs[current];
    while (schema?.type === 'array') {
      current = schema.item.$type;
      schema = refs[current];
    }
    if (!schema) break;

    if (schema.type === 'or' || schema.type === 'and') {
      // Pick the variant whose subtree contains the *entire* remaining path,
      // not just the next token — otherwise two variants that happen to share
      // the first prop name would race and the first one wins.
      const match = findUnionPropMatch(refs, schema.items, remaining);
      if (!match) break;
      extra.push({ name: match.name, $ref: match.$type });
      current = match.$type;
      continue;
    }

    if (schema.type === 'object') {
      const prop = schema.props.find((p) => slugifyPropertyName(p.name) === segment);
      if (!prop) break;
      extra.push({ name: prop.name, $ref: prop.$type });
      current = prop.$type;
      continue;
    }

    break;
  }

  return extra;
}

function findUnionPropMatch(
  refs: Record<string, SchemaData>,
  items: { name: string; $type: string }[],
  segments: string[],
): { name: string; $type: string } | undefined {
  if (segments.length === 0) return undefined;
  const [first, ...rest] = segments;
  for (const variant of items) {
    let schema = refs[variant.$type];
    while (schema?.type === 'array') {
      schema = refs[schema.item.$type];
    }
    if (!schema) continue;
    if (schema.type === 'object') {
      const prop = schema.props.find((p) => slugifyPropertyName(p.name) === first);
      if (prop && pathResolves(refs, prop.$type, rest)) return prop;
    }
    if (schema.type === 'or' || schema.type === 'and') {
      const nested = findUnionPropMatch(refs, schema.items, segments);
      if (nested) return nested;
    }
  }
  return undefined;
}

function pathResolves(
  refs: Record<string, SchemaData>,
  startRef: string,
  segments: string[],
): boolean {
  if (segments.length === 0) return true;
  let schema = refs[startRef];
  while (schema?.type === 'array') {
    schema = refs[schema.item.$type];
  }
  if (!schema) return false;
  if (schema.type === 'or' || schema.type === 'and') {
    return Boolean(findUnionPropMatch(refs, schema.items, segments));
  }
  if (schema.type === 'object') {
    const [first, ...rest] = segments;
    const prop = schema.props.find((p) => slugifyPropertyName(p.name) === first);
    if (!prop) return false;
    return pathResolves(refs, prop.$type, rest);
  }
  return false;
}

function SchemaUIProperty({
  name,
  $type,
  variant = 'default',
  path,
  topLevelId,
  overrides,
  objectSearchOverrides,
}: {
  name: ReactNode;
  $type: string;
  variant?: 'default' | 'expand';
  path?: string;
  /**
   * The DOM id of the nearest inline Property element that contains this
   * subtree. Threaded to popover triggers / array collapsibles so they can
   * decide whether to auto-open in response to a deep link.
   */
  topLevelId?: string;
  overrides?: Partial<PropertyProps>;
  objectSearchOverrides?: Partial<ObjectSearchProps>;
}) {
  const { refs } = useData();
  const schema = refs[$type];
  const renderRef = useRenderRef();
  let type: ReactNode = schema.aliasName;

  if ((schema.type === 'or' || schema.type === 'and') && schema.items.length > 0) {
    if (variant === 'expand')
      return (
        <UnionTabs items={schema.items} path={path} topLevelId={topLevelId} />
      );
    type = renderRef({
      pathName: name,
      $ref: $type,
      text: schema.aliasName,
      topLevelId: topLevelId ?? path,
    });
  } else if (schema.type === 'object' && schema.props.length > 0) {
    if (variant === 'expand')
      return (
        <ObjectSearch properties={schema.props} parentPath={path} {...objectSearchOverrides} />
      );

    type = renderRef({
      pathName: name,
      $ref: $type,
      text: schema.aliasName,
      topLevelId: topLevelId ?? path,
    });
  } else if (schema.type === 'array') {
    if (variant === 'expand')
      return (
        <ArrayItemCollapsible schema={schema} parentPath={path} topLevelId={topLevelId} />
      );

    type = renderRef({
      pathName: name,
      $ref: $type,
      text: schema.aliasName,
      topLevelId: topLevelId ?? path,
    });
  }

  const child = (
    <>
      {schema.description}
      {schema.infoTags && schema.infoTags.length > 0 && (
        <div className="flex flex-row gap-2 flex-wrap my-2 not-prose empty:hidden">
          {schema.infoTags.map((tag, i) => (
            <InfoTag key={i} tag={tag} />
          ))}
        </div>
      )}
    </>
  );
  if (variant === 'expand') return child;
  return (
    <Property id={path} name={name} type={type} deprecated={schema.deprecated} {...overrides}>
      {child}
    </Property>
  );
}

function UnionTabs({
  items,
  path,
  topLevelId,
}: {
  items: { name: string; $type: string }[];
  path?: string;
  topLevelId?: string;
}) {
  const { refs } = useData();
  const { target } = useDeepLink();

  const targetedVariant = useMemo(() => {
    if (!target || !path) return undefined;
    const onRoute = target.fullHash === path || target.fullHash.startsWith(`${path}.`);
    if (!onRoute) return undefined;

    const remaining =
      target.fullHash === path ? [] : target.fullHash.slice(path.length + 1).split('.');
    if (remaining.length === 0) return undefined;

    for (const item of items) {
      if (findUnionPropMatch(refs, [item], remaining)) return item.$type;
    }
    return undefined;
  }, [items, path, refs, target]);

  const [value, setValue] = useState(items[0].$type);

  useEffect(() => {
    if (targetedVariant && targetedVariant !== value) setValue(targetedVariant);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetedVariant]);

  return (
    <Tabs value={value} onValueChange={setValue}>
      <TabsList>
        {items.map((item) => (
          <TabsTrigger key={item.$type} value={item.$type}>
            {item.name}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((item) => (
        <TabsContent key={item.$type} value={item.$type} className="pt-2 pb-0">
          <SchemaUIProperty {...item} variant="expand" path={path} topLevelId={topLevelId} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function ArrayItemCollapsible({
  schema,
  parentPath,
  topLevelId,
}: {
  schema: Extract<SchemaData, { type: 'array' }>;
  parentPath?: string;
  topLevelId?: string;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations();
  const { target } = useDeepLink();

  const [appliedDeepHash, setAppliedDeepHash] = useState<string | null>(null);
  const isActiveTarget = Boolean(
    parentPath &&
      target &&
      target.fullHash !== appliedDeepHash &&
      (target.fullHash === parentPath || target.fullHash.startsWith(`${parentPath}.`)),
  );

  useEffect(() => {
    if (!isActiveTarget || !target) return;
    setOpen(true);
    setAppliedDeepHash(target.fullHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActiveTarget]);

  return (
    <Collapsible className="my-2" open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          buttonVariants({ color: 'secondary', size: 'sm' }),
          'group px-3 py-2 data-[state=open]:rounded-b-none',
        )}
      >
        {open ? t.schemaHideArray : t.schemaShowArray}
        <ChevronDown className="size-4 text-fd-muted-foreground group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="-mt-px bg-fd-card px-3 rounded-lg rounded-tl-none border shadow-sm">
        <SchemaUIProperty
          name=""
          $type={schema.item.$type}
          variant="expand"
          path={parentPath}
          topLevelId={topLevelId}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

interface ObjectSearchProps {
  properties: SchemaDataObjectProperty[];
  container?: ComponentProps<'div'>;
  open?: (item: SchemaDataObjectProperty) => void;
  parentPath?: string;
}

function ObjectSearch({ properties, container, open, parentPath }: ObjectSearchProps) {
  const [search, setSearch] = useState('');
  const deferredValue = useDeferredValue(search);
  const firstItemRef = useRef<SchemaDataObjectProperty>(null);
  const prevProperties = useRef(properties);
  const t = useTranslations();

  if (prevProperties.current !== properties) {
    prevProperties.current = properties;
    setSearch('');
  }

  return (
    <>
      <div
        {...container}
        className={cn(
          'flex items-center border my-2 rounded-md bg-fd-secondary text-fd-secondary-foreground transition-colors shadow-sm focus-within:ring-2 focus-within:ring-fd-ring',
          container?.className,
        )}
      >
        <FilterIcon className="text-fd-muted-foreground ms-2 size-3.5" />
        <input
          value={search}
          data-object-search-input=""
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.schemaFilterPropertiesPlaceholder}
          className="text-sm ps-2 py-2 flex-1 outline-none placeholder:text-fd-muted-foreground"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && open) {
              if (firstItemRef.current) open(firstItemRef.current);
              e.preventDefault();
            }
          }}
        />
      </div>
      <Suspense>
        <ObjectSearchContent
          search={deferredValue}
          properties={properties}
          parentPath={parentPath}
          firstItemRef={firstItemRef}
        />
      </Suspense>
    </>
  );
}

function ObjectSearchContent({
  search: rawSearch,
  firstItemRef,
  properties,
  parentPath,
}: {
  search: string;
  firstItemRef: RefObject<SchemaDataObjectProperty | null>;
  properties: SchemaDataObjectProperty[];
  parentPath?: string;
}) {
  const t = useTranslations();
  const filtered = useMemo(() => {
    const search = rawSearch.trim().toLowerCase();
    return search.length > 0
      ? properties.filter((prop) => prop.name.toLowerCase().includes(search))
      : properties;
  }, [properties, rawSearch]);

  firstItemRef.current = filtered.length > 0 ? filtered[0] : null;

  if (filtered.length === 0)
    return (
      <p className="text-fd-muted-foreground text-sm px-2">
        {t.schemaFilterPropertiesEmpty}{' '}
        <span className="text-fd-foreground font-medium">{`"${rawSearch}"`}</span>
      </p>
    );

  return filtered.map((prop) => {
    const childPath = joinPath(parentPath, prop.name);
    // Each rendered top-level property's DOM id becomes the topLevelId for
    // anything below it (popovers, nested type triggers).
    return (
      <SchemaUIProperty
        key={prop.name}
        name={prop.name}
        $type={prop.$type}
        path={childPath}
        topLevelId={childPath}
        overrides={{ required: prop.required }}
      />
    );
  });
}

function joinPath(parent: string | undefined, name: string): string | undefined {
  if (!parent) return undefined;
  const slug = slugifyPropertyName(name);
  if (!slug) return parent;
  return `${parent}.${slug}`;
}

function InfoTag({ tag }: { tag: InfoTagData }) {
  const ref = useRef<HTMLElement>(null);
  const [isTruncated, setTruncated] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    // assume the tag width will never change
    setTruncated(element.scrollWidth !== element.offsetWidth);
  }, []);

  return (
    <div className="flex flex-row items-start gap-2 bg-fd-secondary border rounded-lg text-xs p-1.5 shadow-md max-w-full">
      <span className="font-medium">{tag.label}</span>
      <code
        ref={ref}
        className={cn(
          'min-w-0 flex-1 text-fd-muted-foreground',
          open ? 'wrap-break-word' : 'truncate',
        )}
      >
        {tag.value}
      </code>
      {isTruncated && (
        <button
          className={cn(buttonVariants({ size: 'icon-xs', variant: 'ghost' }))}
          onClick={() => setOpen((prev) => !prev)}
        >
          <ChevronDown />
        </button>
      )}
    </div>
  );
}

interface PathItemType {
  name: ReactNode;
  $ref?: string;
  scrollTop?: number;
}

function SchemaUIPopover({
  containerRef,
  initialPath,
  topLevelId,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  initialPath: PathItemType[];
  topLevelId?: string;
}) {
  const [path, setPath] = useState(initialPath);

  // Re-seed the breadcrumb if a fresh deep-link target arrives while the
  // popover is already open (e.g. another auto-open fires for the same
  // trigger). Reference equality is enough since `initialPath` is `useMemo`d
  // by the parent and only changes when the deep target does.
  useEffect(() => {
    setPath(initialPath);
  }, [initialPath]);

  useLayoutEffect(() => {
    const last = path[0];
    const element = containerRef.current;
    if (!element || !last || !element.parentElement) return;

    // recover scroll
    element.parentElement.scrollTop = last.scrollTop ?? 0;
    return () => {
      if (element.parentElement) last.scrollTop = element.parentElement.scrollTop;
    };
  }, [containerRef, path]);

  const context: PopoverContextType = useMemo(
    () => ({
      // Inside the popover, type triggers drill into the popover instead of
      // opening a new one; topLevelId is irrelevant here.
      renderTrigger: ({ $ref, pathName, children }) => (
        <button
          className={cn(typeVariants({ variant: 'trigger' }))}
          onClick={() => setPath((path) => [...path, { name: pathName, $ref }])}
        >
          {children}
        </button>
      ),
    }),
    [],
  );

  const { refs } = useData();

  // Pick the deepest non-primitive item to render expanded. If the deep-link
  // path bottoms out on a primitive leaf (e.g. `body.creator.name` where name
  // is a string), we render the parent (`creator`) expanded so the leaf shows
  // up as a real Property row — otherwise the popover body would only contain
  // the leaf's description text.
  const expandedItemIndex = useMemo(() => {
    let fallback = -1;
    for (let i = path.length - 1; i >= 0; i--) {
      const item = path[i];
      if (!item.$ref) continue;
      const schema = refs[item.$ref];
      if (!schema) continue;
      if (fallback === -1) fallback = i;
      if (schema.type !== 'primitive') return i;
    }
    return fallback;
  }, [path, refs]);

  const currentRef = expandedItemIndex >= 0 ? path[expandedItemIndex] : undefined;

  // Build the schema-internal path inside the popover by concatenating the
  // breadcrumb names *up to the expanded item* (skipping the initial root,
  // which is already represented by topLevelId). Non-string names (array
  // bracket wrappers) are ignored.
  const currentFullPath = useMemo(() => {
    if (!topLevelId || expandedItemIndex < 0) return undefined;
    const segments: string[] = [];
    for (let i = 1; i <= expandedItemIndex; i++) {
      const itemName = path[i].name;
      if (typeof itemName !== 'string') continue;
      const seg = slugifyPropertyName(itemName);
      if (seg) segments.push(seg);
    }
    return segments.length === 0 ? topLevelId : `${topLevelId}.${segments.join('.')}`;
  }, [topLevelId, path, expandedItemIndex]);

  return (
    <>
      <div className="sticky top-0 -mx-2 flex flex-row flex-wrap items-center text-sm font-medium font-mono bg-fd-popover px-2 h-8 border-b">
        {path.map((item, i) => {
          const isDuplicated = path.some((other, j) => j < i && other.$ref === item.$ref);
          const className = cn(
            isDuplicated && 'text-orange-400',
            item.$ref && 'hover:underline hover:text-fd-accent-foreground',
          );
          const node = item.$ref ? (
            <button onClick={() => setPath((path) => path.slice(0, i + 1))} className={className}>
              {item.name}
            </button>
          ) : (
            <span className={className}>{item.name}</span>
          );

          return (
            <Fragment key={i}>
              {i > 0 && '.'}
              {node}
            </Fragment>
          );
        })}
      </div>
      <PopoverContext value={context}>
        {currentRef?.$ref && (
          <SchemaUIProperty
            name=""
            $type={currentRef.$ref}
            variant="expand"
            path={currentFullPath}
            topLevelId={currentFullPath}
            objectSearchOverrides={{
              container: {
                className: 'sticky top-10',
              },
              open(item) {
                setPath((path) => [...path, { name: item.name, $ref: item.$type }]);
              },
            }}
          />
        )}
      </PopoverContext>
    </>
  );
}

function useRenderRef() {
  const { refs } = useData();
  const { renderTrigger } = usePopover();
  return function renderRef({
    pathName,
    $ref,
    text,
    topLevelId,
  }: {
    pathName: ReactNode;
    $ref: string;
    text: ReactNode;
    topLevelId?: string;
  }) {
    const schema = refs[$ref];

    if (!isExpandable(schema)) {
      return <span className={cn(typeVariants())}>{text}</span>;
    }

    if (schema.type === 'and' || schema.type === 'or') {
      const sep = schema.type === 'and' ? '&' : '|';
      return (
        <span className={cn(typeVariants(), 'flex flex-row gap-2 items-center flex-wrap')}>
          {schema.items.map((item, i) => (
            <Fragment key={item.$type}>
              {i > 0 && <span>{sep}</span>}
              {renderRef({ pathName, text: item.name, $ref: item.$type, topLevelId })}
            </Fragment>
          ))}
        </span>
      );
    }

    if (schema.type === 'array') {
      return (
        <span className={cn(typeVariants(), 'flex flex-row items-center flex-wrap')}>
          {'array<'}
          {renderRef({
            pathName: <>{pathName}[]</>,
            text: refs[schema.item.$type].aliasName,
            $ref: schema.item.$type,
            topLevelId,
          })}
          {'>'}
        </span>
      );
    }

    return renderTrigger({ $ref, pathName, children: text, topLevelId });
  };
}

function RootPopoverTrigger({
  $ref,
  pathName,
  children,
  topLevelId,
}: {
  pathName: ReactNode;
  $ref: string;
  children: ReactNode;
  topLevelId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { refs } = useData();
  const { target } = useDeepLink();

  // Tracks which deep hash this trigger has already auto-applied. After a
  // deep target is consumed, subsequent user-initiated clicks open the base
  // view; a *different* deep hash re-arms the auto-open.
  const [appliedDeepHash, setAppliedDeepHash] = useState<string | null>(null);

  const isActiveTarget = Boolean(
    topLevelId &&
      target &&
      target.fullHash !== appliedDeepHash &&
      target.fullHash.startsWith(`${topLevelId}.`),
  );

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isActiveTarget || !target) return;
    setOpen(true);
    setAppliedDeepHash(target.fullHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActiveTarget]);

  const initialPath = useMemo<PathItemType[]>(() => {
    const base: PathItemType[] = [{ name: pathName, $ref }];
    if (!isActiveTarget || !target || !topLevelId) return base;
    const segments = target.fullHash.slice(topLevelId.length + 1).split('.');
    base.push(...walkDeepSchemaPath(refs, $ref, segments));
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathName, $ref, isActiveTarget, target?.fullHash, topLevelId, refs]);

  const refCallback = useCallback((element: HTMLDivElement | null) => {
    ref.current = element;
    if (!element || element.style.getPropertyValue('--initial-height')) return;

    element.style.setProperty('--initial-height', `${element.clientHeight + 2}px`);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn(typeVariants({ variant: 'trigger' }))}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        ref={refCallback}
        onOpenAutoFocus={(e) => {
          if (!ref.current) return;
          const input = ref.current.querySelector('input[data-object-search-input]');
          if (!(input instanceof HTMLInputElement)) return;
          input.focus({ preventScroll: true });
          e.preventDefault();
        }}
        className="w-[600px] min-h-(--initial-height,0) max-h-[460px] px-2 py-0"
      >
        <SchemaUIPopover
          containerRef={ref}
          initialPath={initialPath}
          topLevelId={topLevelId}
        />
      </PopoverContent>
    </Popover>
  );
}

interface PropertyProps {
  name: ReactNode;
  type: ReactNode;
  id?: string;
  required?: boolean;
  deprecated?: boolean;
  nested?: boolean;

  children?: ReactNode;
  className?: string;
}

function Property({
  name,
  type,
  id,
  required,
  deprecated,
  nested = false,
  className,
  ...props
}: PropertyProps) {
  const t = useTranslations();
  return (
    <div
      id={id}
      className={cn(
        'group/property text-sm border-t scroll-mt-20',
        nested
          ? 'p-3 border-x bg-fd-card last:rounded-b-xl first:rounded-tr-xl last:border-b'
          : 'py-4 first:border-t-0',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3 not-prose">
        <span className="font-medium font-mono text-fd-primary inline-flex items-center gap-1.5">
          {id && (
            <PropertyAnchorCopyButton
              id={id}
              label={typeof name === 'string' ? name : 'property'}
            />
          )}
          <span>
            {name}
            {required ? (
              <span className="text-red-400">*</span>
            ) : (
              <span className="text-fd-muted-foreground">?</span>
            )}
          </span>
        </span>
        {typeof type === 'string' ? (
          <span className="text-sm font-mono text-fd-muted-foreground">{type}</span>
        ) : (
          type
        )}
        {deprecated && (
          <Badge color="yellow" className="ms-auto text-xs">
            {t.deprecated}
          </Badge>
        )}
      </div>
      <div className="prose-no-margin pt-2.5 empty:hidden">{props.children}</div>
    </div>
  );
}

function PropertyAnchorCopyButton({ id, label }: { id: string; label: string }) {
  const [isChecked, onCopy] = useCopyButton(() => {
    const url = new URL(window.location.href);
    url.hash = id;
    // Update the address bar without re-triggering hashchange (which would
    // reset the popover/collapsible state the user just navigated into).
    history.replaceState(null, '', url.href);
    return navigator.clipboard.writeText(url.href);
  });

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`Copy link to ${label}`}
      className={cn(
        'text-fd-muted-foreground transition-opacity focus-visible:opacity-100',
        isChecked
          ? 'opacity-100 text-fd-primary'
          : 'opacity-0 group-hover/property:opacity-100',
      )}
    >
      {isChecked ? <Check className="size-3.5" /> : <LinkIcon className="size-3.5" />}
    </button>
  );
}

function isExpandable(data: SchemaData): boolean {
  if (data.type !== 'primitive') return true;
  return Boolean(data.description || (data.infoTags && data.infoTags.length > 0));
}
