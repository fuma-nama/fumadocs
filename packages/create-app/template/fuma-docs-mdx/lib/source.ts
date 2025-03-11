import { docs } from '@/.source';
import { loader } from 'fumadocs-core/source';

export const source = loader({
  // `loader()` also assign an url to your pages
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});
