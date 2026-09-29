'use client';
import type { FC } from 'react';
import {
  createGraphQLRenderer,
  type CreateGraphQLRendererOptions,
  type GraphQLLinks,
  type GraphQLPageProps,
  type GraphQLRenderOptions,
  type GraphQLRuntimeOptions,
  type PageLayoutProps,
} from '@/utils/create-page';
import { Operation } from '@/ui/operation';
import { TypeDocs } from '@/ui/type-docs';
import { GraphQLSchemaView } from '@/ui/schema-ui';
import type { PageOperationProps } from '@/operation';
import type { PageTypeProps } from '@/type-docs';

export type {
  GraphQLLinks,
  GraphQLPageProps,
  PageOperationProps as OperationProps,
  PageTypeProps as TypeDocsProps,
};

export interface CreateGraphQLPageOptions extends GraphQLRuntimeOptions, GraphQLRenderOptions {
  /**
   * Replace parts of the UI, e.g. the ones installed with Fumadocs CLI.
   */
  components?: Partial<CreateGraphQLRendererOptions['components']>;
}

/**
 * Create `<GraphQLPage />` (a client component).
 */
export function createGraphQLPage(options: CreateGraphQLPageOptions = {}): FC<GraphQLPageProps> {
  return createGraphQLRenderer({
    ...options,
    components: { SchemaUI: GraphQLSchemaView, Operation, TypeDocs, Layout, ...options.components },
  });
}

function Layout({ items }: PageLayoutProps) {
  return (
    <div className="flex flex-col gap-24 text-sm @container">
      {items?.map((item) => item.children)}
    </div>
  );
}
