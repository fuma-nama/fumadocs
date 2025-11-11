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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from 'fumadocs-ui/components/tabs';
import type { SchemaData, SchemaUIGeneratedData } from '@/ui/schema';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'fumadocs-ui/components/ui/collapsible';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/ui/components/method-label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'fumadocs-ui/components/ui/popover';
import { cn } from 'fumadocs-ui/utils/cn';
import { cva } from 'class-variance-authority';

interface DataContextType extends SchemaUIGeneratedData {
  readOnly?: boolean;
  writeOnly?: boolean;
}

interface PropertyContextType {
  renderRef: (options: RenderRefOptions) => ReactNode;
}

interface RenderRefOptions {
  text: ReactNode;
  pathName: ReactNode;
  $ref: string;
}

const typeVariants = cva('text-sm text-fd-muted-foreground font-mono', {
  variants: {
    variant: {
      trigger:
        'underline hover:text-fd-accent-foreground data-[state=open]:text-fd-accent-foreground',
    },
  },
});

const PropertyContext = createContext<PropertyContextType>({
  renderRef: (props) => <RootRef {...props} />,
});

const DataContext = createContext<DataContextType | null>(null);

function useData() {
  return use(DataContext)!;
}

function useProperty() {
  return use(PropertyContext);
}

export interface SchemaUIProps {
  name: string;
  required?: boolean;
  as?: 'property' | 'body';

  readOnly?: boolean;
  writeOnly?: boolean;
  generated: SchemaUIGeneratedData;
}

export function SchemaUI({
  name,
  required = false,
  as = 'property',
  generated,
  readOnly,
  writeOnly,
}: SchemaUIProps) {
  const schema = generated.refs[generated.$root];
  const context: DataContextType = useMemo(
    () => ({
      ...generated,
      readOnly,
      writeOnly,
    }),
    [generated, readOnly, writeOnly],
  );
  const isProperty = as === 'property' || !isExpandable(schema);

  return (
    <DataContext value={context}>
      {isProperty ? (
        <SchemaUIProperty
          name={name}
          $type={generated.$root}
          overrides={{
            required,
          }}
        />
      ) : (
        <SchemaUIContent $type={generated.$root} />
      )}
    </DataContext>
  );
}

function SchemaUIContent({ $type }: { $type: string }) {
  const { refs, readOnly, writeOnly } = useData();
  const schema = refs[$type];

  if ((schema.readOnly && !readOnly) || (schema.writeOnly && !writeOnly))
    return;

  let child: ReactNode = null;

  if (schema.type === 'or' && schema.items.length > 0) {
    child = (
      <>
        {child}
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
              <SchemaUIContent {...item} />
            </TabsContent>
          ))}
        </Tabs>
      </>
    );
  }

  if (schema.type === 'object' && schema.props.length > 0) {
    child = (
      <>
        {child}
        {schema.props.map((prop) => (
          <SchemaUIProperty
            key={prop.name}
            name={prop.name}
            $type={prop.$type}
            overrides={{ required: prop.required }}
          />
        ))}
      </>
    );
  }

  if (schema.type === 'array') {
    child = (
      <>
        {child}
        <ObjectCollapsible name="Array item">
          <SchemaUIContent $type={schema.item.$type} />
        </ObjectCollapsible>
      </>
    );
  }

  return child;
}

function SchemaUIProperty({
  name,
  $type,
  overrides,
}: {
  name: ReactNode;
  $type: string;
  overrides?: Partial<PropertyProps>;
}) {
  const { renderRef } = useProperty();
  const { refs, readOnly, writeOnly } = useData();
  const schema = refs[$type];

  if ((schema.readOnly && !readOnly) || (schema.writeOnly && !writeOnly))
    return;

  let type: ReactNode = schema.typeName;
  if (schema.type === 'or' && schema.items.length > 0) {
    type = (
      <span className={cn(typeVariants(), 'flex flex-row gap-2 items-center')}>
        {schema.items.map((item, i) => (
          <Fragment key={item.$type}>
            {i > 0 && <span>|</span>}
            {renderRef({
              pathName: name,
              text: item.name,
              $ref: item.$type,
            })}
          </Fragment>
        ))}
      </span>
    );
  }

  if (schema.type === 'object' && schema.props.length > 0) {
    type = renderRef({
      text: schema.aliasName,
      pathName: name,
      $ref: $type,
    });
  }

  if (schema.type === 'array') {
    type = renderRef({
      text: schema.aliasName,
      pathName: <>{name}[]</>,
      $ref: schema.item.$type,
    });
  }

  return (
    <Property
      name={name}
      type={type}
      deprecated={schema.deprecated}
      {...overrides}
    >
      {schema.description}
      {schema.infoTags && schema.infoTags.length > 0 && (
        <div className="flex flex-row gap-2 flex-wrap my-2 not-prose empty:hidden">
          {schema.infoTags.map((tag, i) => (
            <Fragment key={i}>{tag}</Fragment>
          ))}
        </div>
      )}
    </Property>
  );
}

function SchemaUIPopover({
  initialPath,
}: {
  initialPath: { name: ReactNode; $ref?: string }[];
}) {
  const [path, setPath] = useState(initialPath);
  const ref = useRef<HTMLDivElement>(null);
  const last = path.findLast((item) => item.$ref !== undefined);

  useEffect(() => {
    const element = ref.current;
    if (!element || !element.parentElement) return;

    // reset scroll
    element.parentElement.scrollTop = 0;
  }, [last?.$ref]);

  const context: PropertyContextType = useMemo(
    () => ({
      renderRef: (props) => (
        <LinkRef
          {...props}
          onInsert={(name, $ref) => {
            setPath((path) => [...path, { name, $ref }]);
          }}
        />
      ),
    }),
    [],
  );

  if (!last) return;

  return (
    <>
      <div className="sticky top-0 flex flex-row flex-wrap items-center text-sm font-medium font-mono bg-fd-muted p-2">
        {path.map((item, i) => {
          const isDuplicated = path.some(
            (other, j) => j < i && other.$ref === item.$ref,
          );
          const className = cn(
            isDuplicated && 'text-orange-400',
            item.$ref && 'hover:underline hover:text-fd-accent-foreground',
          );

          const node = item.$ref ? (
            <button
              onClick={() => setPath((path) => path.slice(0, i + 1))}
              className={className}
            >
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
      <PropertyContext value={context}>
        <div ref={ref} className="px-2">
          <SchemaUIContent $type={last.$ref!} />
        </div>
      </PropertyContext>
    </>
  );
}

function RootRef({ text, $ref, pathName }: RenderRefOptions) {
  const { refs } = useData();
  const ref = useCallback((element: HTMLDivElement | null) => {
    if (!element || element.style.getPropertyValue('--initial-height')) return;

    element.style.setProperty('--initial-height', `${element.clientHeight}px`);
  }, []);

  if (!isExpandable(refs[$ref])) {
    return <span className={cn(typeVariants())}>{text}</span>;
  }

  return (
    <Popover>
      <PopoverTrigger className={cn(typeVariants({ variant: 'trigger' }))}>
        {text}
      </PopoverTrigger>
      <PopoverContent
        ref={ref}
        className="w-[600px] min-h-(--initial-height,0) max-h-[460px] p-0"
      >
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

function LinkRef({
  $ref,
  pathName,
  onInsert,
  text,
}: RenderRefOptions & {
  onInsert: (name: ReactNode, $ref: string) => void;
}) {
  const { refs } = useData();
  if (!isExpandable(refs[$ref])) {
    return <span className={cn(typeVariants())}>{text}</span>;
  }

  return (
    <button
      className={cn(typeVariants({ variant: 'trigger' }))}
      onClick={() => {
        onInsert(pathName, $ref);
      }}
    >
      {text}
    </button>
  );
}

function ObjectCollapsible(props: { name: string; children: ReactNode }) {
  return (
    <Collapsible className="my-2" {...props}>
      <CollapsibleTrigger
        className={cn(
          buttonVariants({ color: 'secondary', size: 'sm' }),
          'group px-3 py-2 data-[state=open]:rounded-b-none',
        )}
      >
        {props.name}
        <ChevronDown className="size-4 text-fd-muted-foreground group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="-mt-px *:bg-fd-card">
        {props.children}
      </CollapsibleContent>
    </Collapsible>
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
  ...props
}: PropertyProps) {
  return (
    <div
      className={cn(
        'text-sm border-t',
        nested
          ? 'p-3 border-x bg-fd-card last:rounded-b-xl first:rounded-tr-xl last:border-b'
          : 'py-4 first:border-t-0',
        props.className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3 not-prose">
        <span className="font-medium font-mono text-fd-primary">
          {name}
          {required === false && (
            <span className="text-fd-muted-foreground">?</span>
          )}
        </span>
        {typeof type === 'string' ? (
          <span className="text-sm font-mono text-fd-muted-foreground">
            {type}
          </span>
        ) : (
          type
        )}
        {deprecated && (
          <Badge color="yellow" className="ms-auto text-xs">
            Deprecated
          </Badge>
        )}
      </div>
      <div className="prose-no-margin pt-2.5 empty:hidden">
        {props.children}
      </div>
    </div>
  );
}

function isExpandable(schema: SchemaData) {
  return schema.type !== 'primitive';
}
