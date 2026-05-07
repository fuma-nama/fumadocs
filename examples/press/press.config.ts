import { defineConfig } from '@fumapress/core';
import { llmsPlugin } from '@fumapress/core/plugins/llms.txt';
import { takumiPlugin } from '@fumapress/core/plugins/takumi';
import { oramaSearchPlugin } from '@fumapress/core/plugins/orama-search';
import { loader } from 'fumadocs-core/source';
import { docs } from './.source/server';
import { lucideIconsPlugin } from 'fumadocs-core/source/plugins/lucide-icons';

export default defineConfig({
  loader: loader(docs.toFumadocsSource(), {
    baseUrl: '/',
    plugins: [lucideIconsPlugin()],
  }),
  site: {
    name: 'Example Site',
    git: {
      user: 'fuma-nama',
      branch: 'main',
      repo: 'fumadocs',
    },
  },
  plugins: [oramaSearchPlugin(), llmsPlugin(), takumiPlugin()],
});
