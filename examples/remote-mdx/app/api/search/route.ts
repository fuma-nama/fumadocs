import { AdvancedIndex, createSearchAPI } from 'fumadocs-core/search/server';
import * as fs from 'node:fs/promises';

export const {GET} = createSearchAPI('advanced', {
  indexes: async () => {
    const content = await fs
      .readFile(
        process.env.NODE_ENV === 'production'
          ? './.next/search-index.json'
          : './dist/search-index.json',
      )
      .then((res) => res.toString())
      .catch(() => '[]'); // skip if not built

    return JSON.parse(content) as AdvancedIndex[];
  },
});
