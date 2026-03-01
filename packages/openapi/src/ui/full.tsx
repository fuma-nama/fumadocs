import type { OpenAPIServer } from '@/server';
import * as base from './base';
import { configDefault } from 'fumadocs-core/highlight';
import { ApiPageProps } from './api-page';
import { ShikiConfigProvider } from './full.client';

export type CreateAPIPageOptions = Partial<base.CreateAPIPageOptions>;

export function createAPIPage(server: OpenAPIServer, options: CreateAPIPageOptions = {}) {
  const APIPage = base.createAPIPage(server, {
    shiki: configDefault,
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
      <ShikiConfigProvider>
        <APIPage {...props} />
      </ShikiConfigProvider>
    );
  };
}
