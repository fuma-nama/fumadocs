import { uiTranslations } from 'fumadocs-ui/i18n';
import { zhTW } from '@fumadocs/language/zh-tw';
import { defineConfig } from '@fumadocs/astro/config';
import { i18n } from './lib/i18n';
import { source } from './lib/source';

export default defineConfig({
  source,
  title: 'Fumadocs on Astro',
  translations: i18n.translations().extend(uiTranslations()).preset('cn', zhTW()),
});
