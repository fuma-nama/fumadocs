import { ogImagePlugin } from '@/plugins/og-image';
import { i18nPlugin } from '@/plugins/i18n';
import { openapiPlugin } from '@/plugins/openapi';
import { type Plugin } from '@/commands/init';

export const plugins: Record<string, Plugin> = {
  'og-image': ogImagePlugin,
  i18n: i18nPlugin,
  openapi: openapiPlugin,
};
