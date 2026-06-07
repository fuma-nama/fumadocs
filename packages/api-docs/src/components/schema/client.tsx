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
import type {
  InfoTag,
  SchemaData,
  SchemaDataObjectProperty,
  SchemaUIGeneratedData,
} from '@/components/schema';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { CheckIcon, FilterIcon, LinkIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from 'fumadocs-ui/components/ui/popover';
import { cn } from '@/utils/cn';
import { cva } from 'class-variance-authority';
import { useAnchorId } from '@/auto-anchor/client';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { mergeRefs } from '@/utils/merge-refs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';

interface PathItemType {
  name: string;
  $ref: string;
  scrollTop?: number;
  /** property name of highlighted field, only applicable for objects */
  highlighted?: string;
  tabValues?: string[];
  /** popover state, only applicable for root */
  closed?: boolean;
}

interface StateContextType {
  rootId: string;
  /** the first tiem will always be the root item */
  path: PathItemType[];
  setPath: (path: PathItemType[]) => void;
  generated: SchemaUIGeneratedData;
  renderTypeInfoTrigger: (props: {
    pathName: string;
    $ref: string;
    children: ReactNode;
  }) => ReactNode;
}

const typeVariants = cva('text-sm text-start text-fd-muted-foreground font-mono', {
  variants: {
    variant: {
      trigger:
        'underline hover:text-fd-accent-foreground data-[state=open]:text-fd-accent-foreground',
    },
  },
});

const Context = createContext<StateContextType | null>(null);

function useStates() {
  return use(Context)!;
}

export interface SchemaUIProps {
  name: string;
  required?: boolean;
  as?: 'property' | 'body';

  generated: SchemaUIGeneratedData;
}

export function SchemaUI({ name, required = false, as = 'property', generated }: SchemaUIProps) {
  const rootId = useAnchorId([name]);
  const [path, setPath] = useState<PathItemType[]>(() => [{ $ref: generated.$root, name }]);
  const ref = useRef<HTMLDivElement>(null);
  const popoverRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return;
      element.scrollTop = path.at(-1)!.scrollTop ?? 0;
      const current = parseFloat(element.style.getPropertyValue('--min-height') || '200px');
      element.style.setProperty('--min-height', Math.max(element.clientHeight + 2, current) + 'px');
    },
    [path],
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    const param = url.searchParams.get('path');
    if (url.hash !== `#${rootId}` || !param) return;

    const decoded = decodePath(param, url.searchParams.get('s-highlight'));
    if (!decoded || decoded.length === 0 || decoded.some((item) => !generated.refs[item.$ref]))
      return;

    setPath(decoded);
    if (!decoded.at(-1)!.highlighted) {
      ref.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [rootId, generated.refs]);

  return (
    <Context
      value={useMemo(
        () => ({
          rootId,
          path,
          generated,
          setPath,
          renderTypeInfoTrigger: ({ $ref, children, pathName }) => (
            <Popover
              open={
                path.length > 1 &&
                path[1].$ref === $ref &&
                path[1].name === pathName &&
                !path[0].closed
              }
              onOpenChange={(v) => {
                if (v) {
                  setPath([
                    { ...path[0], closed: false },
                    { name: pathName, $ref },
                  ]);
                } else {
                  setPath(path.map((item, i) => (i === 0 ? { ...item, closed: true } : item)));
                }
              }}
            >
              <PopoverTrigger className={cn(typeVariants({ variant: 'trigger' }))}>
                {children}
              </PopoverTrigger>
              <PopoverContent
                ref={popoverRef}
                collisionPadding={10}
                className="w-[600px] max-w-(--radix-popover-content-available-width) min-h-(--min-height,200px) fd-scroll-container max-h-[460px] px-3 pt-0"
                onScrollEnd={(e) => {
                  // ensure popover scroll top is stable
                  path.at(-1)!.scrollTop = (e.target as HTMLElement).scrollTop;
                }}
                onOpenAutoFocus={(e) => {
                  const element = e.target as HTMLElement;
                  const input = element.querySelector('input[data-object-search-input]');
                  if (!(input instanceof HTMLInputElement)) return;
                  input.focus({ preventScroll: true });
                  e.preventDefault();
                }}
              >
                <SchemaUIPopover />
              </PopoverContent>
            </Popover>
          ),
        }),
        [generated, path, rootId, popoverRef],
      )}
    >
      {as === 'property' || generated.refs[generated.$root].type === 'primitive' ? (
        <ObjectProperty
          ref={ref}
          id={rootId}
          name={name}
          $type={generated.$root}
          parentPathIndex={0}
          required={required}
        />
      ) : (
        <div id={rootId} ref={ref}>
          <PathItemBody pathIndex={0} />
        </div>
      )}
    </Context>
  );
}

function SchemaDescription({ schema, ...props }: ComponentProps<'div'> & { schema: SchemaData }) {
  return (
    <div {...props} className={cn('prose-no-margin py-4 empty:hidden', props.className)}>
      {schema.description}
      {schema.infoTags && schema.infoTags.length > 0 && (
        <div className="flex flex-row gap-2 flex-wrap mt-2 not-prose empty:hidden">
          {schema.infoTags.map((tag, i) => (
            <InfoTag key={i} tag={tag} />
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
    path,
    generated: { refs },
    rootId,
  } = useStates();
  const schema = refs[$type];
  const parentItem = path[parentPathIndex];
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element || parentItem.highlighted !== name) return;

      window.setTimeout(() => {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
        delete parentItem.highlighted;
      }, 300);
    },
    [parentItem, name],
  );
  const [isChecked, onClick] = useCopyButton(() => {
    const url = new URL(window.location.href);
    url.hash = `#${rootId}`;
    url.searchParams.set('s-highlight', name);
    url.searchParams.set('path', encodePath(path));
    return navigator.clipboard.writeText(url.href);
  });

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
              parentItem.highlighted === name
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
    setPath,
    generated: { refs },
  } = useStates();
  const schema = asSchema ?? refs[path[pathIndex].$ref];

  if ((schema.type === 'or' || schema.type === 'and') && schema.items.length > 0) {
    const value = path[pathIndex].tabValues?.[tabDepth] ?? schema.items[0].$type;
    const items = schema.items.map((item) => ({
      label: <code className="text-xs font-medium">{item.name}</code>,
      value: item.$type,
    }));
    return (
      <Select
        value={value}
        onValueChange={(v) => {
          const next = [...path];
          (next[pathIndex].tabValues ??= []).splice(tabDepth, 1, v);
          setPath(next);
        }}
      >
        <div className="flex flex-row my-2 gap-2 items-center">
          <SchemaDescription schema={schema} className="flex-1 py-0" />

          <SelectTrigger className="not-prose w-fit min-w-0 mb-auto *:min-w-0">
            <SelectValue>{items.find((item) => item.value === value)?.label}</SelectValue>
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
  const { path, setPath } = useStates();
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
              if (item) setPath([...path, { name: item.name, $ref: item.$type }]);
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
            <p className="text-fd-muted-foreground text-sm mt-2! mb-0!">
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

function InfoTag({ tag }: { tag: InfoTag }) {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <button
      className="inline-flex text-start items-start gap-2 bg-fd-secondary border rounded-lg text-xs p-1.5 shadow-md max-w-full"
      onClick={() => setOpen((prev) => !prev)}
    >
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
    </button>
  );
}

function SchemaUIPopover() {
  const states = useStates();
  const { path, setPath } = states;

  return (
    <Context
      value={useMemo(
        () => ({
          ...states,
          renderTypeInfoTrigger: ({ $ref, pathName, children }) => (
            <button
              className={cn(typeVariants({ variant: 'trigger' }))}
              onClick={() => setPath([...path, { name: pathName, $ref }])}
            >
              {children}
            </button>
          ),
        }),
        [states, setPath, path],
      )}
    >
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
              onClick={() => setPath(path.slice(0, i + 1))}
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
    </Context>
  );
}

function TypeInfoTrigger({
  pathName,
  $ref,
  children,
}: {
  pathName: string;
  $ref: string;
  children: ReactNode;
}) {
  const {
    generated: { refs },
    renderTypeInfoTrigger,
  } = useStates();
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

  return renderTypeInfoTrigger({ $ref, pathName, children });
}

function encodePath(path: PathItemType[]): string {
  return path.map((item) => [item.name, item.$ref, ...(item.tabValues ?? [])].join('\0')).join('|');
}

function decodePath(path: string, highlighted: string | null): PathItemType[] | null {
  const out: PathItemType[] = [];
  for (const part of path.split('|')) {
    const [name, $ref, ...tabValues] = part.split('\0');
    out.push({ name, $ref, tabValues });
  }

  if (highlighted && out.length > 0) out[out.length - 1].highlighted = highlighted;
  return out;
}
