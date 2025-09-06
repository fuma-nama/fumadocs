import type { AnyCollection } from '@/config';

interface GlobOptions {
  query: Record<string, string>;
  base?: string;
  eager?: boolean;
  import?: string;
}

export function generateGlob(
  name: string,
  patterns: string[],
  globOptions?: Partial<GlobOptions>,
) {
  const options: GlobOptions = {
    ...globOptions,
    query: {
      ...globOptions?.query,
      collection: name,
    },
  };

  return `import.meta.glob(${JSON.stringify(mapGlobPatterns(patterns))}, ${JSON.stringify(options, null, 2)})`;
}

function mapGlobPatterns(patterns: string[]) {
  return patterns.map(enforceRelative);
}

function enforceRelative(file: string) {
  if (file.startsWith('./')) return file;
  if (file.startsWith('/')) return `.${file}`;

  return `./${file}`;
}

export function getGlobBase(collection: AnyCollection) {
  let dir = collection.dir;

  if (Array.isArray(dir)) {
    if (dir.length !== 1)
      throw new Error(
        `[Fumadocs MDX] Vite Plugin doesn't support multiple \`dir\` for a collection at the moment.`,
      );

    dir = dir[0];
  }

  return enforceRelative(dir);
}
