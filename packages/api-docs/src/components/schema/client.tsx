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
import { CheckIcon, FilterIcon, LinkIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { cn } from '@/utils/cn';
import { cva } from 'class-variance-authority';
import { mergeRefs } from '@/utils/merge-refs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';
import {
  type SchemaData,
  type SchemaDataObjectProperty,
  type SchemaUIContextType,
  type SchemaUIGeneratedData,
  SchemaUIProvider,
  useCopySchemaLink,
  useSchemaHighlight,
  useSchemaPopover,
  useSchemaTabs,
  useSchemaUI,
} from './headless';

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
  name: string;
  required?: boolean;
  as?: 'property' | 'body';

  generated: SchemaUIGeneratedData;
}

export function SchemaUI({ name, required = false, as = 'property', generated }: SchemaUIProps) {
  return (
    <SchemaUIProvider name={name} generated={generated}>
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
