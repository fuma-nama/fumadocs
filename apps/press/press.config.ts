import { defineConfig } from 'fumapress';
import { llmsPlugin } from 'fumapress/plugins/llms.txt';
import { takumiPlugin } from 'fumapress/plugins/takumi';
import { loader } from 'fumadocs-core/source';
import { docs } from './.source/server';
import { lucideIconsPlugin } from 'fumadocs-core/source/plugins/lucide-icons';
import { fumadocsMdx } from 'fumapress/adapters/mdx';
import { flexsearchPlugin } from 'fumapress/plugins/flexsearch';

export default defineConfig({
  loader: loader(docs.toFumadocsSource(), {
    baseUrl: '/',
    plugins: [lucideIconsPlugin()],
  }),
  site: {
    name: 'Fumapress',
    git: {
      user: 'fuma-nama',
      branch: 'dev',
      repo: 'fumadocs',
    },
  },
  plugins: [flexsearchPlugin(), llmsPlugin(), takumiPlugin()],
  adapters: [fumadocsMdx()],
});
