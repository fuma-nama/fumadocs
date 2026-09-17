'use client';
import type { FC, ReactNode } from 'react';
import type { GraphQLField, GraphQLNamedType } from 'graphql';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import type { ShikiFactory } from 'fumadocs-core/highlight/shiki';
import type { BundledTheme, CodeOptionsThemes, CodeToHastOptionsCommon } from 'shiki';
import type { RenderContext } from '@/types';
import type { PlaygroundRequest, PlaygroundResult } from '@/playground/fetcher';
import type { GraphQLPageItem } from '@/utils/pages';
import type { GraphQLLinks, GraphQLPageProps } from '@/headless';
import type { NamedTypeKind, OperationKind } from '@/utils/schema';
import type { GraphQLComponents, SchemaViewProps } from '@/headless';
import type { OperationProps } from './operation';
import type { TypeDocsProps } from './type-docs';
import { createGraphQLPageBase } from './base';

export type { GraphQLLinks, GraphQLPageProps, OperationProps, TypeDocsProps };

export interface CreateGraphQLPageOptions {
  shiki?: ShikiFactory;
  shikiOptions?: Omit<CodeToHastOptionsCommon, 'lang'> & CodeOptionsThemes<BundledTheme>;
  /**
   * resolve the URL of the docs page of a named type, used for cross-linking type references.
   *
   * return `undefined` for types without their own page.
   */
  typeLinks?: (name: string, ctx: RenderContext) => string | undefined;
  /**
   * resolve the URL of the docs page of an operation, used for cross-linking operation references
   * (e.g. usage backlinks on type pages).
   *
   * return `undefined` for operations without their own page.
   */
  operationLinks?: (kind: OperationKind, name: string, ctx: RenderContext) => string | undefined;
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
    renderPageLayout?: (
      slots: {
        items?: {
          item: GraphQLPageItem;
          children: ReactNode;
        }[];
      },
      ctx: RenderContext,
    ) => ReactNode;
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
  components?: Partial<Omit<GraphQLComponents, 'SchemaUI'>> & {
    /**
     * Replace the Schema UI, e.g. the one installed with Fumadocs CLI.
     */
    SchemaUI?: FC<SchemaViewProps>;
    /**
     * Replace the UI of operations, e.g. the one installed with Fumadocs CLI.
     */
    Operation?: FC<OperationProps>;
    /**
     * Replace the UI of named types, e.g. the one installed with Fumadocs CLI.
     */
    TypeDocs?: FC<TypeDocsProps>;
  };
}

/**
 * Create `<GraphQLPage />` (a client component).
 */
export function createGraphQLPage(options: CreateGraphQLPageOptions = {}): FC<GraphQLPageProps> {
  return createGraphQLPageBase({
    ...options,
    shiki: options.shiki ?? defaultShikiFactory,
  });
}
