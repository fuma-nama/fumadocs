// @ts-check
import { getLocalFiles } from '@fumadocs/mdx-remote/github';
import { structure } from 'fumadocs-core/mdx-plugins';
import { createGetUrl, getSlugs, parseFilePath } from 'fumadocs-core/source';
import * as fs from 'node:fs/promises';

/**
 * This is yet experimental.
 * This script must be executed every time the MDX files are changed to ensure search indexes are up-to-date.
 *
 * We recommend using 3rd party solutions like Algolia Search to handle search indexes
 */
async function main() {
  const getUrl = createGetUrl('/');
  const files = await getLocalFiles({
    directory: './content',
    keepContent: true,
  });
  /**
   * @type {import("fumadocs-core/search/server").AdvancedIndex[]}
   */
  const output = [];

  await Promise.all(
    files.map(async (file) => {
      if (file.type === 'page' && file.data.data.content) {
        const structuredData = structure(file.data.data.content);

        output.push({
          // @ts-expect-error -- Frontmatter
          title: file.data.title,
          id: file.path,
          structuredData,
          url: getUrl(getSlugs(parseFilePath(file.path))),
        });
      }
    }),
  );

  console.log('Search indexes built');

  // Use Algolia Search and sync search indexes
  // Since this is for experimental purposes, we just use file system
  await fs.mkdir('./dist');
  await fs.writeFile('./dist/search-index.json', JSON.stringify(output));
}

void main();
