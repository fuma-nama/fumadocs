import { localHtml } from '@fumadocs/local-html';
import { watchWithDevServer } from '@fumadocs/local-html/dev/ws';
import { dynamicLoader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';

const pages = localHtml({
  dir: 'content/pages',
  // an exported document repeats its title in the content, but `<DocsTitle />` already renders it
  exclude: ['h1'],
});

// keeps the loader in sync with `local-html dev`, see the `dev` script
if (process.env.NODE_ENV === 'development') {
  void watchWithDevServer(pages);
}

// See https://fumadocs.dev/docs/headless/source-api for more info
export const pagesLoader = dynamicLoader(pages.dynamicSource(), {
  baseUrl: '/docs',
  // turns the `fumadocs:icon` meta of a page into a Lucide icon
  plugins: [lucideIconsPlugin()],
});

export function getSource() {
  return pagesLoader.get();
}
