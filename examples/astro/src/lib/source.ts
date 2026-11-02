import { getCollection } from 'astro:content';
import { loader } from 'fumadocs-core/source';
import { toFumadocsSource } from '@fumadocs/astro/source';
import { openapi } from './openapi';
import { docsRoute } from './shared';

export const source = loader({
  source: {
    docs: toFumadocsSource(await getCollection('docs'), await getCollection('meta')),
    api: await openapi.staticSource({ baseDir: 'api' }),
  },
  baseUrl: docsRoute,
  plugins: [openapi.loaderPlugin()],
});
