'use client';
import type { PageOperationProps } from '@/operation';
import type { PageTypeProps } from '@/type-docs';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import {
  createPageComponents,
  defaultShikiOptions,
  type PageComponents,
  type ShikiOptions,
} from 'shared-api/components/defaults';
import type { GeneratedPageProps, GraphQLPageItem } from '@/utils/pages';
import { createContext, type FC, type ReactNode, use, useMemo } from 'react';
import type {
  DirectiveNode,
  GraphQLArgument,
  GraphQLDefaultInput,
  GraphQLField,
  GraphQLNamedType,
  GraphQLSchema,
  GraphQLType,
} from 'graphql';
import type { SchemaUIProps } from 'shared-api/components/schema';
import type { NamedTypeKind, OperationKind } from '@/utils/schema';
import type { PlaygroundRequest, PlaygroundResult } from '@/playground/fetcher';
import { buildSchemaFromSDL } from '@/utils/build-schema';

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
export interface GraphQLComponents extends PageComponents {
  SchemaUI: FC<SchemaViewProps>;
}

export interface GraphQLRuntimeOptions {
  /**
   * resolve the page URL of a named type, used for cross-linking type references.
   *
   * return `undefined` for types without their own page.
   */
  typeLinks?: (name: string) => string | undefined;
  /**
   * resolve the page URL of an operation, used for cross-linking operation references
   * (e.g. usage backlinks on type pages).
   *
   * return `undefined` for operations without their own page.
   */
  operationLinks?: (kind: OperationKind, name: string) => string | undefined;
}

/**
 * The schema and cross-links of the page, read from `useGraphQL()`.
 */
export interface GraphQLRuntime extends GraphQLRuntimeOptions {
  schema: GraphQLSchema;
  sdl: string;
  /**
   * pre-generated links of generated pages, see `baseUrl` in source options.
   */
  links?: GraphQLLinks;
}

export interface PageLayoutProps {
  items?: { item: GraphQLPageItem; children: ReactNode }[];
}

/**
 * The options the UI renders with, read from `useRenderContext()`.
 */
export interface GraphQLRenderOptions {
  /** the Shiki highlighter of code blocks */
  shiki?: ShikiFactory;
  shikiOptions?: ShikiOptions;
  /**
   * interactive playground, shown on operation pages when `url`, `fetcher` or `render` is provided.
   */
  playground?: {
    /**
     * the URL of GraphQL endpoint, operations are sent over HTTP POST.
     */
    url?: string;
    /**
     * allow users to edit the endpoint URL, it is rendered as plain text when disabled.
     *
     * @defaultValue true
     */
    allowUrlEdit?: boolean;
    /**
     * default headers of playground requests, used as the initial header rows
     * when the user has no stored headers for the endpoint origin.
     */
    headers?: Record<string, string>;
    /**
     * replace the default fetcher, e.g. to proxy requests.
     */
    fetcher?: (request: PlaygroundRequest, ctx: RenderContext) => Promise<PlaygroundResult>;
    /**
     * replace the playground UI, e.g. the one installed with Fumadocs CLI.
     */
    render?: (context: {
      kind: OperationKind;
      name: string;
      operation: GraphQLField<unknown, unknown>;
      ctx: RenderContext;
    }) => ReactNode;
  };
  content?: {
    renderPageLayout?: (slots: PageLayoutProps, ctx: RenderContext) => ReactNode;
    renderOperationLayout?: (
      slots: {
        header: ReactNode;
        description: ReactNode;
        deprecated: ReactNode;
        directives: ReactNode;
        playground: ReactNode;
        arguments: ReactNode;
        returns: ReactNode;
        example: ReactNode;
      },
      context: {
        operation: GraphQLField<unknown, unknown>;
        kind: OperationKind;
        ctx: RenderContext;
      },
    ) => ReactNode;
    renderTypeLayout?: (
      slots: {
        header: ReactNode;
        description: ReactNode;
        directives: ReactNode;
        relations: ReactNode;
        fields: ReactNode;
        values: ReactNode;
        scalar: ReactNode;
      },
      context: {
        type: GraphQLNamedType;
        kind: NamedTypeKind;
        ctx: RenderContext;
      },
    ) => ReactNode;
  };
  schemaUI?: {
    /**
     * wrap the Schema UI, `ctx.SchemaUI` renders the default one.
     */
    render?: (options: SchemaViewProps, ctx: RenderContext) => ReactNode;
  };
}

/**
 * The render options of the page with their defaults applied, read from `useRenderContext()`.
 */
export interface RenderContext extends GraphQLRenderOptions {
  shiki: ShikiFactory;
  shikiOptions: ShikiOptions;
  /** the Schema UI of the page */
  SchemaUI: FC<SchemaViewProps>;
}

export interface GraphQLProviderProps extends GraphQLRuntimeOptions, GraphQLRenderOptions {
  shiki: ShikiFactory;
  sdl: string;
  links?: GraphQLLinks;
  components: GraphQLComponents;
  children: ReactNode;
}

export interface CreateGraphQLRendererOptions extends GraphQLRuntimeOptions, GraphQLRenderOptions {
  components: Partial<PageComponents> & {
    SchemaUI: FC<SchemaViewProps>;
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

const GraphQLContext = createContext<GraphQLRuntime | null>(null);
const ComponentsContext = createContext<GraphQLComponents | null>(null);
const OptionsContext = createContext<RenderContext | null>(null);

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
 * The render options of the page, available under a page created with `createGraphQLRenderer()`.
 */
export function useRenderContext(): RenderContext {
  const ctx = use(OptionsContext);
  if (!ctx) throw new Error('Component must be used under <GraphQLProvider />');

  return ctx;
}

/**
 * Resolve the page URL of a named type, from `typeLinks` or the pre-generated links.
 */
export function useTypeLink(name: string): string | undefined {
  const { typeLinks, links } = useGraphQL();

  return typeLinks?.(name) ?? links?.types[name];
}

/**
 * Resolve the page URL of an operation, from `operationLinks` or the pre-generated links.
 */
export function useOperationLink(kind: OperationKind, name: string): string | undefined {
  const { operationLinks, links } = useGraphQL();

  return operationLinks?.(kind, name) ?? links?.operations[`${kind}:${name}`];
}

export function GraphQLProvider({
  sdl,
  links,
  typeLinks,
  operationLinks,
  shiki,
  shikiOptions = defaultShikiOptions,
  playground,
  content,
  schemaUI,
  components,
  children,
}: GraphQLProviderProps) {
  const schema = useMemo(() => buildSchemaFromSDL(sdl), [sdl]);
  const runtime = useMemo<GraphQLRuntime>(
    () => ({ schema, sdl, links, typeLinks, operationLinks }),
    [schema, sdl, links, typeLinks, operationLinks],
  );
  const { SchemaUI } = components;
  const render = useMemo<RenderContext>(
    () => ({ shiki, shikiOptions, playground, content, schemaUI, SchemaUI }),
    [shiki, shikiOptions, playground, content, schemaUI, SchemaUI],
  );

  return (
    <GraphQLContext value={runtime}>
      <ComponentsContext value={components}>
        <OptionsContext value={render}>{children}</OptionsContext>
      </ComponentsContext>
    </GraphQLContext>
  );
}

/**
 * Create `<GraphQLPage />` from your own UI, it takes the props of generated pages.
 *
 * Code blocks are highlighted with the full Shiki bundle, pass `shiki` to trim it.
 */
export function createGraphQLRenderer({
  components,
  shiki = defaultShikiFactory,
  ...options
}: CreateGraphQLRendererOptions): FC<GraphQLPageProps> {
  const { Operation, TypeDocs, Layout = DefaultLayout } = components;
  const slots: GraphQLComponents = {
    SchemaUI: components.SchemaUI,
    // fills the Markdown, code block and heading slots the page didn't replace
    ...createPageComponents({ ...options, shiki, components }),
  };

  function Content({ items, showTitle, showDescription }: GraphQLPageProps) {
    const ctx = useRenderContext();
    const layout: PageLayoutProps = {
      items: items?.map((item) => ({
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
      })),
    };

    if (ctx.content?.renderPageLayout) return ctx.content.renderPageLayout(layout, ctx);
    return <Layout {...layout} />;
  }

  return function GraphQLPage(props) {
    return (
      <GraphQLProvider
        {...options}
        shiki={shiki}
        sdl={props.payload.sdl}
        links={props.payload.links}
        components={slots}
      >
        <Content {...props} />
      </GraphQLProvider>
    );
  };
}

function DefaultLayout({ items }: PageLayoutProps) {
  return <>{items?.map((item) => item.children)}</>;
}
