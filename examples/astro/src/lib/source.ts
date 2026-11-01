import { getCollection } from 'astro:content';
import { loader, multiple } from 'fumadocs-core/source';
import { toFumadocsSource } from '@fumadocs/astro/source';
import { openapi } from './openapi';
import { docsRoute } from './shared';

export const source = loader({
  source: multiple({
    docs: toFumadocsSource(await getCollection('docs'), await getCollection('meta')),
    api: await openapi.staticSource({ baseDir: 'api' }),
  }),
  baseUrl: docsRoute,
  plugins: [openapi.loaderPlugin()],
});
