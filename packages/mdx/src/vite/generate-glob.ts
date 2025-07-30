import type { AnyCollection, DocCollection, MetaCollection } from '@/config';
import { getGlobPatterns } from '@/utils/collections';

export function generateGlob(
  name: string,
  collection: MetaCollection | DocCollection,
) {
  const patterns = mapGlobPatterns(getGlobPatterns(collection));
  const options: Record<string, unknown> = {
    query: {
      collection: name,
    },
    base: getGlobBase(collection),
  };

  if (collection.type === 'meta') {
    options.import = 'default';
  }

  return `import.meta.glob(${JSON.stringify(patterns)}, ${JSON.stringify(options, null, 2)})`;
}

function mapGlobPatterns(patterns: string[]) {
  return patterns.map((file) => {
    if (file.startsWith('./')) return file;
    if (file.startsWith('/')) return `.${file}`;

    return `./${file}`;
  });
}

function getGlobBase(collection: AnyCollection) {
  let dir = collection.dir;

  if (Array.isArray(dir)) {
    if (dir.length !== 1)
      throw new Error(
        `[Fumadocs MDX] Vite Plugin doesn't support multiple \`dir\` for a collection at the moment.`,
      );

    dir = dir[0];
  }

  if (!dir.startsWith('./') && !dir.startsWith('/')) {
    return '/' + dir;
  }
  return dir;
}
