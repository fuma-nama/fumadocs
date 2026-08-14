import { localHtml } from '@fumadocs/local-html';
import { dynamicLoader } from 'fumadocs-core/source/dynamic';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';

// parsed files are cached until invalidated, so editing a `.html` file during development
// needs a restart — call `pages.invalidateFile(path)` from your own watcher to avoid that
const pages = localHtml({
  dir: 'content/pages',
  // an exported document repeats its title in the content, but `<DocsTitle />` already renders it
  exclude: ['h1'],
});

// See https://fumadocs.dev/docs/headless/source-api for more info
export const pagesLoader = dynamicLoader(pages.dynamicSource(), {
  baseUrl: '/docs',
  // turns the `fumadocs:icon` meta of a page into a Lucide icon
  plugins: [lucideIconsPlugin()],
});

export function getSource() {
  return pagesLoader.get();
}
