import { fumaMatter } from '@/utils/fuma-matter';
import { validate } from '@/utils/validation';
import { getGitTimestamp } from '@/utils/git-timestamp';
import { buildMDX } from '@/loaders/mdx/build-mdx';
import type { SourceMap } from 'rollup';
import type { Loader } from '@/loaders/adapter';
import { z } from 'zod';
import type { ConfigLoader } from '@/loaders/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { DocCollection } from '@/config';

const querySchema = z
  .object({
    only: z.literal(['frontmatter', 'all']).default('all'),
    collection: z.string().optional(),
    hash: z
      .string()
      .describe(
        'the hash of config, used for revalidation on Turbopack/Webpack.',
      )
      .optional(),
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

    const loaded = await configLoader.getConfig(parsed.hash);
    const cacheDir = isDevelopment
      ? undefined
      : loaded.global.experimentalBuildCache;
    const cacheKey = `${parsed.hash}_${parsed.collection ?? 'global'}_${generateCacheHash(filePath)}`;

    if (cacheDir) {
      const cached = await fs
        .readFile(path.join(cacheDir, cacheKey))
        .then((content) => cacheEntry.parse(JSON.parse(content.toString())))
        .catch(() => null);

      if (cached && cached.hash === generateCacheHash(value)) return cached;
    }

    const collection = parsed.collection
      ? loaded.collections.get(parsed.collection)
      : undefined;

    let docCollection: DocCollection | undefined;
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
    if (loaded.global.lastModifiedTime === 'git') {
      data.lastModified = (await getGitTimestamp(filePath))?.getTime();
    }

    // ensure the line number is correct in dev mode
    const lineOffset = isDevelopment ? countLines(matter.matter) : 0;

    const compiled = await buildMDX(
      `${parsed.hash ?? ''}:${parsed.collection ?? 'global'}`,
      '\n'.repeat(lineOffset) + matter.content,
      {
        development: isDevelopment,
        ...(docCollection?.mdxOptions ?? (await loaded.getDefaultMDXOptions())),
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

    if (cacheDir) {
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(
        path.join(cacheDir, cacheKey),
        JSON.stringify({
          ...out,
          hash: generateCacheHash(value),
        } satisfies CacheEntry),
      );
    }

    return out;
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
