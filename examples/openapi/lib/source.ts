import { loader } from 'fumadocs-core/source';
import { openapiPlugin, openapiSource } from 'fumadocs-openapi/server';
import { docs } from 'collections/server';
import { openapi } from './openapi';

export const source = loader(
  {
    docs: docs.toFumadocsSource(),
    openapi: await openapiSource(openapi, {
      groupBy: 'tag',
    }),
  },
  {
    baseUrl: '/docs',
    plugins: [openapiPlugin()],
  },
);
