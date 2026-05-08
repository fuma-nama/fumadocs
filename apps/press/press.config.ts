import { coreI18n, defineConfig, type I18nConfig } from '@fumapress/core';
import { llmsPlugin } from '@fumapress/core/plugins/llms.txt';
import { takumiPlugin } from '@fumapress/core/plugins/takumi';
import { loader } from 'fumadocs-core/source';
import { docs } from './.source/server';
import { lucideIconsPlugin } from 'fumadocs-core/source/plugins/lucide-icons';
import { fumadocsMdx } from '@fumapress/core/adapters/mdx';
import { flexsearchPlugin } from '@fumapress/core/plugins/flexsearch';

const i18n: I18nConfig = {
  defaultLanguage: 'en',
  languages: {
    en: {
      displayName: 'English',
    },
    cn: {
      displayName: 'Chinese',
    },
  },
};

export default defineConfig({
  loader: loader(docs.toFumadocsSource(), {
    baseUrl: '/',
    plugins: [lucideIconsPlugin()],
    i18n: coreI18n(i18n),
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
  i18n,
});
