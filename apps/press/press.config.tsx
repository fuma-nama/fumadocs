import { defineConfig } from 'fumapress';
import { llmsPlugin } from 'fumapress/plugins/llms.txt';
import { takumiPlugin } from 'fumapress/plugins/takumi';
import { loader } from 'fumadocs-core/source';
import { docs } from './.source/server';
import { lucideIconsPlugin } from 'fumadocs-core/source/plugins/lucide-icons';
import { fumadocsMdx } from 'fumapress/adapters/mdx';
import { flexsearchPlugin } from 'fumapress/plugins/flexsearch';

export default defineConfig({
  mode: 'static',
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
  meta: {
    root() {
      return (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link
            href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&family=Geist:wght@100..900&display=swap"
            rel="stylesheet"
          />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link
            href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&family=Geist:wght@100..900&display=swap"
            rel="stylesheet"
          />
        </>
      );
    },
  },
  plugins: [flexsearchPlugin(), llmsPlugin(), takumiPlugin()],
  adapters: [fumadocsMdx()],
});
