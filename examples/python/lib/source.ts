import { docs } from 'fumadocs-mdx:collections/server';
import { loader } from 'fumadocs-core/source';

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  // it assigns a URL to your pages
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});
