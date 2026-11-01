import { defineConfig } from '@fumadocs/astro/config';
import { openapiPlugin } from '@fumadocs/astro/plugins/openapi';
import { takumiPlugin } from '@fumadocs/astro/plugins/takumi';
import { source } from './lib/source';
import { appName } from './lib/shared';
import Head from './components/Head.astro';

export default defineConfig({
  source,
  title: appName,
  head: Head,
  plugins: [openapiPlugin(), takumiPlugin()],
});
