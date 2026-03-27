import type { OpenAPIServer } from '@/server';
import * as base from './base';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import { FullProvider } from './client/full';

export type CreateAPIPageOptions = Partial<base.CreateAPIPageOptions>;

export function createAPIPage(server: OpenAPIServer, options: CreateAPIPageOptions = {}) {
  const APIPage = base.createAPIPage(server, {
    shiki: defaultShikiFactory,
    shikiOptions: { themes: { light: 'github-light', dark: 'github-dark' } },
    ...options,
  });

  return function APIPageFull(props: base.ServerApiPageProps) {
    return (
      <FullProvider>
        <APIPage {...props} />
      </FullProvider>
    );
  };
}

export type { ApiPageProps, OperationItem, WebhookItem } from './api-page';
