import {
  type AdvancedIndex,
  createSearchAPI,
} from 'fumadocs-core/search/server';
import * as fs from 'node:fs/promises';
import { getPages } from '@/app/docs/utils';
import { parseFrontmatter } from '@fumadocs/mdx-remote';
import { structure } from 'fumadocs-core/mdx-plugins';

export const { GET } = createSearchAPI('advanced', {
  indexes: async () => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'Firing the `/api/search` route handler will trigger all Markdown files to be parsed into build indexes, it may be slow.',
      );
    }
    const pages = await getPages();

    return Promise.all(
      pages.map(async (page) => {
        const content = (await fs.readFile(page.path)).toString();
        const { frontmatter } = parseFrontmatter(content);

        return {
          id: page.path,
          title: frontmatter.title,
          description: frontmatter.description,
          structuredData: structure(content),
          url: `/docs/${page.slug.join('/')}`,
        } satisfies AdvancedIndex;
      }),
    );
  },
});
