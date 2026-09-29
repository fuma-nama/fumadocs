import { llms, loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { docs } from './collections';
import { docsRoute } from './shared';
import { openapi } from './openapi';

// server-only: `staticSource()` reads files, client code imports `docs` from `./collections`
export const source = loader(
  {
    docs: docs.toFumadocsSource(),
    openapi: await openapi.staticSource({
      baseDir: 'openapi',
    }),
  },
  {
    baseUrl: docsRoute,
    plugins: [lucideIconsPlugin(), openapi.loaderPlugin()],
  },
);

export const docsLlms = llms(source, {
  renderPage: async (page) => {
    if (page.type === 'openapi') return JSON.stringify(page.data.getSchema(), null, 2);

    return `# ${page.data.title} (${page.url})

${await page.data.getText('processed')}`;
  },
});
