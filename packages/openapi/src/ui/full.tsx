import type { OpenAPIServer } from '@/server';
import * as base from './base';
import type { ApiPageProps } from './api-page';
import { defaultShikiFactory } from 'fumadocs-core/highlight/shiki/full';
import { FullProvider } from './full.client';

export type CreateAPIPageOptions = Partial<base.CreateAPIPageOptions>;

export function createAPIPage(server: OpenAPIServer, options: CreateAPIPageOptions = {}) {
  const APIPage = base.createAPIPage(server, {
    shiki: defaultShikiFactory,
    shikiOptions: { themes: { light: 'github-light', dark: 'github-dark' } },
    async generateTypeScriptDefinitions(schema, ctx) {
      if (typeof schema !== 'object') return;
      const { compile } = await import('@fumari/json-schema-ts');

      try {
        return compile(schema, {
          name: 'Response',
          readOnly: ctx.readOnly,
          writeOnly: ctx.writeOnly,
          getSchemaId: ctx.schema.getRawRef,
        });
      } catch (e) {
        console.warn('Failed to generate typescript schema:', e);
      }
    },
    ...options,
  });

  return function APIPageFull(props: ApiPageProps) {
    return (
      <FullProvider>
        <APIPage {...props} />
      </FullProvider>
    );
  };
}
