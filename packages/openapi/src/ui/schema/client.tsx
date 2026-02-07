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
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'fumadocs-ui/components/tabs';
import type { InfoTag, SchemaUIGeneratedData } from '@/ui/schema';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'fumadocs-ui/components/ui/collapsible';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { ChevronDown } from 'lucide-react';
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
}: {
  name: ReactNode;
  $type: string;
  variant?: 'default' | 'expand';
  overrides?: Partial<PropertyProps>;
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
              className="py-0"
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
      return schema.props.map((prop) => (
        <SchemaUIProperty
          key={prop.name}
          name={prop.name}
          $type={prop.$type}
          overrides={{ required: prop.required }}
        />
      ));
    type = renderRef({
      pathName: name,
      $ref: $type,
    });
  } else if (schema.type === 'array') {
    if (variant === 'expand')
      return (
        <Collapsible className="my-2">
          <CollapsibleTrigger
            className={cn(
              buttonVariants({ color: 'secondary', size: 'sm' }),
              'group px-3 py-2 data-[state=open]:rounded-b-none',
            )}
          >
            Array Item
            <ChevronDown className="size-4 text-fd-muted-foreground group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="-mt-px bg-fd-card px-3 rounded-lg rounded-tl-none border shadow-sm">
            <SchemaUIProperty name="" $type={schema.item.$type} variant="expand" />
          </CollapsibleContent>
        </Collapsible>
      );

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
          {schema.infoTags.map((tag) => (
            <InfoTag key={tag.label} tag={tag} />
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

function SchemaUIPopover({ initialPath }: { initialPath: { name: ReactNode; $ref?: string }[] }) {
  const [path, setPath] = useState(initialPath);
  const ref = useRef<HTMLDivElement>(null);
  const last = path.findLast((item) => item.$ref !== undefined);

  useEffect(() => {
    const element = ref.current;
    if (!element || !element.parentElement) return;

    // reset scroll
    element.parentElement.scrollTop = 0;
  }, [last?.$ref]);

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

  if (!last) return;

  return (
    <>
      <div className="sticky top-0 flex flex-row flex-wrap items-center text-sm font-medium font-mono bg-fd-muted p-2">
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
        <div ref={ref} className="px-2">
          <SchemaUIProperty name="" $type={last.$ref!} variant="expand" />
        </div>
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
  const ref = useCallback((element: HTMLDivElement | null) => {
    if (!element || element.style.getPropertyValue('--initial-height')) return;

    element.style.setProperty('--initial-height', `${element.clientHeight}px`);
  }, []);

  return (
    <Popover>
      <PopoverTrigger className={cn(typeVariants({ variant: 'trigger' }))}>
        {children}
      </PopoverTrigger>
      <PopoverContent ref={ref} className="w-[600px] min-h-(--initial-height,0) max-h-[460px] p-0">
        <SchemaUIPopover
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
            Deprecated
          </Badge>
        )}
      </div>
      <div className="prose-no-margin pt-2.5 empty:hidden">{props.children}</div>
    </div>
  );
}
