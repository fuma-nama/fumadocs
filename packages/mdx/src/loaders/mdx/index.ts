import { fumaMatter } from '@/utils/fuma-matter';
import { validate } from '@/utils/validation';
import { getGitTimestamp } from '@/utils/git-timestamp';
import { buildMDX } from '@/loaders/mdx/build-mdx';
import type { SourceMap } from 'rollup';
import type { Loader } from '@/loaders/adapter';
import { z } from 'zod';
import type { DocCollectionItem, LoadedConfig } from '@/config/build';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { ConfigLoader } from '@/loaders/config';

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
  return async ({
    source: value,
    development: isDevelopment,
    query,
    compiler,
    filePath,
  }) => {
    const matter = fumaMatter(value);
    const parsed = querySchema.parse(query);
    const config = await configLoader.getConfig();

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

    if (docCollection?.schema) {
      matter.data = await validate(
        docCollection.schema,
        matter.data,
        {
          source: value,
          path: filePath,
        },
        `invalid frontmatter in ${filePath}`,
      );
    }

    if (parsed.only === 'frontmatter') {
      return {
        code: `export const frontmatter = ${JSON.stringify(matter.data)}`,
        map: null,
      };
    }

    const data: Record<string, unknown> = {};
    if (config.global.lastModifiedTime === 'git') {
      data.lastModified = (await getGitTimestamp(filePath))?.getTime();
    }

    // ensure the line number is correct in dev mode
    const lineOffset = isDevelopment ? countLines(matter.matter) : 0;

    const compiled = await buildMDX(
      `${getConfigHash(config)}:${parsed.collection ?? 'global'}`,
      '\n'.repeat(lineOffset) + matter.content,
      {
        development: isDevelopment,
        ...(docCollection?.mdxOptions ?? (await config.getDefaultMDXOptions())),
        postprocess: docCollection?.postprocess,
        data,
        filePath,
        frontmatter: matter.data as Record<string, unknown>,
        _compiler: compiler,
      },
    );

    const out = {
      code: String(compiled.value),
      map: compiled.map as SourceMap,
    };

    await after?.();
    return out;
  };
}

const hashes = new WeakMap<LoadedConfig, string>();

function getConfigHash(config: LoadedConfig) {
  let hash = hashes.get(config);
  if (hash) return hash;

  hash = Date.now().toString();
  hashes.set(config, hash);
  return hash;
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
