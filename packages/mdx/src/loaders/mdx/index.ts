import { fumaMatter } from '@/utils/fuma-matter';
import type { SourceMap } from 'rollup';
import type { Loader } from '@/loaders/adapter';
import { z } from 'zod';
import type { DocCollectionItem } from '@/config/build';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { ConfigLoader } from '@/loaders/config';
import { mdxLoaderGlob } from '..';

const querySchema = z
  .object({
    only: z.literal(['frontmatter', 'all']).default('all'),
    collection: z.string().optional(),
  })
  .loose();

const cacheEntry = z.object({
  code: z.string(),
  map: z.any().optional(),
  hash: z.string().optional(),
});

type CacheEntry = z.infer<typeof cacheEntry>;

export function createMdxLoader(configLoader: ConfigLoader): Loader {
  return {
    test: mdxLoaderGlob,
    async load({
      getSource,
      development: isDevelopment,
      query,
      compiler,
      filePath,
    }) {
      const config = await configLoader.getConfig();
      const value = await getSource();
      const matter = fumaMatter(value);
      const parsed = querySchema.parse(query);

      let after: (() => Promise<void>) | undefined;

      if (!isDevelopment && config.global.experimentalBuildCache) {
        const cacheDir = config.global.experimentalBuildCache;
        const cacheKey = `${parsed.hash}_${parsed.collection ?? 'global'}_${generateCacheHash(filePath)}`;

        const cached = await fs
          .readFile(path.join(cacheDir, cacheKey))
          .then((content) => cacheEntry.parse(JSON.parse(content.toString())))
          .catch(() => null);

        if (cached && cached.hash === generateCacheHash(value)) return cached;
        after = async () => {
          await fs.mkdir(cacheDir, { recursive: true });
          await fs.writeFile(
            path.join(cacheDir, cacheKey),
            JSON.stringify({
              ...out,
              hash: generateCacheHash(value),
            } satisfies CacheEntry),
          );
        };
      }

      const collection = parsed.collection
        ? config.getCollection(parsed.collection)
        : undefined;

      let docCollection: DocCollectionItem | undefined;
      switch (collection?.type) {
        case 'doc':
          docCollection = collection;
          break;
        case 'docs':
          docCollection = collection.docs;
          break;
      }

      if (docCollection) {
        matter.data = await configLoader.core.transformFrontmatter(
          { collection: docCollection, filePath, source: value },
          matter.data as Record<string, unknown>,
        );
      }

      if (parsed.only === 'frontmatter') {
        return {
          code: `export const frontmatter = ${JSON.stringify(matter.data)}`,
          map: null,
        };
      }

      // ensure the line number is correct in dev mode
      const lineOffset = isDevelopment ? countLines(matter.matter) : 0;

      const { buildMDX } = await import('@/loaders/mdx/build-mdx');
      const compiled = await buildMDX(configLoader.core, docCollection, {
        isDevelopment,
        source: '\n'.repeat(lineOffset) + matter.content,
        filePath,
        frontmatter: matter.data as Record<string, unknown>,
        _compiler: compiler,
        environment: 'bundler',
      });

      const out = {
        code: String(compiled.value),
        map: compiled.map as SourceMap,
      };

      await after?.();
      return out;
    },
  };
}

function generateCacheHash(input: string): string {
  return createHash('md5').update(input).digest('hex');
}

function countLines(s: string) {
  let num = 0;

  for (const c of s) {
    if (c === '\n') num++;
  }

  return num;
}
