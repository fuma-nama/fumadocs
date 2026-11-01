import type { ComponentType } from 'react';
import type { Document } from 'fumadocs-openapi';
import { createOpenAPIPage, type OpenAPIPageProps } from 'fumadocs-openapi/ui';
import { components } from 'virtual:fumadocs/components';
import { ContentProvider, type ProviderData } from './provider';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function documentUrl(id: string) {
  return `${base}/api/openapi/${id}`;
}

/** documents left out of page props, for server rendering */
export const documents = new Map<string, Document>();

// `<OpenAPIPage />` of the MDX components replaces the default
const OpenAPIPage =
  (components.OpenAPIPage as ComponentType<OpenAPIPageProps> | undefined) ??
  createOpenAPIPage({
    async loadDocument(id) {
      if (import.meta.env.SSR) return documents.get(id)!;
      return (await fetch(documentUrl(id))).json();
    },
  });

export function APIPage({ page, provider }: { page: OpenAPIPageProps; provider: ProviderData }) {
  return (
    <ContentProvider provider={provider}>
      <OpenAPIPage {...page} />
    </ContentProvider>
  );
}
