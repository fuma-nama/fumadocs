'use client';
import type { PageOperationProps } from '@/operation';
import type { PageTypeProps } from '@/type-docs';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import {
  createPageComponents,
  type CreatePageComponentsOptions as PageComponentsOptions,
} from 'shared-api/components/defaults';
import type { GeneratedPageProps, GraphQLPageItem } from '@/utils/pages';
import { type ComponentProps, createContext, type FC, type ReactNode, use, useMemo } from 'react';
import type {
  DirectiveNode,
  GraphQLArgument,
  GraphQLDefaultInput,
  GraphQLSchema,
  GraphQLType,
} from 'graphql';
import type { DynamicCodeblockProps } from 'fumadocs-ui/components/dynamic-codeblock.core';
import type { SchemaUIProps } from 'shared-api/components/schema';
import type { OperationKind } from '@/utils/schema';
import { buildSchemaFromSDL } from '@/utils/build-schema';

export type CodeBlockProps = Omit<DynamicCodeblockProps, 'highlighter' | 'options'>;

/**
 * pre-generated links of generated pages, see `baseUrl` in source options.
 */
export interface GraphQLLinks {
  /**
   * type name -> page URL
   */
  types: Record<string, string>;
  /**
   * `${kind}:${name}` of operation -> page URL
   */
  operations: Record<string, string>;
}

/**
 * a field-like root to render: a plain type, an argument, or a field.
 */
export interface SchemaViewRoot {
  type: GraphQLType;
  description?: string | null;
  deprecationReason?: string | null;
  args?: readonly GraphQLArgument[];
  default?: GraphQLDefaultInput;
  astNode?: { readonly directives?: readonly DirectiveNode[] } | null;
}

export interface SchemaViewProps {
  client: Omit<SchemaUIProps, 'generated'>;
  root: SchemaViewRoot;
}

/** components the UI renders through, so a page can replace them */
export interface GraphQLComponents {
  SchemaUI: FC<SchemaViewProps>;
  Markdown: FC<{ md: string }>;
  CodeBlock: FC<CodeBlockProps>;
  Heading: FC<ComponentProps<'h1'> & { id: string; depth: number }>;
}

export interface GraphQLRuntime {
  schema: GraphQLSchema;
  sdl: string;
  /**
   * pre-generated links of generated pages, see `baseUrl` in source options.
   */
  links?: GraphQLLinks;
  /**
   * resolve the page URL of a named type, used for cross-linking type references.
   *
   * return `undefined` for types without their own page.
   */
  typeLinks?: (name: string, runtime: GraphQLRuntime) => string | undefined;
  /**
   * resolve the page URL of an operation, used for cross-linking operation references.
   *
   * return `undefined` for operations without their own page.
   */
  operationLinks?: (
    kind: OperationKind,
    name: string,
    runtime: GraphQLRuntime,
  ) => string | undefined;
}

export interface GraphQLProviderProps extends Omit<GraphQLRuntime, 'schema'> {
  components: GraphQLComponents;
  children: ReactNode;
}

const GraphQLContext = createContext<GraphQLRuntime | null>(null);
const ComponentsContext = createContext<GraphQLComponents | null>(null);

/**
 * The runtime of a GraphQL page: the schema and its cross-links.
 */
export function useGraphQL(): GraphQLRuntime {
  const ctx = use(GraphQLContext);
  if (!ctx) throw new Error('Component must be used under <GraphQLProvider />');

  return ctx;
}

export function useComponents(): GraphQLComponents {
  const components = use(ComponentsContext);
  if (!components) throw new Error('Component must be used under <GraphQLProvider />');

  return components;
}

/**
 * Resolve the page URL of a named type, from `typeLinks` or the pre-generated links.
 */
export function useTypeLink(name: string): string | undefined {
  const runtime = useGraphQL();

  return runtime.typeLinks?.(name, runtime) ?? runtime.links?.types[name];
}

/**
 * Resolve the page URL of an operation, from `operationLinks` or the pre-generated links.
 */
export function useOperationLink(kind: OperationKind, name: string): string | undefined {
  const runtime = useGraphQL();

  return (
    runtime.operationLinks?.(kind, name, runtime) ?? runtime.links?.operations[`${kind}:${name}`]
  );
}

export function GraphQLProvider({
  sdl,
  links,
  typeLinks,
  operationLinks,
  components,
  children,
}: GraphQLProviderProps) {
  const schema = useMemo(() => buildSchemaFromSDL(sdl), [sdl]);
  const runtime = useMemo<GraphQLRuntime>(
    () => ({ schema, sdl, links, typeLinks, operationLinks }),
    [schema, sdl, links, typeLinks, operationLinks],
  );

  return (
    <GraphQLContext value={runtime}>
      <ComponentsContext value={components}>{children}</ComponentsContext>
    </GraphQLContext>
  );
}

// the playground form model: GraphQL input types as JSON Schema
export { inputTypeToJsonSchema } from '@/playground/json-schema';
export * from '@/utils/snippets';
export type { OperationExample } from '@/utils/example';

export interface PageLayoutProps {
  items?: { item: GraphQLPageItem; children: ReactNode }[];
}

export interface CreateGraphQLPageOptions extends Omit<
  GraphQLProviderProps,
  'sdl' | 'links' | 'components' | 'children'
> {
  /** the Shiki highlighter of code blocks, the full bundle by default */
  shiki?: ShikiFactory;
  shikiOptions?: PageComponentsOptions['shikiOptions'];
  components: Pick<GraphQLComponents, 'SchemaUI'> &
    Partial<Omit<GraphQLComponents, 'SchemaUI'>> & {
      /** renders an operation of the page */
      Operation: FC<PageOperationProps>;
      /** renders a named type of the page */
      TypeDocs: FC<PageTypeProps>;
      /** wraps the rendered items */
      Layout?: FC<PageLayoutProps>;
    };
}

export type GraphQLPageProps = GeneratedPageProps & {
  payload: {
    links?: GraphQLLinks;
    sdl: string;
  };
};

/**
 * Create `<GraphQLPage />` from your own UI, it takes the props of generated pages.
 */
export function createGraphQLPage({
  components,
  shiki = defaultShikiFactory,
  shikiOptions,
  ...options
}: CreateGraphQLPageOptions): FC<GraphQLPageProps> {
  const { Operation, TypeDocs, Layout = DefaultLayout } = components;
  const slots: GraphQLComponents = {
    SchemaUI: components.SchemaUI,
    // fills the Markdown, code block and heading slots the page didn't replace
    ...createPageComponents({ shiki, shikiOptions, components }).components,
  };

  return function GraphQLPage({ payload, items, showTitle, showDescription }) {
    return (
      <GraphQLProvider {...options} sdl={payload.sdl} links={payload.links} components={slots}>
        <Layout
          items={items?.map((item) => ({
            item,
            children:
              item.type === 'operation' ? (
                <Operation
                  key={`${item.kind}:${item.name}`}
                  kind={item.kind}
                  name={item.name}
                  showTitle={showTitle}
                  showDescription={showDescription}
                />
              ) : (
                <TypeDocs
                  key={`type:${item.name}`}
                  name={item.name}
                  showTitle={showTitle}
                  showDescription={showDescription}
                />
              ),
          }))}
        />
      </GraphQLProvider>
    );
  };
}

function DefaultLayout({ items }: PageLayoutProps) {
  return <>{items?.map((item) => item.children)}</>;
}
