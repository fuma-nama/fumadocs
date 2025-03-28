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

async function createSource() {
  const files = await Glob('content/docs/**/*.mdx');

  const source: Source<{
    pageData: PageData & {
      content: string;
    };
    metaData: MetaData;
  }> = {
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

  return loader({
    source,
    baseUrl: '/docs',
  });
}

const source = createSource();

export function getSource() {
  return source;
}
