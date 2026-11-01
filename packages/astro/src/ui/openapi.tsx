import type { ComponentType } from 'react';
import type { OpenAPIPageData } from 'fumadocs-openapi/server';
import { createOpenAPIPage, type OpenAPIPageProps } from 'fumadocs-openapi/ui';
import { components } from 'virtual:fumadocs/components';
import { getBase } from '../shared';
import { withContentProvider } from './provider';

type Schema = ReturnType<OpenAPIPageData['getSchema']>;

/** the props of `OpenAPIPage.astro`, besides `provider` */
export interface BodyProps {
  page: OpenAPIPageProps;
  /** the document left out of `page`, with `includeDocument: false` */
  schema?: Schema;
}

export function documentUrl(id: string) {
  return `${getBase()}/api/openapi/${id}`;
}

/** documents left out of page props, for server rendering */
export const documents: Map<string, Schema['bundled']> = new Map();

// `<OpenAPIPage />` of the MDX components replaces the default
export const APIPage = withContentProvider(
  (components.OpenAPIPage as ComponentType<OpenAPIPageProps> | undefined) ??
    createOpenAPIPage({
      async loadDocument(id) {
        if (import.meta.env.SSR) return documents.get(id)!;
        return (await fetch(documentUrl(id))).json();
      },
    }),
);
