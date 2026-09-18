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
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslations } from '@fuma-translate/react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { CheckIcon, FilterIcon, LinkIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { cn } from '@/utils/cn';
import { cva } from 'class-variance-authority';
import { mergeRefs } from '@/utils/merge-refs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';
import type {
  SchemaData,
  SchemaDataObjectProperty,
  SchemaUIGeneratedData,
} from '@fumadocs/json-schema/react';

export interface SchemaPathItem {
  name: string;
  $ref: string;
}

interface PathItemState extends SchemaPathItem {
  /** property name of highlighted field, only applicable for objects */
  highlighted?: string;
  tabValues?: string[];
  /** popover state, only applicable for root */
  closed?: boolean;
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

interface SchemaUIState extends SchemaUIContextType {
  path: PathItemState[];
  setPath: (path: PathItemState[]) => void;
}

const SchemaUIContext = createContext<SchemaUIState | null>(null);
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
  const [path, setPath] = useState<PathItemState[]>(() => [{ $ref: generated.$root, name }]);

  useEffect(() => {
    if (restored.has(rootId)) return;
    const url = new URL(window.location.href);
    const param = url.searchParams.get('path');
    if (url.hash !== `#${rootId}` || !param) return;

    const decoded = decodePath(param, url.searchParams.get('s-highlight'));
    if (decoded.length === 0 || decoded.some((item) => !generated.refs[item.$ref])) return;

    setPath(decoded);
    // avoid re-triggering it again
    restored.add(rootId);
    if (!decoded.at(-1)!.highlighted) {
      document.getElementById(rootId)?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [rootId, generated.refs]);

  return (
    <SchemaUIContext
      value={useMemo(
        () => ({
          rootId,
          path,
          setPath,
          generated,
          open: (name, $ref) => setPath([...path, { name, $ref }]),
          back: (index) => setPath(path.slice(0, index + 1)),
        }),
        [rootId, path, generated],
      )}
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
 * The selected member of a union schema on the path item at `pathIndex`, `depth` for nested unions.
 */
export function useSchemaTabs(
  pathIndex: number,
  depth: number,
): [value: string | undefined, setValue: (value: string) => void] {
  const { path, setPath } = usePathState();

  return [
    // empty for unselected parents restored from the URL
    path[pathIndex].tabValues?.[depth] || undefined,
    (value) => {
      // selections of nested unions belong to the previous value
      const tabValues = path[pathIndex].tabValues?.slice(0, depth) ?? [];
      tabValues[depth] = value;
      setPath(path.with(pathIndex, { ...path[pathIndex], tabValues }));
    },
  ];
}

/**
 * Open state of the popover showing the schema `$ref` of the root property `pathName`.
 */
export function useSchemaPopover(
  pathName: string,
  $ref: string,
): { open: boolean; onOpenChange: (open: boolean) => void } {
  const { path, setPath } = usePathState();

  return {
    open: path.length > 1 && path[1].$ref === $ref && path[1].name === pathName && !path[0].closed,
    onOpenChange(open) {
      if (open) {
        setPath([
          { ...path[0], closed: false },
          { name: pathName, $ref },
        ]);
      } else {
        setPath(path.map((item, i) => (i === 0 ? { ...item, closed: true } : item)));
      }
    },
  };
}

/**
 * Whether the property `name` on the path item at `pathIndex` is highlighted by the link it was opened from.
 *
 * @returns the state and a ref to scroll the highlighted element into view
 */
export function useSchemaHighlight(
  pathIndex: number,
  name: string,
): [highlighted: boolean, ref: (element: HTMLElement | null) => void] {
  const { path } = usePathState();
  const item = path[pathIndex];
  const highlighted = item.highlighted === name;
  const ref = useCallback(
    (element: HTMLElement | null) => {
      if (!element || !highlighted) return;

      window.setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'end' });
        delete item.highlighted;
      }, 300);
    },
    [item, highlighted],
  );

  return [highlighted, ref];
}

/**
 * Copy the link to the property `name` of the current path.
 */
export function useCopySchemaLink(name: string) {
  const { path, rootId } = usePathState();

  return useCopyButton(() => {
    const url = new URL(window.location.href);
    url.hash = `#${rootId}`;
    url.searchParams.set('s-highlight', name);
    url.searchParams.set('path', encodePath(path));
    return navigator.clipboard.writeText(url.href);
  });
}

function encodePath(path: PathItemState[]): string {
  return path.map((item) => [item.name, item.$ref, ...(item.tabValues ?? [])].join('\0')).join('|');
}

function decodePath(path: string, highlighted: string | null): PathItemState[] {
  const out: PathItemState[] = [];
  for (const part of path.split('|')) {
    const [name, $ref, ...tabValues] = part.split('\0');
    out.push({ name, $ref, tabValues });
  }

  if (highlighted && out.length > 0) out[out.length - 1].highlighted = highlighted;
  return out;
}

const typeVariants = cva('text-sm text-start text-fd-muted-foreground font-mono', {
  variants: {
    variant: {
      trigger:
        'underline hover:text-fd-accent-foreground data-[popup-open]:text-fd-accent-foreground',
    },
  },
});

interface TypeInfoTriggerProps {
  pathName: string;
  $ref: string;
  children: ReactNode;
}

/** how a type opens its schema: a popover from the root, navigation inside the popover */
const TriggerContext = createContext<(props: TypeInfoTriggerProps) => ReactNode>((props) => (
  <RootTypeInfoTrigger {...props} />
));
const renderPopoverTrigger = (props: TypeInfoTriggerProps) => <PopoverTypeInfoTrigger {...props} />;

export interface SchemaUIProps {
  /** anchor ID of the root schema, links to a property are resolved against it */
  rootId: string;
  name: string;
  required?: boolean;
  as?: 'property' | 'body';

  generated: SchemaUIGeneratedData;
}

export function SchemaUI({
  rootId,
  name,
  required = false,
  as = 'property',
  generated,
}: SchemaUIProps) {
  return (
    <SchemaUIProvider rootId={rootId} name={name} generated={generated}>
      <SchemaUIContent name={name} required={required} as={as} />
    </SchemaUIProvider>
  );
}

function SchemaUIContent({
  name,
  required,
  as,
}: {
  name: string;
  required: boolean;
  as: 'property' | 'body';
}) {
  const { rootId, generated } = useSchemaUI();

  if (as === 'property' || generated.refs[generated.$root].type === 'primitive') {
    return (
      <ObjectProperty
        id={rootId}
        name={name}
        $type={generated.$root}
        parentPathIndex={0}
        required={required}
      />
    );
  }

  return (
    <div id={rootId}>
      <PathItemBody pathIndex={0} />
    </div>
  );
}

function RootTypeInfoTrigger({ pathName, $ref, children }: TypeInfoTriggerProps) {
  const { path, rootId } = useSchemaUI();
  const { open, onOpenChange } = useSchemaPopover(pathName, $ref);
  const popoverRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return;
      element.scrollTop = scrollTops.get(getScrollKey(rootId, path)) ?? 0;
      const current = parseFloat(element.style.getPropertyValue('--min-height') || '200px');
      element.style.setProperty('--min-height', Math.max(element.clientHeight + 2, current) + 'px');
    },
    [rootId, path],
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger className={cn(typeVariants({ variant: 'trigger' }))}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        ref={popoverRef}
        className="w-[600px] max-w-(--available-width) min-h-(--min-height,200px) fd-scroll-container max-h-[460px] px-3 pt-0"
        onScrollEnd={(e) => {
          // ensure popover scroll top is stable
          scrollTops.set(getScrollKey(rootId, path), (e.target as HTMLElement).scrollTop);
        }}
      >
        <SchemaUIPopover />
      </PopoverContent>
    </Popover>
  );
}

/** scroll positions of opened schemas, restored when navigating back */
const scrollTops = new Map<string, number>();

function getScrollKey(rootId: string, path: SchemaUIContextType['path']) {
  const last = path.at(-1)!;
  return `${rootId}\0${path.length}\0${last.name}\0${last.$ref}`;
}

function PopoverTypeInfoTrigger({ pathName, $ref, children }: TypeInfoTriggerProps) {
  const { open } = useSchemaUI();

  return (
    <button
      className={cn(typeVariants({ variant: 'trigger' }))}
      onClick={() => open(pathName, $ref)}
    >
      {children}
    </button>
  );
}

function SchemaDescription({ schema, ...props }: ComponentProps<'div'> & { schema: SchemaData }) {
  return (
    <div {...props} className={cn('prose-no-margin py-2 empty:hidden', props.className)}>
      {schema.description}
      {schema.infoTags && schema.infoTags.length > 0 && (
        <div className="flex flex-row gap-2 flex-wrap mt-2 empty:hidden">
          {schema.infoTags.map((tag, i) => (
            <Fragment key={i}>
              {'node' in tag ? (
                tag.node
              ) : 'list' in tag ? (
                <BlockTag label={tag.label}>
                  <ul>
                    {tag.list.map((item, i) => (
                      <li
                        key={i}
                        className="font-mono list-disc list-inside ps-1 marker:text-fd-muted-foreground"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </BlockTag>
              ) : tag.block ? (
                <BlockTag label={tag.label}>{tag.value}</BlockTag>
              ) : (
                <InlineTag label={tag.label}>{tag.value}</InlineTag>
              )}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

function ObjectProperty({
  name,
  $type,
  required,
  parentPathIndex,
  ...props
}: ComponentProps<'div'> & {
  name: string;
  $type: string;
  parentPathIndex: number;
  required?: boolean;
}) {
  const t = useTranslations({ note: 'schema UI' });
  const {
    generated: { refs },
  } = useSchemaUI();
  const schema = refs[$type];
  const [highlighted, ref] = useSchemaHighlight(parentPathIndex, name);
  const [isChecked, onClick] = useCopySchemaLink(name);

  return (
    <div
      {...props}
      ref={mergeRefs(props.ref, ref)}
      className={cn('text-sm border-t py-4 scroll-m-20 first:border-t-0', props.className)}
    >
      <div className="flex flex-wrap items-center gap-2 not-prose">
        <span className="font-medium font-mono">
          <span
            className={cn(
              highlighted
                ? 'bg-fd-primary text-fd-primary-foreground rounded-sm'
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
        </span>
        {schema.type === 'primitive' ? (
          <span className={cn(typeVariants())}>{schema.aliasName}</span>
        ) : (
          <TypeInfoTrigger pathName={name} $ref={$type}>
            {schema.aliasName}
          </TypeInfoTrigger>
        )}

        <div className="flex-1" />
        {schema.deprecated && (
          <span className="text-xs font-mono text-yellow-600 dark:text-yellow-400">
            {t('Deprecated')}
          </span>
        )}
        <button
          className={cn(
            buttonVariants({ size: 'icon-xs', variant: 'ghost' }),
            'text-fd-muted-foreground [&_svg]:size-3.5',
          )}
          onClick={onClick}
        >
          {isChecked ? <CheckIcon /> : <LinkIcon />}
        </button>
      </div>
      <SchemaDescription schema={schema} className="pb-0" />
    </div>
  );
}

function PathItemBody({
  pathIndex,
  asSchema,
  tabDepth = 0,
  objectSearchOverrides,
}: {
  pathIndex: number;
  asSchema?: SchemaData;
  tabDepth?: number;
  objectSearchOverrides?: Partial<ObjectSearchProps>;
}) {
  const {
    path,
    generated: { refs },
  } = useSchemaUI();
  const [selected, setSelected] = useSchemaTabs(pathIndex, tabDepth);
  const schema = asSchema ?? refs[path[pathIndex].$ref];

  if ((schema.type === 'or' || schema.type === 'and') && schema.items.length > 0) {
    const value = selected ?? schema.items[0].$type;
    const items = schema.items.map((item) => ({
      label: <code className="text-xs font-medium">{item.name}</code>,
      value: item.$type,
    }));
    return (
      <Select items={items} value={value} onValueChange={(v) => v && setSelected(v)}>
        <div className="flex flex-row my-2 gap-2 items-center">
          <SchemaDescription schema={schema} className="flex-1 py-0" />

          <SelectTrigger className="not-prose w-fit min-w-0 mb-auto *:min-w-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map(({ label, value }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </div>
        <PathItemBody asSchema={refs[value]} pathIndex={pathIndex} tabDepth={tabDepth + 1} />
      </Select>
    );
  }
  if (schema.type === 'object' && schema.props.length > 0) {
    return (
      <ObjectSearch pathIndex={pathIndex} schema={schema} {...objectSearchOverrides}>
        <SchemaDescription schema={schema} />
      </ObjectSearch>
    );
  }
  if (schema.type === 'array') {
    return (
      <>
        <SchemaDescription schema={schema} />
        <ObjectProperty
          name="[index: integer]"
          $type={schema.item.$type}
          parentPathIndex={pathIndex}
        />
      </>
    );
  }

  return <SchemaDescription schema={schema} />;
}

interface ObjectSearchProps {
  variant?: 'default' | 'in-popover';
  pathIndex: number;
  schema: Extract<SchemaData, { type: 'object' }>;
  children?: ReactNode;
}

function ObjectSearch({ variant = 'default', schema, pathIndex, children }: ObjectSearchProps) {
  const { open } = useSchemaUI();
  const [search, setSearch] = useState('');
  const deferredValue = useDeferredValue(search);
  const firstItemRef = useRef<SchemaDataObjectProperty>(null);
  const t = useTranslations({ note: 'schema UI' });

  return (
    <>
      <div
        className={cn(
          'flex items-center bg-fd-secondary text-fd-secondary-foreground transition-colors',
          variant === 'in-popover' &&
            'sticky top-10 -mx-3 ps-3 border-b focus-within:[&_svg]:text-fd-primary',
          variant === 'default' &&
            'border rounded-md ps-2 shadow-sm focus-within:ring-2 focus-within:ring-fd-ring',
        )}
      >
        <FilterIcon className="text-fd-muted-foreground size-3.5 transition-colors" />
        <input
          value={search}
          data-object-search-input=""
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('Filter Properties')}
          className="text-sm ps-2 py-2 flex-1 outline-none placeholder:text-fd-muted-foreground"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const item = firstItemRef.current;
              if (item) open(item.name, item.$type);
              e.preventDefault();
            }
          }}
        />
      </div>
      {children}
      <Suspense>
        <ObjectSearchContent
          search={deferredValue}
          properties={schema.props}
          firstItemRef={firstItemRef}
          empty={() => (
            <p className="text-fd-muted-foreground text-sm my-2!">
              {t('No property matching')}{' '}
              <span className="text-fd-foreground font-medium">{`"${deferredValue}"`}</span>
            </p>
          )}
          render={(item) => (
            <ObjectProperty
              key={item.name}
              name={item.name}
              $type={item.$type}
              required={item.required}
              parentPathIndex={pathIndex}
            />
          )}
        />
      </Suspense>
    </>
  );
}

function ObjectSearchContent({
  search: rawSearch,
  firstItemRef,
  properties,
  empty,
  render,
}: {
  search: string;
  firstItemRef: RefObject<SchemaDataObjectProperty | null>;
  properties: SchemaDataObjectProperty[];
  render: (item: SchemaDataObjectProperty) => ReactNode;
  empty: () => ReactNode;
}) {
  const filtered = useMemo(() => {
    const search = rawSearch.trim().toLowerCase();
    return search.length > 0
      ? properties.filter((prop) => prop.name.toLowerCase().includes(search))
      : properties;
  }, [properties, rawSearch]);

  firstItemRef.current = filtered[0] ?? null;

  if (filtered.length === 0) return empty();
  return filtered.map(render);
}

export function InlineTag({
  label,
  prose = false,
  children,
}: {
  label: ReactNode;
  prose?: boolean;
  children: ReactNode;
}) {
  if (prose) {
    return (
      <div className="inline-flex gap-2 bg-fd-secondary border rounded-lg text-xs p-1.5 shadow-md max-w-full">
        <span className="font-medium not-prose">{label}</span>
        <span className="min-w-0 flex-1 text-fd-muted-foreground prose-sm prose-no-margin">
          {children}
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex gap-2 bg-fd-secondary border rounded-lg text-xs p-1.5 shadow-md max-w-full not-prose">
      <span className="font-medium">{label}</span>
      <code className="min-w-0 flex-1 text-fd-muted-foreground wrap-break-word">{children}</code>
    </div>
  );
}

export function BlockTag({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col w-full gap-2 bg-fd-secondary border rounded-lg p-1.5 shadow-md not-prose">
      <p className="font-medium text-xs">{label}</p>
      {children}
    </div>
  );
}

function SchemaUIPopover() {
  const { path, back } = useSchemaUI();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current
      ?.querySelector<HTMLInputElement>('input[data-object-search-input]')
      ?.focus({ preventScroll: true });
  }, [path]);

  return (
    <TriggerContext value={renderPopoverTrigger}>
      <div ref={ref}>
        <div className="sticky top-0 -mx-3 flex overflow-x-auto overflow-y-hidden items-center text-sm font-medium font-mono bg-fd-secondary text-fd-secondary-foreground px-3 h-10 border-b z-20">
          {path.map((item, i) => {
            // ignore root
            if (i === 0) return;
            const isDuplicated = path.some((other, j) => j !== i && other.$ref === item.$ref);

            let text: string;
            const indexItemMatch = /^\[(\w+): (\w+)]$/.exec(item.name);
            if (indexItemMatch) {
              text = `[${indexItemMatch[1]}]`;
            } else if (i > 1) {
              text = `.${item.name}`;
            } else {
              text = item.name;
            }

            return (
              <button
                key={i}
                onClick={() => back(i)}
                className={cn(
                  'hover:underline hover:text-fd-accent-foreground',
                  isDuplicated && 'text-orange-400',
                )}
              >
                {text}
              </button>
            );
          })}
        </div>
        <PathItemBody
          pathIndex={path.length - 1}
          objectSearchOverrides={{
            variant: 'in-popover',
          }}
        />
      </div>
    </TriggerContext>
  );
}

function TypeInfoTrigger({ pathName, $ref, children }: TypeInfoTriggerProps) {
  const {
    generated: { refs },
  } = useSchemaUI();
  const renderTrigger = use(TriggerContext);
  const schema = refs[$ref];

  if (
    schema.type === 'primitive' &&
    !schema.description &&
    (!schema.infoTags || schema.infoTags.length === 0)
  ) {
    return <span className={cn(typeVariants())}>{children}</span>;
  }

  if (schema.type === 'and' || schema.type === 'or') {
    const sep = schema.type === 'and' ? '&' : '|';
    return (
      <span className={cn(typeVariants(), 'flex flex-row gap-2 items-center flex-wrap')}>
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
      <span className={cn(typeVariants(), 'flex flex-row items-center flex-wrap')}>
        {'array<'}
        <TypeInfoTrigger pathName={`${pathName}[]`} $ref={schema.item.$type}>
          {refs[schema.item.$type].aliasName}
        </TypeInfoTrigger>
        {'>'}
      </span>
    );
  }

  return renderTrigger({ pathName, $ref, children });
}
