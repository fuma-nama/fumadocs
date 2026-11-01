import type { ComponentType } from 'react';
import type { AsyncAPIPageData } from '@fumadocs/asyncapi/server';
import { createAsyncAPIPage, type AsyncAPIPageProps } from '@fumadocs/asyncapi/ui';
import { components } from 'virtual:fumadocs/components';
import { getBase } from '../shared';
import { withContentProvider } from './provider';

type Schema = ReturnType<AsyncAPIPageData['getSchema']>;

/** the props of `AsyncAPIPage.astro`, besides `provider` */
export interface BodyProps {
  page: AsyncAPIPageProps;
  /** the document left out of `page`, with `includeDocument: false` */
  schema?: Schema;
}

export function documentUrl(id: string) {
  return `${getBase()}/api/asyncapi/${id}`;
}

/** documents left out of page props, for server rendering */
export const documents: Map<string, Schema['bundled']> = new Map();

// `<AsyncAPIPage />` of the MDX components replaces the default
export const APIPage = withContentProvider(
  (components.AsyncAPIPage as ComponentType<AsyncAPIPageProps> | undefined) ??
    createAsyncAPIPage({
      async loadDocument(id) {
        if (import.meta.env.SSR) return documents.get(id)!;
        return (await fetch(documentUrl(id))).json();
      },
    }),
);
