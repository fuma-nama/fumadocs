import type { OpenAPIServer } from '@/server';
import * as base from './base';
import { configDefault } from 'fumadocs-core/highlight';
import { getTypescriptSchema } from '@/utils/get-typescript-schema';
import { ApiPageProps } from './api-page';
import { ShikiConfigProvider } from './full.client';

export type CreateAPIPageOptions = Partial<base.CreateAPIPageOptions>;

export function createAPIPage(server: OpenAPIServer, options: CreateAPIPageOptions = {}) {
  const APIPage = base.createAPIPage(server, {
    ...options,
    shiki: configDefault,
    generateTypeScriptSchema(method, statusCode, contentType, ctx) {
      const schema = method.responses?.[statusCode]?.content?.[contentType];
      if (!schema) return;
      return getTypescriptSchema(schema, ctx);
    },
  });

  return function APIPageFull(props: ApiPageProps) {
    return (
      <ShikiConfigProvider>
        <APIPage {...props} />
      </ShikiConfigProvider>
    );
  };
}
