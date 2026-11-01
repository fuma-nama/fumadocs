import type { ComponentType } from 'react';
import type { AsyncAPI } from '@fumadocs/asyncapi';
import { createAsyncAPIPage, type AsyncAPIPageProps } from '@fumadocs/asyncapi/ui';
import { components } from 'virtual:fumadocs/components';
import { ContentProvider, type ProviderData } from './provider';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function documentUrl(id: string) {
  return `${base}/api/asyncapi/${id}`;
}

/** documents left out of page props, for server rendering */
export const documents = new Map<string, AsyncAPI.AsyncAPIObject>();

// `<AsyncAPIPage />` of the MDX components replaces the default
const AsyncAPIPage =
  (components.AsyncAPIPage as ComponentType<AsyncAPIPageProps> | undefined) ??
  createAsyncAPIPage({
    async loadDocument(id) {
      if (import.meta.env.SSR) return documents.get(id)!;
      return (await fetch(documentUrl(id))).json();
    },
  });

export function APIPage({ page, provider }: { page: AsyncAPIPageProps; provider: ProviderData }) {
  return (
    <ContentProvider provider={provider}>
      <AsyncAPIPage {...page} />
    </ContentProvider>
  );
}
