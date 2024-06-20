// TODO replace this with more abstracted plugin featuring wesocket and automatic local file cache for dev

import { createCache } from '@fumadocs/mdx-remote/github';
import path from 'node:path';

const cwd = process.cwd();
const directory = path.resolve(cwd, 'content', 'docs');
const cache = await createCache({
  directory,
  saveFile: path.resolve(directory, '.fumadocs', 'cache.json'),
}).load();

export const { pageTree, getPage, getPages, getSearchIndexes } =
  await cache.generatePageTree();
export const { compileMDX } = cache;
