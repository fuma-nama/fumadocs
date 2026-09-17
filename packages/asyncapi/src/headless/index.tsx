'use client';
import type { FC, ReactNode } from 'react';
import type { AsyncAPIObject } from '@/types';
import type { GeneratedPageProps, OperationItem } from '@/utils/pages/builder';
import {
  type AsyncAPIComponents,
  AsyncAPIProvider,
  type AsyncAPIProviderProps,
  type PageOperationProps,
} from './runtime';

export * from './runtime';
export * from './operation';
export { useServer, type SelectedServer } from './server';

export interface PageLayoutProps {
  operations?: { item: OperationItem; children: ReactNode }[];
}

export interface CreateAsyncAPIPageOptions extends Omit<
  AsyncAPIProviderProps,
  'document' | 'components' | 'children'
> {
  components: AsyncAPIComponents & {
    /** renders an operation of the page */
    Operation: FC<PageOperationProps>;
    /** wraps the rendered operations */
    Layout?: FC<PageLayoutProps>;
  };
}

export type AsyncAPIPageProps = AsyncAPIPageProps_Spec | AsyncAPIPageProps_Preloaded;

export type AsyncAPIPageProps_Spec = Omit<GeneratedPageProps, 'document'> & {
  payload: {
    bundled: AsyncAPIObject;
  };
};

export type AsyncAPIPageProps_Preloaded = GeneratedPageProps & {
  preloaded: {
    docs: Record<string, AsyncAPIObject>;
    proxyUrl?: string;
  };
};

/**
 * Create `<AsyncAPIPage />` from your own UI, it takes the props of generated pages.
 */
export function createAsyncAPIPage({
  components,
  ...options
}: CreateAsyncAPIPageOptions): FC<AsyncAPIPageProps> {
  const { Operation, Layout = DefaultLayout } = components;

  function Content({ showTitle, showDescription, operations }: AsyncAPIPageProps) {
    return (
      <Layout
        operations={operations?.map((item) => ({
          item,
          children: (
            <Operation
              key={`${item.id}:${item.action}`}
              id={item.id}
              action={item.action}
              showTitle={showTitle}
              showDescription={showDescription}
            />
          ),
        }))}
      />
    );
  }

  return function AsyncAPIPage(props) {
    let document: AsyncAPIObject;
    if ('preloaded' in props) {
      document = props.preloaded.docs[props.document];
      if (!document)
        throw new Error(
          `[Fumadocs AsyncAPI] the document ${props.document} is not preloaded, make sure to pass the "preloaded" prop to <AsyncAPIPage />`,
        );
    } else {
      document = props.payload.bundled;
    }

    return (
      <AsyncAPIProvider {...options} document={document} components={components}>
        <Content {...props} />
      </AsyncAPIProvider>
    );
  };
}

function DefaultLayout({ operations }: PageLayoutProps) {
  return <>{operations?.map((item) => item.children)}</>;
}
