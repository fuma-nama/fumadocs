import { getCollection } from 'astro:content';
import { loader } from 'fumadocs-core/source';
import { uiTranslations } from 'fumadocs-ui/i18n';
import { zhTW } from '@fumadocs/language/zh-tw';
import { toFumadocsSource } from '@fumadocs/astro/source';
import { defineConfig } from '@fumadocs/astro/config';
import { i18n } from './lib/i18n';

export const source = loader({
  source: toFumadocsSource(await getCollection('docs'), await getCollection('meta')),
  baseUrl: '/docs',
  i18n,
});

export default defineConfig({
  source,
  title: 'Fumadocs on Astro',
  translations: i18n.translations().extend(uiTranslations()).preset('cn', zhTW()),
});
