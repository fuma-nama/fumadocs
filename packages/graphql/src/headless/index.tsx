'use client';
import type { FC, ReactNode } from 'react';
import type { GeneratedPageProps, GraphQLPageItem } from '@/utils/pages';
import type { OperationKind } from '@/utils/schema';
import {
  type GraphQLComponents,
  type GraphQLLinks,
  GraphQLProvider,
  type GraphQLProviderProps,
} from './runtime';

export * from './runtime';
export * from './operation';
export * from './type-docs';
export * from '@/utils/snippets';
export { syncOperationVariables, type OperationExample } from '@/utils/example';

/** props of the component rendering an operation of a page */
export interface PageOperationProps {
  kind: OperationKind;
  name: string;
  showTitle?: boolean;
  showDescription?: boolean;
}

/** props of the component rendering a named type of a page */
export interface PageTypeProps {
  name: string;
  showTitle?: boolean;
  showDescription?: boolean;
}

export interface PageLayoutProps {
  items?: { item: GraphQLPageItem; children: ReactNode }[];
}

export interface CreateGraphQLPageOptions extends Omit<
  GraphQLProviderProps,
  'sdl' | 'links' | 'components' | 'children'
> {
  components: GraphQLComponents & {
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
  ...options
}: CreateGraphQLPageOptions): FC<GraphQLPageProps> {
  const { Operation, TypeDocs, Layout = DefaultLayout } = components;

  return function GraphQLPage({ payload, items, showTitle, showDescription }) {
    return (
      <GraphQLProvider {...options} sdl={payload.sdl} links={payload.links} components={components}>
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
