import {
  loader,
  type MetaData,
  type PageData,
  type Source,
  type VirtualFile,
} from 'fumadocs-core/source';
import matter from 'gray-matter';
import * as path from 'node:path';
import { i18n } from '~/i18n';

const files = Object.entries(
  import.meta.glob<true, 'raw'>('/content/docs/**/*', {
    eager: true,
    query: '?raw',
    import: 'default',
  }),
);

const virtualFiles: VirtualFile[] = files.flatMap(([file, content]) => {
  const ext = path.extname(file);
  const virtualPath = path.relative(
    'content/docs',
    path.join(process.cwd(), file),
  );

  if (ext === '.mdx' || ext === '.md') {
    const parsed = matter(content);

    return {
      type: 'page',
      path: virtualPath,
      data: {
        ...parsed.data,
        content: parsed.content,
      },
    };
  }

  if (ext === '.json') {
    return {
      type: 'meta',
      path: virtualPath,
      data: JSON.parse(content),
    };
  }

  return [];
});

export const source = loader({
  source: {
    files: virtualFiles,
  } as Source<{
    pageData: PageData & {
      content: string;
    };
    metaData: MetaData;
  }>,
  baseUrl: '/docs',
  i18n,
});
