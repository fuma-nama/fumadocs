import { createCache } from '@fumadocs/mdx-remote/github';
import path from 'node:path';

const cwd = process.cwd();
const directory = path.resolve(cwd, 'content', 'docs');
const cache = createCache({
  directory,
  cachePath: path.resolve(directory, '.fumadocs', 'cache.json'),
});

await cache.load();

export const { getPageTree, getPage, getPages, getSearchIndexes } =
  await cache.generatePageTree();
export const { compileMDX } = cache;
