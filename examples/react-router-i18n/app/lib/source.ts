import { loader } from 'fumadocs-core/source';
import { docs } from '#/collections/server.ts';
import { i18n } from '#/lib/i18n.ts';

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: '/docs',
  i18n,
});
