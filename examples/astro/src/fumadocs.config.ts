import { defineConfig } from '@fumadocs/astro/config';
import { gitPlugin } from '@fumadocs/astro/plugins/git';
import { openapiPlugin } from '@fumadocs/astro/plugins/openapi';
import { takumiPlugin } from '@fumadocs/astro/plugins/takumi';
import { source } from './lib/source';
import { openapi } from './lib/openapi';
import { appName, gitConfig } from './lib/shared';
import Head from './components/Head.astro';

export default defineConfig({
  source,
  title: appName,
  head: Head,
  plugins: [openapiPlugin({ server: openapi }), takumiPlugin(), gitPlugin(gitConfig)],
});
