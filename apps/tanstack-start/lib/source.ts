import Glob from 'fast-glob';
import { readFile } from 'fs/promises';
import {
  loader,
  type MetaData,
  type PageData,
  type Source,
} from 'fumadocs-core/source';
import matter from 'gray-matter';
import * as path from 'node:path';
import { createCompiler } from '@fumadocs/mdx-remote';

const files = await Glob('content/docs/**/*.mdx');

async function createSource(): Promise<
  Source<{
    pageData: PageData & {
      content: string;
    };
    metaData: MetaData;
  }>
> {
  return {
    files: await Promise.all(
      files.map(async (file) => {
        const { data, content } = matter(await readFile(file));

        return {
          type: 'page',
          path: path.relative('content/docs', file),
          data: {
            ...data,
            content,
          },
        };
      }),
    ),
  };
}

export const compiler = createCompiler({
  development: false,
});

export const source = loader({
  source: await createSource(),
  baseUrl: '/docs',
});
