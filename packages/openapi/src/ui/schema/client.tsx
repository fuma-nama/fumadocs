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
  InfoTag,
  SchemaData,
  SchemaDataObjectProperty,
  SchemaUIGeneratedData,
} from '@/ui/schema';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'fumadocs-ui/components/ui/collapsible';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { ChevronDown, FilterIcon } from 'lucide-react';
import { Badge } from '@/ui/components/method-label';
import { Popover, PopoverContent, PopoverTrigger } from 'fumadocs-ui/components/ui/popover';
import { cn } from '@/utils/cn';
import { cva } from 'class-variance-authority';

type DataContextType = SchemaUIGeneratedData;

interface PopoverContextType {
  renderTrigger: (props: { pathName: ReactNode; $ref: string; children: ReactNode }) => ReactNode;
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

  generated: SchemaUIGeneratedData;
}

export function SchemaUI({ name, required = false, as = 'property', generated }: SchemaUIProps) {
  return (
    <DataContext value={generated}>
      <SchemaUIProperty
        name={name}
        $type={generated.$root}
        overrides={{
          required,
        }}
        variant={
          as === 'property' || generated.refs[generated.$root].type === 'primitive'
            ? 'default'
            : 'expand'
        }
      />
    </DataContext>
  );
}

function SchemaUIProperty({
  name,
  $type,
  variant = 'default',
  overrides,
  objectSearchOverrides,
}: {
  name: ReactNode;
  $type: string;
  variant?: 'default' | 'expand';
  overrides?: Partial<PropertyProps>;
  objectSearchOverrides?: Partial<ObjectSearchProps>;
}) {
  const { refs } = useData();
  const schema = refs[$type];
  const renderRef = useRenderRef();
  let type: ReactNode = schema.typeName;

  if ((schema.type === 'or' || schema.type === 'and') && schema.items.length > 0) {
    if (variant === 'expand')
      return (
        <Tabs defaultValue={schema.items[0].$type}>
          <TabsList>
            {schema.items.map((item) => (
              <TabsTrigger key={item.$type} value={item.$type}>
                {item.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {schema.items.map((item) => (
            <TabsContent
              key={item.$type}
              value={item.$type}
              forceMount={undefined}
              className="pt-2 pb-0"
            >
              <SchemaUIProperty {...item} variant="expand" />
            </TabsContent>
          ))}
        </Tabs>
      );
    type = renderRef({
      pathName: name,
      $ref: $type,
    });
  } else if (schema.type === 'object' && schema.props.length > 0) {
    if (variant === 'expand')
      return <ObjectSearch properties={schema.props} {...objectSearchOverrides} />;

    type = renderRef({
      pathName: name,
      $ref: $type,
    });
  } else if (schema.type === 'array') {
    if (variant === 'expand') return <ArrayItemCollapsible schema={schema} />;

    type = renderRef({
      pathName: name,
      $ref: $type,
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
    <Property name={name} type={type} deprecated={schema.deprecated} {...overrides}>
      {child}
    </Property>
  );
}

function ArrayItemCollapsible({ schema }: { schema: Extract<SchemaData, { type: 'array' }> }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations();

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
        <SchemaUIProperty name="" $type={schema.item.$type} variant="expand" />
      </CollapsibleContent>
    </Collapsible>
  );
}

interface ObjectSearchProps {
  properties: SchemaDataObjectProperty[];
  container?: ComponentProps<'div'>;
  open?: (item: SchemaDataObjectProperty) => void;
}

function ObjectSearch({ properties, container, open }: ObjectSearchProps) {
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
}: {
  search: string;
  firstItemRef: RefObject<SchemaDataObjectProperty | null>;
  properties: SchemaDataObjectProperty[];
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

  return filtered.map((prop) => (
    <SchemaUIProperty
      key={prop.name}
      name={prop.name}
      $type={prop.$type}
      overrides={{ required: prop.required }}
    />
  ));
}

function InfoTag({ tag }: { tag: InfoTag }) {
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
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  initialPath: PathItemType[];
}) {
  const [path, setPath] = useState(initialPath);

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

  const currentRef = path.findLast((item) => item.$ref !== undefined);

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
  }: {
    pathName: ReactNode;
    $ref: string;
    text?: ReactNode;
  }) {
    const schema = refs[$ref];

    if (schema.type === 'and' || schema.type === 'or') {
      const sep = schema.type === 'and' ? '&' : '|';
      return (
        <span className={cn(typeVariants(), 'flex flex-row gap-2 items-center flex-wrap')}>
          {schema.items.map((item, i) => (
            <Fragment key={item.$type}>
              {i > 0 && <span>{sep}</span>}
              {renderRef({ pathName, text: item.name, $ref: item.$type })}
            </Fragment>
          ))}
        </span>
      );
    }

    if (schema.type === 'array') {
      return (
        <span className={cn(typeVariants(), 'flex flex-row items-center flex-wrap')}>
          {'array<'}
          {renderRef({ pathName: <>{pathName}[]</>, $ref: schema.item.$type })}
          {'>'}
        </span>
      );
    }

    return renderTrigger({ $ref, pathName, children: text ?? schema.aliasName });
  };
}

function RootPopoverTrigger({
  $ref,
  pathName,
  children,
}: {
  pathName: ReactNode;
  $ref: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const refCallback = useCallback((element: HTMLDivElement | null) => {
    ref.current = element;
    if (!element || element.style.getPropertyValue('--initial-height')) return;

    element.style.setProperty('--initial-height', `${element.clientHeight + 2}px`);
  }, []);

  return (
    <Popover>
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
          initialPath={[
            {
              name: pathName,
              $ref: $ref,
            },
          ]}
        />
      </PopoverContent>
    </Popover>
  );
}

interface PropertyProps {
  name: ReactNode;
  type: ReactNode;
  required?: boolean;
  deprecated?: boolean;
  nested?: boolean;

  children?: ReactNode;
  className?: string;
}

function Property({
  name,
  type,
  required,
  deprecated,
  nested = false,
  className,
  ...props
}: PropertyProps) {
  const t = useTranslations();
  return (
    <div
      className={cn(
        'text-sm border-t',
        nested
          ? 'p-3 border-x bg-fd-card last:rounded-b-xl first:rounded-tr-xl last:border-b'
          : 'py-4 first:border-t-0',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3 not-prose">
        <span className="font-medium font-mono text-fd-primary">
          {name}
          {required ? (
            <span className="text-red-400">*</span>
          ) : (
            <span className="text-fd-muted-foreground">?</span>
          )}
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
