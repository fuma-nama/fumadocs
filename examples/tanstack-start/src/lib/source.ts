import {
  loader,
  type MetaData,
  type PageData,
  type Source,
  type VirtualFile,
} from 'fumadocs-core/source';
import matter from 'gray-matter';
import * as path from 'node:path';
import * as icons from 'lucide-static';

const files = Object.entries(
  import.meta.glob<true, 'raw'>('/content/**/*', {
    eager: true,
    query: '?raw',
    import: 'default',
  }),
);

const virtualFiles: VirtualFile[] = files.flatMap(([file, content]) => {
  const ext = path.extname(file);
  const virtualPath = path.relative('content', path.join(process.cwd(), file));

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
  // @ts-expect-error -- string
  icon(icon) {
    if (!icon) {
      return;
    }

    if (icon in icons) return icons[icon as keyof typeof icons];
  },
});
