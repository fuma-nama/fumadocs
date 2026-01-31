import type { OpenAPIServer } from '@/server';
import * as base from './base';
import { withJSEngine } from 'fumadocs-core/highlight/full/config';
import { getTypescriptSchema } from '@/utils/get-typescript-schema';
import { ApiPageProps } from './api-page';
import { ShikiConfigProvider } from './full.client';

export type CreateAPIPageOptions = Partial<base.CreateAPIPageOptions>;

export function createAPIPage(server: OpenAPIServer, options: CreateAPIPageOptions = {}) {
  const APIPage = base.createAPIPage(server, {
    ...options,
    shiki: withJSEngine,
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
