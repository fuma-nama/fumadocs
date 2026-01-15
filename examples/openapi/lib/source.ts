import { loader, multiple } from 'fumadocs-core/source';
import { openapiPlugin, openapiSource } from 'fumadocs-openapi/server';
import { docs } from 'fumadocs-mdx:collections/server';
import { openapi } from './openapi';

export const source = loader(
  multiple({
    docs: docs.toFumadocsSource(),
    openapi: await openapiSource(openapi, {
      groupBy: 'tag',
    }),
  }),
  {
    baseUrl: '/docs',
    plugins: [openapiPlugin()],
  },
);
