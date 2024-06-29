// @ts-check
import { buildSearchIndexes } from '@fumadocs/mdx-remote/github';
import * as fs from 'node:fs/promises';

/**
 * This is yet experimental.
 * This script must be executed every time the MDX files are changed to ensure search indexes are up-to-date.
 *
 * We recommend using 3rd party solutions like Algolia Search to handle search indexes
 */
async function main() {
  const output = await buildSearchIndexes({
    directory: './content/docs',
    baseUrl: '/docs',
  });

  console.log('Search indexes built');

  // Use Algolia Search and sync search indexes
  // Since this is for experimental purposes, we just use file system
  await fs.mkdir('./dist', { recursive: true });
  await fs.writeFile('./dist/search-index.json', JSON.stringify(output));

  // for Vercel
  await fs.writeFile('./.next/search-index.json', JSON.stringify(output));
}

void main();
