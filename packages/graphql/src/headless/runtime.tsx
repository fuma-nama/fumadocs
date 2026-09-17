'use client';
import { type ComponentProps, createContext, type FC, type ReactNode, use, useMemo } from 'react';
import type {
  DirectiveNode,
  GraphQLArgument,
  GraphQLDefaultInput,
  GraphQLSchema,
  GraphQLType,
} from 'graphql';
import type { DynamicCodeblockProps } from 'fumadocs-ui/components/dynamic-codeblock.core';
import type { SchemaUIProps } from '@fumadocs/api-docs/components/schema';
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
